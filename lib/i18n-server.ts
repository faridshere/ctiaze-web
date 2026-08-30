import { cookies } from "next/headers";
import { type Locale } from "./i18n";

// English-only, globally (skopnix is a global product now). We still touch
// cookies() so the tool pages keep their dynamic opt-in — their data sits behind
// unstable_cache, and a static prerender at build would re-run Mongo/NVD and risk
// the build timeout we hit before. The locale is fixed; there is no toggle.
export async function getLocale(): Promise<Locale> {
  await cookies();
  return "en";
}
