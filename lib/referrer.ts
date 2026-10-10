// The referrer host stored with a visit (app/api/hit). The beacon sends a bare
// host by design (components/HitBeacon.tsx); a full http(s) URL is reduced to
// its host. Anything that is not a plausible host is dropped, never stored raw.
const HOST = /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*(?::\d{1,5})?$/;
export function refHost(raw: string): string {
  let v = raw.trim().toLowerCase();
  if (/^https?:\/\//.test(v)) {
    try {
      v = new URL(v).host;
    } catch {
      return "";
    }
  }
  return HOST.test(v) ? v : "";
}
