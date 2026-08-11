"use client";

import { useState } from "react";
import { useLocale } from "./locale";

type Vuln = { cve: string; kev: boolean; epss: number | null };
type Identity = {
  country?: string; countryCode?: string; city?: string;
  asn?: string; org?: string; isp?: string; abuse?: string;
};
type Reputation = {
  malware: string;
  threatType: string;
  confidence: number;
  firstSeen?: string | null;
  reference?: string | null;
} | null;
type Result = {
  ip: string;
  own: boolean;
  resolvedFrom?: string;
  verdict: "malicious" | "exposed" | "visible" | "invisible";
  found: boolean;
  reputation?: Reputation;
  ports: number[];
  vulns: Vuln[];
  kevCount: number;
  hostnames: string[];
  tags: string[];
  cpes: string[];
  identity: Identity;
};

// A handful of high-signal ports get a plain-language risk hint (PO: name which
// ports and what they mean, so the result reads as a verdict not a dump).
const PORT_HINT: Record<number, string> = {
  21: "FTP", 22: "SSH", 23: "Telnet — şifrəsiz, təhlükəli", 25: "SMTP",
  53: "DNS", 80: "HTTP", 110: "POP3", 143: "IMAP", 443: "HTTPS",
  445: "SMB — lateral/ransomware", 1433: "MSSQL — DB açıq", 3306: "MySQL — DB açıq",
  3389: "RDP — ransomware №1 giriş qapısı", 5432: "PostgreSQL — DB açıq",
  5900: "VNC — uzaq masaüstü", 6379: "Redis — çox vaxt auth-suz",
  9200: "Elasticsearch — data sızması", 27017: "MongoDB — çox vaxt auth-suz",
  161: "SNMP", 502: "Modbus — ICS/SCADA", 102: "S7 — ICS/SCADA",
};
const PORT_HINT_EN: Record<number, string> = {
  21: "FTP", 22: "SSH", 23: "Telnet — plaintext, risky", 25: "SMTP",
  53: "DNS", 80: "HTTP", 110: "POP3", 143: "IMAP", 443: "HTTPS",
  445: "SMB — lateral/ransomware", 1433: "MSSQL — DB exposed", 3306: "MySQL — DB exposed",
  3389: "RDP — ransomware's #1 entry point", 5432: "PostgreSQL — DB exposed",
  5900: "VNC — remote desktop", 6379: "Redis — often auth-less",
  9200: "Elasticsearch — data leak", 27017: "MongoDB — often auth-less",
  161: "SNMP", 502: "Modbus — ICS/SCADA", 102: "S7 — ICS/SCADA",
};
const THREAT_LABEL: Record<string, string> = {
  botnet_cc: "Botnet C2", payload_delivery: "Zərərli yük çatdırılması",
  payload: "Zərərli yük", malware_download: "Malware endirmə",
};
const THREAT_LABEL_EN: Record<string, string> = {
  botnet_cc: "Botnet C2", payload_delivery: "Payload delivery",
  payload: "Payload", malware_download: "Malware download",
};

const EXAMPLES = ["45.33.32.156", "scanme.nmap.org"];

export function ExposureLookup() {
  const en = useLocale() === "en";
  const [ip, setIp] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  async function run(target: string, own: boolean) {
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const r = await fetch(`/api/lookup${own ? "" : `?ip=${encodeURIComponent(target)}`}`);
      const data = await r.json();
      if (!r.ok) setError(data.error || (en ? "Something went wrong" : "Xəta baş verdi"));
      else setResult(data as Result);
    } catch {
      setError(en ? "Network error — try again" : "Şəbəkə xətası — yenidən cəhd edin");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-md border border-hairline bg-surface-raised/40 p-5 sm:p-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (ip.trim()) run(ip.trim(), false);
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <input
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          placeholder={en ? "IP or domain — e.g. 45.33.32.156 or company.com" : "IP və ya domen — məs. 45.33.32.156 və ya sirket.az"}
          aria-label={en ? "IP address or domain" : "IP ünvanı və ya domen"}
          className="flex-1 rounded-sm border border-hairline bg-surface px-3.5 py-2.5 font-mono text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand focus:outline-none"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading || !ip.trim()}
            className="rounded-sm bg-brand px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-widest text-[#07110e] transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {en ? "Check" : "Yoxla"}
          </button>
          <button
            type="button"
            onClick={() => run("", true)}
            disabled={loading}
            className="rounded-sm border border-hairline px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-ink-secondary transition-colors hover:border-ink-secondary hover:text-ink-primary disabled:opacity-40"
          >
            {en ? "My IP" : "Öz IP-mi"}
          </button>
        </div>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-ink-muted">
        <span>{en ? "examples:" : "nümunə:"}</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => { setIp(ex); run(ex, false); }}
            className="text-brand hover:underline"
          >
            {ex}
          </button>
        ))}
      </div>
      <p className="mt-2 font-mono text-[11px] text-ink-muted">
        {en ? "For any IP/domain: who owns it (ASN/operator), internet-exposed ports and known CVEs (ranked by KEV/EPSS)." : "Hər IP/domen üçün: kimə aiddir (ASN/operator), internetə açıq portlar və məlum CVE-lər (KEV/EPSS ilə sıralı)."}
      </p>

      {loading && (
        <p role="status" className="mt-5 font-mono text-xs text-ink-secondary">
          <span className="text-accent-good">●</span> {en ? "checking…" : "yoxlanılır…"}
        </p>
      )}
      {error && <p role="alert" className="mt-5 font-mono text-xs text-accent-critical">{error}</p>}
      {result && !loading && <ResultView r={result} />}
    </div>
  );
}

const RING: Record<string, string> = {
  malicious: "border-accent-critical/60 bg-accent-critical/10",
  invisible: "border-accent-good/40 bg-accent-good/5",
  visible: "border-accent-warning/40 bg-accent-warning/5",
  exposed: "border-accent-critical/40 bg-accent-critical/5",
};
const DOT: Record<string, string> = {
  malicious: "text-accent-critical", invisible: "text-accent-good",
  visible: "text-accent-warning", exposed: "text-accent-critical",
};
const VERDICT_AZ: Record<string, { title: string; sub: string }> = {
  malicious: { title: "Zərərli infrastruktur — abuse.ch", sub: "Bu ünvan hazırda aktiv təhdid infrastrukturu kimi qeydə alınıb. Ekspozisiyadan asılı olmayaraq, bu ünvana etibar etməyin." },
  invisible: { title: "İnternetdən görünmür ✓", sub: "Bu ünvanda internetə açıq servis aşkarlanmadı — bu yaxşı əlamətdir." },
  visible: { title: "İnternetdən görünür", sub: "Açıq portlar var, amma məlum CVE göstərilmir. Nəyin açıq olduğunu yoxlayın." },
  exposed: { title: "İnternetə açıq — zəifliklər var", sub: "Açıq portlar və məlum CVE-lər aşkarlandı. Aşağıda ən təhlükəlilər üstdə." },
};
const VERDICT_EN: Record<string, { title: string; sub: string }> = {
  malicious: { title: "Malicious infrastructure — abuse.ch", sub: "This address is currently logged as active threat infrastructure. Regardless of exposure, don't trust it." },
  invisible: { title: "Not visible from the internet ✓", sub: "No internet-exposed services detected on this address — a good sign." },
  visible: { title: "Visible from the internet", sub: "Open ports exist, but no known CVE is shown. Check what's open." },
  exposed: { title: "Internet-exposed — vulnerabilities present", sub: "Open ports and known CVEs detected. The most dangerous are on top below." },
};

function ResultView({ r }: { r: Result }) {
  const en = useLocale() === "en";
  const v = { ...(en ? VERDICT_EN : VERDICT_AZ)[r.verdict], ring: RING[r.verdict], dot: DOT[r.verdict] };
  const id = r.identity || {};
  const hasId = id.country || id.asn || id.org || id.isp;
  return (
    <div className="mt-6 border-t border-hairline pt-5">
      {/* header line */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-sm text-ink-primary">{r.ip}</span>
        {r.resolvedFrom && (
          <span className="font-mono text-[11px] text-ink-muted">← {r.resolvedFrom}</span>
        )}
        {r.own && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-accent-good">{en ? "your IP" : "sizin IP"}</span>
        )}
        {r.hostnames.length > 0 && (
          <span className="font-mono text-xs text-ink-muted truncate">{r.hostnames.slice(0, 2).join(", ")}</span>
        )}
      </div>

      {/* verdict banner */}
      <div className={`mt-4 rounded-md border ${v.ring} px-4 py-3`}>
        <div className="flex items-center gap-2">
          <span className={v.dot}>●</span>
          <span className="font-semibold text-ink-primary">{v.title}</span>
        </div>
        <p className="mt-1 text-[13.5px] text-ink-secondary">{v.sub}</p>
      </div>

      {/* reputation — a known-malicious hit, the strongest signal */}
      {r.reputation && (
        <div className="mt-4 rounded-md border border-accent-critical/40 bg-accent-critical/[0.04] px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold text-ink-primary">{r.reputation.malware}</span>
            {r.reputation.threatType && (
              <span className="rounded-sm border border-hairline px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-accent-serious">
                {(en ? THREAT_LABEL_EN : THREAT_LABEL)[r.reputation.threatType] || r.reputation.threatType}
              </span>
            )}
            <span className="ml-auto font-mono text-[11px] text-ink-muted tabular-nums">
              {r.reputation.confidence}% {en ? "confidence" : "əminlik"}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-ink-muted">
            {r.reputation.firstSeen && <span>{en ? "first seen" : "ilk görünüş"} {r.reputation.firstSeen.slice(0, 10)}</span>}
            {r.reputation.reference && (
              <a href={r.reputation.reference} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                {en ? "abuse.ch source" : "abuse.ch mənbə"} ↗
              </a>
            )}
          </div>
        </div>
      )}

      {/* identity card — always present, so a "clean" IP still says something */}
      {hasId && (
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border border-hairline bg-surface px-4 py-3 sm:grid-cols-4">
          <Field k={en ? "Country" : "Ölkə"} v={[id.city, id.country].filter(Boolean).join(", ") || id.countryCode} />
          <Field k="ASN" v={id.asn} />
          <Field k={en ? "Operator" : "Operator"} v={id.org || id.isp} />
          <Field k="Abuse" v={id.abuse} mono />
        </div>
      )}

      {/* ports */}
      {r.ports.length > 0 && (
        <div className="mt-5">
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
            {en ? "Open ports" : "Açıq portlar"} · {r.ports.length}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {r.ports.map((p) => {
              const hint = (en ? PORT_HINT_EN : PORT_HINT)[p];
              return (
              <span
                key={p}
                className="rounded-sm border border-hairline px-2 py-0.5 font-mono text-[11px] tabular-nums text-ink-secondary"
                title={hint || ""}
              >
                {p}{hint ? <span className="text-ink-muted"> · {hint}</span> : null}
              </span>
            );})}
          </div>
        </div>
      )}

      {/* CVEs — triaged, KEV first */}
      {r.vulns.length > 0 && (
        <div className="mt-5">
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
            {en ? "Known CVEs" : "Məlum CVE-lər"} · <span className="text-accent-critical">{r.vulns.length}</span>
            {r.kevCount > 0 && (
              <span className="ml-2 text-accent-critical">· {r.kevCount} KEV {en ? "(actively exploited)" : "(aktiv istismar)"}</span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {r.vulns.slice(0, 40).map((x) => (
              <a
                key={x.cve}
                href={`https://nvd.nist.gov/vuln/detail/${x.cve}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`rounded-sm border px-2 py-0.5 font-mono text-[11px] tabular-nums transition-colors ${
                  x.kev
                    ? "border-accent-critical bg-accent-critical/15 text-accent-critical font-semibold"
                    : "border-accent-critical/40 bg-accent-critical/5 text-accent-critical hover:bg-accent-critical/10"
                }`}
                title={x.epss != null ? `EPSS ${(x.epss * 100).toFixed(1)}%${en ? " exploit probability" : " istismar ehtimalı"}` : ""}
              >
                {x.kev ? "⚡ " : ""}{x.cve}
                {x.epss != null && x.epss >= 0.1 ? (
                  <span className="ml-1 text-accent-critical/70">{(x.epss * 100).toFixed(0)}%</span>
                ) : null}
              </a>
            ))}
          </div>
          {r.vulns.length > 40 && (
            <p className="mt-1.5 font-mono text-[11px] text-ink-muted">+{r.vulns.length - 40} {en ? "more" : "daha"}</p>
          )}
          <p className="mt-2 font-mono text-[10px] text-ink-muted">
            {en ? "⚡ = CISA KEV (actively exploited) · % = EPSS exploit probability" : "⚡ = CISA KEV (aktiv istismar olunur) · % = EPSS istismar ehtimalı"}
          </p>
        </div>
      )}

      {r.tags.length > 0 && (
        <div className="mt-5">
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">{en ? "Tags" : "Tag-lar"}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {r.tags.map((t) => (
              <span key={t} className="rounded-sm border border-hairline px-2 py-0.5 font-mono text-[11px] text-ink-secondary">{t}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ k, v, mono }: { k: string; v?: string; mono?: boolean }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">{k}</div>
      <div className={`mt-0.5 text-[13px] text-ink-primary break-words ${mono ? "font-mono text-[12px]" : ""}`}>
        {v || "—"}
      </div>
    </div>
  );
}
