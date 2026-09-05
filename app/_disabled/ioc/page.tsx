import type { Metadata } from "next";
import { Header } from "@/components/_disabled/Header";
import { Footer } from "@/components/_disabled/Footer";
import { ThreatLookup } from "@/components/_disabled/ThreatLookup";
import { NewsIocFeed } from "@/components/_disabled/NewsIocFeed";
import { infraBoard, lookupThreatFox, type TfKind } from "@/lib/threatfox";
import { getIocFeed, groupIocsByType } from "@/lib/_disabled/iocfeed";
import type { IocType } from "@/lib/ioc";
import { getLocale } from "@/lib/_disabled/i18n-server";
import { localizedMeta } from "@/lib/_disabled/seo";

const IOC_WINDOW = 150;

function tfKindOf(t: IocType): TfKind | null {
  if (t === "ipv4") return "ip";
  if (t === "domain") return "domain";
  if (t === "url") return "url";
  if (t === "sha256" || t === "sha1" || t === "md5") return "hash";
  return null;
}

export const revalidate = 3600; // the board refreshes ~2×/hour; the lib caches 1h

export async function generateMetadata(
): Promise<Metadata> {
  const en = (await getLocale()) === "en";
  return localizedMeta({
    path: "/ioc", en,
    azTitle: "IOC / CVE yoxlama — təhdid reputasiyası",
    enTitle: "IOC / CVE lookup — threat reputation",
    azDesc: "İstənilən IP, domen, URL, hash və ya CVE-ni yoxlayın: abuse.ch ThreatFox reputasiyası, CISA KEV aktiv istismar statusu, FIRST EPSS və NVD triage-i.",
    enDesc: "Check any IP, domain, URL, hash or CVE: abuse.ch ThreatFox reputation, CISA KEV active-exploitation status, FIRST EPSS and NVD triage.",
  });
}

const THREAT_LABEL: Record<string, string> = {
  botnet_cc: "Botnet C2", payload_delivery: "Yük çatdırılması",
  payload: "Zərərli yük", malware_download: "Malware endirmə",
};
const THREAT_LABEL_EN: Record<string, string> = {
  botnet_cc: "Botnet C2", payload_delivery: "Payload delivery",
  payload: "Payload", malware_download: "Malware download",
};

function defang(kind: string, v: string): string {
  if (kind === "hash") return v;
  return v.replace(/\./g, "[.]");
}

export default async function IocPage() {
  const en = (await getLocale()) === "en";
  const [board, iocFeed] = await Promise.all([infraBoard(12), getIocFeed(IOC_WINDOW).catch(() => [])]);
  const example = board?.samples.find((s) => s.kind === "ip" || s.kind === "domain")?.ioc;
  const maxFam = Math.max(1, ...(board?.families.map((f) => f.count) ?? [1]));

  // Cross-check each news indicator against the live ThreatFox feed (shared cached
  // index — the first call builds it, the rest are in-memory lookups).
  const liveChecks = await Promise.all(
    iocFeed.map(async (i) => {
      const k = tfKindOf(i.type);
      if (!k) return null;
      const hits = await lookupThreatFox(i.value, k).catch(() => []);
      return hits.length ? `${i.type}:${i.value.toLowerCase()}` : null;
    })
  );
  const liveSet = new Set(liveChecks.filter((x): x is string => x !== null));
  const iocGroups = groupIocsByType(iocFeed);

  return (
    <div className="ops min-h-screen flex flex-col">
      <Header />
      <main id="main" className="flex-1 mx-auto w-full max-w-3xl px-4 py-14 sm:py-20">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand">
          {en ? "Live check · abuse.ch · CISA KEV · NVD" : "Canlı yoxlama · abuse.ch · CISA KEV · NVD"}
        </p>
        <h1 className="mt-3 font-headline text-3xl sm:text-4xl text-ink-primary text-balance">
          {en ? "IOC and CVE lookup" : "IOC və CVE yoxlama"}
        </h1>
        <p className="mt-4 max-w-xl leading-relaxed text-ink-secondary">
          {en ? "Paste any indicator — an IP, domain, URL, file hash or CVE. For IP/domain/URL/hash you get abuse.ch ThreatFox reputation (with the malware family behind it); for a CVE, CISA KEV exploitation status, FIRST EPSS probability and NVD detail." : "Bir indikator yapışdırın — IP, domen, URL, fayl hash-i və ya CVE. IP/domen/URL/hash üçün abuse.ch ThreatFox reputasiyası (arxasındakı zərərli proqram ailəsi ilə), CVE üçün CISA KEV aktiv istismar statusu, FIRST EPSS ehtimalı və NVD təfərrüatı."}
        </p>

        <div className="mt-8">
          <ThreatLookup exampleIndicator={example} />
        </div>

        {/* Zone 2 — every indicator the wire carried, linked to its briefings */}
        <NewsIocFeed
          groups={iocGroups}
          total={iocFeed.length}
          window={IOC_WINDOW}
          liveSet={liveSet}
          locale={en ? "en" : "az"}
        />

        {/* Live malicious-infrastructure board — from the same keyless ThreatFox
            feed, so it's always populated. This is the "what's active right now"
            picture behind the lookup. */}
        {board && (
          <>
            <p className="mt-16 font-mono text-xs uppercase tracking-[0.2em] text-brand">
              {en ? "Live malicious infrastructure · abuse.ch" : "Canlı zərərli infrastruktur · abuse.ch"}
            </p>
            <div className="mt-6 border-y border-hairline py-6">
              <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
                <div className="font-mono text-4xl sm:text-5xl text-ink-primary tabular-nums">
                  {board.total.toLocaleString("en-US")}
                </div>
                <span className="pb-1 font-mono text-xs uppercase tracking-widest text-ink-muted">
                  {en ? "active indicators" : "aktiv indikator"}{board.ageHours != null ? (en ? ` · updated ~${board.ageHours}h ago` : ` · ~${board.ageHours}s əvvəl yeniləndi`) : ""}
                </span>
              </div>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-secondary">
                {en
                  ? "Active threat infrastructure tracked worldwide right now — C2 servers, malicious domains and payload hashes. The lookup above runs against exactly this list."
                  : "Hazırda dünya üzrə izlənilən aktiv təhdid infrastrukturu — C2 serverləri, zərərli domenlər və yük hash-ləri. Yuxarıdakı yoxlama məhz bu siyahıya qarşı işləyir."}
              </p>
            </div>

            {/* top malware families */}
            <section className="mt-10">
              <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-accent-critical">
                {en ? "Most active malware families" : "Ən aktiv zərərli proqram ailələri"}
              </h2>
              <div className="mt-4 space-y-2.5">
                {board.families.map((f) => (
                  <div key={f.name} className="flex items-center gap-3">
                    <div className="w-40 shrink-0 truncate text-sm text-ink-primary" title={f.name}>
                      {f.name}
                    </div>
                    <div className="flex-1 h-2 rounded-sm bg-surface-raised overflow-hidden">
                      <div
                        className="h-full bg-accent-critical/70"
                        style={{ width: `${Math.max(2, (f.count / maxFam) * 100)}%` }}
                      />
                    </div>
                    <div className="w-14 shrink-0 text-right font-mono text-sm text-ink-primary tabular-nums">
                      {f.count.toLocaleString("en-US")}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* threat-type mix */}
            {board.threatTypes.length > 0 && (
              <section className="mt-10">
                <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-ink-secondary">
                  {en ? "Threat types" : "Təhdid növləri"}
                </h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {board.threatTypes.map((t) => (
                    <span
                      key={t.name}
                      className="rounded-sm border border-hairline px-2.5 py-1 font-mono text-[11px] text-ink-secondary"
                    >
                      {(en ? THREAT_LABEL_EN : THREAT_LABEL)[t.name] || t.name}
                      <span className="ml-1.5 text-ink-muted tabular-nums">{t.count}</span>
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* fresh C2 samples — defanged */}
            <section className="mt-10">
              <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-accent-serious">
                {en ? "Latest C2 indicators" : "Ən son C2 indikatorları"}
              </h2>
              <p className="mt-2 text-[13px] text-ink-muted">
                {en
                  ? "Defanged — not clickable. Paste into the lookup above to investigate."
                  : "Defang edilib — kliklənə bilməz. Araşdırma üçün yuxarıdakı yoxlamaya yapışdırın."}
              </p>
              <div className="mt-4 border-y border-hairline">
                {board.samples.map((s, i) => (
                  <div
                    key={`${s.ioc}-${i}`}
                    className="flex items-center justify-between gap-4 border-t border-hairline py-2.5 first:border-t-0"
                  >
                    <span className="font-mono text-[12px] text-ink-secondary break-all">
                      {defang(s.kind, s.ioc)}
                      {s.port != null ? <span className="text-ink-muted">:{s.port}</span> : null}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-ink-muted">{s.malware}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        <p className="mt-14 pt-8 border-t border-hairline font-mono text-xs text-ink-muted leading-relaxed">
          {en ? (
            <>Sources: abuse.ch <span className="text-ink-secondary">ThreatFox</span> (keyless active-indicator
            export), CISA <span className="text-ink-secondary">KEV</span>, FIRST{" "}
            <span className="text-ink-secondary">EPSS</span>, NIST{" "}
            <span className="text-ink-secondary">NVD</span>, geo via{" "}
            <span className="text-ink-secondary">ipwho.is</span>. «Not listed» does not mean «safe».</>
          ) : (
            <>Mənbələr: abuse.ch <span className="text-ink-secondary">ThreatFox</span> (açarsız aktiv-indikator
            eksportu), CISA <span className="text-ink-secondary">KEV</span>, FIRST{" "}
            <span className="text-ink-secondary">EPSS</span>, NIST{" "}
            <span className="text-ink-secondary">NVD</span>, geo üçün{" "}
            <span className="text-ink-secondary">ipwho.is</span>. «Siyahıda deyil» «təhlükəsiz» demək deyil.</>
          )}
        </p>
      </main>
      <Footer />
    </div>
  );
}
