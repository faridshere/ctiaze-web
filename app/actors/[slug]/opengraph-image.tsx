import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { getActorById, originLabel } from "@/lib/threatactors";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "skopnix — threat actor dossier";

// Cached, not rendered per hit (2026-10-10): with no CDN in front any more,
// every share-preview fetch cost a ~1 s PNG render (7.8 s cold) on the 1 GB
// box. An empty generateStaticParams plus revalidate makes this ISR: the
// first hit renders, later hits are served from the cache for a day. An
// unknown slug's 404 stays in memory and expires after a minute
// (lib/isr-cache-handler.mjs), so made-up ids reach neither the disk nor a
// long cache.
export const revalidate = 86400;
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return [];
}

// Branded share card for /actors/[slug] — a shared dossier link otherwise
// rendered the generic site card. Mirrors the story-page pattern (app/news/[slug]/).
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await getActorById(slug);
  // An unknown slug used to render a generic card, so any of infinitely many
  // made-up URLs cost a function invocation and a PNG render. Unknown is 404.
  if (!a) return new Response("Not found", { status: 404 });
  const origin = originLabel(a);
  const alias = (a.aliases || []).filter((x) => x && x !== a.name)[0];
  const title = alias ? `${a.name} (${alias})` : a.name;
  return ogCard(title, origin ? `Threat actor · ${origin}` : "Threat actor dossier", {
    category: a.type === "nation-state" ? "state-sponsored APT" : a.type === "crime" ? "cybercrime group" : "threat actor",
    critical: a.type === "nation-state",
    verified: true,
  });
}
