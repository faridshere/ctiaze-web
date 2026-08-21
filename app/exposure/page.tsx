import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  getLatestSnapshot,
  getTotalsTrend,
  type RiskyService,
} from "@/lib/exposure";
import { ExposureLookup } from "@/components/ExposureLookup";
import { getLocale } from "@/lib/i18n-server";
import { localizedMeta } from "@/lib/seo";
import { AZ_MONTHS } from "@/lib/format";

export const revalidate = 3600; // snapshot changes weekly; hourly ISR is ample

export async function generateMetadata(
  { searchParams }: { searchParams: Promise<{ dil?: string }> },
): Promise<Metadata> {
  const en = (await getLocale()) === "en";
  const dil = (await searchParams)?.dil;
  return localizedMeta({
    path: "/exposure", dil, en,
    azTitle: "Ekspozisiya — Azərbaycan hücum səthi",
    enTitle: "Exposure — Azerbaijan's attack surface",
    azDesc: "Azərbaycanda internetə açıq host-ların həftəlik Shodan mənzərəsi: açıq RDP/SMB/Telnet, verilənlər bazaları və ICS/SCADA portları.",
    enDesc: "A weekly Shodan picture of internet-exposed hosts in Azerbaijan: open RDP/SMB/Telnet, databases and ICS/SCADA ports.",
  });
}

const CATEGORY_LABEL: Record<string, string> = {
  "remote-access": "Uzaqdan giriş",
  database: "Verilənlər bazası",
  "ics-scada": "ICS / SCADA",
};
const CATEGORY_LABEL_EN: Record<string, string> = {
  "remote-access": "Remote access",
  database: "Databases",
  "ics-scada": "ICS / SCADA",
};
// The snapshot stores names/notes in Azerbaijani; these override to English for
// the fixed, known sets (regional neighbours by ISO code, the SOC watchlist,
// the main AZ cities). Unknown values fall back to the stored (AZ) string.
const REGION_EN: Record<string, string> = {
  AZ: "Azerbaijan", TR: "Turkey", IR: "Iran", RU: "Russia", GE: "Georgia", AM: "Armenia",
};
const CITY_EN: Record<string, string> = {
  "Bakı": "Baku", "Sumqayıt": "Sumqayit", "Gəncə": "Ganja", "Naxçıvan": "Nakhchivan",
  "Mingəçevir": "Mingachevir", "Şirvan": "Shirvan", "Xırdalan": "Khirdalan", "Şəki": "Shaki",
};
const WATCHLIST_EN: { match: string; name: string; note: string }[] = [
  { match: "mikrotik", name: "MikroTik RouterOS", note: "Mass-exploited router OS (Winbox, botnets)" },
  { match: "fortigate", name: "FortiGate SSL-VPN", note: "Persistent KEV, a ransomware entry point" },
  { match: "exchange", name: "Microsoft Exchange", note: "ProxyShell / ProxyLogon — APT & ransomware target" },
  { match: "owa", name: "Outlook Web (OWA)", note: "Credential harvesting / password-spray target" },
  { match: "globalprotect", name: "Palo Alto GlobalProtect", note: "VPN portal — CVE-2024-3400 and other critical flaws" },
  { match: "rdp", name: "RDP — screen exposed", note: "Desktops exposing their screen directly to the internet" },
  { match: "esxi", name: "VMware ESXi", note: "Targeted by ESXiArgs ransomware campaigns" },
];
function watchlistEn(name: string) {
  const l = name.toLowerCase();
  return WATCHLIST_EN.find((w) => l.includes(w.match));
}

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

function fmtDate(iso: string, en = true): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Baku", day: "2-digit", month: en ? "short" : "numeric", year: "numeric",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const month = en ? get("month") : (AZ_MONTHS[parseInt(get("month"), 10) - 1] ?? "");
  return `${get("day")} ${month} ${get("year")}`;
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
  const en = (await getLocale()) === "en";
  const catLabel = en ? CATEGORY_LABEL_EN : CATEGORY_LABEL;
  const snap = await getLatestSnapshot();
  const trend = await getTotalsTrend();

  if (!snap) {
    return (
      <div className="ops min-h-screen flex flex-col">
        <Header />
        <main id="main" className="flex-1 mx-auto w-full max-w-2xl px-4 py-20">
          <h1 className="font-headline text-3xl text-ink-primary">
            {en ? "Exposure" : "Ekspozisiya"}
          </h1>
          <p className="mt-6 text-ink-secondary">
            {en ? "The first weekly snapshot is being prepared. It'll be here soon." : "İlk həftəlik snapshot hazırlanır. Tezliklə burada olacaq."}
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
  const watchlist = snap.watchlist ?? [];

  // Narrator — turn the bare headline into intel: week-over-week delta,
  // per-capita framing, and a one-line verdict. All from data already present.
  const prevTotal = trend.length >= 2 ? trend[trend.length - 2].total : null;
  const deltaAbs = prevTotal != null ? snap.total_hosts - prevTotal : null;
  const deltaPct = prevTotal ? (deltaAbs! / prevTotal) * 100 : null;
  const AZ_POP = 10_400_000; // ~2026 estimate
  const perCapita = snap.total_hosts > 0 ? Math.round(AZ_POP / snap.total_hosts) : null;
  const rdpCount =
    snap.risky_services.find((s) => s.port === 3389)?.count ??
    regional.find((r) => r.code === "AZ")?.rdp ??
    null;
  const trendWord = deltaAbs == null ? "" :
    en ? (deltaAbs > 0 ? "rose" : deltaAbs < 0 ? "fell" : "held steady")
       : (deltaAbs > 0 ? "artdı" : deltaAbs < 0 ? "azaldı" : "sabit qaldı");

  return (
    <div className="ops min-h-screen flex flex-col">
      <Header />
      <main id="main" className="flex-1 mx-auto w-full max-w-3xl px-4 py-14 sm:py-20">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand">
          {en ? "Live check · Shodan" : "Canlı yoxlama · Shodan"}
        </p>
        <h1 className="mt-3 font-headline text-3xl sm:text-4xl text-ink-primary text-balance">
          {en ? "Internet-exposed attack surface" : "İnternetə açıq ekspozisiya"}
        </h1>
        <p className="mt-4 max-w-xl leading-relaxed text-ink-secondary">
          {en
            ? "Check what any public IP shows to the internet — open ports and known CVEs. Below, the whole of Azerbaijan's weekly attack-surface picture."
            : "İstənilən public IP-nin internetə nə göstərdiyini yoxlayın — açıq portlar və məlum CVE-lər. Aşağıda isə bütün Azərbaycanın həftəlik hücum səthi mənzərəsi."}
        </p>

        <div className="mt-8">
          <ExposureLookup />
        </div>

        {/* national snapshot */}
        <p className="mt-16 font-mono text-xs uppercase tracking-[0.2em] text-brand">
          {en ? "Azerbaijan · national picture" : "Azərbaycan · milli mənzərə"}
        </p>

        {/* headline number + narrator */}
        <div className="mt-6 border-y border-hairline py-8">
          <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
            <div className="font-mono text-5xl sm:text-6xl text-ink-primary tabular-nums">
              {snap.total_hosts.toLocaleString("en-US")}
            </div>
            {deltaAbs != null && (
              <span
                className={`pb-1.5 font-mono text-sm ${
                  deltaAbs > 0 ? "text-accent-critical" : deltaAbs < 0 ? "text-accent-good" : "text-ink-muted"
                }`}
              >
                {deltaAbs > 0 ? "▲" : deltaAbs < 0 ? "▼" : "■"}{" "}
                {deltaAbs > 0 ? "+" : ""}{deltaAbs.toLocaleString("en-US")}
                {deltaPct != null && (
                  <span className="text-ink-muted"> ({deltaPct > 0 ? "+" : ""}{deltaPct.toFixed(1)}%)</span>
                )}
                <span className="text-ink-muted"> {en ? "vs last week" : "keçən həftə"}</span>
              </span>
            )}
          </div>
          <div className="mt-2 font-mono text-xs uppercase tracking-widest text-ink-muted">
            {en ? "exposed hosts" : "açıq host"} · {snap.country} · {fmtDate(new Date(snap.swept_at).toISOString(), en)}
          </div>
          {perCapita && (
            <div className="mt-1 font-mono text-[11px] text-ink-muted">
              {en
                ? `≈ 1 exposed host per ${perCapita.toLocaleString("en-US")} people (pop. ~10.4M)`
                : `≈ 1 açıq host hər ${perCapita.toLocaleString("en-US")} nəfərə (əhali ~10.4M)`}
            </div>
          )}
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-secondary">
            {en ? "This week the number of internet-exposed hosts in Azerbaijan " : "Bu həftə Azərbaycanda internetə açıq host sayı "}
            {deltaAbs != null ? (
              <>
                <span className={deltaAbs > 0 ? "text-accent-critical" : deltaAbs < 0 ? "text-accent-good" : ""}>
                  {trendWord}
                </span>
                {en
                  ? <> (from last week {deltaAbs > 0 ? "+" : ""}{deltaAbs.toLocaleString("en-US")}).</>
                  : <>{" "}(keçən həftədən {deltaAbs > 0 ? "+" : ""}{deltaAbs.toLocaleString("en-US")}).</>}
              </>
            ) : (
              en ? "is being tracked." : "izlənilir."
            )}
            {rdpCount != null && (
              en ? (
                <>
                  {" "}Of these <span className="text-accent-critical tabular-nums">{rdpCount.toLocaleString("en-US")}</span> are
                  open <span className="text-accent-critical">RDP</span> — ransomware&apos;s #1 entry point.
                </>
              ) : (
                <>
                  {" "}Bunlardan <span className="text-accent-critical tabular-nums">{rdpCount.toLocaleString("en-US")}</span>-i
                  açıq <span className="text-accent-critical">RDP</span> — ransomware-in №1 giriş qapısı.
                </>
              )
            )}
          </p>
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
                {catLabel[category] ?? category}
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

        {/* SOC watchlist */}
        {watchlist.length > 0 && (
          <section className="mt-16">
            <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-accent-serious">
              {en ? "SOC watchlist · mass-exploit targets" : "SOC izləmə siyahısı · kütləvi istismar hədəfləri"}
            </h2>
            <p className="mt-3 max-w-xl text-sm text-ink-secondary">
              {en
                ? "The perimeter technologies most exploited in APT and ransomware campaigns (VPN, mail, virtualization) — instances exposed to the internet in Azerbaijan. These are targets that appear again and again on the CISA KEV list."
                : "APT və ransomware kampaniyalarında ən çox istismar olunan perimetr texnologiyaları (VPN, mail, virtualizasiya) — Azərbaycanda internetə açıq nüsxələr. Bunlar CISA KEV siyahısında təkrar-təkrar görünən hədəflərdir."}
            </p>
            <div className="mt-5 border-y border-hairline">
              {watchlist.map((w) => (
                <div
                  key={w.name}
                  className="flex items-start justify-between gap-4 border-t border-hairline py-3.5 first:border-t-0"
                >
                  <div className="min-w-0">
                    <div className="text-sm text-ink-primary">{en ? (watchlistEn(w.name)?.name || w.name) : w.name}</div>
                    <div className="mt-0.5 text-[13px] leading-snug text-ink-muted">
                      {en ? (watchlistEn(w.name)?.note || w.note) : w.note}
                    </div>
                  </div>
                  <div className="shrink-0 whitespace-nowrap pt-0.5 text-right">
                    <span className="font-mono text-lg text-accent-serious tabular-nums">
                      {w.count.toLocaleString("en-US")}
                    </span>
                    <span className="ml-1 font-mono text-[10px] uppercase tracking-widest text-ink-muted">
                      {en ? "hosts" : "host"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* regional comparison */}
        {regional.length > 0 && (
          <section className="mt-16">
            <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-accent-critical">
              {en ? "Regional comparison · open RDP" : "Regional müqayisə · açıq RDP"}
            </h2>
            <p className="mt-3 max-w-xl text-sm text-ink-secondary">
              {en
                ? "Remote Desktop (RDP, port 3389) — the most-used entry point for ransomware. Internet-exposed RDP host count for Azerbaijan compared with its neighbours."
                : "Uzaqdan masaüstü (RDP, port 3389) — ransomware üçün ən çox istifadə olunan giriş nöqtəsi. Azərbaycan qonşuları ilə müqayisədə internetə açıq RDP host sayı."}
            </p>
            <div className="mt-5 space-y-3.5">
              {regional.map((r) => {
                const isAz = r.code === "AZ";
                return (
                  <div key={r.code}>
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-24 shrink-0 text-sm ${
                          isAz ? "text-brand font-medium" : "text-ink-secondary"
                        }`}
                      >
                        {en ? (REGION_EN[r.code] || r.name) : r.name}
                      </div>
                      <div className="flex-1 h-2 rounded-sm bg-surface-raised overflow-hidden">
                        <div
                          className={`h-full ${isAz ? "bg-brand" : "bg-ink-muted/50"}`}
                          style={{ width: `${Math.max(2, (r.rdp / maxRdp) * 100)}%` }}
                        />
                      </div>
                      <div
                        className={`w-16 shrink-0 text-right font-mono text-sm tabular-nums ${
                          isAz ? "text-brand" : "text-ink-primary"
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
              {en ? "Exposed hosts by city" : "Şəhərlər üzrə açıq host"}
            </h2>
            <div className="mt-4 space-y-2">
              {cities.slice(0, 8).map((c) => (
                <div key={c.city} className="flex items-center gap-3">
                  <div className="w-28 shrink-0 text-sm text-ink-secondary truncate">
                    {en ? (CITY_EN[c.city] || c.city) : c.city}
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
              {en ? "Most-exposed operators" : "Ən çox açıq operator"}
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
              {en ? "Most-seen products" : "Ən çox görünən məhsul"}
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
            {en ? "Weekly trend — exposed host count" : "Həftəlik trend — açıq host sayı"}
          </h2>
          {trend.length < 2 ? (
            <p className="mt-4 text-sm text-ink-muted">
              {en
                ? `The trend forms as weeks pass — currently ${trend.length} snapshot(s).`
                : `Trend həftələr keçdikcə formalaşır — hazırda ${trend.length} snapshot.`}
            </p>
          ) : (
            <div className="mt-5 flex items-end gap-1.5 h-28">
              {trend.map((t) => (
                <div key={t.swept_at} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full flex items-end justify-center h-24">
                    <div
                      className="w-full max-w-6 rounded-sm bg-accent-good/70"
                      style={{ height: `${Math.max(3, (t.total / trendMax) * 100)}%` }}
                      title={`${fmtDate(t.swept_at, en)}: ${t.total.toLocaleString("en-US")}`}
                    />
                  </div>
                  <span className="font-mono text-[9px] text-ink-muted">
                    {fmtDate(t.swept_at, en).slice(0, 6)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="mt-14 pt-8 border-t border-hairline font-mono text-xs text-ink-muted leading-relaxed">
          {en ? (
            <>Source: Shodan <span className="text-ink-secondary">/shodan/host/count</span> (country:AZ), weekly.
            Aggregate counts — no individual IP is disclosed. The academic API has no vuln filter, so this is an
            exposure picture, not a CVE view.</>
          ) : (
            <>Mənbə: Shodan <span className="text-ink-secondary">/shodan/host/count</span> (country:AZ),
            həftəlik. Aqreqat saylar — fərdi IP açıqlanmır. Academic API-də vuln filtri olmadığı üçün bu, CVE yox,
            ekspozisiya mənzərəsidir.</>
          )}
        </p>
      </main>
      <Footer />
    </div>
  );
}
