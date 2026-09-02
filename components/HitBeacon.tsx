"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Fires one lightweight beacon per page view. Necessary because the pages are
// served statically from the CDN and never reach our server, so there is nothing
// to count otherwise. Sends only the path and referrer host — the IP and country
// are read server-side from the request, never sent from here.
export function HitBeacon() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (last.current === pathname) return; // don't double-count a re-render
    last.current = pathname;
    let ref = "";
    try {
      ref = document.referrer ? new URL(document.referrer).host : "";
    } catch {
      ref = "";
    }
    const body = JSON.stringify({ path: pathname, ref });
    // keepalive so the beacon still lands if the visitor navigates away at once
    fetch("/api/hit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
