import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Waitlist } from "@/components/Waitlist";
import { getLocale } from "@/lib/i18n-server";

// A 404 is a high-intent moment: someone followed a skopnix link — an old post,
// a mistyped slug, a shelved section that slipped the redirect list. Rather than
// dead-end them, recover the lead with the email form. Deliberately NO database
// read here: bots spray random paths, and every 404 must stay free (no Mongo
// hit, no ISR write) — so this is fully static and the only interactive part is
// the client-side Waitlist.
export default async function NotFound() {
  const en = (await getLocale()) === "en";
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-24 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-muted">404</p>
        <h1 className="mt-4 font-display text-[clamp(1.6rem,5vw,2.4rem)] font-semibold tracking-[-0.02em] text-ink-primary">
          {en ? "That link's gone — you're not." : "Bu keçid köhnəlib — amma sən düz yerdəsən."}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-ink-secondary">
          {en
            ? "The page moved or never existed. The wire hasn't — drop your email and you'll get the threats that matter, straight from the source."
            : "Səhifə köçürülüb və ya heç olmayıb. Amma xət işləyir — e-poçtunu yaz, əhəmiyyətli təhdidləri birbaşa mənbədən al."}
        </p>

        <div className="mx-auto mt-9 max-w-md text-left">
          <Waitlist source="404" compact />
        </div>

        <div className="mt-10 flex items-center justify-center gap-5 font-mono text-[11px] uppercase tracking-wider text-ink-muted">
          <Link href="/" className="hover:text-ink-primary transition-colors">
            {en ? "home" : "ana səhifə"}
          </Link>
          <span aria-hidden>·</span>
          <Link href="/news" className="hover:text-ink-primary transition-colors">
            {en ? "latest stories" : "son xəbərlər"}
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
