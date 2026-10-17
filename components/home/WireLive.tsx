"use client";

import { useEffect, useRef } from "react";

// The living edition. Every five minutes while the paper is open and visible,
// read the cached JSON feed (hourly ISR, zero database cost) and compare it
// with the rows on the page. When a dispatch has landed since the page was
// printed: the edition number rolls one digit at a time in the tape, the
// nameplate and the colophon; a LATE tag appears beside the number for a
// minute; the new row unfolds from the top rule of THE WIRE while the column,
// locked to 56px rows, steps down one and the last row leaves; the tape's
// line swaps with a wipe; and the mark's top node ignites again. Nothing
// here invents a number: the count comes from the feed's own total.
//
// Deferred until the load sequence is over, and silent under reduced motion
// (the rows and numbers still change, without animation).
type FeedItem = {
  id: string;
  url: string;
  title: string;
  date_published?: string;
  _skopnix?: { kev?: boolean; category?: string; severity?: string | null; cve_ids?: string[] };
};

const POLL_MS = 5 * 60_000;
const FEED = "/feed.json";

function slugOf(url: string): string {
  try {
    const u = new URL(url, location.origin);
    return u.pathname.replace(/^\/news\//, "");
  } catch {
    return url;
  }
}

function hhmm(iso: string | undefined): string {
  if (!iso) return "--:--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--";
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

function sevOf(it: FeedItem): string | undefined {
  const s = it._skopnix;
  if (s?.kev) return "kev";
  if (s?.severity === "critical") return "critical";
  if (s?.severity === "high") return "high";
  return undefined;
}

function rollNumber(el: Element, next: number, reduce: boolean) {
  const current = Number(el.getAttribute("data-edition-no") || "0");
  if (next === current) return;
  const digits = el.querySelector("[data-digits]");
  if (!digits) return;
  const text = next.toLocaleString("en-US");
  el.setAttribute("data-edition-no", String(next));
  const prev = Array.from(digits.children).map((c) => c.textContent ?? "");
  digits.textContent = "";
  text.split("").forEach((ch, i) => {
    const span = document.createElement("span");
    span.className = "inline-block";
    span.setAttribute("data-ch", /\d/.test(ch) ? "d" : "s");
    if (!reduce && /\d/.test(ch) && prev[i] !== ch) {
      // Roll: the digit arrives from below over 400ms.
      span.style.transform = "translateY(100%)";
      span.style.opacity = "0";
      span.style.transition = "transform 0.4s var(--ease-out), opacity 0.3s";
      requestAnimationFrame(() => {
        span.style.transform = "";
        span.style.opacity = "";
      });
    }
    span.textContent = ch;
    digits.appendChild(span);
  });
}

function buildRow(it: FeedItem, ordinal: number, reduce: boolean): HTMLLIElement {
  const li = document.createElement("li");
  const sev = sevOf(it);
  li.className = `row wire-row${reduce ? "" : " row-land"}`;
  li.style.setProperty("--i", "0");
  li.style.opacity = "1";
  if (sev) li.setAttribute("data-sev", sev);
  const slug = slugOf(it.url);
  li.setAttribute("data-slug", slug);
  const cat = (it._skopnix?.category || "other").toUpperCase().slice(0, 4);
  const tag = it._skopnix?.kev ? `<span class="stamp">KEV</span>` : `<span class="tag text-ink-3">${cat}</span>`;
  li.innerHTML =
    `<a href="/news/${slug}" class="group grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 py-3 sm:grid-cols-[auto_auto_1fr_auto]">` +
    `<span class="num hidden w-[7.5ch] whitespace-nowrap font-mono text-[11px] text-ink-3 sm:inline">№ ${ordinal.toLocaleString("en-US")}</span>` +
    `<time class="num font-mono text-[11px] text-ink-3">${hhmm(it.date_published)}</time>` +
    `<span class="flex items-center gap-1.5 sm:order-4">${tag}</span>` +
    `<span class="col-span-2 text-[14px] leading-[1.3] text-ink underline-offset-[3px] group-hover:underline sm:col-span-1 sm:order-3"></span></a>`;
  // Title as text, never as markup.
  const titleEl = li.querySelector("span.col-span-2");
  if (titleEl) titleEl.textContent = it.title;
  return li;
}

export function WireLive() {
  const lateTimer = useRef<number | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let alive = true;
    let timer: number | null = null;

    async function check() {
      if (!alive || document.visibilityState !== "visible") return;
      let feed: { items?: FeedItem[]; _skopnix?: { total?: number } } | null = null;
      try {
        const r = await fetch(FEED, { headers: { accept: "application/feed+json, application/json" } });
        if (!r.ok) return;
        feed = await r.json();
      } catch {
        return;
      }
      const items = feed?.items ?? [];
      if (!items.length) return;
      const list = document.querySelector<HTMLOListElement>("[data-wire-rows]");
      if (!list) return;
      const known = new Set(Array.from(list.querySelectorAll("li[data-slug]")).map((li) => li.getAttribute("data-slug")));
      const leadSlug = document.querySelector("[data-lead] a[href^='/news/']")?.getAttribute("href")?.replace(/^\/news\//, "");
      if (leadSlug) known.add(leadSlug);
      // Newest first in the feed; take only what the page has not printed.
      const fresh: FeedItem[] = [];
      for (const it of items) {
        if (known.has(slugOf(it.url))) break;
        fresh.push(it);
        if (fresh.length >= 5) break;
      }
      if (!fresh.length) return;

      const total = typeof feed?._skopnix?.total === "number" ? feed._skopnix.total : null;
      const currentNo = Number(document.querySelector("[data-edition-no]")?.getAttribute("data-edition-no") || "0");
      const nextNo = total ?? currentNo + fresh.length;

      // Oldest of the fresh batch first, so the newest ends on top.
      fresh.reverse().forEach((it, i) => {
        const ordinal = nextNo - (fresh.length - 1 - i);
        list.insertBefore(buildRow(it, ordinal, reduce), list.firstChild);
        while (list.querySelectorAll("li[data-slug]").length > 10) list.removeChild(list.lastChild!);
      });

      document.querySelectorAll("[data-edition-no]").forEach((el) => rollNumber(el, nextNo, reduce));

      const late = document.querySelector("[data-late-tag]");
      if (late) {
        late.setAttribute("data-on", "");
        if (lateTimer.current) window.clearTimeout(lateTimer.current);
        lateTimer.current = window.setTimeout(() => late.removeAttribute("data-on"), 60_000);
      }

      // The tape prints the newest line.
      const newest = fresh[fresh.length - 1];
      const tapeLine = document.querySelector("[data-tape-line] a");
      if (tapeLine) {
        const spans = tapeLine.querySelectorAll("span");
        tapeLine.setAttribute("href", `/news/${slugOf(newest.url)}`);
        if (spans[0]) spans[0].textContent = newest.title;
        if (spans[1]) spans[1].textContent = `${hhmm(newest.date_published)} UTC`;
        if (spans[2]) spans[2].textContent = newest._skopnix?.kev ? "KEV" : (newest._skopnix?.category || "").slice(0, 4);
        if (!reduce) {
          tapeLine.classList.remove("tape-swap");
          void (tapeLine as HTMLElement).offsetWidth;
          tapeLine.classList.add("tape-swap");
        }
      }

      // The mark ignites again: the grid is live.
      if (!reduce) {
        document.querySelectorAll("header svg, [data-tape] ~ header svg").forEach(() => {});
        const marks = document.querySelectorAll(".mark-ignite");
        marks.forEach((m) => {
          const p = m.parentElement;
          if (!p) return;
          p.classList.remove("reignite");
          void (p as unknown as HTMLElement).getBoundingClientRect();
          p.classList.add("reignite");
        });
      }
    }

    function schedule() {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(async () => {
        await check();
        schedule();
      }, POLL_MS);
    }

    // First check only after the load sequence has settled.
    const first = window.setTimeout(() => {
      void check();
      schedule();
    }, 20_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      alive = false;
      window.clearTimeout(first);
      if (timer) window.clearTimeout(timer);
      if (lateTimer.current) window.clearTimeout(lateTimer.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
