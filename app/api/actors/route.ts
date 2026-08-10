import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { searchActors } from "@/lib/threatactors";

export const revalidate = 0;

export async function GET(req: Request) {
  if (!rateLimit(`actors:${clientIp(req)}`, 60, 60_000)) {
    return NextResponse.json(
      { error: "Çox sorğu göndərdiniz — bir dəqiqə gözləyin" },
      { status: 429 }
    );
  }
  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ error: "Axtarış termini boşdur" }, { status: 400 });
  if (q.length > 80) return NextResponse.json({ error: "Termin çox uzundur" }, { status: 400 });

  try {
    const hits = await searchActors(q, 24);
    const results = hits.map((h) => ({
      id: h._id,
      name: h.name,
      aliases: (h.aliases || []).filter((a) => a !== h.name).slice(0, 4),
      type: h.type,
      origin_country: h.origin_country,
      state_sponsor: h.state_sponsor,
      targets_countries: (h.targets_countries || []).slice(0, 6),
      targets_sectors: (h.targets_sectors || []).slice(0, 6),
      description_az: h.description_az || null,
      source: h.source,
      refsCount: (h.refs || []).length,
      recentCount: (h.recent_activity || []).length,
      recent: (h.recent_activity || []).slice(0, 2).map((r) => ({
        title: r.title,
        url: r.url,
        date: r.date ? new Date(r.date).toISOString() : null,
      })),
      match_reasons: h.match_reasons,
      match_score: h.match_score,
    }));
    return NextResponse.json(
      { query: q, count: results.length, results },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
    );
  } catch {
    return NextResponse.json(
      { error: "Aktor bazası hazırda əlçatan deyil — bir azdan yenidən yoxlayın" },
      { status: 503 }
    );
  }
}
