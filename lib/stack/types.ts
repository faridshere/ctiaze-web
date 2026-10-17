// Shared shapes for the stack check. Pure types: no I/O, safe to import from
// the client tool, the API route and the node:test suite alike.

/** One thing the caller runs, as they sent it (paste line, SBOM entry or API row). */
export type Component = {
  name: string;
  version: string | null;
  purl?: string | null;
  cpe?: string | null;
  /** The vendor, when the input states one (paste "vendor product version", CPE, or derived from a known namespace). */
  vendor?: string | null;
  /** A package namespace (CycloneDX group, Maven groupId, npm scope). Never an NVD vendor as-is. */
  namespace?: string | null;
  /**
   * Where the row came from. Only free-text paste is matched word by word
   * ("apache-tomcat 9.0" is Tomcat); SBOM and API rows name a package, and a
   * library named after a server ("spring-boot-starter-log4j2") is not it.
   */
  origin?: "paste" | "sbom" | null;
};

/**
 * How we decided which NVD product a component is. Strongest first:
 *   cpe   — the caller sent a CPE 2.3 name; we use its vendor:product verbatim.
 *   purl  — a package URL we map through a curated purl → CPE table.
 *   alias — a well-known product name from our curated alias table.
 *   kev   — the name matched a vendor/product pair in the CISA KEV catalog.
 *   name  — a guess from the free-text name; NVD may call it something else.
 */
export type IdentityVia = "cpe" | "purl" | "alias" | "kev" | "name";

/** CPE part: a = application, o = operating system / firmware, h = hardware. */
export type CpePart = "a" | "o" | "h";

export type Resolved = {
  vendor: string;
  product: string;
  /** Known part; when absent the NVD pull tries "a" then "o". */
  part?: CpePart;
  /** Other CPE names the same product has been filed under. */
  alts?: { vendor: string; product: string; part?: CpePart }[];
  via: IdentityVia;
};

/** NVD configuration row (cpeMatch), the only part of a CVE the matcher reads. */
export type CpeMatch = {
  criteria: string;
  vulnerable?: boolean;
  versionStartIncluding?: string;
  versionStartExcluding?: string;
  versionEndIncluding?: string;
  versionEndExcluding?: string;
};

/** One CVE as the matcher needs it: id plus the cpeMatch rows naming our product. */
export type ProductCve = { id: string; matches: CpeMatch[] };

/**
 * What the version check said:
 *   in-range       — the version sits inside an NVD vulnerable range (or equals a listed version).
 *   not-affected   — NVD has ranges for this product and the version is outside all of them.
 *   ambiguous      — a bound could not be compared (e.g. "8.2p1" vs "8.2.1"); not confirmed either way.
 *   no-version     — the caller gave no version.
 *   not-checked    — we did not have NVD ranges for this product (budget, upstream error, or KEV-only hit).
 */
export type VersionVerdict = "in-range" | "not-affected" | "ambiguous" | "no-version" | "not-checked";

export type Confidence = "high" | "medium" | "low";

/** A threat_actors.<id>.cves row as the engine writes it. */
export type ActorCveRow = {
  cve?: string;
  kev?: boolean;
  epss?: number | null;
  item?: string | null;
  date?: string | null;
  source?: string | null;
  evidence?: string | null;
  url?: string | null;
};

/** An actor link we are willing to print: it always carries its quote and a source. */
export type ActorClaim = {
  actor_id: string;
  actor: string;
  evidence: string;
  source: string;
  url: string | null;
  date: string | null;
  item: string | null;
};

export type CveFinding = {
  cve: string;
  kev: boolean;
  kev_date_added: string | null;
  ransomware: boolean;
  epss: number | null;
  version: VersionVerdict;
  /** Human-readable reason, e.g. "2.14.1 ∈ [2.0, 2.15.0)". */
  version_detail: string | null;
  fixed_in: string | null;
  confidence: Confidence;
  actors: ActorClaim[];
  /** The engine's own triage for this CVE (cve_intel.priority), when it has one. */
  coverage_priority: string | null;
};

export type ComponentStatus =
  | "checked" // NVD ranges evaluated
  | "kev-only" // matched the KEV catalog by name; NVD ranges not evaluated
  | "no-records" // resolved, but neither NVD nor KEV has anything under that name
  | "unresolved" // we could not tell which product this is
  | "upstream-error"; // NVD failed for this product; KEV name matches still shown

export type ComponentResult = {
  input: Component;
  resolved: Resolved | null;
  status: ComponentStatus;
  findings: CveFinding[];
  /** Affected CVEs before the per-component cap. */
  total_affected: number;
  /** CVEs NVD lists for the product whose ranges exclude this version. */
  not_affected: number;
  note: string | null;
};
