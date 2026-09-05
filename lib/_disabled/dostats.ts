import { getDb } from "../db";
import { GLOSSARY } from "./glossary";
import { getGlossaryCount } from "./glossary-db";

// Live counts of the DO-built knowledge base (read-only, cheap countDocuments,
// re-fetched only on ISR regeneration of the pages that use it). Every number
// shown on the site comes from the database — never hardcoded, never inflated.
export type DoStats = {
  actors: number;
  cveExplainers: number;
  glossaryTerms: number;
  qaPairs: number;
};

export async function getDoStats(): Promise<DoStats> {
  try {
    const db = await getDb();
    const [actors, cveExplainers, glossaryTerms, qaPairs] = await Promise.all([
      db.collection("threat_actors").countDocuments({}),
      db.collection("cve_intel").countDocuments({}),
      getGlossaryCount().catch(() => GLOSSARY.length),
      db.collection("qa").countDocuments({}).catch(() => 0),
    ]);
    return { actors, cveExplainers, glossaryTerms, qaPairs };
  } catch {
    // DB unreachable → render zeros-free fallback from what we know statically.
    return { actors: 0, cveExplainers: 0, glossaryTerms: GLOSSARY.length, qaPairs: 0 };
  }
}
