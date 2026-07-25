import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getStats } from "@/lib/stories";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Haqqında",
  description: "ctiaze — Hackxana layihəsi.",
};

export default async function AboutPage() {
  const stats = await getStats();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-14 sm:py-20">
        <h1 className="font-headline text-3xl sm:text-4xl text-ink-primary">
          Haqqında
        </h1>

        <p className="mt-6 text-lg leading-relaxed text-ink-secondary">
          ctiaze — kibertəhlükəsizlik xəbərlərini 40+ mənbədən toplayıb,
          əhəmiyyətli olanları seçən və Azərbaycan dilinə tərcümə edən
          avtomatlaşdırılmış kəşfiyyat sistemidir. 24/7, insan müdaxiləsi
          olmadan işləyir.
        </p>

        <p className="mt-5 text-lg leading-relaxed text-ink-secondary">
          <span className="text-ink-primary">Hackxana</span> layihəsidir.
        </p>

        <p className="mt-10 pt-8 border-t border-hairline font-mono text-xs text-ink-muted">
          indiyədək {stats.total} dispaç · {stats.kevCount} aktiv istismar (KEV)
        </p>
      </main>
      <Footer />
    </div>
  );
}
