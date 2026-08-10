import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getLocale } from "@/lib/i18n-server";

export default async function NotFound() {
  const en = (await getLocale()) === "en";
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-24 text-center">
        <p className="font-mono text-xs text-ink-muted tracking-widest">404</p>
        <h1 className="mt-3 font-headline text-2xl text-ink-primary">
          {en ? "This page was not found" : "Bu xəbər tapılmadı"}
        </h1>
        <Link
          href="/"
          className="mt-6 inline-block font-mono text-xs text-ink-secondary hover:text-ink-primary transition-colors"
        >
          {en ? "← back to all news" : "← bütün xəbərlərə qayıt"}
        </Link>
      </main>
      <Footer />
    </div>
  );
}
