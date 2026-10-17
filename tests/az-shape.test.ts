import { test } from "node:test";
import assert from "node:assert/strict";
import type { AzBoard, CampaignInput } from "../lib/az-shape.ts";
import type { TrendingCard } from "../lib/exploit-shape.ts";
import { register } from "node:module";

// The module imports ./format without an extension; the loader resolves it.
register("./ts-ext-loader.mjs", import.meta.url);
const {
  apiBody,
  azCounts,
  checkVerdict,
  credibilityWord,
  groupCampaigns,
  hostOf,
  NO_TARGET,
  safeHttps,
  selectAzExploits,
  shapeAdversaries,
  shapeExposure,
} = await import("../lib/az-shape.ts");

// Neutral placeholders only: example.az hosts, GroupX / GroupY, CVE-2099-*.
const NOW = new Date("2099-01-08T12:00:00Z");
const day = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

const claim = (over: Partial<CampaignInput> = {}): CampaignInput => ({
  kind: "telegram",
  group: "GroupX",
  url: "https://t.me/groupx/1",
  at: day(1),
  claimType: "ddos",
  targets: ["example-bank.az"],
  checks: [],
  ...over,
});

test("checkVerdict reads our probe and check-host the same way the ledger does", () => {
  assert.equal(checkVerdict({ here: "HTTP 200", checkhost: "12/12 check-host nodes OK" }), "up");
  assert.equal(checkVerdict({ here: "HTTP 301", checkhost: "0/12 check-host nodes OK" }), "filtered");
  assert.equal(checkVerdict({ here: "timeout", checkhost: "0/12" }), "unreachable");
  assert.equal(checkVerdict({}), "unreachable");
});

test("hostOf and safeHttps normalise and refuse unsafe links", () => {
  assert.equal(hostOf("https://www.Example-Bank.az:443/login?x=1"), "example-bank.az");
  assert.equal(safeHttps("http://example.az/"), null);
  assert.equal(safeHttps("javascript:alert(1)"), null);
  assert.equal(safeHttps("https://abc.onion/x"), null);
  assert.equal(safeHttps("https://example.org/a"), "https://example.org/a");
});

test("groupCampaigns: one entry per group and target, this week only, public kinds only", () => {
  const rows: CampaignInput[] = [
    claim({ at: day(1), targets: ["https://example-bank.az/", "example-gov.az"] }),
    claim({ at: day(2), url: "https://t.me/groupx/2" }),
    claim({ at: day(3), group: "GroupY", kind: "ransomware", claimType: "ransomware", url: "https://www.ransomware.live/", targets: ["example-shop.az"] }),
    claim({ at: day(9) }), // outside the week
    claim({ kind: "darkweb", group: "GroupZ" }), // never public
    claim({ kind: "ahmia", group: "GroupZ" }),
    claim({ group: "GroupY", targets: [], url: "http://insecure.example/" }),
  ];
  const out = groupCampaigns(rows, NOW);
  assert.equal(out.length, 4);
  assert.ok(!out.some((c) => c.group === "GroupZ"));
  const bank = out.find((c) => c.group === "GroupX" && c.target === "example-bank.az")!;
  assert.equal(bank.claims, 2);
  assert.equal(bank.first, day(2));
  assert.equal(bank.last, day(1));
  assert.deepEqual(bank.sources, ["https://t.me/groupx/1", "https://t.me/groupx/2"]);
  assert.equal(bank.verdict, "unchecked");
  const unnamed = out.find((c) => c.target === NO_TARGET)!;
  assert.equal(unnamed.group, "GroupY");
  assert.deepEqual(unnamed.sources, [], "a non-https source is not printed");
});

test("groupCampaigns takes the verdict from the newest claim that checked that target", () => {
  const rows = [
    claim({ at: day(3), checks: [{ target: "https://example-bank.az", here: "timeout", checkhost: "0/10" }] }),
    claim({ at: day(1), checks: [{ target: "https://example-bank.az/", here: "HTTP 200", checkhost: "10/10" }] }),
    claim({ at: day(2), checks: [{ target: "example-other.az", here: "timeout", checkhost: "0/10" }] }),
  ];
  const [c] = groupCampaigns(rows, NOW);
  assert.equal(c.verdict, "up");
  assert.ok(!("verdictAt" in c));
});

test("shapeAdversaries reads the engine's dossier fields (type, confidence, claim_count, last_seen_az, targets_sectors, threat_actor_id)", () => {
  const { cards, withheld } = shapeAdversaries(
    [
      {
        _id: "groupx",
        name: "GroupX",
        aliases: ["GX"],
        type: "hacktivist",
        alignment: "pro-example",
        confidence: "high",
        claim_count: 8,
        last_seen_az: "2099-01-07T10:00:00.000Z",
        targets_sectors: { unknown: 4, other: 2, government: 3, finance: 1 },
        threat_actor_id: "groupx",
        cited_reports: [{ url: "https://t.me/groupx/1", quote: "GroupX claims to have targeted example.az" }],
      },
      { _id: "groupy", name: "GroupY", type: "ransomware", cited_reports: [] },
      {
        _id: "groupz",
        name: "GroupZ",
        cited_reports: [{ url: "https://t.me/groupz/1", quote: "write to leaks@example.az for the dump" }],
      },
    ],
    new Set(["groupx"]),
  );
  assert.equal(cards.length, 1);
  assert.equal(withheld, 2);
  assert.deepEqual(cards[0].hits, ["government", "finance"]);
  assert.equal(cards[0].credibility, "high");
  assert.equal(cards[0].claims, 8);
  assert.equal(cards[0].lastSeen, "2099-01-07T10:00:00.000Z");
  assert.equal(cards[0].dossier, "/actors/groupx");
});

test("shapeAdversaries prints only cited groups and counts the rest", () => {
  const { cards, withheld } = shapeAdversaries(
    [
      {
        _id: "gx",
        name: "GroupX",
        actor_id: "groupx",
        aliases: ["GroupX", "GX Team"],
        alignment: "placeholder-aligned",
        targets: ["banking", "government"],
        credibility: 0.8,
        citations: [
          { quote: "", url: "https://example.org/no-quote" },
          { quote: "GroupX claimed a placeholder test.", url: "https://example.org/report", source: "Example Report" },
        ],
        last_seen: "2099-01-07T00:00:00Z",
      },
      { _id: "gy", name: "GroupY", citations: [{ quote: "Placeholder quote.", url: "http://example.org/insecure" }] },
      { _id: "gw", name: "GroupW", quote: "Placeholder W.", source_url: "https://example.net/w", sectors: "telecom; energy" },
      { _id: "gd", name: "GroupD", kind: "darkweb", quote: "x", source_url: "https://example.net/d" },
    ],
    new Set(["groupx"]),
  );
  assert.equal(withheld, 1);
  assert.deepEqual(cards.map((c) => c.name), ["GroupX", "GroupW"]);
  const gx = cards[0];
  assert.equal(gx.dossier, "/actors/groupx");
  assert.deepEqual(gx.aliases, ["GX Team"]);
  assert.equal(gx.credibility, "high");
  assert.deepEqual(gx.citation, { quote: "GroupX claimed a placeholder test.", url: "https://example.org/report", source: "Example Report" });
  assert.equal(cards[1].dossier, null);
  assert.deepEqual(cards[1].hits, ["telecom", "energy"]);
  assert.equal(cards[1].citation.source, "example.net");
});

test("credibilityWord maps scores to words and keeps words", () => {
  assert.equal(credibilityWord(55), "medium");
  assert.equal(credibilityWord(0.1), "low");
  assert.equal(credibilityWord("High"), "high");
  assert.equal(credibilityWord(null), null);
});

test("shapeExposure keeps listing metadata only and drops dark-web or PII rows", () => {
  const rows = shapeExposure([
    {
      _id: "1",
      org: "example-bank.az",
      sector: "finance",
      claim_type: "leak",
      group: "GroupY",
      status: "listed",
      published: "2099-01-05T00:00:00Z",
      ...({ sample: "row1,row2", download_url: "https://example.org/dump.zip" } as object),
    },
    { _id: "2", org: "example-shop.az", first_seen: "2099-01-06T00:00:00Z" },
    { _id: "3", org: "someone@example.az" },
    { _id: "4", org: "Example Org https://example.org/leak" },
    { _id: "5", org: "example-gov.az", source: "ahmia" },
    { _id: "6", org: "example-tel.az", kind: "darkweb" },
    { _id: "7", org: "   " },
  ]);
  assert.deepEqual(rows.map((r) => r.id), ["2", "1"]);
  assert.deepEqual(Object.keys(rows[1]).sort(), ["at", "claimType", "group", "id", "org", "sector", "status"]);
  assert.ok(!JSON.stringify(rows).includes("dump"));
});

const card = (cve: string, over: Partial<TrendingCard> = {}): TrendingCard => ({
  cve,
  title: `Placeholder product flaw ${cve}`,
  kev: false,
  epss: null,
  who: null,
  newExploits: 1,
  sources: { github: 1, metasploit: 0, exploitdb: 0, nuclei: 0 },
  actors: [],
  timeline: [],
  ...over,
});

test("selectAzExploits keeps CVEs with a reason and ranks AZ-specific ones first", () => {
  const groupx = { id: "groupx", name: "GroupX", hasDossier: true, quote: "GroupX used it.", url: "https://example.org/r" };
  const uncited = { id: "groupy", name: "GroupY", hasDossier: false, quote: null, url: null };
  const out = selectAzExploits(
    [
      card("CVE-2099-0001", { kev: true, epss: 0.9 }),
      card("CVE-2099-0002"),
      card("CVE-2099-0003", { actors: [groupx, uncited] }),
      card("CVE-2099-0004", { epss: 0.5 }),
      card("CVE-2099-0005", { actors: [uncited] }),
    ],
    new Set(["groupx", "groupy"]),
    new Map([
      ["CVE-2099-0004", { product: "PlaceholderGW", count: 12, asOf: "2099-01-01" }],
      ["CVE-2099-0002", { product: "PlaceholderOS", count: 0, asOf: "2099-01-01" }],
    ]),
  );
  assert.deepEqual(out.map((e) => e.cve), ["CVE-2099-0003", "CVE-2099-0004", "CVE-2099-0001"]);
  assert.deepEqual(out[0].why, ["az-actor"]);
  assert.deepEqual(out[0].actors.map((a) => a.id), ["groupx"], "an uncited actor is never printed");
  assert.equal(out[1].exposure?.count, 12);
});

test("azCounts and apiBody say null for an unreadable section, [] for an empty one", () => {
  const board: AzBoard = {
    generatedAt: "2099-01-08T12:00:00.000Z",
    campaigns: { ok: true, rows: [] },
    claims7d: 0,
    adversaries: { ok: false, rows: [] },
    adversariesWithheld: 0,
    exposure: { ok: true, rows: [] },
    exploits: { ok: true, rows: [] },
    exploitsDay: "2099-01-08",
    iocs: null,
  };
  const c = azCounts(board);
  assert.equal(c.campaigns_7d, 0);
  assert.equal(c.claims_7d, 0);
  assert.equal(c.adversaries, null);
  const body = apiBody(board);
  assert.deepEqual(body.campaigns_7d, []);
  assert.equal(body.adversaries, null);
  assert.deepEqual(body.exploited_now, { snapshot: "2099-01-08", rows: [] });
  assert.match(String(body.note), /CLAIMS/);
});
