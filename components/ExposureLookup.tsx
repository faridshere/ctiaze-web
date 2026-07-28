"use client";

import { useState } from "react";

type Result = {
  ip: string;
  own: boolean;
  found: boolean;
  ports: number[];
  vulns: string[];
  hostnames: string[];
  tags: string[];
  cpes: string[];
};

export function ExposureLookup() {
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
      if (!r.ok) setError(data.error || "Xəta baş verdi");
      else setResult(data as Result);
    } catch {
      setError("Şəbəkə xətası — yenidən cəhd edin");
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
          placeholder="IP ünvanı — məs. 45.33.32.156"
          aria-label="IP ünvanı"
          className="flex-1 rounded-sm border border-hairline bg-surface px-3.5 py-2.5 font-mono text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand focus:outline-none"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading || !ip.trim()}
            className="rounded-sm bg-brand px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-widest text-[#07110e] transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Yoxla
          </button>
          <button
            type="button"
            onClick={() => run("", true)}
            disabled={loading}
            className="rounded-sm border border-hairline px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-ink-secondary transition-colors hover:border-ink-secondary hover:text-ink-primary disabled:opacity-40"
          >
            Öz IP-mi
          </button>
        </div>
      </form>

      <p className="mt-3 font-mono text-[11px] text-ink-muted">
        Shodan InternetDB — bir public IP-nin internetə nə göstərdiyini yoxlayın (açıq portlar, məlum CVE-lər).
      </p>

      {loading && (
        <p className="mt-5 font-mono text-xs text-ink-secondary">
          <span className="text-accent-good">●</span> yoxlanılır…
        </p>
      )}

      {error && (
        <p className="mt-5 font-mono text-xs text-accent-critical">{error}</p>
      )}

      {result && !loading && <ResultView r={result} />}
    </div>
  );
}

function Chips({ items, tone }: { items: (string | number)[]; tone: "muted" | "crit" }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {items.map((x) => (
        <span
          key={String(x)}
          className={`rounded-sm border px-2 py-0.5 font-mono text-[11px] tabular-nums ${
            tone === "crit"
              ? "border-accent-critical/40 bg-accent-critical/10 text-accent-critical"
              : "border-hairline text-ink-secondary"
          }`}
        >
          {x}
        </span>
      ))}
    </div>
  );
}

function ResultView({ r }: { r: Result }) {
  return (
    <div className="mt-6 border-t border-hairline pt-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-sm text-ink-primary">{r.ip}</span>
        {r.own && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-accent-good">
            sizin IP
          </span>
        )}
        {r.hostnames.length > 0 && (
          <span className="font-mono text-xs text-ink-muted truncate">
            {r.hostnames.slice(0, 2).join(", ")}
          </span>
        )}
      </div>

      {!r.found ? (
        <p className="mt-4 text-sm text-ink-secondary">
          Shodan bu IP üçün heç nə görmür — açıq servis aşkarlanmadı (təmiz və ya
          skan edilməyib).
        </p>
      ) : (
        <div className="mt-4 space-y-5">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
              Açıq portlar · {r.ports.length}
            </div>
            {r.ports.length ? (
              <Chips items={[...r.ports].sort((a, b) => a - b)} tone="muted" />
            ) : (
              <p className="mt-1 text-sm text-ink-muted">yoxdur</p>
            )}
          </div>

          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
              Məlum CVE-lər ·{" "}
              <span className={r.vulns.length ? "text-accent-critical" : ""}>
                {r.vulns.length}
              </span>
            </div>
            {r.vulns.length ? (
              <>
                <Chips items={r.vulns.slice(0, 40)} tone="crit" />
                {r.vulns.length > 40 && (
                  <p className="mt-1.5 font-mono text-[11px] text-ink-muted">
                    +{r.vulns.length - 40} daha
                  </p>
                )}
              </>
            ) : (
              <p className="mt-1 text-sm text-ink-muted">
                Shodan bu host-a bağlı məlum CVE göstərmir.
              </p>
            )}
          </div>

          {r.tags.length > 0 && (
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
                Tag-lar
              </div>
              <Chips items={r.tags} tone="muted" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
