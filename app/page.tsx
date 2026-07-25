import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StoryRow } from "@/components/StoryRow";
import { getStories } from "@/lib/stories";

// The pipeline publishes at most every ~15 minutes; a few minutes of staleness
// here is imperceptible in practice, and this keeps the data layer as simple
// as possible (no webhook/on-demand-revalidation plumbing needed for v1).
export const revalidate = 180;

export default async function HomePage() {
  const stories = await getStories(60);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-2xl px-4">
        <div className="pt-10 pb-6">
          <p className="font-mono text-xs text-ink-muted tracking-wide">
            avtomatlaşdırılmış · Claude AI tərəfindən seçilir
          </p>
        </div>

        {stories.length === 0 ? (
          <p className="py-16 text-center text-ink-muted font-mono text-sm">
            hələ heç bir xəbər dərc olunmayıb
          </p>
        ) : (
          <div>
            {stories.map((story) => (
              <StoryRow key={story.id} story={story} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
