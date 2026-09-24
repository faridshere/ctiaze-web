import Link from "next/link";
import type { ReactNode } from "react";

// A story link. It used to fire a Vercel Analytics "story_click" event; that
// package was removed on 2026-09-24 for the move off Vercel, and HitBeacon
// (/api/hit) already records which story pages are opened. Kept as a named
// component so the shelved rails that use it need no edit when they return;
// `title` stays in the props for the same reason and is no longer read.
export function StoryLink({
  slug,
  className,
  children,
}: {
  slug: string;
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={`/news/${slug}`} className={className}>
      {children}
    </Link>
  );
}
