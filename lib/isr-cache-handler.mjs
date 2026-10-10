// ---------------------------------------------------------------------------
// The ISR cache for the self-hosted server: Next's own file-system cache with
// one change, a result that means "nothing here" stays in memory and never
// reaches the disk. Wired in next.config.ts for every host except Vercel.
//
// Why (2026-09-24, the move off Vercel): /cve/[id], /actors/[slug] and
// /news/[slug] accept any id (dynamicParams), and Next caches their notFound()
// render like any other ISR page. Measured on the standalone build: every
// made-up id wrote 8 files, about 100 KB, under .next/server/app, and nothing
// ever prunes them. Vercel managed that storage; on the 30 GB host a crawl of
// junk ids would fill the disk and take the site down with it. The same key
// space reaches the data cache too: unstable_cache stores a loader's null
// (the actor lookup behind /actors/<junk>) as a fetch-cache file on the
// persistent volume. So one rule covers every unbounded route:
//   - a page that rendered as a 404 or a redirect (/news/<id><any tail> answers
//     with a redirect to the canonical slug), and
//   - an unstable_cache result of null
// are kept only in the memory cache, an LRU bounded by cacheMaxMemorySize
// (50 MB by default). Repeat hits on one junk id are still served from it.
//
// Except when the key already has an entry on disk (2026-09-24, review): a
// story or dossier that was removed after it rendered as a real page. Left
// memory-only, the old page would come back from disk as soon as the LRU
// evicted the 404, so the empty result is written over it, as Next does by
// default. Such keys are real ids, so their number stays bounded.
//
// Plain JavaScript, outside the TypeScript build, because the server imports
// it by path at run time (standalone output traces it into the image).
// ---------------------------------------------------------------------------
import fileSystemCache from "next/dist/server/lib/incremental-cache/file-system-cache.js";

// Node's ESM loader hands this CommonJS module over as its exports object, so
// the class is on .default. Turbopack, which bundles this file into the proxy
// (proxy.ts) chunk, already unwraps it, and .default there is undefined:
// "Class extends value undefined" at module load, a 500 on every request
// (found 2026-10-10 the first time a proxy.ts existed). Accept both shapes.
const FileSystemCache = fileSystemCache.default ?? fileSystemCache;

// unstable_cache stores JSON.stringify(result) as the body of a FETCH entry.
function isEmptyResult(data) {
  if (data?.kind === "APP_PAGE") return data.status >= 300;
  // A route handler's error answer (the OG image routes 404 an unknown slug).
  if (data?.kind === "APP_ROUTE") return data.status >= 400;
  return data?.kind === "FETCH" && data.data?.body === "null";
}

// A "nothing here" that may stop being true (2026-10-10): a 404 page or an
// unstable_cache null. The pipeline sends a story to Telegram a few seconds
// before it marks it published, Telegram's preview crawler fetches the link in
// that gap, and the 404 render was then served for the page's whole revalidate
// window (24 h on /news/<slug>) although the story was live. The same holds for
// a new actor dossier or a CVE that first appears on the wire. Such an entry
// now counts as a miss once it is older than this, so the next request renders
// again. Redirects are deterministic and keep the normal window.
function isRecheckable(data) {
  if (data?.kind === "APP_PAGE" || data?.kind === "APP_ROUTE") return data.status === 404;
  return data?.kind === "FETCH" && data.data?.body === "null";
}

export default class EmptyResultsInMemoryCache extends FileSystemCache {
  static emptyTtlMs = 60_000;

  async get(key, ctx) {
    const entry = await super.get(key, ctx);
    if (entry && isRecheckable(entry.value) && Date.now() - (entry.lastModified ?? 0) > EmptyResultsInMemoryCache.emptyTtlMs) {
      return null;
    }
    return entry;
  }

  async set(key, data, ctx) {
    if (!isEmptyResult(data) || (await this.#hasDiskEntry(key, data.kind))) return super.set(key, data, ctx);
    // The same entry FileSystemCache.set() puts in memory before it writes files.
    FileSystemCache.memoryCache?.set(key, { value: data, lastModified: Date.now() });
  }

  // The file FileSystemCache.get() reads first for this key.
  async #hasDiskEntry(key, kind) {
    try {
      const file = kind === "FETCH" ? key : kind === "APP_ROUTE" ? `${key}.body` : `${key}.html`;
      await this.fs.stat(this.getFilePath(file, kind));
      return true;
    } catch {
      return false;
    }
  }
}
