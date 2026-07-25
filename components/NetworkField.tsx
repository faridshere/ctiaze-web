"use client";

import { useEffect, useRef } from "react";

// An ambient, ever-so-faint global threat-network visualization behind the
// content: drifting nodes (sources/IOCs) linked when close, swept by a slow
// rotating radar trail from the top-right that briefly "detects" (pulses)
// whatever it passes over. Deliberately not falling-code rain — the
// storytelling here is "a monitoring system," which is what the product
// actually is. Kept at very low opacity throughout: this is atmosphere, not
// content, and must never fight with reading the actual feed.
const NODE_COUNT = 26;
const LINK_DISTANCE = 170;
const SWEEP_PERIOD_MS = 16000;
const TRAIL_STEPS = 20;
const TRAIL_SPAN = 0.85;

type Node = { x: number; y: number; vx: number; vy: number; pulse: number };

export function NetworkField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    const nodes: Node[] = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.05,
      vy: (Math.random() - 0.5) * 0.05,
      pulse: 0,
    }));

    const originX = () => width * 0.85;
    const originY = () => height * 0.15;

    function drawFrame(angle: number | null) {
      ctx!.clearRect(0, 0, width, height);

      // links
      ctx!.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < LINK_DISTANCE) {
            ctx!.strokeStyle = `rgba(140,140,135,${0.09 * (1 - dist / LINK_DISTANCE)})`;
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(b.x, b.y);
            ctx!.stroke();
          }
        }
      }

      // nodes
      for (const n of nodes) {
        const r = 1.5 + n.pulse * 2.4;
        ctx!.beginPath();
        ctx!.fillStyle =
          n.pulse > 0.04
            ? `rgba(208,59,59,${0.2 + n.pulse * 0.55})`
            : "rgba(140,140,135,0.2)";
        ctx!.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx!.fill();
      }

      // radar sweep trail
      if (angle !== null) {
        const ox = originX();
        const oy = originY();
        const sweepLength = Math.hypot(width, height);
        for (let i = 0; i < TRAIL_STEPS; i++) {
          const a = angle - (i / TRAIL_STEPS) * TRAIL_SPAN;
          const alpha = 0.05 * (1 - i / TRAIL_STEPS);
          ctx!.strokeStyle = `rgba(140,140,135,${alpha})`;
          ctx!.beginPath();
          ctx!.moveTo(ox, oy);
          ctx!.lineTo(ox + Math.cos(a) * sweepLength, oy + Math.sin(a) * sweepLength);
          ctx!.stroke();
        }
      }
    }

    if (reduced) {
      // One static frame, no motion at all.
      drawFrame(null);
      return () => window.removeEventListener("resize", resize);
    }

    let raf = 0;
    let visible = !document.hidden;
    const start = performance.now();

    function tick(now: number) {
      if (!visible) return;

      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -20) n.x = width + 20;
        if (n.x > width + 20) n.x = -20;
        if (n.y < -20) n.y = height + 20;
        if (n.y > height + 20) n.y = -20;
        n.pulse = Math.max(0, n.pulse - 0.01);
      }

      // Bounded to [0, 2π) regardless of how long the page stays open.
      const rotations = (now - start) / SWEEP_PERIOD_MS;
      const angle = (rotations % 1) * Math.PI * 2;
      const ox = originX();
      const oy = originY();

      for (const n of nodes) {
        const nodeAngle = Math.atan2(n.y - oy, n.x - ox);
        const diff = Math.abs(((nodeAngle - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        if (diff < 0.05) n.pulse = 1;
      }

      drawFrame(angle);
      raf = requestAnimationFrame(tick);
    }

    function onVisibility() {
      visible = !document.hidden;
      if (visible) raf = requestAnimationFrame(tick);
      else cancelAnimationFrame(raf);
    }
    document.addEventListener("visibilitychange", onVisibility);

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
    />
  );
}
