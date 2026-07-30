import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ThreatLookup } from "@/components/ThreatLookup";
import { infraBoard } from "@/lib/threatfox";

export const revalidate = 1800; // the board refreshes ~2×/hour; the lib caches 1h

export const metadata: Metadata = {
  title: "IOC / CVE yoxlama — təhdid reputasiyası",
  description:
    "İstənilən IP, domen, URL, hash və ya CVE-ni yoxlayın: abuse.ch ThreatFox reputasiyası, CISA KEV aktiv istismar statusu, FIRST EPSS və NVD triage-i.",
};

const THREAT_LABEL: Record<string, string> = {
  botnet_cc: "Botnet C2", payload_delivery: "Yük çatdırılması",
  payload: "Zərərli yük", malware_download: "Malware endirmə",
};

function defang(kind: string, v: string): string {
  if (kind === "hash") return v;
  return v.replace(/\./g, "[.]");
}

export default async function IocPage() {
  const board = await infraBoard(12);
  const example = board?.samples.find((s) => s.kind === "ip" || s.kind === "domain")?.ioc;
  const maxFam = Math.max(1, ...(board?.families.map((f) => f.count) ?? [1]));

  return (
    <div className="ops min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-14 sm:py-20">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand">
          Canlı yoxlama · abuse.ch · CISA KEV · NVD
        </p>
        <h1 className="mt-3 font-headline text-3xl sm:text-4xl text-ink-primary text-balance">
          IOC və CVE yoxlama
        </h1>
        <p className="mt-4 max-w-xl leading-relaxed text-ink-secondary">
          Bir indikator yapışdırın — IP, domen, URL, fayl hash-i və ya CVE. IP/domen/URL/hash
          üçün abuse.ch ThreatFox reputasiyası (arxasındakı zərərli proqram ailəsi ilə), CVE
          üçün CISA KEV aktiv istismar statusu, FIRST EPSS ehtimalı və NVD təfərrüatı.
        </p>

        <div className="mt-8">
          <ThreatLookup exampleIndicator={example} />
        </div>

        {/* Live malicious-infrastructure board — from the same keyless ThreatFox
            feed, so it's always populated. This is the "what's active right now"
            picture behind the lookup. */}
        {board && (
          <>
            <p className="mt-16 font-mono text-xs uppercase tracking-[0.2em] text-brand">
              Canlı zərərli infrastruktur · abuse.ch
            </p>
            <div className="mt-6 border-y border-hairline py-6">
              <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
                <div className="font-mono text-4xl sm:text-5xl text-ink-primary tabular-nums">
                  {board.total.toLocaleString("en-US")}
                </div>
                <span className="pb-1 font-mono text-xs uppercase tracking-widest text-ink-muted">
                  aktiv indikator{board.ageHours != null ? ` · ~${board.ageHours}s əvvəl yeniləndi` : ""}
                </span>
              </div>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-secondary">
                Hazırda dünya üzrə izlənilən aktiv təhdid infrastrukturu — C2 serverləri,
                zərərli domenlər və yük hash-ləri. Yuxarıdakı yoxlama məhz bu siyahıya qarşı işləyir.
              </p>
            </div>

            {/* top malware families */}
            <section className="mt-10">
              <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-accent-critical">
                Ən aktiv zərərli proqram ailələri
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
                  Təhdid növləri
                </h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {board.threatTypes.map((t) => (
                    <span
                      key={t.name}
                      className="rounded-sm border border-hairline px-2.5 py-1 font-mono text-[11px] text-ink-secondary"
                    >
                      {THREAT_LABEL[t.name] || t.name}
                      <span className="ml-1.5 text-ink-muted tabular-nums">{t.count}</span>
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* fresh C2 samples — defanged */}
            <section className="mt-10">
              <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-accent-serious">
                Ən son C2 indikatorları
              </h2>
              <p className="mt-2 text-[13px] text-ink-muted">
                Defang edilib — kliklənə bilməz. Araşdırma üçün yuxarıdakı yoxlamaya yapışdırın.
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
          Mənbələr: abuse.ch <span className="text-ink-secondary">ThreatFox</span> (açarsız aktiv-indikator
          eksportu), CISA <span className="text-ink-secondary">KEV</span>, FIRST{" "}
          <span className="text-ink-secondary">EPSS</span>, NIST{" "}
          <span className="text-ink-secondary">NVD</span>, geo üçün{" "}
          <span className="text-ink-secondary">ipwho.is</span>. «Siyahıda deyil» «təhlükəsiz» demək deyil.
        </p>
      </main>
      <Footer />
    </div>
  );
}
