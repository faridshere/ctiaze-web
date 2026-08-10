import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ActorSearch } from "@/components/ActorSearch";
import { ActorDossier } from "@/components/ActorDossier";
import { getTopActors, getActorStats } from "@/lib/threatactors";

export const revalidate = 3600; // roster refreshes weekly; hourly ISR is ample

export const metadata: Metadata = {
  title: "Təhdid aktorları — APT və crime qrupları",
  description:
    "Səni kim hədəf alır? Ölkə, sektor və ya şirkət adı ilə axtar — hansı APT və crime qruplarının onu hədəf aldığını göstərək. Hər cavab mənbəyə bağlıdır (MISP Galaxy, ransomware.live) — yalnız mənbənin açıq bildirdiyi.",
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
  const [top, stats] = await Promise.all([getTopActors(12), getActorStats()]);

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

        {/* leading actors */}
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

        <DevContract />

        <p className="mt-14 border-t border-hairline pt-8 font-mono text-xs leading-relaxed text-ink-muted">
          Mənbələr: <span className="text-ink-secondary">MISP Galaxy</span> (threat-actor cluster) +{" "}
          <span className="text-ink-secondary">ransomware.live</span> qrupları, son fəaliyyət isə bizim
          öz item-lərimizlə ad-join. Roster{" "}
          <span className="text-ink-secondary tabular-nums">{stats.total.toLocaleString("en-US")}</span> aktor
          ({stats.active} bizim intel-də aktiv, {stats.translated} Azərbaycanca xülasə)
          {stats.lastRefreshed ? ` · yeniləndi ${fmtDate(stats.lastRefreshed)}` : ""}. Attribution
          honesty: hər iddia mənbənin açıq bildirdiyidir.
        </p>
      </main>
      <Footer />
    </div>
  );
}

function DevContract() {
  const json = `// threat_actors collection-dakı bir aktor sənədi (və query nəticəsinin əsası)
{
  "_id":               "lazarus-group",   // primary adın slug-u (stabil açar)
  "name":              "Lazarus Group",
  "aliases":           ["APT38", "Hidden Cobra"],
  "origin_country":    "KP",       // ISO-2 (MISP meta.country) və ya null
  "state_sponsor":     "North Korea",   // STATED olanda, yoxsa null
  "type":              "nation-state",  // "nation-state" | "unknown" | "crime"
  "targets_countries": ["South Korea", "USA"],  // mənbənin STATED hədəfləri
  "targets_sectors":   ["Banking", "Financial services", "Crypto"],
  "description_en":     "…",      // mənbədən İngiliscə təsvir
  "description_az":     "…",      // təbii Azərbaycanca (yalnız top-N; yoxsa null)
  "refs":              ["https://…"],  // hər iddia izlənə bilər
  "source":            "misp-galaxy",   // "misp-galaxy" | "ransomware.live"
  "recent_activity":   [{ "title": "…", "url": "…", "date": "…" }],  // bizim item-lər
  "last_refreshed":     "2026-08-11T06:23:00Z",

  // query helper-ləri hər qaytarılan hit-ə əlavə edir (saxlanmır):
  "match_reasons":      ["targets: Banking", "alias match: APT38"],  // provenance
  "match_score":        140            // ranking çəkisi (böyük = güclü/birbaşa)
}`;
  return (
    <section className="mt-14">
      <details className="group overflow-hidden rounded-md border border-hairline bg-surface-raised/40">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 font-semibold text-ink-primary [&::-webkit-details-marker]:hidden">
          <span aria-hidden="true">{"</>"}</span>
          Developer üçün · JSON contract
          <span className="ml-auto rounded-full border border-hairline px-2.5 py-0.5 font-mono text-[11px] font-normal text-ink-secondary">
            cti/actors.py
          </span>
        </summary>
        <div className="border-t border-hairline px-4 py-4">
          <p className="text-[13.5px] leading-relaxed text-ink-secondary">
            Hər aktor <span className="font-mono">threat_actors</span> collection-da bir sənəddir; sayt
            bunları oxuyur. <span className="font-mono">/api/actors?q=&lt;term&gt;</span> eyni formanı
            qaytarır, üstəlik hər hit-ə <span className="font-mono">match_reasons</span> +{" "}
            <span className="font-mono">match_score</span> əlavə edir (CLI:{" "}
            <span className="font-mono">python -m cti.actors --who &lt;term&gt;</span>).
          </p>
          <pre className="mt-3.5 overflow-x-auto rounded-sm border border-hairline bg-surface p-4 font-mono text-[12px] leading-relaxed text-ink-secondary">
            {json}
          </pre>
        </div>
      </details>
    </section>
  );
}
