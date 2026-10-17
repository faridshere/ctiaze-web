import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

// Titles and quotes the engine cut at a fixed length must print whole words,
// and an ellipsis only after a full stop. The three titles are real dispatches
// as stored on 2026-10-17 (wire no. 1100 is the first).
register("./ts-ext-loader.mjs", import.meta.url);
const { clipWords, endWhole, titleWasCut, wholeQuote, wholeTitle } = await import("../lib/format.ts");
const { cleanQuote } = await import("../lib/citations.ts");
const { toStory } = await import("../lib/types.ts");

const VERIFIE =
  "BeyondTrust CVE-2026-102764 actively exploited—patch now • BlockStrap RCE on Magento/Commerce (08936e4) • LearnPress CVSS 9.8 PHP injection flaw (CVE-2026-104736) 4 sources verifie";
const VERIFIE_BODY = `${VERIFIE}d · hackingallthethings.com #infosec #threatintel #cybersecurity #Vulnerability #BeyondTrust`;
const DIGEST =
  "Daily IT Security Digest — 2026-10-17 An authenticated remote code execution vulnerability in Palo Alto Networks PAN-OS (CVE-2026-0322) is being exploited in the wild. The attack t";
const GHSA =
  "GHSA-pw5q-rjx4-7f7p: Arcane: Delegated users:update permission allows admin account takeover via password reset (no privilege-hiera";

// The rule the page keeps: no ellipsis unless a sentence just ended.
function ellipsisOnlyAfterStop(s: string) {
  for (const m of s.matchAll(/…/g)) assert.match(s.slice(0, m.index), /[.!?]["'”’)\]]* $/, `ellipsis not at a sentence end: ${s}`);
}

test("the real cut titles sit at the engine's cut lengths; ordinary ones do not", () => {
  assert.equal(VERIFIE.length, 180);
  assert.ok(titleWasCut(VERIFIE));
  assert.ok(titleWasCut(DIGEST));
  assert.ok(titleWasCut(GHSA));
  assert.ok(!titleWasCut("GHSA-xv7q-fvmc-jx96: Vikunja: OIDC email-fallback account linking ignores email_verified, enabling local-account takeover"));
  assert.ok(!titleWasCut("North Korean IT Workers Used Stolen US Identities to Earn $3 Million"));
  assert.ok(!titleWasCut(`CVE-2026-1234: ${"x".repeat(89)}`));
  assert.ok(titleWasCut(`CVE-2026-1234: ${"word ".repeat(18)}`));
});

test("wire no. 1100 no longer ends in 'verifie'", () => {
  const out = wholeTitle(VERIFIE, VERIFIE_BODY);
  assert.equal(out, "BeyondTrust CVE-2026-102764 actively exploited—patch now • BlockStrap RCE on Magento/Commerce (08936e4) • LearnPress CVSS 9.8 PHP injection flaw (CVE-2026-104736) 4 sources");
  ellipsisOnlyAfterStop(out);
});

test("a cut title with a full sentence in it ends on that sentence, with the ellipsis after the stop", () => {
  const out = wholeTitle(DIGEST);
  assert.ok(out.endsWith("is being exploited in the wild. …"), out);
  ellipsisOnlyAfterStop(out);
});

test("a cut advisory title loses the partial word and the bracket it left open", () => {
  assert.equal(
    wholeTitle(GHSA),
    "GHSA-pw5q-rjx4-7f7p: Arcane: Delegated users:update permission allows admin account takeover via password reset",
  );
});

test("when the body shows the cut fell between words, the last word stays", () => {
  // 180 characters that end exactly on a whole word, followed by more body text.
  const title = `${"leak ".repeat(35)}noted`;
  assert.equal(title.length, 180);
  assert.ok(wholeTitle(title, `${title} files, the post says.`).endsWith(" noted"));
  // the same title with nothing to read past the cut is taken as cut mid-word
  assert.ok(!wholeTitle(title).endsWith("noted"));
});

test("a title the engine did not cut is printed exactly as stored", () => {
  const t = "Microsoft Patches Critical Exchange Flaw Used in Attacks";
  assert.equal(wholeTitle(t, "unrelated body"), t);
});

test("toStory carries the whole-word title to every surface; the slug is unchanged", () => {
  const s = toStory({ _id: "url:7dc42bacf99c9fa4", title: VERIFIE, summary: VERIFIE_BODY, url: "https://bsky.app/x", source: "bsky" });
  assert.ok(s.titleEn.endsWith("4 sources"));
  assert.ok(s.slug.startsWith("7dc42bacf99c-"));
});

test("a quote the engine cut at 400 ends whole; one under 400 is untouched", () => {
  const sentence = "The group exploited the flaw to gain initial access to edge devices. ";
  const q400 = sentence.repeat(10).slice(1, 401); // ends mid-word: "… access to e"
  assert.equal(q400.length, 400);
  const out = wholeQuote(q400);
  assert.ok(out.endsWith("edge devices. …"), out);
  // the engine's 400th character can be a space: still a cut, still ends on the sentence
  const atSpace = sentence.repeat(10).slice(0, 400); // ends "… access to "
  assert.ok(wholeQuote(atSpace).endsWith("edge devices. …"));
  ellipsisOnlyAfterStop(out);
  const short = "APT28 has used CVE-2015-4902 to bypass security features";
  assert.equal(wholeQuote(short), short);
});

test("a quote with no sentence end past the cap ends on a whole word, with no ellipsis", () => {
  const q = "operators chained the gateway bug with a credential replay against exposed management interfaces across ministries and banks".repeat(5);
  const out = wholeQuote(q, 120);
  assert.ok(!out.includes("…"));
  assert.ok(q.startsWith(out));
  assert.ok(/\w$/.test(out) && q[out.length] === " ", `cut inside a word: ${out}`);
  assert.ok(!/\s(?:the|and|with|a)$/.test(out));
});

test("cleanQuote: the page cap ends on whole words, the API (no cap) keeps the stored quote", () => {
  const q = `${"word ".repeat(120)}fragme`;
  const page = cleanQuote(q)!;
  assert.ok(!page.endsWith("fragme") && !page.includes("…"));
  assert.ok(page.length <= 480);
  const stored = "w".repeat(10) + " ".concat("x".repeat(389));
  assert.equal(cleanQuote(stored, Infinity), stored);
});

test("endWhole never returns an ellipsis after a fragment", () => {
  for (const s of [VERIFIE, DIGEST, GHSA, "One. Two three fo", "No stop at all in this cut tex"]) ellipsisOnlyAfterStop(endWhole(s));
});

test("clipWords caps share text and OG titles on whole words", () => {
  const brief = "APT28 is a Russian state-sponsored group attributed to GRU unit 26165. It has targeted governments, militaries and security organisations across Europe and the Caucasus since at least 2004";
  const out = clipWords(brief, 120);
  assert.equal(out, "APT28 is a Russian state-sponsored group attributed to GRU unit 26165. …");
  const long = "Ransomware crew lists a regional logistics operator and posts what it says are internal invoices and payroll exports from the breach";
  const og = clipWords(long, 100, 40);
  assert.ok(long.startsWith(og) && long[og.length] === " " && !og.includes("…"), og);
  assert.equal(clipWords("Short and whole", 140), "Short and whole");
});
