// Package URL (purl) and CPE 2.3 parsing, per the public specs:
//   purl: https://github.com/package-url/purl-spec  pkg:type/namespace/name@version?qualifiers#subpath
//   CPE:  NISTIR 7695 formatted string               cpe:2.3:part:vendor:product:version:update:…

export type Purl = { type: string; namespace: string | null; name: string; version: string | null };

function dec(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export function parsePurl(raw: string): Purl | null {
  let s = raw.trim();
  if (!/^pkg:/i.test(s)) return null;
  s = s.slice(4).replace(/^\/+/, "");
  s = s.split("#")[0].split("?")[0];
  let version: string | null = null;
  const at = s.lastIndexOf("@");
  if (at > 0) {
    version = dec(s.slice(at + 1)) || null;
    s = s.slice(0, at);
  }
  const parts = s.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const type = parts[0].toLowerCase();
  const name = dec(parts[parts.length - 1]);
  const namespace = parts.length > 2 ? parts.slice(1, -1).map(dec).join("/") : null;
  if (!name) return null;
  return { type, namespace, name, version };
}

export type Cpe23 = { part: string; vendor: string; product: string; version: string | null };

/** Split a CPE 2.3 formatted string on colons that are not backslash-escaped, unescaping each field. */
export function splitCpe(s: string): string[] {
  const out: string[] = [];
  let cur = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "\\" && i + 1 < s.length) {
      cur += s[i + 1];
      i++;
    } else if (ch === ":") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

export function parseCpe23(raw: string): Cpe23 | null {
  const f = splitCpe(raw.trim());
  if (f.length < 6 || f[0].toLowerCase() !== "cpe" || f[1] !== "2.3") return null;
  const [part, vendor, product, version] = [f[2], f[3], f[4], f[5]].map((x) => x.toLowerCase());
  if (!/^[aoh]$/.test(part) || !vendor || !product || vendor === "*" || product === "*") return null;
  return { part, vendor, product, version: version && version !== "*" && version !== "-" ? version : null };
}

/** Quote one CPE 2.3 formatted-string field: anything but [a-z0-9._-] gets a backslash ("backup_\\&_replication"). */
export function cpeEscape(field: string): string {
  return field.replace(/[^a-z0-9._\-]/gi, (ch) => `\\${ch}`);
}

/** The "cpe:2.3:part:vendor:product" prefix NVD's virtualMatchString expects, from unescaped fields. */
export function cpeName(part: string, vendor: string, product: string): string {
  return `cpe:2.3:${part}:${cpeEscape(vendor)}:${cpeEscape(product)}`;
}
