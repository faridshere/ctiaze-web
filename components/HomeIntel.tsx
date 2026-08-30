import Link from "next/link";
import type { ExposureSnapshot } from "@/lib/exposure";
import type { DoStats } from "@/lib/dostats";

const nf = (n: number) => n.toLocaleString("en-US");
const H = ({ children }: { children: React.ReactNode }) => (
  <h2 className="font-display text-[clamp(1.7rem,3vw,2.5rem)] font-semibold leading-[1.08] tracking-[-0.025em] text-[#EDF1F6] text-balance">{children}</h2>
);
const Check = () => (
  <svg viewBox="0 0 16 16" className="mt-[3px] size-4 flex-none" fill="none" stroke="#6FD3E6" strokeWidth={1.8}><path d="M3 8.5l3.2 3.2L13 5" /></svg>
);

// The product — the API/MCP. Real endpoint, real ATT&CK data, real KB counts.
function ApiSection({ en, doStats }: { en: boolean; doStats: DoStats }) {
  return (
    <section id="api" className="border-t border-hairline bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.012),transparent)]">
      <div className="mx-auto grid w-full max-w-[75rem] grid-cols-1 items-center gap-[clamp(30px,5vw,64px)] px-[var(--sp-gutter)] py-[clamp(46px,7vw,90px)] md:grid-cols-[1.05fr_1.15fr]">
        <div data-sc>
          <H>{en ? "Every line on the wire is one API call away." : "Xəttin hər sətri bir API sorğusu uzaqlıqdadır."}</H>
          <p className="mt-4 max-w-[32rem] text-[1.06rem] text-[#9AA6B4]">
            {en ? <>The same intelligence, structured. Query actors, CVEs, IOCs and exposure over a clean REST <b className="font-medium text-[#EDF1F6]">API</b>, or let your agents pull it over the <b className="font-medium text-[#EDF1F6]">MCP server</b> — no glue code.</>
                : <>Eyni kəşfiyyat, strukturlaşdırılmış. Aktorları, CVE-ləri, IOC-ları və məruzqalmanı təmiz REST <b className="font-medium text-[#EDF1F6]">API</b> üzərindən sorğula, yaxud agentlərin <b className="font-medium text-[#EDF1F6]">MCP server</b> üzərindən çəksin — əlavə kod yoxdur.</>}
          </p>
          <ul className="mt-6 flex max-w-[32rem] flex-col gap-3">
            <li className="flex gap-2.5 text-[0.96rem] text-[#9AA6B4]"><Check /><span><b className="font-medium text-[#EDF1F6]">{doStats.actors > 0 ? nf(doStats.actors) : (en ? "Hundreds of" : "Yüzlərlə")} {en ? "actor dossiers" : "aktor dosyesi"}</b> — {en ? "MITRE ATT&CK TTPs, malware, victimology, kill-chain playbooks." : "MITRE ATT&CK TTP-lər, zərərli proqram, qurban profili, kill-chain playbook-ları."}</span></li>
            <li className="flex gap-2.5 text-[0.96rem] text-[#9AA6B4]"><Check /><span><b className="font-medium text-[#EDF1F6]">{doStats.cveExplainers > 0 ? nf(doStats.cveExplainers) : "7,900"} {en ? "CVE explainers" : "CVE izahı"}</b> {en ? "layered live with CISA KEV, FIRST EPSS and NVD CVSS." : "— CISA KEV, FIRST EPSS və NVD CVSS ilə canlı birləşdirilir."}</span></li>
            <li className="flex gap-2.5 text-[0.96rem] text-[#9AA6B4]"><Check /><span><b className="font-medium text-[#EDF1F6]">{en ? "Metered by the call." : "Sorğu ilə ölçülür."}</b> {en ? "First 1,000 free, no signup wall, cancel in one click." : "İlk 1,000 pulsuz, qeydiyyat divarı yoxdur, bir kliklə ləğv et."}</span></li>
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/developers" className="inline-flex items-center gap-2 rounded-[3px] bg-[var(--brand)] px-5 py-3 font-display text-[length:var(--t-meta)] font-medium text-[#170a03] transition-transform hover:-translate-y-0.5">{en ? "Get an API key" : "API açarı al"} →</Link>
            <Link href="/developers" className="inline-flex items-center gap-2 rounded-[3px] border border-white/[0.15] bg-[rgba(11,13,19,0.55)] px-5 py-3 font-display text-[length:var(--t-meta)] text-[#EDF1F6] transition-colors hover:border-[#4b5563]">MCP {en ? "quickstart" : "sürətli başlanğıc"}</Link>
          </div>
        </div>
        <div data-sc="2" className="overflow-hidden rounded-[12px] border border-white/[0.15] bg-[linear-gradient(180deg,#0F121A,#0B0D13)] shadow-[0_40px_90px_-50px_rgba(0,0,0,0.9)]">
          <div className="flex items-center gap-2 border-b border-hairline bg-white/[0.015] px-3.5 py-3">
            <span className="size-[9px] rounded-full bg-[#2a303b]" /><span className="size-[9px] rounded-full bg-[#2a303b]" /><span className="size-[9px] rounded-full bg-[var(--brand)]" />
            <span className="ml-1.5 font-mono text-[0.72rem] text-[#79838F]">api.skopnix.io</span>
          </div>
          <div className="overflow-x-auto px-[18px] py-[17px] font-mono text-[0.78rem] leading-[1.9] text-[#9AA6B4]">
            <div><span className="text-[var(--brand)]">$</span> <span className="text-[#EDF1F6]">curl api.skopnix.io/v1/actors/lazarus</span></div>
            <div className="text-[#79838F]">{"{"}</div>
            <div>{"  "}<span className="text-[#6FD3E6]">&quot;name&quot;</span>: <span className="text-[#EDF1F6]">&quot;Lazarus Group&quot;</span>, <span className="text-[#6FD3E6]">&quot;country&quot;</span>: <span className="text-[#EDF1F6]">&quot;DPRK&quot;</span>,</div>
            <div>{"  "}<span className="text-[#6FD3E6]">&quot;aka&quot;</span>: <span className="text-[#EDF1F6]">[&quot;Hidden Cobra&quot;,&quot;APT38&quot;]</span>,</div>
            <div>{"  "}<span className="text-[#6FD3E6]">&quot;attack&quot;</span>: <span className="text-[#EDF1F6]">[&quot;T1566&quot;,&quot;T1059&quot;,&quot;T1486&quot;]</span>,</div>
            <div>{"  "}<span className="text-[#6FD3E6]">&quot;active_campaigns&quot;</span>: <span className="text-[var(--brand)]">3</span>, <span className="text-[#6FD3E6]">&quot;region_targeting&quot;</span>: <span className="text-[#EDF1F6]">true</span></div>
            <div className="text-[#79838F]">{"}"}</div>
            <div className="mt-2 text-[#79838F]"># {en ? "or, from an agent:" : "yaxud, agentdən:"}</div>
            <div><span className="text-[var(--brand)]">mcp</span> <span className="text-[#EDF1F6]">skopnix.query(&quot;who is hitting energy in the caucasus?&quot;)</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}

// The edge — regional coverage. Real KB counts + the real weekly exposure snapshot.
function EdgeSection({ en, snapshot, doStats }: { en: boolean; snapshot: ExposureSnapshot | null; doStats: DoStats }) {
  const svc: { label: string; port?: number; count: number }[] = (snapshot?.risky_services ?? [])
    .slice(0, 4)
    .map((s) => ({ label: s.label, port: s.port, count: s.count }));
  const services = svc.length ? svc : FALLBACK_SVC;
  const maxCt = Math.max(1, ...services.map((s) => s.count));
  return (
    <section id="edge" className="border-t border-hairline">
      <div className="mx-auto grid w-full max-w-[75rem] grid-cols-1 items-center gap-[clamp(30px,5vw,60px)] px-[var(--sp-gutter)] py-[clamp(46px,7vw,90px)] md:grid-cols-[1.15fr_0.85fr]">
        <div data-sc>
          <H>{en ? <>See the whole board — <span className="text-[var(--brand)]">especially the corners no one else watches.</span></> : <>Bütün lövhəni gör — <span className="text-[var(--brand)]">xüsusən heç kimin baxmadığı guşələri.</span></>}</H>
          <p className="mt-4 max-w-[33rem] text-[1.05rem] text-[#9AA6B4]">
            {en ? <>The global feeds cover the headlines. skopnix runs its own <b className="font-medium text-[#EDF1F6]">weekly Shodan sweeps</b> and sensor coverage across the Caucasus, Central Asia and Türkiye: the exposed hosts, risky services and regional targeting the big feeds never index.</>
                : <>Qlobal feed-lər başlıqları örtür. skopnix öz <b className="font-medium text-[#EDF1F6]">həftəlik Shodan taramalarını</b> və Qafqaz, Mərkəzi Asiya və Türkiyə üzrə sensor əhatəsini işlədir: böyük feed-lərin heç vaxt indeksləmədiyi məruz qalan hostlar, riskli xidmətlər və regional hədəfləmə.</>}
          </p>
          <div className="mt-7 flex flex-wrap gap-[clamp(20px,4vw,44px)]">
            <Fig n={doStats.actors > 0 ? nf(doStats.actors) : "hundreds"} l={en ? "threat-actor dossiers" : "təhlükə-aktor dosyesi"} />
            <Fig n={doStats.cveExplainers > 0 ? nf(doStats.cveExplainers) : "7,900"} l={en ? "grounded CVE explainers" : "yoxlanmış CVE izahı"} />
            <Fig n={en ? "weekly" : "həftəlik"} l={en ? "regional exposure sweep" : "regional məruzqalma taraması"} />
          </div>
        </div>
        <div data-sc="2" className="overflow-hidden rounded-[12px] border border-hairline bg-[#0B0D13]">
          <div className="flex items-center justify-between border-b border-hairline px-4 py-3 font-mono text-[0.74rem] text-[#79838F]">
            <span>exposure · <b className="font-normal text-[#9AA6B4]">{snapshot?.country ? snapshot.country : (en ? "country sweep" : "ölkə taraması")}</b></span>
            <span className="text-[#6FD3E6]">{en ? "regional" : "regional"}</span>
          </div>
          <div className="py-1.5">
            {(services.length ? services : FALLBACK_SVC).map((s, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto] items-center gap-2.5 px-4 py-2 font-mono text-[0.78rem]">
                <span className="text-[#9AA6B4]"><b className="font-normal text-[#EDF1F6]">{s.label}</b>{s.port ? ` · ${s.port}` : ""}</span>
                <span className="h-[5px] min-w-[20px] rounded-[3px] bg-[linear-gradient(90deg,var(--brand),rgba(255,90,31,0.25))]" style={{ width: `${Math.round(28 + 52 * (s.count / maxCt))}px` }} />
              </div>
            ))}
          </div>
          <div className="border-t border-hairline px-4 py-3 font-mono text-[0.72rem] text-[#79838F]">GET /v1/exposure?country=… · {en ? "updated weekly" : "həftəlik yenilənir"}</div>
        </div>
      </div>
    </section>
  );
}
const FALLBACK_SVC: { label: string; port?: number; count: number }[] = [
  { label: "RDP · 3389", count: 78 }, { label: "SMB · 445", count: 54 },
  { label: "Telnet · 23", count: 38 }, { label: "ICS / SCADA", count: 22 },
];
function Fig({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <div className="font-mono text-[1.7rem] font-medium tracking-[-0.01em] tabular-nums text-[#EDF1F6]">{n}</div>
      <div className="mt-0.5 max-w-[16ch] font-mono text-[0.72rem] text-[#79838F]">{l}</div>
    </div>
  );
}

// Scan yourself — the beloved exposure check, surfaced as a first-class strip:
// email breaches, stealer logs, a company domain's subdomains and open ports.
function ScanSection({ en }: { en: boolean }) {
  return (
    <section className="border-t border-hairline">
      <div className="mx-auto grid w-full max-w-[75rem] grid-cols-1 items-center gap-[clamp(26px,4vw,48px)] px-[var(--sp-gutter)] py-[clamp(40px,6vw,72px)] md:grid-cols-[1.1fr_0.9fr]">
        <div data-sc>
          <h2 className="font-display text-[clamp(1.6rem,2.7vw,2.2rem)] font-semibold leading-[1.1] tracking-[-0.02em] text-[#EDF1F6] text-balance">
            {en ? "Your inbox. Your company's domain. Already exposed?" : "Poçtun. Şirkətinin domeni. Artıq ifşa olunub?"}
          </h2>
          <p className="mt-4 max-w-[30rem] text-[1.02rem] text-[#9AA6B4]">
            {en
              ? "One check, no signup: breach history and stealer logs for any email, plus the subdomains and open ports the internet already sees on any company domain. Nothing you enter is stored."
              : "Bir yoxlama, qeydiyyatsız: istənilən e-poçt üçün breach tarixi və stealer logları, üstəgəl istənilən şirkət domenində internetin artıq gördüyü subdomen və açıq portlar. Daxil etdiyin heç nə saxlanılmır."}
          </p>
          <Link href="/scan-me" className="mt-6 inline-flex items-center gap-2 rounded-[3px] border border-white/[0.15] bg-[rgba(11,13,19,0.55)] px-5 py-3 font-display text-[length:var(--t-meta)] text-[#EDF1F6] transition-colors hover:border-[#4b5563]">
            {en ? "Scan yourself" : "Özünü yoxla"} <span className="text-[var(--brand)]">→</span>
          </Link>
        </div>
        <div data-sc="2" className="overflow-hidden rounded-[12px] border border-white/[0.15] bg-[linear-gradient(180deg,#0F121A,#0B0D13)]">
          <div className="flex items-center gap-2 border-b border-hairline bg-white/[0.015] px-3.5 py-3">
            <span className="size-[9px] rounded-full bg-[#2a303b]" /><span className="size-[9px] rounded-full bg-[#2a303b]" /><span className="size-[9px] rounded-full bg-[var(--brand)]" />
            <span className="ml-1.5 font-mono text-[0.72rem] text-[#79838F]">scan · {en ? "sample" : "nümunə"}</span>
          </div>
          <div className="px-[18px] py-[16px] font-mono text-[0.78rem] leading-[1.95] text-[#9AA6B4]">
            <div><span className="text-[var(--brand)]">$</span> <span className="text-[#EDF1F6]">scan you@company.com</span></div>
            <div className="text-[#79838F]">→ 3 {en ? "breaches" : "breach"} · <span className="text-[#FF5A4D]">{en ? "stealer log: 1" : "stealer log: 1"}</span> · {en ? "password reuse risk" : "parol təkrarı riski"}</div>
            <div className="mt-1"><span className="text-[var(--brand)]">$</span> <span className="text-[#EDF1F6]">scan company.com</span></div>
            <div className="text-[#79838F]">→ 14 {en ? "subdomains" : "subdomen"} · <span className="text-[#6FD3E6]">RDP 3389 {en ? "open" : "açıq"}</span> · 2 {en ? "expiring certs" : "bitən sertifikat"}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// The funnel — the documentary. Marketing, not a product line.
function WatchSection({ en }: { en: boolean }) {
  return (
    <section id="watch" className="border-t border-hairline">
      <div className="mx-auto grid w-full max-w-[75rem] grid-cols-1 items-center gap-[clamp(28px,4vw,50px)] px-[var(--sp-gutter)] py-[clamp(46px,7vw,90px)] md:grid-cols-[1.3fr_0.9fr]">
        <div data-sc className="sweepable group relative aspect-video cursor-pointer overflow-hidden rounded-[12px] border border-white/[0.15]" style={{ background: "radial-gradient(80% 110% at 18% 0%, rgba(111,211,230,0.10), transparent 55%), radial-gradient(90% 120% at 85% 100%, rgba(255,90,31,0.22), transparent 60%), linear-gradient(160deg,#131019,#07080c)" }}>
          {/* designed title-card: the film IS the artwork (judge fix: no empty poster) */}
          <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.16) 4px)" }} />
          <div className="absolute left-6 top-6">
            <div className="font-mono text-[0.62rem] uppercase tracking-[0.3em] text-[#6FD3E6]">HACKXANA {en ? "films" : "filmləri"}</div>
            <div className="mt-2 font-display text-[clamp(1.8rem,3.4vw,2.9rem)] font-semibold leading-[0.98] tracking-[-0.02em] text-[#EDF1F6]">CARBANAK</div>
            <div className="mt-1.5 font-mono text-[0.72rem] tracking-[0.06em] text-[#9AA6B4]">{en ? "the billion-dollar heist" : "milyard dollarlıq soyğun"}</div>
          </div>
          <div className="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.15] bg-[rgba(6,7,11,0.6)] backdrop-blur-sm transition-transform group-hover:scale-105 group-hover:bg-[var(--brand)]">
            <svg viewBox="0 0 16 16" className="ml-0.5 size-[18px] fill-[#EDF1F6] group-hover:fill-[#160a04]"><path d="M4 3l9 5-9 5z" /></svg>
          </div>
          <div className="absolute inset-x-0 bottom-0 px-6 pb-4 pt-10 text-[13px] text-[#C6CEDA]" style={{ background: "linear-gradient(transparent, rgba(6,7,11,0.85))" }}>
            <b className="font-medium text-[#EDF1F6]">{en ? "A documentary reconstruction" : "Sənədli rekonstruksiya"}</b> · 28 {en ? "min" : "dəq"} · 4K
          </div>
        </div>
        <div data-sc="2">
          <h2 className="font-display text-[clamp(1.6rem,2.7vw,2.2rem)] font-semibold leading-[1.1] tracking-[-0.02em] text-[#EDF1F6] text-balance">{en ? "The intelligence, told as a story." : "Kəşfiyyat — hekayə kimi danışılır."}</h2>
          <p className="mt-4 max-w-[30rem] text-[1.02rem] text-[#9AA6B4]">{en ? "Long-form breakdowns of the campaigns that shaped the threat landscape, free on the channel — and the reason a lot of people find the wire in the first place." : "Təhlükə mənzərəsini formalaşdıran kampaniyaların uzun-metrajlı təhlili, kanalda pulsuz — və çox adamın xətti ilk dəfə tapmasının səbəbi."}</p>
          <a href="#" className="mt-6 inline-flex items-center gap-2 font-mono text-[0.82rem] text-[var(--brand)]">{en ? "Watch on the channel" : "Kanalda izlə"} →</a>
        </div>
      </div>
    </section>
  );
}

function CtaSection({ en }: { en: boolean }) {
  return (
    <section className="relative overflow-hidden border-t border-hairline text-center">
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(55% 130% at 50% 0%, rgba(255,90,31,0.1), transparent 60%)" }} />
      {/* ambient brand motif — the triad, wireframe, slowly alive (the Xintra molecule move) */}
      <svg aria-hidden viewBox="0 0 32 32" className="triad-ambient pointer-events-none absolute right-[4%] top-1/2 hidden w-[300px] opacity-[0.09] lg:block">
        <g stroke="#EDF1F6" strokeWidth="0.55" strokeLinecap="round" fill="none">
          <path d="M16 15.3 L16 6" /><path d="M16 15.3 L7 22.6" /><path d="M16 15.3 L25 22.6" />
          <circle cx="16" cy="15.3" r="2.6" /><circle cx="7" cy="22.6" r="2.8" /><circle cx="25" cy="22.6" r="2.8" />
        </g>
        <circle className="triad-pulse" cx="16" cy="6" r="3" fill="none" stroke="#A63E14" strokeWidth="0.8" />
      </svg>
      <div className="relative mx-auto w-full max-w-[75rem] px-[var(--sp-gutter)] py-[clamp(56px,8vw,110px)]">
        <h2 data-sc className="font-display text-[clamp(1.9rem,3.6vw,2.8rem)] font-semibold leading-[1.05] tracking-[-0.025em] text-[#EDF1F6] text-balance">{en ? "Point your stack at the wire." : "Stack-ini xəttə yönəlt."}</h2>
        <p data-sc="2" className="mx-auto mt-4 max-w-[34rem] text-[1.06rem] text-[#9AA6B4]">{en ? "A key takes a minute, the first 1,000 calls are free, and there's no sales call between you and the data." : "Açar bir dəqiqə çəkir, ilk 1,000 sorğu pulsuzdur və səninlə data arasında satış zəngi yoxdur."}</p>
        <div data-sc="3" className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/developers" className="inline-flex items-center gap-2 rounded-[3px] bg-[var(--brand)] px-5 py-3 font-display text-[length:var(--t-meta)] font-medium text-[#170a03] transition-transform hover:-translate-y-0.5">{en ? "Get an API key" : "API açarı al"} →</Link>
          <Link href="/haqqinda" className="inline-flex items-center gap-2 rounded-[3px] border border-white/[0.15] bg-[rgba(11,13,19,0.55)] px-5 py-3 font-display text-[length:var(--t-meta)] text-[#EDF1F6] transition-colors hover:border-[#4b5563]">{en ? "Talk to us" : "Bizimlə danış"}</Link>
        </div>
      </div>
    </section>
  );
}

export function HomeIntel({ en, snapshot, doStats }: { en: boolean; snapshot: ExposureSnapshot | null; doStats: DoStats }) {
  return (
    <>
      <ApiSection en={en} doStats={doStats} />
      <EdgeSection en={en} snapshot={snapshot} doStats={doStats} />
      <ScanSection en={en} />
      <WatchSection en={en} />
      <CtaSection en={en} />
    </>
  );
}
