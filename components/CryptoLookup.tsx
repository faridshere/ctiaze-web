"use client";

import { useState } from "react";
import { useLocale } from "./locale";

type Result = {
  chain: string;
  chainName: string;
  symbol: string;
  address: string;
  found: boolean;
  is_contract?: boolean;
  balance?: number;
  balance_usd?: number;
  received?: number;
  received_usd?: number;
  spent?: number;
  spent_usd?: number;
  tx_count?: number;
  first_seen?: string | null;
  last_seen?: string | null;
};

const CHAINS = [
  ["bitcoin", "Bitcoin (BTC)"],
  ["ethereum", "Ethereum (ETH)"],
  ["litecoin", "Litecoin (LTC)"],
  ["dogecoin", "Dogecoin (DOGE)"],
  ["bitcoin-cash", "Bitcoin Cash (BCH)"],
];

function coin(n: number | undefined, sym: string): string {
  if (!n) return `0 ${sym}`;
  const s = n.toLocaleString("en-US", { maximumFractionDigits: 8 });
  return `${s} ${sym}`;
}
function usd(n: number | undefined): string {
  if (!n) return "$0";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
function dateOnly(s?: string | null): string {
  if (!s) return "—";
  return s.slice(0, 10);
}

export function CryptoLookup() {
  const en = useLocale() === "en";
  const [chain, setChain] = useState("bitcoin");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  async function run() {
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const r = await fetch(
        `/api/chain?chain=${encodeURIComponent(chain)}&address=${encodeURIComponent(address.trim())}`
      );
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
          if (address.trim()) run();
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <select
          value={chain}
          onChange={(e) => setChain(e.target.value)}
          aria-label={en ? "Blockchain" : "Blokçeyn"}
          className="shrink-0 rounded-sm border border-hairline bg-surface px-3 py-2.5 font-mono text-sm text-ink-primary focus:border-brand focus:outline-none"
        >
          {CHAINS.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          placeholder={en ? "Paste a crypto address" : "Kripto ünvanı yapışdırın"}
          aria-label={en ? "Crypto address" : "Kripto ünvanı"}
          className="flex-1 rounded-sm border border-hairline bg-surface px-3.5 py-2.5 font-mono text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !address.trim()}
          className="rounded-sm bg-brand px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-widest text-[#07110e] transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {en ? "Check" : "Yoxla"}
        </button>
      </form>

      <p className="mt-3 font-mono text-[11px] text-ink-muted">
        {en
          ? "Blockchair on-chain intel — the address balance, volume and activity history. For investigating ransomware payments and scam wallets."
          : "Blockchair on-chain kəşfiyyatı — ünvanın balansı, dövriyyəsi və fəaliyyət tarixçəsi. Ransomware ödənişləri və scam cüzdanlarının araşdırılması üçün."}
      </p>

      {loading && (
        <p className="mt-5 font-mono text-xs text-ink-secondary">
          <span className="text-accent-good">●</span> {en ? "checking…" : "yoxlanılır…"}
        </p>
      )}
      {error && <p className="mt-5 font-mono text-xs text-accent-critical">{error}</p>}
      {result && !loading && <ResultView r={result} />}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">{label}</div>
      <div className="mt-1 font-mono text-sm text-ink-primary tabular-nums">{value}</div>
      {sub && <div className="font-mono text-[11px] text-ink-muted tabular-nums">{sub}</div>}
    </div>
  );
}

function ResultView({ r }: { r: Result }) {
  const en = useLocale() === "en";
  return (
    <div className="mt-6 border-t border-hairline pt-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-mono text-[13px] text-ink-primary break-all">{r.address}</span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-ink-secondary">
          {r.chainName}
        </span>
        {r.is_contract && (
          <span className="rounded-sm border border-accent-warning/40 bg-accent-warning/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-accent-warning">
            smart contract
          </span>
        )}
      </div>

      {!r.found ? (
        <p className="mt-4 text-sm text-ink-secondary">
          {en ? "No on-chain data found for this address (unused or invalid)." : "Bu ünvan üçün on-chain məlumat tapılmadı (istifadə edilməyib və ya yanlış)."}
        </p>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
            <Stat label={en ? "Balance" : "Balans"} value={coin(r.balance, r.symbol)} sub={usd(r.balance_usd)} />
            <Stat label={en ? "Total received" : "Cəmi qəbul"} value={coin(r.received, r.symbol)} sub={usd(r.received_usd)} />
            <Stat label={en ? "Total sent" : "Cəmi göndərilmiş"} value={coin(r.spent, r.symbol)} sub={usd(r.spent_usd)} />
            <Stat label={en ? "Transactions" : "Əməliyyat sayı"} value={(r.tx_count ?? 0).toLocaleString("en-US")} />
          </div>
          <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2 border-t border-hairline pt-4">
            <Stat label={en ? "First activity" : "İlk fəaliyyət"} value={dateOnly(r.first_seen)} />
            <Stat label={en ? "Last activity" : "Son fəaliyyət"} value={dateOnly(r.last_seen)} />
          </div>
          <a
            href={`https://blockchair.com/${r.chain}/address/${r.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-block font-mono text-[11px] uppercase tracking-widest text-accent-critical hover:underline"
          >
            {en ? "Full investigation on Blockchair" : "Blockchair-də tam araşdır"} ↗
          </a>
        </>
      )}
    </div>
  );
}
