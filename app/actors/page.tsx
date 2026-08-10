import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ActorSearch } from "@/components/ActorSearch";
import { ActorDossier } from "@/components/ActorDossier";
import { getTopActors, getActorStats } from "@/lib/threatactors";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Təhdid aktorları — APT və crime qrupları",
  description:
    "Səni kim hədəf alır? Ölkə, sektor və ya şirkət adı ilə axtar — hansı APT və crime qruplarının onu hədəf aldığını göstərək. Hər cavab mənbəyə bağlıdır (MISP Galaxy, ransomware.live).",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Baku",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export default async function ActorsPage() {
  const [top, stats] = await Promise.all([getTopActors(24), getActorStats()]);

  return (
    <div className="ops flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-14 sm:py-20">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand">
          APT-lər və crime qrupları
        </p>
        <h1 className="mt-3 max-w-2xl text-balance font-headline text-3xl text-ink-primary sm:text-4xl">
          Səni kim hədəf alır?
        </h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-secondary">
          Ölkə, sektor və ya şirkət adı yaz — hansı <span className="text-ink-primary">APT</span> və
          crime qruplarının onu hədəf aldığını göstərək. Hər cavab mənbəyə bağlıdır:{" "}
          <span className="text-ink-primary">yalnız mənbənin açıq bildirdiyini</span> qaytarırıq,
          uydurulmuş əlaqə yoxdur.
        </p>

        <div className="mt-8 max-w-3xl">
          <ActorSearch />
        </div>

        <div className="mt-16 flex items-baseline gap-3">
          <h2 className="font-headline text-xl text-ink-primary">Aparıcı təhdid aktorları</h2>
          <span className="h-px flex-1 bg-hairline" />
          <span className="font-mono text-[11px] text-ink-muted">bizim item-lərdə ən aktiv</span>
        </div>

        {top.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {top.map((a) => (
              <ActorDossier key={a._id} a={a} />
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-ink-muted">
            Aktor rosteri hazırlanır — həftəlik ETL ilk dəfə işləyəndə burada olacaq.
          </p>
        )}

        <p className="mt-14 border-t border-hairline pt-8 font-mono text-xs leading-relaxed text-ink-muted">
          Mənbələr: <span className="text-ink-secondary">MISP Galaxy</span> +{" "}
          <span className="text-ink-secondary">ransomware.live</span>, son fəaliyyət bizim item-lərlə ad-join.
          Roster <span className="text-ink-secondary tabular-nums">{stats.total.toLocaleString("en-US")}</span> aktor
          ({stats.active} aktiv, {stats.translated} Azərbaycanca)
          {stats.lastRefreshed ? ` · yeniləndi ${fmtDate(stats.lastRefreshed)}` : ""}. Axtarış bütün rosteri əhatə edir.
        </p>
      </main>
      <Footer />
    </div>
  );
}
