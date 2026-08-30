"use client";

import { useRouter } from "next/navigation";

type PickSector = { slug: string; name_az: string; name_en: string };

/**
 * The picker on /sectors: choosing a sector remembers it (localStorage) AND
 * navigates to its hub, so the home page can greet the reader with their sector
 * next time (see SectorRecall). The SEO-friendly <Link> card grid stays below
 * this band untouched — this only adds the "remember me" behavior.
 */
export function SectorPicker({ sectors, en }: { sectors: PickSector[]; en: boolean }) {
  const router = useRouter();

  function pick(s: PickSector) {
    const name = en ? s.name_en : s.name_az;
    try {
      localStorage.setItem("ctiaze_sector", JSON.stringify({ slug: s.slug, name }));
    } catch {
      /* storage disabled — navigation still works */
    }
    router.push(`/sectors/${s.slug}`);
  }

  return (
    <div
      className="mt-8 border border-hairline bg-surface-raised p-4"
      style={{ borderRadius: "var(--radius-chip)" }}
    >
      <p className="flex items-center gap-2 font-mono text-[length:var(--t-micro)] uppercase tracking-[0.16em] text-brand">
        <span aria-hidden className="h-px w-4 bg-brand" />
        {en ? "Set your sector — the site remembers it" : "Sektorunu seç — sayt onu yadda saxlayır"}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {sectors.map((s) => (
          <button
            key={s.slug}
            type="button"
            onClick={() => pick(s)}
            className="border border-hairline bg-surface px-3 py-1.5 font-mono text-[length:var(--t-meta)] text-ink-secondary transition-colors hover:border-brand hover:text-brand"
            style={{ borderRadius: "var(--radius-chip)" }}
          >
            {en ? s.name_en : s.name_az}
          </button>
        ))}
      </div>
    </div>
  );
}
