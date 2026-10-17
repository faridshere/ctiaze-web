import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// A minimal JSON Schema (2020-12) validator — just the keywords the OASIS
// STIX 2.1 schemas use — so the tests can check our bundles against the
// official schemas (vendored under tests/vendor/) without adding a dependency.
//
// It fails closed: a keyword it does not implement throws instead of being
// skipped, so a schema update that starts using one cannot quietly turn a
// check into a pass. tests/stix-schema.test.ts proves it rejects real
// violations, not just that our output passes.
// ---------------------------------------------------------------------------
type Schema = boolean | { [k: string]: unknown };

const ANNOTATIONS = new Set(["$id", "$schema", "$comment", "title", "description", "definitions", "examples"]);
const ROOT = new URL("./vendor/stix2-json-schemas/", import.meta.url);

const files = new Map<string, Schema>();
function load(url: string): Schema {
  let s = files.get(url);
  if (!s) {
    s = JSON.parse(readFileSync(fileURLToPath(url), "utf8")) as Schema;
    files.set(url, s);
  }
  return s;
}

const regexes = new Map<string, RegExp>();
// No `u` flag: the STIX schemas escape `-` outside character classes, which
// the unicode flag rejects as a syntax error.
const re = (p: string) => {
  let r = regexes.get(p);
  if (!r) {
    r = new RegExp(p);
    regexes.set(p, r);
  }
  return r;
};

function resolveRef(ref: string, base: string): { schema: Schema; base: string } {
  const [file, pointer] = ref.split("#");
  const url = file ? new URL(file, base).href : base;
  let node: unknown = load(url);
  for (const part of (pointer ?? "").split("/").filter(Boolean)) {
    node = (node as Record<string, unknown>)[part.replace(/~1/g, "/").replace(/~0/g, "~")];
    if (node === undefined) throw new Error(`unresolvable $ref ${ref} from ${base}`);
  }
  return { schema: node as Schema, base: url };
}

function typeOf(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}

function hasType(v: unknown, t: string): boolean {
  if (t === "integer") return typeof v === "number" && Number.isInteger(v);
  if (t === "number") return typeof v === "number" && Number.isFinite(v);
  return typeOf(v) === t;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function check(data: unknown, schema: Schema, base: string, path: string, errors: string[]): void {
  if (schema === true) return;
  if (schema === false) {
    errors.push(`${path}: not allowed`);
    return;
  }
  const isObj = typeOf(data) === "object";
  const obj = data as Record<string, unknown>;
  const sub = (d: unknown, s: unknown, p: string) => {
    const e: string[] = [];
    check(d, s as Schema, base, p, e);
    return e;
  };

  for (const [k, v] of Object.entries(schema)) {
    if (ANNOTATIONS.has(k)) continue;
    switch (k) {
      case "$ref": {
        const r = resolveRef(v as string, base);
        check(data, r.schema, r.base, path, errors);
        break;
      }
      case "type": {
        const types = Array.isArray(v) ? (v as string[]) : [v as string];
        if (!types.some((t) => hasType(data, t))) errors.push(`${path}: expected ${types.join("|")}, got ${typeOf(data)}`);
        break;
      }
      case "enum":
        if (!(v as unknown[]).some((x) => same(x, data))) errors.push(`${path}: ${JSON.stringify(data)} not in enum`);
        break;
      case "const":
        if (!same(v, data)) errors.push(`${path}: must equal ${JSON.stringify(v)}`);
        break;
      case "pattern":
        if (typeof data === "string" && !re(v as string).test(data)) errors.push(`${path}: "${data}" !~ /${v}/`);
        break;
      case "minLength":
        if (typeof data === "string" && [...data].length < (v as number)) errors.push(`${path}: shorter than ${v}`);
        break;
      case "maxLength":
        if (typeof data === "string" && [...data].length > (v as number)) errors.push(`${path}: longer than ${v}`);
        break;
      case "minimum":
        if (typeof data === "number" && data < (v as number)) errors.push(`${path}: below ${v}`);
        break;
      case "maximum":
        if (typeof data === "number" && data > (v as number)) errors.push(`${path}: above ${v}`);
        break;
      case "format":
        if (v !== "uri") throw new Error(`format "${String(v)}" is not implemented`);
        if (typeof data === "string") {
          try {
            new URL(data);
          } catch {
            errors.push(`${path}: "${data}" is not a URI`);
          }
        }
        break;
      case "items":
        if (Array.isArray(data)) data.forEach((x, i) => check(x, v as Schema, base, `${path}[${i}]`, errors));
        break;
      case "minItems":
        if (Array.isArray(data) && data.length < (v as number)) errors.push(`${path}: fewer than ${v} items`);
        break;
      case "contains":
        if (Array.isArray(data) && !data.some((x, i) => sub(x, v, `${path}[${i}]`).length === 0)) {
          errors.push(`${path}: no item matches "contains"`);
        }
        break;
      case "required":
        if (isObj) for (const r of v as string[]) if (!(r in obj)) errors.push(`${path}: missing "${r}"`);
        break;
      case "minProperties":
        if (isObj && Object.keys(obj).length < (v as number)) errors.push(`${path}: fewer than ${v} properties`);
        break;
      case "properties":
        if (isObj) {
          for (const [p, s] of Object.entries(v as Record<string, Schema>)) {
            if (p in obj) check(obj[p], s, base, `${path}.${p}`, errors);
          }
        }
        break;
      case "patternProperties":
        if (isObj) {
          for (const [p, s] of Object.entries(v as Record<string, Schema>)) {
            for (const key of Object.keys(obj)) if (re(p).test(key)) check(obj[key], s, base, `${path}.${key}`, errors);
          }
        }
        break;
      case "additionalProperties":
        if (isObj) {
          const props = Object.keys((schema.properties as object | undefined) ?? {});
          const pats = Object.keys((schema.patternProperties as object | undefined) ?? {});
          for (const key of Object.keys(obj)) {
            if (props.includes(key) || pats.some((p) => re(p).test(key))) continue;
            check(obj[key], v as Schema, base, `${path}.${key}`, errors);
          }
        }
        break;
      case "propertyNames":
        if (isObj) for (const key of Object.keys(obj)) check(key, v as Schema, base, `${path}{${key}}`, errors);
        break;
      case "allOf":
        for (const s of v as Schema[]) check(data, s, base, path, errors);
        break;
      case "anyOf":
        if (!(v as Schema[]).some((s) => sub(data, s, path).length === 0)) errors.push(`${path}: matches no anyOf branch`);
        break;
      case "oneOf": {
        const n = (v as Schema[]).filter((s) => sub(data, s, path).length === 0).length;
        if (n !== 1) errors.push(`${path}: matches ${n} oneOf branches, expected exactly 1`);
        break;
      }
      case "not":
        if (sub(data, v, path).length === 0) errors.push(`${path}: matches a "not" schema`);
        break;
      case "if": {
        const ok = sub(data, v, path).length === 0;
        const branch = ok ? schema.then : schema.else;
        if (branch !== undefined) check(data, branch as Schema, base, path, errors);
        break;
      }
      case "then":
      case "else":
        break; // applied by "if"
      default:
        throw new Error(`JSON Schema keyword "${k}" is not implemented (at ${path})`);
    }
  }
}

/** Errors validating `data` against a vendored schema, e.g. "common/bundle.json". Empty = valid. */
export function validateStix(data: unknown, schemaPath = "common/bundle.json"): string[] {
  const url = new URL(schemaPath, ROOT).href;
  const errors: string[] = [];
  check(data, load(url), url, "$", errors);
  return errors;
}

/** Every object validated against the schema for its own type: precise errors. */
export function validateObjects(objects: { type: string }[]): string[] {
  const dirs = ["sdos", "sros", "common", "observables"];
  const errors: string[] = [];
  for (const o of objects) {
    const dir = dirs.find((d) => {
      try {
        load(new URL(`${d}/${o.type}.json`, ROOT).href);
        return true;
      } catch {
        return false;
      }
    });
    if (!dir) {
      errors.push(`${o.type}: no schema`);
      continue;
    }
    for (const e of validateStix(o, `${dir}/${o.type}.json`)) errors.push(`${(o as { id?: string }).id ?? o.type} ${e}`);
  }
  return errors;
}
