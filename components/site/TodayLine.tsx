"use client";

import { useSyncExternalStore } from "react";

// The dateline in the nameplate: "THURSDAY 16 OCTOBER 2026". The server prints
// the UTC date of the render (an hourly ISR page is never more than an hour
// old) and the browser re-prints its own calendar date after hydration, so a
// reader at 00:30 in Baku is not handed yesterday's paper.
const subscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function formatDateline(d: Date, utc: boolean): string {
  const [wd, day, mon, year] = utc
    ? [d.getUTCDay(), d.getUTCDate(), d.getUTCMonth(), d.getUTCFullYear()]
    : [d.getDay(), d.getDate(), d.getMonth(), d.getFullYear()];
  return `${DAYS[wd]} ${day} ${MONTHS[mon]} ${year}`;
}

export function TodayLine({ serverIso, className = "" }: { serverIso: string; className?: string }) {
  const hydrated = useSyncExternalStore(subscribe, onClient, onServer);
  const text = hydrated ? formatDateline(new Date(), false) : formatDateline(new Date(serverIso), true);
  return (
    <time dateTime={hydrated ? undefined : serverIso.slice(0, 10)} className={className} suppressHydrationWarning>
      {text}
    </time>
  );
}
