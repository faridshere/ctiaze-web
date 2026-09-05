"use client";

import { Button } from "@/components/site/Button";

// Branded route error boundary. Without this a Mongo/upstream hiccup on any page
// rendered Next's unstyled default screen — off-brand for a reliability-first CTI
// product. role="alert" so assistive tech announces it.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main role="alert" className="ops flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">Error</p>
      <h1 className="font-display text-2xl font-semibold text-ink-primary">Something went wrong</h1>
      <p className="max-w-md text-[13.5px] leading-relaxed text-ink-secondary">
        A temporary error — a data source may be briefly unavailable. Please try again.
      </p>
      <div className="mt-2 flex gap-3">
        {/* Button is a link/submit primitive with no onClick prop; retry needs a real
            click handler, so this one call site carries Button's primary classes on a
            bare <button> rather than the shared component. */}
        <button
          onClick={reset}
          className="rounded-[var(--radius-btn)] bg-brand px-5 py-3 font-mono text-[12px] uppercase tracking-[0.12em] text-[#170a03]"
        >
          Retry
        </button>
        <Button href="/" variant="ghost">
          Home
        </Button>
      </div>
    </main>
  );
}
