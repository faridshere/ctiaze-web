// ---------------------------------------------------------------------------
// Turn away bogus Server Action calls before they reach the renderer
// (2026-10-10, self-hosted).
//
// This site defines no Server Actions ("use server" appears nowhere outside
// app/_disabled). Scanners still POST any path with a `Next-Action: x` header,
// probing for the React2Shell-era bugs, and each one made Next log a stack
// trace ("The Server Reference ID did not match the expected format") into
// the journal. A legitimate request can never carry that header here, so it
// gets a bare 400.
//
// Cost: the matcher below is evaluated by the router, and this function runs
// ONLY for requests that carry the header. Ordinary page, ISR and API traffic
// never enters it, which is why this does not contradict the project's
// "no per-request middleware" rule. If Server Actions are ever added, delete
// this file first.
// ---------------------------------------------------------------------------
export function proxy() {
  return new Response("Bad Request\n", { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

export const config = {
  matcher: [{ source: "/:path*", has: [{ type: "header", key: "next-action" }] }],
};
