// Node's native ESM resolver requires explicit file extensions on relative
// specifiers; this repo's app code (correctly, for its TypeScript "bundler"
// moduleResolution — see tsconfig.json, which tests/ deliberately doesn't
// touch) omits them, e.g. lib/seo.ts does `from "./site"`. This is a
// module-customization hook (Node's public, dependency-free `node:module`
// `register()` API), registered only by the handful of tests that need to
// import a file with an extensionless relative import of its own: given an
// unresolved relative specifier with no extension, if "<specifier>.ts" exists
// on disk, resolve to that instead — the same fallback TypeScript's
// `allowImportingTsExtensions` gives the compiler, without touching the
// shared tsconfig or package.json.
import { existsSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export async function resolve(specifier, context, nextResolve) {
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !extname(specifier) && context.parentURL) {
    const candidate = join(dirname(fileURLToPath(context.parentURL)), `${specifier}.ts`);
    if (existsSync(candidate)) {
      return nextResolve(pathToFileURL(candidate).href, context);
    }
  }
  return nextResolve(specifier, context);
}
