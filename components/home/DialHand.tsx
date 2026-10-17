"use client";

import { useEffect, useState } from "react";

// The dial's hand: UTC now, as an angle on the 24-hour face, updated once a
// minute. Renders at 00:00 on the server and turns after mount, so the markup
// agrees on both sides and nothing shifts.
function angleNow(): number {
  const d = new Date();
  return ((d.getUTCHours() * 60 + d.getUTCMinutes()) / 1440) * 360;
}

export function DialHand({ r }: { r: number }) {
  const [angle, setAngle] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setAngle(angleNow());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);
  return (
    <line
      x1="60"
      y1="60"
      x2="60"
      y2={60 - r}
      stroke="var(--brand)"
      strokeWidth="1.25"
      strokeLinecap="round"
      transform={`rotate(${angle ?? 0} 60 60)`}
      style={{ transition: "transform 0.6s var(--ease-out)" }}
      opacity={angle === null ? 0 : 1}
    />
  );
}
