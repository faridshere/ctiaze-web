import Link from "next/link";
import type { IocRef } from "@/lib/iocfeed";
import type { IocType } from "@/lib/ioc";

// Zone 2 of /ioc — every indicator the wire actually carried, grouped by type,
// each linked to the briefing(s) it came from ("super related") and to the Zone-1
// lookup for on-demand enrichment. A "canlı" mark means the same indicator is
// ALSO in abuse.ch's live active-threat feed right now. All keyless — the list
// pre-computes, the tool enriches; no per-row API calls, so no added cost.

const TYPE_CODE: Record<IocType, string> = {
  ipv4: "IP",
  domain: "DM",
  url: "UR",
  sha256: "HS",
  sha1: "HS",
  md5: "HS",
  email: "EP",
  btc: "BTC",
  eth: "ETH",
};
const TYPE_LABEL: Record<IocType, string> = {
  ipv4: "IP ünvanları",
  domain: "Domenlər",
  url: "URL-lər",
  sha256: "Hash-lər (SHA256)",
  sha1: "Hash-lər (SHA1)",
  md5: "Hash-lər (MD5)",
  email: "E-poçtlar",
  btc: "BTC ünvanları",
  eth: "ETH ünvanları",
};
const TYPE_LABEL_EN: Record<IocType, string> = {
  ipv4: "IP addresses", domain: "Domains", url: "URLs",
  sha256: "Hashes (SHA256)", sha1: "Hashes (SHA1)", md5: "Hashes (MD5)",
  email: "Emails", btc: "BTC addresses", eth: "ETH addresses",
};

export function NewsIocFeed({
  groups,
  total,
  window: win,
  liveSet,
  locale = "az",
}: {
  groups: { type: IocType; items: IocRef[] }[];
  total: number;
  window: number;
  liveSet: Set<string>;
  locale?: "az" | "en";
}) {
  const en = locale === "en";
  const typeLabel = en ? TYPE_LABEL_EN : TYPE_LABEL;
  return (
    <section className="mt-16">
      <p className="font-mono text-[length:var(--t-micro)] uppercase tracking-[0.16em] text-brand">
        {en ? "Feed indicators" : "Lent göstəriciləri"}
      </p>
      <p className="mt-2 font-mono text-[length:var(--t-meta)] text-ink-muted">
        {en ? "extracted from the last " : "son "}{win}{en ? " dispatches · " : " dispaçdan çıxarılıb · "}
        <span className="tabular-nums text-ink-secondary">{total}</span>
        {en ? " indicators. The lookup above enriches exactly these." : " göstərici. Yuxarıdakı yoxlama məhz bunları zənginləşdirir."}
      </p>

      {total === 0 ? (
        <p className="mt-6 font-mono text-[length:var(--t-meta)] text-ink-muted">
          {en
            ? "No machine-readable indicators in the recent window — dispatches are mostly AI summaries, raw indicators are rare. Use the lookup above for the live feed."
            : "son pəncərədə maşınla oxunan göstərici tapılmadı — dispaçlar əsasən AI xülasələridir, xam indikator nadir hallarda olur. Canlı lent üçün yuxarıdakı yoxlamadan istifadə edin."}
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-8">
          {groups.map(({ type, items }) => (
            <div key={type}>
              <div className="font-mono text-[length:var(--t-micro)] uppercase tracking-[0.14em] text-ink-secondary">
                {typeLabel[type]} · <span className="tabular-nums">{items.length}</span>
              </div>
              <div className="mt-3">
                {items.map((ioc) => {
                  const live = liveSet.has(`${ioc.type}:${ioc.value.toLowerCase()}`);
                  return (
                    <article
                      key={ioc.value}
                      className="grid grid-cols-1 gap-x-4 gap-y-1.5 border-t border-hairline py-3 first:border-t-0 min-[640px]:grid-cols-[7rem_minmax(0,1fr)]"
                    >
                      <div className="flex items-center gap-2 font-mono text-[length:var(--t-micro)]">
                        <span className="rounded-[var(--radius-chip)] border border-ink-secondary px-1 uppercase text-ink-secondary">
                          {TYPE_CODE[type]}
                        </span>
                        <span className="tabular-nums text-ink-muted">
                          {ioc.stories.length} {en ? "dispatches" : "dispaç"}
                        </span>
                        {live && (
                          <span className="rounded-[var(--radius-chip)] bg-accent-critical px-1 font-semibold uppercase text-surface">
                            {en ? "live" : "canlı"}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="overflow-x-auto">
                          <code className="font-mono text-[length:var(--t-meta)] text-ink-primary">
                            {ioc.defanged}
                          </code>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[length:var(--t-meta)]">
                          {ioc.stories.slice(0, 3).map((s) => {
                            const st = en ? s.titleEn || s.titleAz : s.titleAz;
                            return (
                            <Link
                              key={s.slug}
                              href={`/xeber/${s.slug}`}
                              title={st}
                              className="text-ink-secondary transition-colors hover:text-brand"
                            >
                              → {st.length > 40 ? st.slice(0, 40) + "…" : st}
                            </Link>
                          );})}
                          <Link
                            href={`/ioc?q=${encodeURIComponent(ioc.value)}`}
                            className="uppercase tracking-wider text-brand hover:underline"
                          >
                            {en ? "check" : "yoxla"} →
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
