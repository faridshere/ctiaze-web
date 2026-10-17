import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Last-good snapshots for the page-level data blobs (landing, census, the
// adversaries index). Written 2026-10-16, the day after Atlas went unreachable:
// the live site kept serving because Next's data cache still held every blob,
// but a redeploy replaces the app directory, and the first render after it
// would have found no cache, failed on Mongo, and published an EMPTY landing
// page for the next hour (page.tsx catches the error and renders the quiet
// page; ISR then caches that render). The same blob is therefore also kept as
// a plain JSON file next to the app, and a loader that cannot reach its source
// serves the last one it wrote, with its original generatedAt, so nothing on
// the page claims to be fresher than it is.
//
// Resolution order: a real read wins and refreshes the file; a failed read
// serves the file; no file rethrows, so the caller's own fallback still applies.
// The directory is `.snapshots` under the working directory (the app root on
// the server, the repo locally; both gitignored) unless SNAPSHOT_DIR says
// otherwise. deploy.sh carries the directory over from the previous release.
const DIR = process.env.SNAPSHOT_DIR || join(process.cwd(), ".snapshots");

type Saved<T> = { savedAt: string; value: T };

async function load<T>(name: string): Promise<Saved<T> | null> {
  try {
    const raw = await readFile(join(DIR, `${name}.json`), "utf8");
    const parsed = JSON.parse(raw) as Partial<Saved<T>>;
    if (!parsed || typeof parsed !== "object" || !("value" in parsed)) return null;
    return { savedAt: String(parsed.savedAt ?? ""), value: parsed.value as T };
  } catch {
    return null;
  }
}

async function save<T>(name: string, value: T): Promise<void> {
  // Atomic: write beside, then rename, so a crash mid-write never leaves a
  // half file that the next failure would then try to serve.
  const file = join(DIR, `${name}.json`);
  // Unique per call: at build time several prerender workers in one process
  // can save the same name at once, and two renames of one tmp file race.
  const tmp = `${file}.${process.pid}.${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}.tmp`;
  await mkdir(DIR, { recursive: true });
  await writeFile(tmp, JSON.stringify({ savedAt: new Date().toISOString(), value } satisfies Saved<T>));
  await rename(tmp, file);
}

export async function withSnapshot<T>(name: string, compute: () => Promise<T>): Promise<T> {
  let value: T;
  try {
    value = await compute();
  } catch (err) {
    const saved = await load<T>(name);
    if (saved) {
      console.error(`[snapshot] ${name}: source unreachable, serving the copy saved ${saved.savedAt || "earlier"}:`, err);
      return saved.value;
    }
    throw err;
  }
  // A snapshot that cannot be written must never fail the read that succeeded.
  await save(name, value).catch((e) => console.error(`[snapshot] ${name}: could not save:`, e));
  return value;
}

/** Where snapshots live — exported for the tests and the ops scripts. */
export const SNAPSHOT_DIR = DIR;
