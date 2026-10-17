import type { Component, CpePart, Resolved } from "./types";
import { parseCpe23, parsePurl } from "./ids";

// Which NVD product (vendor:product) is this component? Strongest evidence
// wins, and the answer always says how it was reached (Resolved.via), so the
// UI can tell an exact CPE from a guess on a free-text name.

/** Comparison key: lowercase alphanumerics only ("HTTP Server" ≡ "http_server"). */
export const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
/** CPE-style token: lowercase, spaces/dashes to underscores. */
const snake = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[\s\-]+/g, "_")
    .replace(/[^a-z0-9_.+]/g, "");

type Cpe = { vendor: string; product: string; part?: CpePart };
type Alias = Cpe & { alts?: Cpe[] };
const C = (vendor: string, product: string, part?: CpePart, alts?: Cpe[]): Alias => ({ vendor, product, part, alts });

// Curated product names → NVD CPE vendor:product (every pair checked against
// NVD's virtualMatchString on 2026-10-17). Keys are key()-normalised. Some
// products live under more than one CPE name over the years (nginx moved to
// f5:nginx, Confluence splits server / data center); `alts` are pulled too.
const NGINX = C("f5", "nginx", "a", [{ vendor: "nginx", product: "nginx", part: "a" }]);
const CONFLUENCE = C("atlassian", "confluence_server", "a", [{ vendor: "atlassian", product: "confluence_data_center", part: "a" }]);
const ZIMBRA = C("synacor", "zimbra_collaboration_suite", "a", [{ vendor: "zimbra", product: "collaboration", part: "a" }]);
const ALIAS: Record<string, Alias> = {
  log4j: C("apache", "log4j", "a"),
  log4j2: C("apache", "log4j", "a"),
  log4jcore: C("apache", "log4j", "a"),
  openssh: C("openbsd", "openssh", "a"),
  httpd: C("apache", "http_server", "a"),
  httpserver: C("apache", "http_server", "a"),
  apachehttpserver: C("apache", "http_server", "a"),
  apache2: C("apache", "http_server", "a"),
  tomcat: C("apache", "tomcat", "a"),
  struts: C("apache", "struts", "a"),
  struts2: C("apache", "struts", "a"),
  activemq: C("apache", "activemq", "a"),
  nginx: NGINX,
  exchange: C("microsoft", "exchange_server", "a"),
  exchangeserver: C("microsoft", "exchange_server", "a"),
  sharepoint: C("microsoft", "sharepoint_server", "a"),
  sharepointserver: C("microsoft", "sharepoint_server", "a"),
  esxi: C("vmware", "esxi", "o"),
  vcenter: C("vmware", "vcenter_server", "a"),
  vcenterserver: C("vmware", "vcenter_server", "a"),
  confluence: CONFLUENCE,
  confluenceserver: CONFLUENCE,
  jira: C("atlassian", "jira_server", "a"),
  jenkins: C("jenkins", "jenkins", "a"),
  gitlab: C("gitlab", "gitlab", "a"),
  wordpress: C("wordpress", "wordpress", "a"),
  fortios: C("fortinet", "fortios", "o"),
  fortigate: C("fortinet", "fortios", "o"),
  panos: C("paloaltonetworks", "pan-os", "o"),
  globalprotect: C("paloaltonetworks", "pan-os", "o"),
  moveit: C("progress", "moveit_transfer", "a"),
  moveittransfer: C("progress", "moveit_transfer", "a"),
  openssl: C("openssl", "openssl", "a"),
  sudo: C("sudo_project", "sudo", "a"),
  curl: C("haxx", "curl", "a"),
  libcurl: C("haxx", "libcurl", "a"),
  routeros: C("mikrotik", "routeros", "o"),
  mikrotik: C("mikrotik", "routeros", "o"),
  zimbra: ZIMBRA,
  roundcube: C("roundcube", "webmail", "a"),
  ivanticonnectsecure: C("ivanti", "connect_secure", "a"),
  connectsecure: C("ivanti", "connect_secure", "a"),
  springframework: C("vmware", "spring_framework", "a"),
  jacksondatabind: C("fasterxml", "jackson-databind", "a"),
  commonstext: C("apache", "commons_text", "a"),
  django: C("djangoproject", "django", "a"),
  bash: C("gnu", "bash", "a"),
  glibc: C("gnu", "glibc", "a"),
  xz: C("tukaani", "xz", "a"),
  xzutils: C("tukaani", "xz", "a"),
  php: C("php", "php", "a"),
  redis: C("redis", "redis", "a"),
  postgresql: C("postgresql", "postgresql", "a"),
  mysql: C("oracle", "mysql", "a"),
};

// purl "type/namespace/name" (lowercased) → CPE, for packages whose purl name
// differs from the NVD product. OS packages (deb/rpm/apk) fall through to ALIAS
// on their name, which is how distros name upstream software anyway.
const PURL: Record<string, Alias> = {
  "maven/org.apache.logging.log4j/log4j-core": C("apache", "log4j", "a"),
  "maven/org.apache.logging.log4j/log4j-api": C("apache", "log4j", "a"),
  "maven/org.apache.struts/struts2-core": C("apache", "struts", "a"),
  "maven/org.apache.tomcat.embed/tomcat-embed-core": C("apache", "tomcat", "a"),
  "maven/org.apache.tomcat/tomcat-catalina": C("apache", "tomcat", "a"),
  "maven/org.apache.activemq/activemq-client": C("apache", "activemq", "a"),
  "maven/org.apache.commons/commons-text": C("apache", "commons_text", "a"),
  "maven/com.fasterxml.jackson.core/jackson-databind": C("fasterxml", "jackson-databind", "a"),
  "maven/org.springframework/spring-beans": C("vmware", "spring_framework", "a"),
  "maven/org.springframework/spring-webmvc": C("vmware", "spring_framework", "a"),
  "maven/org.springframework/spring-core": C("vmware", "spring_framework", "a"),
  "pypi/django": C("djangoproject", "django", "a"),
  "npm/lodash": C("lodash", "lodash", "a"),
};

/** A vendor/product pair from the CISA KEV catalog (vendorProject, product). */
export type KevName = { vendor: string; product: string };

export function resolveComponent(c: Component, kevNames: KevName[] = []): Resolved | null {
  if (c.cpe) {
    const p = parseCpe23(c.cpe);
    if (p) return { vendor: p.vendor, product: p.product, part: p.part as CpePart, via: "cpe" };
  }
  let name = c.name;
  const vendor = c.vendor ?? null;
  if (c.purl) {
    const p = parsePurl(c.purl);
    if (p) {
      const k = [p.type, p.namespace, p.name].filter(Boolean).join("/").toLowerCase();
      const hit = PURL[k];
      if (hit) return { ...hit, via: "purl" };
      name = p.name;
      // A maven groupId or npm scope is not an NVD vendor; keep any vendor the caller stated.
    }
  }

  // Curated aliases: the name alone first, then vendor + name, then each name word.
  const candidates = [key(name), vendor ? key(`${vendor} ${name}`) : "", ...name.split(/[\s_\-/]+/).map(key)];
  for (const k of candidates) if (k && ALIAS[k]) return { ...ALIAS[k], via: "alias" };

  // The KEV catalog as a dictionary of exploited products' real names.
  const nk = key(name);
  const vk = vendor ? key(vendor) : null;
  const kevHits = kevNames.filter((n) => productKeyEq(key(n.product), nk) && (!vk || vendorKeyEq(key(n.vendor), vk)));
  const vendors = new Set(kevHits.map((n) => key(n.vendor)));
  if (kevHits.length && vendors.size === 1) {
    return { vendor: snake(kevHits[0].vendor), product: snake(kevHits[0].product), via: "kev" };
  }

  const prod = snake(name);
  if (!prod) return null;
  return { vendor: vendor ? snake(vendor) : prod, product: prod, via: "name" };
}

/** "log4j2" ≡ "log4j", "struts2" ≡ "struts": a trailing major-version digit is not a different product. */
export function productKeyEq(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const strip = (s: string) => s.replace(/\d+$/, "");
  return strip(a) === strip(b) && strip(a).length >= 3;
}

/** "paloaltonetworks" ≡ "paloalto", "apache" ≡ "apachesoftwarefoundation": one is a prefix of the other. */
export function vendorKeyEq(a: string, b: string): boolean {
  if (!a || !b) return false;
  return a === b || (a.length >= 4 && b.startsWith(a)) || (b.length >= 4 && a.startsWith(b));
}
