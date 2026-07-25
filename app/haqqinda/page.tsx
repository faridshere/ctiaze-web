import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getStats } from "@/lib/stories";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Haqqında",
  description: "ctiaze necə işləyir — avtomatlaşdırılmış kiber-təhlükə kəşfiyyatı.",
};

export default async function AboutPage() {
  const stats = await getStats();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-10">
        <h1 className="font-headline text-3xl sm:text-4xl text-ink-primary">
          ctiaze necə işləyir
        </h1>

        <p className="mt-6 text-lg leading-relaxed text-ink-secondary">
          ctiaze — kibertəhlükəsizlik sahəsində Azərbaycan dilində xəbər dərc edən,
          tam avtomatlaşdırılmış kəşfiyyat sistemidir. İnsan müdaxiləsi olmadan
          40+ mənbədən toplayır, əhəmiyyətli olanları seçir və Azərbaycan dilinə
          tərcümə edir.
        </p>

        <div className="mt-10 space-y-8">
          <Step n="01" title="Toplama">
            40+ mənbədən (BleepingComputer, Krebs, CISA, Talos, Unit42, seçilmiş
            tədqiqatçıların X hesabları və s.) paralel şəkildə real-vaxt xəbərlər
            toplanır. Eyni hadisə haqqında fərqli mənbələr avtomatik birləşdirilir.
          </Step>
          <Step n="02" title="Seçim">
            Claude (Anthropic-in AI modeli) hər xəbəri Azərbaycan auditoriyası
            üçün əhəmiyyətinə görə qiymətləndirir — regional əlaqə, ciddilik,
            aktiv istismar vəziyyəti nəzərə alınır. Adi, təkrarlanan və
            əhəmiyyətsiz xəbərlər buraxılır.
          </Step>
          <Step n="03" title="Yoxlama">
            Hər qərar mənbə mətninə qarşı avtomatik yoxlanılır — AI-nin özündən
            uydurduğu heç bir fakt keçə bilməz. Sosial media mənbələri üçün əlavə
            tonallıq süzgəci tətbiq olunur.
          </Step>
          <Step n="04" title="Tərcümə">
            Seçilən xəbərlər təbii, peşəkar Azərbaycan dilinə tərcümə olunur.
            Texniki terminlər (CVE, ransomware, exploit və s.) ardıcıllıq üçün
            ingiliscə saxlanılır.
          </Step>
          <Step n="05" title="Dərc">
            Tərcümə mətndə olmayan fakt uydurmadığı yoxlanılandan sonra, xəbər
            avtomatik olaraq @ctiaze Telegram kanalına və bu saytda dərc olunur —
            24/7, insan müdaxiləsi olmadan.
          </Step>
        </div>

        <div className="mt-12 pt-8 border-t border-hairline">
          <p className="font-mono text-xs text-ink-muted">
            indiyədək {stats.total} xəbər dərc olunub, {stats.kevCount} aktiv
            istismar (KEV) daxil olmaqla
          </p>
        </div>

        <p className="mt-8 text-ink-secondary leading-relaxed">
          Hackxana tərəfindən yaradılıb. Claude (Anthropic) ilə işləyir.
        </p>
      </main>
      <Footer />
    </div>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <span className="font-mono text-xs text-ink-muted pt-1 shrink-0">{n}</span>
      <div>
        <h2 className="font-headline text-xl text-ink-primary italic">{title}</h2>
        <p className="mt-1.5 text-ink-secondary leading-relaxed">{children}</p>
      </div>
    </div>
  );
}
