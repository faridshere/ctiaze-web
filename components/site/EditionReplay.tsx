"use client";

import { useLayoutEffect } from "react";

// The second half of the root layout's EDITION_SCRIPT. That inline script runs
// before first paint on every server-rendered page, but a notFound() thrown
// from generateMetadata (news, actors and cve dynamic routes) makes Next serve
// its bare error shell and render the whole tree, <html> included, on the
// client. A <script> React inserts never executes, and React takes <html> over
// with only the attributes it renders, so the 404 printed the OS edition
// instead of the saved one (2026-10-17, data-edition was null under a saved
// "day"). A layout effect runs after that commit and before the browser
// paints, so the saved edition is back with no flash. On a normal page the
// attribute is already right and this is a no-op.
const KEY = "skopnix.edition";

export function EditionReplay() {
  useLayoutEffect(() => {
    try {
      const e = localStorage.getItem(KEY);
      const root = document.documentElement;
      if ((e === "day" || e === "night") && root.getAttribute("data-edition") !== e) root.setAttribute("data-edition", e);
    } catch {
      /* storage blocked: prefers-color-scheme decides, as it does everywhere */
    }
  }, []);
  return null;
}
