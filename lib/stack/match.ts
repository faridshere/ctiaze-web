import type {
  ActorClaim,
  ActorCveRow,
  CpeMatch,
  ComponentResult,
  ComponentStatus,
  Component,
  Confidence,
  CveFinding,
  IdentityVia,
  ProductCve,
  Resolved,
  VersionVerdict,
} from "./types";
import { evalRanges } from "./version";
import { key, productKeyEq, vendorKeyEq } from "./resolve";

// The pure core of the stack check: given a resolved component, the CVEs NVD
// files under its product (with their version ranges), the KEV catalog and the
// cited actor rows, decide which CVEs to report and how sure we are. No I/O:
// the route gathers the facts, this file only reasons over them.

export const MAX_FINDINGS_PER_COMPONENT = 50;

/** A CISA KEV catalog row, trimmed to what the stack check reads. */
export type KevEntry = {
  cve: string;
  vendor: string;
  product: string;
  dateAdded: string | null;
  ransomware: boolean;
};

/** Facts about CVEs, gathered by the route from KEV, EPSS, items and cve_intel. */
export type CveFacts = {
  kev: Map<string, KevEntry>;
  epss: Map<string, number>;
  priority: Map<string, string>;
  actors: Map<string, ActorClaim[]>;
};

/** Keep only the cpeMatch rows that name this product (vendor:product), any part. */
export function matchesFor(configs: CpeMatch[], vendor: string, product: string): CpeMatch[] {
  const v = vendor.toLowerCase();
  const p = product.toLowerCase();
  return configs.filter((m) => {
    const f = m.criteria.toLowerCase().split(":");
    return f[3] === v && f[4] === p;
  });
}

/** KEV entries whose catalog vendor/product names this component. */
export function kevByName(r: Resolved, c: Component, kev: Iterable<KevEntry>): KevEntry[] {
  const pk = [r.product, ...(r.alts ?? []).map((a) => a.product)].map(key);
  const vk = [r.vendor, ...(r.alts ?? []).map((a) => a.vendor)].map(key);
  const named = key(c.name);
  // A free-text name with no stated vendor has the product as its vendor guess;
  // matching it on vendor too would make "jenkins" never match "Jenkins/Jenkins".
  const vendorKnown = r.via !== "name" || !!c.vendor;
  const out: KevEntry[] = [];
  for (const e of kev) {
    const ep = key(e.product);
    const ev = key(e.vendor);
    const productHit = pk.some((p) => productKeyEq(ep, p)) || productKeyEq(ep, named);
    if (!productHit) continue;
    if (vendorKnown && !vk.some((v) => vendorKeyEq(ev, v))) continue;
    out.push(e);
  }
  return out;
}

/**
 * How sure is one finding? Two independent questions, both shown in the UI:
 * is this the product (identity), and is this version affected (version)?
 */
export function confidenceOf(via: IdentityVia, version: VersionVerdict): Confidence {
  const strongId = via === "cpe" || via === "purl" || via === "alias";
  if (version === "in-range") return strongId || via === "kev" ? "high" : "medium";
  if (version === "ambiguous" || version === "no-version" || version === "not-checked") {
    return strongId ? "medium" : "low";
  }
  return "low";
}

const VERSION_RANK: Record<VersionVerdict, number> = { "in-range": 4, ambiguous: 2, "no-version": 2, "not-checked": 1, "not-affected": 0 };
const CONF_RANK: Record<Confidence, number> = { high: 2, medium: 1, low: 0 };

/** Ranking: exploited first (KEV, cited actors), then version certainty, then EPSS. */
export function compareFindings(a: CveFinding, b: CveFinding): number {
  return (
    Number(b.kev) - Number(a.kev) ||
    Number(b.actors.length > 0) - Number(a.actors.length > 0) ||
    VERSION_RANK[b.version] - VERSION_RANK[a.version] ||
    CONF_RANK[b.confidence] - CONF_RANK[a.confidence] ||
    (b.epss ?? -1) - (a.epss ?? -1) ||
    b.cve.localeCompare(a.cve)
  );
}

export type NvdPull = { status: "ok"; cves: ProductCve[] } | { status: "error" } | { status: "skipped" };

/**
 * Assess one component. `nvd` is what the route got from NVD for the resolved
 * product(s): ok (with the CVEs, maybe empty), error, or skipped (over the
 * per-request lookup budget). KEV name matches are reported either way, but
 * when NVD ranges exist they decide the version verdict.
 */
export function assessComponent(c: Component, r: Resolved | null, nvd: NvdPull, kevNamed: KevEntry[], facts: CveFacts): ComponentResult {
  if (!r) {
    return { input: c, resolved: null, status: "unresolved", findings: [], total_affected: 0, not_affected: 0, note: "Could not tell which product this is. Try 'vendor product version', a purl or a CPE." };
  }
  const products = [{ vendor: r.vendor, product: r.product }, ...(r.alts ?? [])];
  const verdicts = new Map<string, { verdict: VersionVerdict; detail: string | null; fixedIn: string | null }>();
  if (nvd.status === "ok") {
    for (const cve of nvd.cves) {
      const rows = products.flatMap((p) => matchesFor(cve.matches, p.vendor, p.product));
      // Our product only as the platform another product runs on
      // (vulnerable: false) is not a vulnerability in our product.
      if (!rows.some((m) => m.vulnerable !== false)) continue;
      verdicts.set(cve.id.toUpperCase(), evalRanges(c.version, rows));
    }
  }

  const ids = new Set<string>();
  let notAffected = 0;
  for (const [id, v] of verdicts) {
    if (v.verdict === "not-affected") notAffected++;
    else ids.add(id);
  }
  // KEV-by-name hits NVD did not list for this product still get reported
  // (version not checked) unless NVD ranges positively excluded them.
  for (const e of kevNamed) {
    const id = e.cve.toUpperCase();
    if (verdicts.get(id)?.verdict === "not-affected") continue;
    ids.add(id);
  }

  const findings: CveFinding[] = [];
  for (const id of ids) {
    const v = verdicts.get(id) ?? { verdict: c.version ? ("not-checked" as const) : ("no-version" as const), detail: null, fixedIn: null };
    const kev = facts.kev.get(id);
    findings.push({
      cve: id,
      kev: !!kev,
      kev_date_added: kev?.dateAdded ?? null,
      ransomware: kev?.ransomware ?? false,
      epss: facts.epss.get(id) ?? null,
      version: v.verdict,
      version_detail: v.detail,
      fixed_in: v.fixedIn,
      confidence: confidenceOf(r.via, v.verdict),
      actors: facts.actors.get(id) ?? [],
      coverage_priority: facts.priority.get(id) ?? null,
    });
  }
  findings.sort(compareFindings);

  let status: ComponentStatus;
  let note: string | null = null;
  if (nvd.status === "ok" && (nvd.cves.length > 0 || findings.length > 0)) status = "checked";
  else if (nvd.status === "error") {
    status = "upstream-error";
    note = "NVD did not answer for this product, so versions were not checked. KEV name matches are still shown.";
  } else if (kevNamed.length > 0) {
    status = "kev-only";
    note = nvd.status === "skipped"
      ? "Over this request's NVD lookup budget: matched against CISA KEV by name, versions not checked."
      : "NVD lists nothing under this CPE name: matched against CISA KEV by name, versions not checked.";
  } else if (nvd.status === "skipped") {
    status = "no-records";
    note = "Over this request's NVD lookup budget and not in CISA KEV by name. Check it in a smaller batch.";
  } else {
    status = "no-records";
    note = `Neither NVD (as ${r.vendor}:${r.product}) nor CISA KEV lists anything under this name. A different spelling, a purl or a CPE may resolve it.`;
  }
  if (!c.version && findings.length) note = (note ? note + " " : "") + "No version given: every CVE for the product is listed, unconfirmed.";

  return {
    input: c,
    resolved: r,
    status,
    findings: findings.slice(0, MAX_FINDINGS_PER_COMPONENT),
    total_affected: findings.length,
    not_affected: notAffected,
    note,
  };
}

// ---- actor citations -------------------------------------------------------

const HTTP_URL = /^https?:\/\/[^\s<>"]+$/i;

/**
 * Turn threat_actors.<id>.cves rows into printable claims. A row without an
 * evidence quote, or without any source (name or link), is dropped: we never
 * print "exploited by X" that the reader cannot check. Only http(s) links are
 * kept as links.
 */
export function actorClaims(actorId: string, actorName: string, rows: ActorCveRow[] | null | undefined, wanted: Set<string>): Map<string, ActorClaim[]> {
  const out = new Map<string, ActorClaim[]>();
  for (const row of rows ?? []) {
    const cve = typeof row?.cve === "string" ? row.cve.trim().toUpperCase() : "";
    if (!cve || !wanted.has(cve)) continue;
    const evidence = typeof row.evidence === "string" ? row.evidence.trim() : "";
    const url = typeof row.url === "string" && HTTP_URL.test(row.url.trim()) ? row.url.trim() : null;
    const source = typeof row.source === "string" ? row.source.trim() : "";
    if (!evidence || (!source && !url)) continue;
    const claim: ActorClaim = {
      actor_id: actorId,
      actor: actorName,
      evidence: evidence.slice(0, 600),
      source: source || new URL(url!).hostname,
      url,
      date: typeof row.date === "string" ? row.date.slice(0, 10) : null,
      item: typeof row.item === "string" ? row.item : null,
    };
    const list = out.get(cve) ?? [];
    if (!list.some((x) => x.evidence === claim.evidence && x.url === claim.url)) list.push(claim);
    out.set(cve, list);
  }
  return out;
}

/** Merge per-actor maps into one CVE → claims map. */
export function mergeClaims(maps: Map<string, ActorClaim[]>[]): Map<string, ActorClaim[]> {
  const out = new Map<string, ActorClaim[]>();
  for (const m of maps) for (const [cve, list] of m) out.set(cve, [...(out.get(cve) ?? []), ...list]);
  return out;
}

/** Pull the cpeMatch rows out of an NVD 2.0 CVE record. */
export function cpeMatchesOf(cve: { configurations?: { nodes?: { cpeMatch?: CpeMatch[] }[] }[] }): CpeMatch[] {
  const out: CpeMatch[] = [];
  for (const cfg of cve.configurations ?? []) for (const node of cfg.nodes ?? []) for (const m of node.cpeMatch ?? []) if (m?.criteria) out.push(m);
  return out;
}
