import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getLocale } from "@/lib/i18n-server";
import { localizedMeta } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const en = (await getLocale()) === "en";
  return localizedMeta({
    path: "/about",
    en,
    azTitle: "About",
    enTitle: "About",
    azDesc:
      "skopnix reads the world's cyber threats and files them where you can read them — continuously, and without the noise.",
    enDesc:
      "skopnix reads the world's cyber threats and files them where you can read them — continuously, and without the noise.",
  });
}

export default async function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 sm:py-24">
        <h1 className="font-headline text-3xl text-ink-primary sm:text-4xl">About</h1>
        <p className="mt-7 text-lg leading-relaxed text-ink-secondary">
          <span className="text-ink-primary">skopnix</span> reads the world&apos;s cyber
          threats and files them where you can actually read them. Quietly, continuously —
          no noise, nothing invented.
        </p>
      </main>
      <Footer />
    </div>
  );
}
