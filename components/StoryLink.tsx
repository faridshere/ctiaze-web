"use client";

import Link from "next/link";
import { track } from "@vercel/analytics";
import type { ReactNode } from "react";

// A story link that fires a custom "story_click" Vercel Analytics event with the
// post's slug + title, so the dashboard can rank exactly which posts people click
// (not just which pages get viewed). Behaves identically to next/link otherwise —
// prefetch, client nav, everything — the tracking is a fire-and-forget side effect.
export function StoryLink({
  slug,
  title,
  className,
  children,
}: {
  slug: string;
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={`/xeber/${slug}`}
      className={className}
      onClick={() => track("story_click", { slug, title })}
    >
      {children}
    </Link>
  );
}
