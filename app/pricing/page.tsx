import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getLocale } from "@/lib/i18n-server";
import { localizedMeta } from "@/lib/seo";

export const revalidate = 86400;

export async function generateMetadata(
  { searchParams }: { searchParams: Promise<{ dil?: string }> },
): Promise<Metadata> {
  const en = (await getLocale()) === "en";
  const dil = (await searchParams)?.dil;
  return localizedMeta({
    path: "/pricing", dil, en,
    azTitle: "Qiymət — skopnix",
    enTitle: "Pricing — skopnix",
    azDesc: "Regional təhlükə kəşfiyyatı API və MCP — pulsuz başla, istifadəyə görə ödə. Sadə, özünə-xidmət qiymət. Satış zəngi yoxdur.",
    enDesc: "Regional threat-intel API & MCP — start free, pay as you use. Simple self-serve pricing, no sales calls.",
  });
}

type Tier = {
  name: string; price: string; per?: string; tagline: string;
  features: string[]; cta: string; href: string; featured?: boolean;
};

const TIERS: Tier[] = [
  {
    name: "Free", price: "$0", tagline: "For trying it and building on the public feed.",
    features: [
      "stacknix — free exposure check (summary + worst finding, 5 components)",
      "1,000 API calls / month",
      "Public CVE + actor + IOC endpoints",
      "RSS · feed.json · llms.txt machine feeds",
      "MCP server (public tools)",
      "Attribution required",
    ],
    cta: "Get a free key", href: "/developers",
  },
  {
    name: "Builder", price: "$49", per: "/ month", featured: true,
    tagline: "stacknix full reports + the regional data for products and agents.",
    features: [
      "stacknix — full stack-exposure reports (KEV / EPSS / version-adjudicated), 15 components/scan, JSON export",
      "50,000 API calls / month, then metered",
      "Sensor-grid endpoints — enrich_ioc, regional exposure",
      "MCP server (paid tools) + weekly KEV-diff alerts",
      "Commercial use · versioned /v1 schema",
    ],
    cta: "Start Builder", href: "/developers",
  },
  {
    name: "Pro / MSSP", price: "$199", per: "/ month",
    tagline: "For teams monitoring the region for clients.",
    features: [
      "Everything in Builder, higher limits",
      "stacknix — saved stacks, client-labeled reports",
      "Historical exposure snapshots + bulk export",
      "Priority data requests",
      "Seats for your analysts",
      "Best-effort freshness SLA (in writing)",
    ],
    cta: "Talk to us", href: "/developers",
  },
];

export default async function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main" className="mx-auto w-full max-w-[75rem] flex-1 px-[var(--sp-gutter)] py-[var(--sp-section)]">
        <div className="max-w-[42rem]">
          <div className="mb-4 font-mono text-[length:var(--t-micro)] uppercase tracking-[0.18em] text-[var(--brand)]">
            Pricing
          </div>
          <h1 className="font-headline text-[clamp(2rem,4.5vw,3rem)] font-semibold leading-[1.05] tracking-tight text-ink-primary">
            Start free. Pay when the data earns its keep.
          </h1>
          <p className="mt-5 text-[length:var(--t-body)] leading-relaxed text-ink-secondary">
            Self-serve, no sales calls. The public intelligence stays free; you pay for the
            proprietary regional sensor data and the throughput to run it in production.
          </p>
        </div>

        <div className="mt-10 grid gap-3 md:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`flex flex-col border bg-[var(--surface-raised)] p-6 ${
                tier.featured ? "border-[var(--brand)]" : "border-hairline"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <div className="font-headline text-[length:var(--t-h2)] font-semibold text-ink-primary">{tier.name}</div>
                {tier.featured ? (
                  <span className="font-mono text-[length:var(--t-micro)] uppercase tracking-[0.12em] text-[var(--brand)]">
                    Most popular
                  </span>
                ) : null}
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="font-headline text-[2.1rem] font-semibold tabular-nums text-ink-primary">{tier.price}</span>
                {tier.per ? <span className="font-mono text-[length:var(--t-meta)] text-ink-muted">{tier.per}</span> : null}
              </div>
              <p className="mt-2 text-[length:var(--t-meta)] leading-snug text-ink-secondary">{tier.tagline}</p>
              <ul className="mt-5 flex flex-1 flex-col gap-2.5">
                {tier.features.map((f) => (
                  <li key={f} className="flex gap-2.5 text-[length:var(--t-meta)] leading-snug text-ink-secondary">
                    <span aria-hidden className="mt-[0.15em] text-[var(--brand)]">→</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={tier.href}
                className={`mt-6 inline-flex items-center justify-center gap-2 rounded-[2px] px-4 py-2.5 font-mono text-[length:var(--t-meta)] font-semibold transition-transform hover:-translate-y-0.5 ${
                  tier.featured
                    ? "bg-[var(--brand)] text-[#170a03]"
                    : "border border-hairline text-ink-primary hover:border-[var(--ink-muted)]"
                }`}
              >
                {tier.cta} →
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-8 border border-hairline bg-[var(--surface-raised)] p-6">
          <div className="font-mono text-[length:var(--t-micro)] uppercase tracking-[0.14em] text-[var(--brand)]">
            The honest fine print
          </div>
          <p className="mt-3 max-w-[46rem] text-[length:var(--t-meta)] leading-relaxed text-ink-secondary">
            Built and run by one person. No sales calls, cancel in one click, and if the data ever goes
            stale the status page will tell you before we do. The regional sensor grid is in private beta —
            paid tiers open as coverage lands. <b className="text-ink-primary">Prices may change while in beta;</b>{" "}
            early keys keep their rate.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
