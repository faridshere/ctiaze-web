import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/ratelimit";

// Crypto address intelligence via Blockchair (GitHub Student Pack key, 100k
// requests). Normalises the per-chain response shape (UTXO chains use
// received/transaction_count; Ethereum uses *_approximate/call_count) into one
// contract. Read-only lookups of already-public on-chain data. Cached hard so a
// repeat lookup of the same address never re-spends the request budget.

type Family = "utxo" | "eth";
const CHAINS: Record<string, { name: string; symbol: string; decimals: number; family: Family }> = {
  bitcoin: { name: "Bitcoin", symbol: "BTC", decimals: 8, family: "utxo" },
  ethereum: { name: "Ethereum", symbol: "ETH", decimals: 18, family: "eth" },
  litecoin: { name: "Litecoin", symbol: "LTC", decimals: 8, family: "utxo" },
  dogecoin: { name: "Dogecoin", symbol: "DOGE", decimals: 8, family: "utxo" },
  "bitcoin-cash": { name: "Bitcoin Cash", symbol: "BCH", decimals: 8, family: "utxo" },
};

// Earliest ("min") or latest ("max") genuine date among candidates, ignoring
// nulls and pre-2009 placeholder sentinels. ISO-ish strings sort lexically.
function pickDate(candidates: unknown[], mode: "min" | "max"): string | null {
  const valid = candidates
    .filter((s): s is string => typeof s === "string" && s >= "2009-01-01")
    .sort();
  if (!valid.length) return null;
  return mode === "min" ? valid[0] : valid[valid.length - 1];
}

function toCoin(raw: unknown, decimals: number): number {
  const n = Number(raw ?? 0);
  if (!isFinite(n)) return 0;
  return n / 10 ** decimals;
}

export async function GET(req: Request) {
  if (!rateLimit(`chain:${clientIp(req)}`, 20, 60_000)) {
    return NextResponse.json({ error: "Çox sorğu göndərdiniz — bir dəqiqə gözləyin" }, { status: 429 });
  }
  const url = new URL(req.url);
  const chain = (url.searchParams.get("chain") || "bitcoin").toLowerCase();
  const address = (url.searchParams.get("address") || "").trim();

  const cfg = CHAINS[chain];
  if (!cfg) return NextResponse.json({ error: "Dəstəklənməyən blokçeyn" }, { status: 400 });
  if (!address || address.length < 20 || address.length > 120 || /\s/.test(address)) {
    return NextResponse.json({ error: "Yanlış ünvan formatı" }, { status: 400 });
  }
  if (cfg.family === "eth" && !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json({ error: "Yanlış Ethereum ünvanı (0x…)" }, { status: 400 });
  }

  const key = process.env.BLOCKCHAIR_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "BLOCKCHAIR_API_KEY təyin edilməyib (Vercel env-ə əlavə edin)" },
      { status: 500 }
    );
  }

  try {
    // limit=0 keeps the response lean AND still returns the summary for UTXO
    // chains — but for Ethereum it zeroes out type + call/tx counts (only balance
    // survives). So UTXO uses limit=0; Ethereum uses the default (full summary).
    const limitParam = cfg.family === "utxo" ? "&limit=0" : "";
    const api = `https://api.blockchair.com/${chain}/dashboards/address/${encodeURIComponent(
      address
    )}?key=${key}${limitParam}`;
    const r = await fetch(api, { signal: AbortSignal.timeout(12000) });
    if (r.status === 404) {
      return NextResponse.json(
        { chain, chainName: cfg.name, symbol: cfg.symbol, address, found: false },
        { headers: cacheHeaders() }
      );
    }
    if (!r.ok) return NextResponse.json({ error: "Blockchair əlçatan deyil" }, { status: 502 });
    const d = await r.json();
    // Blockchair keys the response by the address, but Ethereum normalises it to
    // lowercase — so read the single returned entry rather than by exact case.
    const entries = d?.data && typeof d.data === "object" ? Object.values(d.data) : [];
    const row = (entries[0] as { address?: Record<string, unknown> } | undefined)?.address;
    if (!row) {
      return NextResponse.json(
        { chain, chainName: cfg.name, symbol: cfg.symbol, address, found: false },
        { headers: cacheHeaders() }
      );
    }

    const isEth = cfg.family === "eth";
    const out = {
      chain,
      chainName: cfg.name,
      symbol: cfg.symbol,
      address,
      found: true,
      is_contract: isEth ? row.type === "contract" || !!row.contract_created : false,
      balance: toCoin(row.balance, cfg.decimals),
      balance_usd: Number(row.balance_usd ?? 0),
      received: toCoin(isEth ? row.received_approximate : row.received, cfg.decimals),
      received_usd: Number(row.received_usd ?? 0),
      spent: toCoin(isEth ? row.spent_approximate : row.spent, cfg.decimals),
      spent_usd: Number(row.spent_usd ?? 0),
      tx_count: isEth
        ? Number(row.transaction_count ?? 0) ||
          Number(row.receiving_call_count ?? 0) + Number(row.spending_call_count ?? 0)
        : Number(row.transaction_count ?? row.output_count ?? 0),
      // Blockchair returns a "2000-01-01"-style placeholder for events that never
      // happened (e.g. an unspent address has a sentinel last_seen_spending). Pick
      // the earliest/latest REAL date across receiving+spending; no crypto address
      // predates 2009, so anything below that is a placeholder to ignore.
      first_seen: pickDate([row.first_seen_receiving, row.first_seen_spending], "min"),
      last_seen: pickDate([row.last_seen_receiving, row.last_seen_spending], "max"),
    };
    return NextResponse.json(out, { headers: cacheHeaders() });
  } catch {
    return NextResponse.json({ error: "Sorğu zaman aşımına uğradı" }, { status: 504 });
  }
}

function cacheHeaders() {
  return { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" };
}
