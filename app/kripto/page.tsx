import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CryptoLookup } from "@/components/CryptoLookup";

export const metadata: Metadata = {
  title: "Kripto ünvan kəşfiyyatı",
  description:
    "Bitcoin, Ethereum və digər blokçeyn ünvanlarının on-chain kəşfiyyatı — balans, dövriyyə, fəaliyyət tarixçəsi. Ransomware ödənişləri və crypto scam araşdırması üçün.",
};

const EXAMPLES: [string, string, string][] = [
  ["bitcoin", "Genesis (Satoshi)", "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"],
  ["ethereum", "ETH2 deposit", "0x00000000219ab540356cBB839Cbe05303d7705Fa"],
];

export default function KriptoPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-14 sm:py-20">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent-critical">
          On-chain kəşfiyyat · Blockchair
        </p>
        <h1 className="mt-3 font-headline text-3xl sm:text-4xl text-ink-primary text-balance">
          Kripto ünvan kəşfiyyatı
        </h1>
        <p className="mt-4 max-w-xl leading-relaxed text-ink-secondary">
          Bir Bitcoin, Ethereum və ya digər blokçeyn ünvanının internetə açıq
          on-chain izini yoxlayın — balans, cəmi dövriyyə, əməliyyat sayı və
          fəaliyyət tarixçəsi. Ransomware ödəniş ünvanlarını, scam cüzdanlarını və
          şübhəli axınları araşdırmaq üçün.
        </p>

        <div className="mt-8">
          <CryptoLookup />
        </div>

        <div className="mt-8">
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
            Nümunə ünvanlar
          </div>
          <ul className="mt-2 space-y-1">
            {EXAMPLES.map(([, label, addr]) => (
              <li key={addr} className="font-mono text-[11px] text-ink-muted">
                <span className="text-ink-secondary">{label}:</span>{" "}
                <span className="break-all">{addr}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-14 pt-8 border-t border-hairline font-mono text-xs text-ink-muted leading-relaxed">
          Mənbə: Blockchair API (41 blokçeyn). Yalnız açıq on-chain məlumat —
          fərdi identifikasiya deyil. On-chain izləmə şəffafdır; mixer və exchange
          off-ramp-ları araşdırmanı çətinləşdirir.
        </p>
      </main>
      <Footer />
    </div>
  );
}
