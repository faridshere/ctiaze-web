import Link from "next/link";
import type { ReactNode } from "react";

// A story link. Its Vercel Analytics click event went with the move off Vercel
// (2026-09-24); HitBeacon (/api/hit) already records which stories are opened.
export function StoryLink({
  slug,
  className,
  children,
}: {
  slug: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={`/news/${slug}`} className={className}>
      {children}
    </Link>
  );
}
