import { GodEyeGlobe } from "@/components/GodEyeGlobe";
import { AuroraCanvas } from "./AuroraCanvas";

// The hero atmosphere, defined once: the night globe deep in the background,
// the live aurora silk screen-blended over it, and a radial scrim so the copy
// sits in the dark upper zone instead of drowning in city lights. Absolutely
// positioned — the parent must be `relative isolate overflow-hidden`.
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
      <AuroraCanvas />
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: scrim }} />
    </>
  );
}
