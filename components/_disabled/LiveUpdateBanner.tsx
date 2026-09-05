"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "./locale";
import { getDict } from "@/lib/_disabled/i18n";

// Polls for newly published stories after the page has already loaded, and
// backs its refresh button with real on-demand ISR revalidation rather than
// a plain reload — clicking it marks the feed stale server-side *then* asks
// the router for a fresh render, so the next paint is guaranteed current.
export function LiveUpdateBanner({ initialCount }: { initialCount: number }) {
  const t = getDict(useLocale()).feed;
  const router = useRouter();
  const [newCount, setNewCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/latest", { cache: "no-store" });
        if (!res.ok) return;
        const data: { count: number } = await res.json();
        if (!cancelled && data.count > initialCount) {
          setNewCount(data.count - initialCount);
        }
      } catch {
        // Transient network hiccups just mean we try again next tick.
      }
    }

    const id = setInterval(poll, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [initialCount]);

  if (newCount === 0) return null;

  async function refresh() {
    setRefreshing(true);
    try {
      await fetch("/api/revalidate", { method: "POST" });
    } finally {
      setNewCount(0);
      setRefreshing(false);
      router.refresh();
    }
  }

  return (
    <div role="status" className="border-b border-hairline bg-surface-raised">
      <div className="mx-auto max-w-5xl px-4">
        <button
          onClick={refresh}
          disabled={refreshing}
          className="w-full flex items-center justify-center gap-2 py-2 font-mono text-[11px] uppercase tracking-wider text-ink-secondary hover:text-ink-primary transition-colors disabled:opacity-60"
        >
          <span className="inline-flex size-1.5 rounded-full bg-accent-good" aria-hidden />
          {refreshing ? t.refreshing : t.newStories(newCount)}
        </button>
      </div>
    </div>
  );
}
