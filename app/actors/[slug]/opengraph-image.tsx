import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { getActorById, originLabel } from "@/lib/threatactors";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "skopnix — təhdid aktoru dossyesi";

// Branded share card for /actors/[slug] — these dossiers are the only
// Azerbaijani-language threat-actor pages anywhere, but a shared link rendered
// the generic site card. Mirrors the story-page pattern (app/xeber/[slug]/).
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await getActorById(slug);
  if (!a) {
    return ogCard("skopnix", "Global cyber-threat intelligence", {});
  }
  const origin = originLabel(a, "az");
  const alias = (a.aliases || []).filter((x) => x && x !== a.name)[0];
  const title = alias ? `${a.name} (${alias})` : a.name;
  return ogCard(title, origin ? `Threat actor · ${origin}` : "Threat actor dossier", {
    category: a.type === "nation-state" ? "dövlət dəstəkli APT" : a.type === "crime" ? "kibercinayət qrupu" : "təhdid aktoru",
    critical: a.type === "nation-state",
    verified: true,
  });
}
