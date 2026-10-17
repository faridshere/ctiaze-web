// Fixture rows in the shape of the engine's cited-intel collections
// (cve_actor_citations, actor_ttps_cited, actor_iocs_cited) and of
// lib/claims.ts ClaimRow. Invented values on documentation-reserved ranges
// (203.0.113.0/24, 2001:db8::/32, *.example) — never the database.
import type { ThreatActor } from "../../lib/threatactors.ts";
import type { CitedRows } from "../../lib/cited.ts";
import type { ClaimRow } from "../../lib/claims.ts";

export const CITED_ACTOR: ThreatActor = {
  _id: "apt28",
  name: "APT28",
  aliases: ["Fancy Bear", "Sofacy", "G0007"],
  origin_country: "RU",
  state_sponsor: "Russia",
  type: "nation-state",
  targets_countries: ["UA"],
  targets_sectors: ["government"],
  description_en: "Russia-nexus espionage group attributed to the GRU.",
  refs: ["https://attack.mitre.org/groups/G0007/"],
  mitre: "G0007",
  source: "mitre",
  techniques: [{ id: "T1078", name: "Valid Accounts", tactic: "persistence" }],
  malware: [],
  tools: [],
  first_seen: "2004-01-01T00:00:00.000Z",
  last_active: "2026-08-01T00:00:00.000Z",
  recent_activity: [],
  last_refreshed: "2026-09-07T11:41:10.163Z",
};

export const OTHER_ACTOR: ThreatActor = {
  _id: "apt29",
  name: "APT29",
  aliases: ["Cozy Bear"],
  origin_country: "RU",
  state_sponsor: "Russia",
  type: "nation-state",
  targets_countries: [],
  targets_sectors: [],
  refs: [],
  mitre: "G0016",
  source: "mitre",
  recent_activity: [],
  last_refreshed: "2026-09-07T11:41:10.163Z",
};

export const CITED_ROWS: CitedRows = {
  cves: [
    {
      cve: "CVE-2023-23397",
      actor_id: "apt28",
      actor_text: "APT28",
      actor_in_quote: true,
      relation: "exploited",
      quote: "APT28 exploited CVE-2023-23397 against European energy targets.",
      url: "https://research.example.com/apt28-outlook",
      host: "research.example.com",
      kev: true,
      extracted_at: "2026-10-01T08:00:00Z",
    },
    {
      cve: "cve-2023-23397",
      actor_id: "apt28",
      actor_text: "Fancy Bear",
      actor_in_quote: false,
      relation: "exploited",
      quote: "The Outlook flaw was used to steal NTLM hashes.",
      url: "https://news.example.org/outlook-ntlm",
      host: "news.example.org",
      kev: true,
      extracted_at: "2026-10-02T09:30:00Z",
    },
    // The same report quoted twice: one relationship.
    {
      cve: "CVE-2023-23397",
      actor_id: "apt28",
      actor_in_quote: true,
      quote: "APT28 exploited CVE-2023-23397 against European energy targets.",
      url: "https://research.example.com/apt28-outlook",
      extracted_at: "2026-10-03T08:00:00Z",
    },
    {
      cve: "CVE-2024-0001",
      actor_id: "apt28",
      actor_in_quote: true,
      quote: "Sofacy chained CVE-2024-0001.",
      url: "https://research.example.com/sofacy-chain",
      extracted_at: "2026-10-04T10:00:00Z",
    },
    // Dropped: no source URL, a non-http URL, a malformed CVE id.
    { cve: "CVE-2024-0002", actor_id: "apt28", actor_in_quote: true, quote: "uncited", url: null },
    { cve: "CVE-2024-0003", actor_id: "apt28", quote: "bad", url: "javascript:alert(1)" },
    { cve: "CVE-23-1", actor_id: "apt28", quote: "bad id", url: "https://research.example.com/x" },
  ],
  ttps: [
    {
      actor_id: "apt28",
      technique_id: "T1078",
      technique_name: "Valid Accounts",
      tactic: "persistence",
      quote: "The group logged in with stolen VPN credentials.",
      url: "https://research.example.com/apt28-vpn",
    },
    {
      actor_id: "apt28",
      technique_id: "T1078",
      technique_name: "Valid Accounts",
      tactic: "initial-access",
      quote: "Initial access came through valid accounts.",
      url: "https://news.example.org/apt28-access",
    },
    {
      actor_id: "apt28",
      technique_id: "T1566.001",
      technique_name: "Spearphishing Attachment",
      tactic: "initial-access",
      quote: "APT28 sent weaponised RTF attachments.",
      url: "https://research.example.com/apt28-rtf",
    },
    { actor_id: "apt28", technique_id: "T99", technique_name: "bogus", quote: "x", url: "https://research.example.com/x" },
  ],
  iocs: [
    { actor_id: "apt28", type: "sha256", value: "A".repeat(64), quote: "Dropper hash.", url: "https://research.example.com/iocs" },
    { actor_id: "apt28", type: "sha1", value: "b".repeat(40), quote: "SHA-1 of the loader.", url: "https://research.example.com/iocs" },
    { actor_id: "apt28", type: "md5", value: "c".repeat(32), quote: "MD5 of the loader.", url: "https://research.example.com/iocs" },
    { actor_id: "apt28", type: "domain", value: "Evil[.]Example[.]com", quote: "C2 at evil[.]example[.]com.", url: "https://research.example.com/iocs" },
    { actor_id: "apt28", type: "ip", value: "203.0.113.7", quote: "Beacon to 203.0.113.7.", url: "https://research.example.com/iocs" },
    { actor_id: "apt28", type: "ip", value: "2001:db8::1", quote: "IPv6 C2.", url: "https://research.example.com/iocs" },
    { actor_id: "apt28", type: "url", value: "hxxp://evil.example.com/a'b", quote: "Payload URL.", url: "https://research.example.com/iocs" },
    { actor_id: "apt28", type: "email", value: "ops@evil.example.com", quote: "Phishing sender.", url: "https://research.example.com/iocs" },
    { actor_id: "apt28", type: "filename", value: "dropper.exe", quote: "Dropped as dropper.exe.", url: "https://research.example.com/iocs" },
    // Dropped: wrong length for its type, and no source URL.
    { actor_id: "apt28", type: "sha256", value: "deadbeef", quote: "x", url: "https://research.example.com/iocs" },
    { actor_id: "apt28", type: "domain", value: "uncited.example.com", quote: "x", url: "" },
  ],
};

const claim = (over: Partial<ClaimRow>): ClaimRow => ({
  id: "c1",
  kind: "telegram",
  group: "Team Insane PK",
  channel: "teaminsanepk",
  url: "https://t.me/teaminsanepk/123",
  at: "2026-10-05T12:00:00.000Z",
  seenAt: "2026-10-05T12:05:00.000Z",
  text: "We took down gov.example.az",
  summaryEn: "Claims a DDoS against a government site.",
  claimType: "ddos",
  targets: ["gov.example.az"],
  checks: [],
  proof: [],
  ...over,
});

export const CLAIMS: ClaimRow[] = [
  claim({}),
  claim({
    id: "c2",
    kind: "ransomware",
    group: "LockBit",
    channel: "",
    url: "https://www.ransomware.live/",
    summaryEn: null,
    text: "Victim listed: Example AZ LLC",
    claimType: "ransomware",
    targets: [],
  }),
  claim({ id: "c3", kind: "bluesky", group: "falconfeeds", url: "https://bsky.app/profile/x/post/1", claimType: null }),
];
