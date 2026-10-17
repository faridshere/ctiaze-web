"use client";

import Link from "next/link";
import { CtiazeMark } from "@/components/CtiazeMark";

// Branded route error boundary. Without this a Mongo/upstream hiccup on any page
// rendered Next's unstyled default screen — off-brand for a reliability-first CTI
// product. role="alert" so assistive tech announces it. Set on the paper like a
// short notice: a 2px rule, the headline, one line, two ghost links. No shared
// Button here: Button has no onClick, and the retry needs a real handler, so the
// ghost classes are carried on a bare <button> and a bare <Link>.
const GHOST =
  "label inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap border border-ink px-3.5 text-ink transition-[background-color,color] duration-200 hover:bg-ink hover:text-paper";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main role="alert" className="flex min-h-screen flex-col bg-paper text-ink">
      <div className="border-b border-ink">
        <div className="sheet flex h-12 items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-ink" aria-label="skopnix — home">
            <CtiazeMark className="size-5 text-ink" />
            <span className="font-wordmark text-[1.125rem] font-bold tracking-[-0.02em]">
              skop<span className="text-brand">nix</span>
            </span>
          </Link>
          <span className="label text-ink-3">Notice · Error</span>
        </div>
      </div>
      <div className="sheet flex flex-1 flex-col justify-center py-16">
        <div className="max-w-[52rem]">
          <p className="label text-ink-3">Error</p>
          <h1 className="headline mt-4 text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.05] text-ink">
            Something went wrong. The wire didn&apos;t.
          </h1>
          <div className="rule-2 mt-6" />
          <p className="prose-paper mt-5">
            A temporary error: a data source may be briefly unavailable. Try again, or go back to the front page.
          </p>
          {error?.digest && (
            <p className="num mt-3 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3">ref {error.digest}</p>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" onClick={reset} className={GHOST}>
              Retry
            </button>
            <Link href="/" className={GHOST}>
              Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
