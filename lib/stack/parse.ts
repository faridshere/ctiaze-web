import type { Component } from "./types";
import { parseCpe23, parsePurl } from "./ids";
import { vendorForNamespace } from "./resolve";

// Turning what a user has into Component rows: pasted lines, a CycloneDX JSON
// SBOM, an SPDX JSON SBOM, or an API body. Everything here is pure and runs
// in the browser (the SBOM never leaves the machine as a file, only the
// extracted name/version/purl/cpe rows are posted) and on the server.

export const MAX_COMPONENTS = 500;
export const MAX_SBOM_BYTES = 2 * 1024 * 1024;
const MAX_FIELD = 300;

const clip = (s: unknown): string | null => {
  if (typeof s !== "string") return null;
  const t = s.trim();
  return t ? t.slice(0, MAX_FIELD) : null;
};

// A version token: digit-led (2.4.49, 8.2p1, 7.0.5-rc1) or v-prefixed.
const VERSION_RE = /^v?\d[\w.+\-~:]*$/i;

/**
 * One pasted line → Component. The documented shape is "vendor product version",
 * but people paste "log4j 2.14.1", "nginx/1.25.3", "openssh@9.6p1" or a bare
 * purl/CPE too, so all of those are accepted. With three or more words, the
 * first is taken as the vendor; with two, there is no vendor.
 */
export function parseLine(raw: string): Component | null {
  const line = raw.replace(/#.*$/, "").trim();
  if (!line) return null;
  if (/^pkg:/i.test(line)) {
    const p = parsePurl(line);
    return p ? { name: p.name, version: p.version, purl: line.slice(0, MAX_FIELD), vendor: null, origin: "paste" } : null;
  }
  if (/^cpe:2\.3:/i.test(line)) {
    const c = parseCpe23(line);
    return c ? { name: c.product, version: c.version, cpe: line.slice(0, MAX_FIELD), vendor: c.vendor, origin: "paste" } : null;
  }
  const words = line.replace(/[/@,]/g, " ").split(/\s+/).filter(Boolean).slice(0, 12);
  let version: string | null = null;
  if (words.length > 1 && VERSION_RE.test(words[words.length - 1])) version = words.pop()!.replace(/^v/i, "");
  if (!words.length) return null;
  const vendor = words.length >= 2 ? words[0] : null;
  const name = (vendor ? words.slice(1) : words).join(" ");
  return { name: name.slice(0, MAX_FIELD), version, vendor, origin: "paste" };
}

export function parsePaste(text: string): Component[] {
  return dedupe(text.split(/\r?\n/).map(parseLine).filter((c): c is Component => c !== null));
}

type CdxComponent = {
  name?: unknown;
  version?: unknown;
  group?: unknown;
  purl?: unknown;
  cpe?: unknown;
  components?: unknown;
};

function walkCdx(list: unknown, out: Component[], depth = 0) {
  if (!Array.isArray(list) || depth > 8) return;
  for (const raw of list as CdxComponent[]) {
    if (!raw || typeof raw !== "object") continue;
    const name = clip(raw.name);
    if (name) {
      const cpe = clip(raw.cpe);
      const purl = clip(raw.purl);
      const group = clip(raw.group);
      // A group is a Maven groupId or npm scope, not an NVD vendor: the vendor
      // comes from the CPE, else from a known namespace (org.apache.* → apache).
      const vendor = (cpe && parseCpe23(cpe)?.vendor) || vendorForNamespace(group ?? (purl ? parsePurl(purl)?.namespace ?? null : null));
      out.push({ name, version: clip(raw.version), purl, cpe, vendor, namespace: group, origin: "sbom" });
    }
    walkCdx(raw.components, out, depth + 1);
  }
}

type SpdxPackage = {
  name?: unknown;
  versionInfo?: unknown;
  supplier?: unknown;
  externalRefs?: { referenceType?: unknown; referenceLocator?: unknown }[];
};

function spdxSupplier(s: unknown): string | null {
  const t = clip(s);
  if (!t || /^NOASSERTION$/i.test(t)) return null;
  return clip(t.replace(/^(Organization|Person|Tool):\s*/i, "").replace(/\s*\(.*\)$/, ""));
}

export type SbomParse = { format: "cyclonedx" | "spdx"; components: Component[] };

/** Parse a CycloneDX or SPDX JSON document. Throws with a user-facing message. */
export function parseSbom(doc: unknown): SbomParse {
  if (!doc || typeof doc !== "object") throw new Error("Not a JSON object.");
  const d = doc as Record<string, unknown>;
  if (d.bomFormat === "CycloneDX" || Array.isArray(d.components)) {
    const out: Component[] = [];
    const meta = d.metadata as { component?: unknown } | undefined;
    if (meta?.component) walkCdx([meta.component], out);
    walkCdx(d.components, out);
    return { format: "cyclonedx", components: dedupe(out) };
  }
  if (typeof d.spdxVersion === "string" || Array.isArray(d.packages)) {
    const out: Component[] = [];
    for (const p of (Array.isArray(d.packages) ? d.packages : []) as SpdxPackage[]) {
      if (!p || typeof p !== "object") continue;
      const name = clip(p.name);
      if (!name) continue;
      let purl: string | null = null;
      let cpe: string | null = null;
      for (const r of Array.isArray(p.externalRefs) ? p.externalRefs : []) {
        const t = typeof r?.referenceType === "string" ? r.referenceType.toLowerCase() : "";
        if (t === "purl" && !purl) purl = clip(r.referenceLocator);
        if ((t === "cpe23type" || t === "cpe23") && !cpe) cpe = clip(r.referenceLocator);
      }
      const version = clip(p.versionInfo);
      out.push({ name, version: version && !/^NOASSERTION$/i.test(version) ? version : null, purl, cpe, vendor: spdxSupplier(p.supplier), origin: "sbom" });
    }
    return { format: "spdx", components: dedupe(out) };
  }
  throw new Error("Neither CycloneDX (bomFormat/components) nor SPDX (spdxVersion/packages) JSON.");
}

function dedupe(list: Component[]): Component[] {
  const seen = new Set<string>();
  const out: Component[] = [];
  for (const c of list) {
    const k = `${(c.vendor ?? "").toLowerCase()}|${(c.namespace ?? "").toLowerCase()}|${c.name.toLowerCase()}|${c.version ?? ""}|${c.purl ?? ""}|${c.cpe ?? ""}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }
  return out;
}

export type BodyParse = { ok: true; components: Component[] } | { ok: false; error: string };

/** Validate the API body { components: [{ name, version, purl?, cpe?, vendor?, namespace?, origin? }] }. */
export function parseApiBody(body: unknown): BodyParse {
  const list = (body as { components?: unknown } | null)?.components;
  if (!Array.isArray(list)) return { ok: false, error: "Send JSON { components: [{ name, version, purl?, cpe? }] }." };
  if (list.length === 0) return { ok: false, error: "components is empty." };
  if (list.length > MAX_COMPONENTS) return { ok: false, error: `At most ${MAX_COMPONENTS} components per request (got ${list.length}).` };
  const out: Component[] = [];
  for (const [i, raw] of list.entries()) {
    const r = (raw ?? {}) as Record<string, unknown>;
    let name = clip(r.name);
    let version = clip(r.version);
    let vendor = clip(r.vendor);
    const purl = clip(r.purl);
    const cpe = clip(r.cpe);
    const namespace = clip(r.namespace);
    const origin = r.origin === "paste" || r.origin === "sbom" ? r.origin : null;
    if (!name && purl) {
      const p = parsePurl(purl);
      name = p?.name ?? null;
      version = version ?? p?.version ?? null;
    }
    if (!name && cpe) {
      const c = parseCpe23(cpe);
      name = c?.product ?? null;
      version = version ?? c?.version ?? null;
      vendor = vendor ?? c?.vendor ?? null;
    }
    if (!name) return { ok: false, error: `components[${i}] needs a name, purl or cpe.` };
    out.push({ name, version, purl, cpe, vendor, namespace, origin });
  }
  return { ok: true, components: dedupe(out) };
}
