import { GodEyeGlobe } from "@/components/GodEyeGlobe";

// The hero atmosphere, defined once: the night globe deep in the background,
// aurora-silk streaks screen-blended over it, and a radial scrim so the copy
// sits in the dark upper zone instead of drowning in city lights. Absolutely
// positioned — the parent must be `relative isolate overflow-hidden`.
const STREAKS: React.CSSProperties[] = [
  { width: 1600, height: 330, left: -220, top: 40, background: "linear-gradient(100deg, transparent 5%, rgba(38,90,150,0.5) 30%, rgba(111,211,230,0.46) 52%, rgba(38,70,140,0.32) 72%, transparent 95%)" },
  { width: 1500, height: 210, left: -120, top: 240, background: "linear-gradient(100deg, transparent 8%, rgba(111,211,230,0.38) 40%, rgba(150,200,235,0.3) 60%, transparent 92%)" },
  { width: 1300, height: 170, left: 200, top: -70, background: "linear-gradient(100deg, transparent, rgba(60,60,140,0.36) 45%, rgba(111,150,230,0.26) 65%, transparent)" },
  { width: 1200, height: 150, left: 60, top: 400, background: "linear-gradient(100deg, transparent, rgba(255,90,31,0.14) 45%, rgba(255,140,80,0.09) 62%, transparent)" },
];

export function AuroraField({
  globe = true,
  globeOpacity = 0.7,
  scrim = "radial-gradient(90% 70% at 50% 42%, rgba(5,6,10,0.62) 0%, rgba(5,6,10,0.32) 55%, transparent 80%)",
}: {
  globe?: boolean;
  globeOpacity?: number;
  scrim?: string;
}) {
  return (
    <>
      {globe && (
        <div aria-hidden className="absolute inset-0" style={{ opacity: globeOpacity }}>
          <GodEyeGlobe />
        </div>
      )}
      {STREAKS.map((st, i) => (
        <div
          key={i}
          aria-hidden
          className="aurora-streak pointer-events-none absolute rounded-full"
          style={{
            ...st,
            filter: "blur(70px)",
            transform: "rotate(-24deg)",
            mixBlendMode: "screen",
            animationDelay: `${i * -3.2}s`,
          }}
        />
      ))}
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: scrim }} />
    </>
  );
}
