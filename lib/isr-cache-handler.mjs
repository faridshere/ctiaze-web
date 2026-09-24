// ---------------------------------------------------------------------------
// The ISR cache for the self-hosted server: Next's own file-system cache with
// one change, a page that rendered as a 404 stays in memory and never reaches
// the disk. Wired in next.config.ts for every host except Vercel.
//
// Why (2026-09-24, the move off Vercel): /cve/[id], /actors/[slug] and
// /news/[slug] accept any id (dynamicParams) and Next caches their notFound()
// render like any other ISR page. Measured on the standalone build: every
// made-up id wrote 8 files, about 100 KB, under .next/server/app, and nothing
// ever prunes them. Vercel managed that storage; on the 30 GB host a crawl of
// junk ids would fill the disk and take the site down with it. The memory
// cache is an LRU bounded by cacheMaxMemorySize (50 MB by default), so repeat
// hits on one junk id are still served from cache, and an evicted one is only
// rendered again.
//
// Plain JavaScript, outside the TypeScript build, because the server imports
// it by path at run time (standalone output traces it into the image).
// ---------------------------------------------------------------------------
import fileSystemCache from "next/dist/server/lib/incremental-cache/file-system-cache.js";

const FileSystemCache = fileSystemCache.default;

function isNotFoundPage(data) {
  return data?.kind === "APP_PAGE" && data.status === 404;
}

export default class NotFoundInMemoryCache extends FileSystemCache {
  async set(key, data, ctx) {
    if (!isNotFoundPage(data)) return super.set(key, data, ctx);
    // The same entry FileSystemCache.set() puts in memory before it writes files.
    FileSystemCache.memoryCache?.set(key, { value: data, lastModified: Date.now() });
  }
}
