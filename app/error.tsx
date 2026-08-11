"use client";

import Link from "next/link";
import { useLocale } from "@/components/locale";

// Branded route error boundary. Without this a Mongo/upstream hiccup on any page
// rendered Next's unstyled default screen — off-brand for a reliability-first CTI
// product. role="alert" so assistive tech announces it.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const en = useLocale() === "en";
  return (
    <main role="alert" className="ops flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-muted">{en ? "error" : "xəta"}</p>
      <h1 className="font-headline text-2xl text-ink-primary">
        {en ? "Something went wrong" : "Nəsə səhv getdi"}
      </h1>
      <p className="max-w-md text-[13.5px] leading-relaxed text-ink-secondary">
        {en
          ? "A temporary error — a data source may be briefly unavailable. Please try again."
          : "Müvəqqəti xəta — məlumat mənbəyi qısa müddət əlçatmaz ola bilər. Yenidən cəhd et."}
      </p>
      <div className="mt-2 flex gap-3">
        <button
          onClick={reset}
          className="rounded-sm bg-brand px-4 py-2 font-mono text-xs font-semibold uppercase tracking-widest text-[#07110e] transition-opacity hover:opacity-90"
        >
          {en ? "Retry" : "Yenidən cəhd et"}
        </button>
        <Link
          href="/"
          className="rounded-sm border border-hairline px-4 py-2 font-mono text-xs text-ink-secondary transition-colors hover:text-ink-primary"
        >
          {en ? "Home" : "Ana səhifə"}
        </Link>
      </div>
    </main>
  );
}
