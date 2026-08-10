import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ScanMe } from "@/components/ScanMe";

export const revalidate = 0; // the scan itself is live; the shell is static

export const metadata: Metadata = {
  title: "Özünü yoxla — breach və domain exposure",
  description:
    "E-poçt ünvanını və ya iş domain-ini yaz: hansı data breach-lərdə görünüb (XposedOrNot) və domain-in nə qədəri açıq internetdə görünür (crt.sh). False positive yoxdur — hər fakt mənbəsi ilə gəlir.",
};

export default function ScanMePage() {
  return (
    <div className="ops flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-14 sm:py-20">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand">
          Şəxsi exposure yoxlaması
        </p>
        <h1 className="mt-3 text-balance font-headline text-3xl text-ink-primary sm:text-4xl">
          Sən internetdə nə qədər açıqdasan?
        </h1>
        <p className="mt-4 max-w-xl leading-relaxed text-ink-secondary">
          E-poçt ünvanını və ya iş domain-ini yaz — sənə düz cavab verək: ünvanın hansı{" "}
          <span className="text-ink-primary">breach</span>-lərdə görünüb, və domain-inin nə qədəri açıq
          internetdə görünür. Heç nə uydurmuruq.
        </p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-sm border border-hairline bg-surface-raised/40 px-3 py-1.5 text-[13px] text-ink-secondary">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent-good opacity-60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-accent-good" />
          </span>
          <span>
            <b className="text-ink-primary">False positive yoxdur.</b> Hər fakt mənbəsi ilə gəlir;
            təsdiqləyə bilmədiyimizi <span className="font-mono text-ink-muted">unavailable</span> kimi göstəririk.
          </span>
        </p>

        <div className="mt-8">
          <ScanMe />
        </div>

        <DevContract />

        <p className="mt-14 border-t border-hairline pt-8 font-mono text-xs leading-relaxed text-ink-muted">
          Mənbələr: <span className="text-ink-secondary">XposedOrNot</span> (keyless breach lookup),{" "}
          <span className="text-ink-secondary">certspotter + crt.sh</span> certificate transparency,{" "}
          <span className="text-ink-secondary">Shodan InternetDB</span> (keyless — açıq portlar/CVE),{" "}
          <span className="text-ink-secondary">ctiaze</span> öz coverage-i, və həftəlik{" "}
          <span className="text-ink-secondary">Shodan AZ</span> exposure snapshot. Hamısı açarsız/pulsuz —
          e-poçt ünvanın heç yerdə saxlanmır.
        </p>
      </main>
      <Footer />
    </div>
  );
}

// The site is the front of the same cti/scanme.py contract — showing it builds
// trust (this is what we ask, and this is the exact shape we render) and doubles
// as integration docs for anyone reading via the API.
function DevContract() {
  const json = `// scan_email("namiq@example.az")  — "@" var, "://" yox → email
{
  "kind":       "email",
  "status":     "ok",          // "ok" | "unavailable" | "invalid"
  "breaches":   ["LinkedIn", "Dropbox", "Canva"],  // yalnız API təsdiqlədikləri; [] = təmiz
  "count":      3,             // == breaches.length
  "source":     "XposedOrNot (api.xposedornot.com/v1/check-email)",
  "fetched_at": "2026-08-09T21:00:00Z"   // UTC ISO-8601, invalid olanda null
}

// scan_domain("example.az")  — "@" yox → domain
{
  "kind":   "domain",
  "domain": "example.az",      // normalize olunmuş host, invalid olanda null
  "status": "ok",              // "ok" | "invalid"
  "subdomains": {              // (a) crt.sh certificate-transparency surface
    "status": "ok",           // "ok" | "unavailable"
    "count":  47,
    "sample": ["dev-api.example.az", "mail.example.az"]   // ≤10, əlifba sırası
  },
  "mentions": {               // (b) bizim öz coverage-imiz bu domain-i xatırlayır
    "status": "ok",           // "unavailable" => yoxlanacaq DB yoxdur
    "count":  2,              // exact-domain, word-boundary match
    "stories": [{ "title": "…", "url": "…", "source": "…", "published": "…" }]  // ≤10
  },
  "watchlist": {              // (c) OPTIONAL — yalnız domain bir watchlist product-u adlandıranda
    "product":    "FortiGate",
    "az_exposed": 340,
    "as_of":      "04 avq"
  }  // və ya null — dayanacaq heç nə olmayanda
}`;
  return (
    <section className="mt-11">
      <details className="group overflow-hidden rounded-md border border-hairline bg-surface-raised/40">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 font-semibold text-ink-primary [&::-webkit-details-marker]:hidden">
          <span aria-hidden="true">{"</>"}</span>
          Developer üçün · JSON contract
          <span className="ml-auto rounded-full border border-hairline px-2.5 py-0.5 font-mono text-[11px] font-normal text-ink-secondary">
            cti/scanme.py
          </span>
        </summary>
        <div className="border-t border-hairline px-4 py-4">
          <p className="text-[13.5px] leading-relaxed text-ink-secondary">
            Bu səhifə <span className="font-mono">/api/scan?q=&lt;email-or-domain&gt;</span>-i oxuyur — o da{" "}
            <span className="font-mono">python -m cti.scanme</span>-in JSON contract-ını izləyir. Hər fakt{" "}
            <span className="font-mono">source</span> daşıyır; təsdiqlənməyən{" "}
            <span className="font-mono">status: &quot;unavailable&quot;</span> olur.
          </p>
          <pre className="mt-3.5 overflow-x-auto rounded-sm border border-hairline bg-surface p-4 font-mono text-[12px] leading-relaxed text-ink-secondary">
            {json}
          </pre>
        </div>
      </details>
    </section>
  );
}
