import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  getLatestSnapshot,
  getTotalsTrend,
  type RiskyService,
} from "@/lib/exposure";
import { ExposureLookup } from "@/components/ExposureLookup";

export const revalidate = 3600; // snapshot changes weekly; hourly ISR is ample

export const metadata: Metadata = {
  title: "Ekspozisiya — Azərbaycan hücum səthi",
  description:
    "Azərbaycanda internetə açıq host-ların həftəlik Shodan mənzərəsi: açıq RDP/SMB/Telnet, verilənlər bazaları və ICS/SCADA portları.",
};

const CATEGORY_LABEL: Record<string, string> = {
  "remote-access": "Uzaqdan giriş",
  database: "Verilənlər bazası",
  "ics-scada": "ICS / SCADA",
};

// remote-access + ICS read as the sharper risks; databases next.
const CATEGORY_ACCENT: Record<string, string> = {
  "remote-access": "text-accent-critical",
  "ics-scada": "text-accent-serious",
  database: "text-accent-warning",
};
const CATEGORY_BAR: Record<string, string> = {
  "remote-access": "bg-accent-critical",
  "ics-scada": "bg-accent-serious",
  database: "bg-accent-warning",
};

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Baku",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function groupByCategory(services: RiskyService[]) {
  const order = ["remote-access", "database", "ics-scada"];
  const groups = new Map<string, RiskyService[]>();
  for (const s of services) {
    if (!groups.has(s.category)) groups.set(s.category, []);
    groups.get(s.category)!.push(s);
  }
  return order
    .filter((c) => groups.has(c))
    .map((c) => ({
      category: c,
      items: groups.get(c)!.sort((a, b) => b.count - a.count),
    }));
}

export default async function ExposurePage() {
  const snap = await getLatestSnapshot();
  const trend = await getTotalsTrend();

  if (!snap) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-20">
          <h1 className="font-headline text-3xl text-ink-primary">
            Ekspozisiya
          </h1>
          <p className="mt-6 text-ink-secondary">
            İlk həftəlik snapshot hazırlanır. Tezliklə burada olacaq.
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  const grouped = groupByCategory(snap.risky_services);
  const maxRisky = Math.max(1, ...snap.risky_services.map((s) => s.count));
  const trendMax = Math.max(1, ...trend.map((t) => t.total));
  const regional = [...(snap.regional ?? [])].sort((a, b) => b.rdp - a.rdp);
  const maxRdp = Math.max(1, ...regional.map((r) => r.rdp));
  const cities = snap.cities ?? [];
  const maxCity = Math.max(1, ...cities.map((c) => c.count));

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-14 sm:py-20">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent-critical">
          Canlı yoxlama · Shodan
        </p>
        <h1 className="mt-3 font-headline text-3xl sm:text-4xl text-ink-primary text-balance">
          İnternetə açıq ekspozisiya
        </h1>
        <p className="mt-4 max-w-xl leading-relaxed text-ink-secondary">
          İstənilən public IP-nin internetə nə göstərdiyini yoxlayın — açıq
          portlar və məlum CVE-lər. Aşağıda isə bütün Azərbaycanın həftəlik
          hücum səthi mənzərəsi.
        </p>

        <div className="mt-8">
          <ExposureLookup />
        </div>

        {/* national snapshot */}
        <p className="mt-16 font-mono text-xs uppercase tracking-[0.2em] text-accent-critical">
          Azərbaycan · milli mənzərə
        </p>

        {/* headline number */}
        <div className="mt-6 border-y border-hairline py-8">
          <div className="font-mono text-5xl sm:text-6xl text-ink-primary tabular-nums">
            {snap.total_hosts.toLocaleString("en-US")}
          </div>
          <div className="mt-2 font-mono text-xs uppercase tracking-widest text-ink-muted">
            açıq host · {snap.country} · {fmtDate(new Date(snap.swept_at).toISOString())}
          </div>
        </div>

        {/* risky services by category */}
        <section className="mt-12 space-y-10">
          {grouped.map(({ category, items }) => (
            <div key={category}>
              <h2
                className={`font-mono text-xs uppercase tracking-[0.18em] ${
                  CATEGORY_ACCENT[category] ?? "text-ink-secondary"
                }`}
              >
                {CATEGORY_LABEL[category] ?? category}
              </h2>
              <div className="mt-4 space-y-2.5">
                {items.map((s) => (
                  <div key={s.port} className="flex items-center gap-3">
                    <div className="w-28 shrink-0 text-sm text-ink-primary">
                      {s.label}
                    </div>
                    <div className="w-16 shrink-0 font-mono text-[11px] text-ink-muted">
                      :{s.port}
                    </div>
                    <div className="flex-1 h-2 rounded-sm bg-surface-raised overflow-hidden">
                      <div
                        className={`h-full ${CATEGORY_BAR[category] ?? "bg-ink-muted"}`}
                        style={{ width: `${Math.max(2, (s.count / maxRisky) * 100)}%` }}
                      />
                    </div>
                    <div className="w-16 shrink-0 text-right font-mono text-sm text-ink-primary tabular-nums">
                      {s.count.toLocaleString("en-US")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* regional comparison */}
        {regional.length > 0 && (
          <section className="mt-16">
            <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-accent-critical">
              Regional müqayisə · açıq RDP
            </h2>
            <p className="mt-3 max-w-xl text-sm text-ink-secondary">
              Uzaqdan masaüstü (RDP, port 3389) — ransomware üçün ən çox istifadə
              olunan giriş nöqtəsi. Azərbaycan qonşuları ilə müqayisədə internetə
              açıq RDP host sayı.
            </p>
            <div className="mt-5 space-y-3.5">
              {regional.map((r) => {
                const isAz = r.code === "AZ";
                return (
                  <div key={r.code}>
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-24 shrink-0 text-sm ${
                          isAz ? "text-accent-critical font-medium" : "text-ink-secondary"
                        }`}
                      >
                        {r.name}
                      </div>
                      <div className="flex-1 h-2 rounded-sm bg-surface-raised overflow-hidden">
                        <div
                          className={`h-full ${isAz ? "bg-accent-critical" : "bg-ink-muted/50"}`}
                          style={{ width: `${Math.max(2, (r.rdp / maxRdp) * 100)}%` }}
                        />
                      </div>
                      <div
                        className={`w-16 shrink-0 text-right font-mono text-sm tabular-nums ${
                          isAz ? "text-accent-critical" : "text-ink-primary"
                        }`}
                      >
                        {r.rdp.toLocaleString("en-US")}
                      </div>
                    </div>
                    <div className="ml-24 pl-3 mt-1 font-mono text-[10px] text-ink-muted">
                      SMB {r.smb.toLocaleString("en-US")} · Telnet{" "}
                      {r.telnet.toLocaleString("en-US")}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* by city */}
        {cities.length > 0 && (
          <section className="mt-14">
            <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-ink-secondary">
              Şəhərlər üzrə açıq host
            </h2>
            <div className="mt-4 space-y-2">
              {cities.slice(0, 8).map((c) => (
                <div key={c.city} className="flex items-center gap-3">
                  <div className="w-28 shrink-0 text-sm text-ink-secondary truncate">
                    {c.city}
                  </div>
                  <div className="flex-1 h-1.5 rounded-sm bg-surface-raised overflow-hidden">
                    <div
                      className="h-full bg-accent-good/60"
                      style={{ width: `${Math.max(1, (c.count / maxCity) * 100)}%` }}
                    />
                  </div>
                  <div className="w-16 shrink-0 text-right font-mono text-xs text-ink-primary tabular-nums">
                    {c.count.toLocaleString("en-US")}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* orgs + products */}
        <section className="mt-14 grid gap-10 sm:grid-cols-2">
          <div>
            <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-ink-secondary">
              Ən çox açıq operator
            </h2>
            <ul className="mt-4 space-y-2">
              {snap.top_orgs.slice(0, 8).map((o) => (
                <li key={o.org} className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-ink-secondary truncate">{o.org}</span>
                  <span className="font-mono text-xs text-ink-primary tabular-nums shrink-0">
                    {o.count.toLocaleString("en-US")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-ink-secondary">
              Ən çox görünən məhsul
            </h2>
            <ul className="mt-4 space-y-2">
              {snap.top_products.slice(0, 8).map((p) => (
                <li key={p.product} className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-ink-secondary truncate">{p.product}</span>
                  <span className="font-mono text-xs text-ink-primary tabular-nums shrink-0">
                    {p.count.toLocaleString("en-US")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* trend */}
        <section className="mt-14">
          <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-ink-secondary">
            Həftəlik trend — açıq host sayı
          </h2>
          {trend.length < 2 ? (
            <p className="mt-4 text-sm text-ink-muted">
              Trend həftələr keçdikcə formalaşır — hazırda {trend.length} snapshot.
            </p>
          ) : (
            <div className="mt-5 flex items-end gap-1.5 h-28">
              {trend.map((t) => (
                <div key={t.swept_at} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full flex items-end justify-center h-24">
                    <div
                      className="w-full max-w-6 rounded-sm bg-accent-good/70"
                      style={{ height: `${Math.max(3, (t.total / trendMax) * 100)}%` }}
                      title={`${fmtDate(t.swept_at)}: ${t.total.toLocaleString("en-US")}`}
                    />
                  </div>
                  <span className="font-mono text-[9px] text-ink-muted">
                    {fmtDate(t.swept_at).slice(0, 6)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="mt-14 pt-8 border-t border-hairline font-mono text-xs text-ink-muted leading-relaxed">
          Mənbə: Shodan <span className="text-ink-secondary">/shodan/host/count</span> (country:AZ),
          həftəlik. Aqreqat saylar — fərdi IP açıqlanmır. Academic API-də vuln
          filtri olmadığı üçün bu, CVE yox, ekspozisiya mənzərəsidir.
        </p>
      </main>
      <Footer />
    </div>
  );
}
