"use client";
import { useEffect, useRef } from "react";
import { LANDMASK, MROWS, MCOLS } from "@/lib/landmask";

// God's-eye globe — Canvas 2D, no libraries. Real Natural-Earth continents,
// a lit Caucasus/Central-Asia/Türkiye region, regional city lights, and live
// "nix" threat choreography. Decorative (aria-hidden); the hero's value prop,
// stats and CTA live as real DOM above it.
export function GodEyeGlobe() {
  const wrap = useRef<HTMLDivElement>(null);
  const skyRef = useRef<HTMLCanvasElement>(null);
  const globeRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrapEl = wrap.current, sky = skyRef.current, cv = globeRef.current;
    if (!wrapEl || !sky || !cv) return;
    const sctx = sky.getContext("2d")!, ctx = cv.getContext("2d")!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = matchMedia("(pointer: fine)").matches;
    const D2R = Math.PI / 180;

    // decode land mask
    const bin = atob(LANDMASK); const bits = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bits[i] = bin.charCodeAt(i);
    const isLand = (lat: number, lon: number) => {
      let r = (90 - lat) | 0; if (r < 0) r = 0; if (r >= MROWS) r = MROWS - 1;
      const c = ((((lon + 180) | 0) % MCOLS) + MCOLS) % MCOLS; const idx = r * MCOLS + c;
      return (bits[idx >> 3] >> (7 - (idx & 7))) & 1;
    };

    let W = 0, H = 0, DPR = 1, cx = 0, cy = 0, R = 0, small = false;
    const LAT0 = 41, LON0 = 56, DLAT = 10, DLON = 34;
    const SEAS = [[43, 34.5, 4, 7.5], [41.5, 50.6, 5.6, 3.2], [45, 59, 1.8, 3]];
    const inEll = (lat: number, lon: number, e: number[]) => { const a = (lat - e[0]) / e[2], b = ((lon - e[1] + 540) % 360 - 180) / e[3]; return a * a + b * b < 1; };
    const regionF = (lat: number, lon: number) => { const a = (lat - LAT0) / DLAT, b = ((lon - LON0 + 540) % 360 - 180) / DLON, r = a * a + b * b; return r < 1 ? 1 - r : 0; };
    const inSea = (lat: number, lon: number) => SEAS.some((e) => inEll(lat, lon, e));
    const wvec = (lat: number, lon: number): number[] => { const la = lat * D2R, lo = lon * D2R, cl = Math.cos(la); return [cl * Math.cos(lo), Math.sin(la), cl * Math.sin(lo)]; };
    const project = (w: number[], yaw: number, pitch: number) => {
      const x1 = w[0] * Math.cos(yaw) + w[2] * Math.sin(yaw), z1 = -w[0] * Math.sin(yaw) + w[2] * Math.cos(yaw), y1 = w[1];
      const y2 = y1 * Math.cos(pitch) - z1 * Math.sin(pitch), z2 = y1 * Math.sin(pitch) + z1 * Math.cos(pitch);
      return [x1, y2, z2];
    };
    const yawBase = -56 * D2R, pitchBase = 24 * D2R, t0 = performance.now();
    let dragYaw = 0, dragPitch = 0, mpx = 0, mpy = 0;
    const CITIES: number[][] = [[40.4, 49.9, 1], [41.7, 44.8, 0], [40.2, 44.5, 0], [41.0, 29.0, 1], [39.9, 32.9, 0], [43.2, 76.9, 1], [41.3, 69.2, 0], [51.1, 71.4, 0], [37.9, 58.4, 0], [42.9, 74.6, 0], [35.7, 51.4, 0], [47.1, 51.9, 0]];
    const anchor = wvec(40.4, 49.9);

    type Pt = { w: number[]; lat: number; lon: number; rf: number; land: number };
    let pts: Pt[] = [];
    const build = () => { pts = []; const la = small ? 4 : 3;
      for (let lat = -88; lat <= 88; lat += la) { const lo = la / Math.max(0.28, Math.cos(lat * D2R));
        for (let lon = -180; lon < 180; lon += lo) { const rf = regionF(lat, lon); if (rf > 0 && inSea(lat, lon)) continue; pts.push({ w: wvec(lat, lon), lat, lon, rf, land: isLand(lat, lon) }); } } };
    const sunVec = (now: number) => { const lon = (now * 0.000012) % (Math.PI * 2), lat = 8 * D2R, cl = Math.cos(lat); return [cl * Math.cos(lon), Math.sin(lat), cl * Math.sin(lon)]; };

    type Threat = { w: number[]; born: number; life: number; nixAt: number; nixed: boolean; arc: number };
    let threats: Threat[] = []; let heat: { w: number[]; born: number }[] = [];
    const spawn = () => { let lat = 0, lon = 0, rf = 0, tr = 0;
      do { lat = LAT0 + (Math.random() * 2 - 1) * DLAT; lon = LON0 + (Math.random() * 2 - 1) * DLON; rf = regionF(lat, lon); tr++; } while ((rf < 0.14 || inSea(lat, lon) || !isLand(lat, lon)) && tr < 14);
      threats.push({ w: wvec(lat, lon), born: performance.now(), life: 2800 + Math.random() * 3400, nixAt: 1000 + Math.random() * 2600, nixed: false, arc: 0 }); };

    let stars: { x: number; y: number; r: number; t: number; s: number }[] = [];
    const buildStars = () => { stars = []; const n = small ? 100 : 220; for (let i = 0; i < n; i++) stars.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.3 + 0.2, t: Math.random() * 6.28, s: 0.4 + Math.random() }); };
    const drawSky = (now: number) => { sctx.clearRect(0, 0, W, H); for (const st of stars) { const tw = reduce ? 0.7 : 0.5 + 0.5 * Math.sin(now * 0.001 * st.s + st.t); sctx.fillStyle = `rgba(200,220,240,${(0.1 + tw * 0.5).toFixed(3)})`; sctx.beginPath(); sctx.arc(st.x * W, st.y * H, st.r, 0, 7); sctx.fill(); } };

    const resize = () => { DPR = Math.min(window.devicePixelRatio || 1, 1.6); W = wrapEl.clientWidth; H = wrapEl.clientHeight; small = W < 860;
      [sky, cv].forEach((c) => { c.width = Math.floor(W * DPR); c.height = Math.floor(H * DPR); c.getContext("2d")!.setTransform(DPR, 0, 0, DPR, 0, 0); });
      cx = W * (W < 1000 ? 0.5 : 0.66); cy = H * 0.5; R = Math.min(W, H) * (small ? 0.58 : 0.5); build(); buildStars(); drawSky(performance.now()); };

    const draw = (now: number) => {
      ctx.clearRect(0, 0, W, H);
      const yaw = yawBase + dragYaw + (reduce ? 0 : Math.sin(now * 0.00004) * 0.05 + mpx * 0.04);
      const pitch = Math.max(-1.2, Math.min(1.2, pitchBase + dragPitch + (reduce ? 0 : Math.sin(now * 0.00003) * 0.016 + mpy * 0.03)));
      const sun = sunVec(reduce ? t0 + 3e5 : now);
      const g = ctx.createRadialGradient(cx - R * 0.32, cy - R * 0.36, R * 0.1, cx, cy, R * 1.02);
      g.addColorStop(0, "#101a24"); g.addColorStop(.5, "#0a1119"); g.addColorStop(.85, "#070c12"); g.addColorStop(1, "#04070b");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
      const atm = ctx.createRadialGradient(cx, cy, R * 0.88, cx, cy, R * 1.16);
      atm.addColorStop(0, "rgba(111,211,230,0)"); atm.addColorStop(.55, "rgba(111,211,230,0.11)"); atm.addColorStop(1, "rgba(111,211,230,0)");
      ctx.fillStyle = atm; ctx.beginPath(); ctx.arc(cx, cy, R * 1.16, 0, 7); ctx.fill();
      const rc = project(wvec(LAT0, LON0), yaw, pitch);
      if (rc[2] > -0.15) { const gx = cx + rc[0] * R, gy = cy - rc[1] * R, rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, R * 0.6); rg.addColorStop(0, "rgba(255,90,31,0.22)"); rg.addColorStop(.5, "rgba(255,90,31,0.07)"); rg.addColorStop(1, "rgba(255,90,31,0)"); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(gx, gy, R * 0.6, 0, 7); ctx.fill(); }
      for (const p of pts) { const v = project(p.w, yaw, pitch); if (v[2] <= 0.02) continue; const sx = cx + v[0] * R, sy = cy - v[1] * R, depth = v[2]; const illum = p.w[0] * sun[0] + p.w[1] * sun[1] + p.w[2] * sun[2], night = illum < 0;
        if (p.rf > 0) { const b = p.rf * (0.5 + 0.5 * depth) * (night ? 1.16 : 1);
          if (p.land) { const sz = p.rf > 0.5 ? 2.1 : 1.6; ctx.fillStyle = `rgba(255,${120 + ((1 - p.rf) * 70 | 0)},${48 + ((1 - p.rf) * 22 | 0)},${(0.34 + b * 0.58).toFixed(3)})`; ctx.fillRect(sx - sz / 2, sy - sz / 2, sz, sz); }
          else { ctx.fillStyle = `rgba(255,150,90,${(0.09 + b * 0.16).toFixed(3)})`; ctx.fillRect(sx, sy, 1.2, 1.2); } }
        else if (p.land) { const db = (0.16 + 0.22 * depth) * (night ? 0.5 : 1); ctx.fillStyle = `rgba(126,146,172,${db.toFixed(3)})`; ctx.fillRect(sx, sy, 1.5, 1.5); }
        else if ((p.lat | 0) % 10 === 0 && Math.round(p.lon) % 10 === 0) { ctx.fillStyle = `rgba(66,84,108,${(0.09 + 0.11 * depth).toFixed(3)})`; ctx.fillRect(sx, sy, 1, 1); } }
      for (const C of CITIES) { const cvp = project(wvec(C[0], C[1]), yaw, pitch); if (cvp[2] <= 0.03) continue; const cxp = cx + cvp[0] * R, cyp = cy - cvp[1] * R; ctx.save(); ctx.shadowBlur = C[2] ? 9 : 5; ctx.shadowColor = "#FFB27A"; ctx.fillStyle = C[2] ? "rgba(255,220,180,0.95)" : "rgba(255,180,120,0.8)"; ctx.beginPath(); ctx.arc(cxp, cyp, C[2] ? 1.7 : 1.2, 0, 7); ctx.fill(); ctx.restore(); }
      ctx.strokeStyle = "rgba(111,211,230,0.18)"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(cx, cy, R + 1, 0, 7); ctx.stroke();
      const av = project(anchor, yaw, pitch), ax = cx + av[0] * R, ay = cy - av[1] * R, aVis = av[2] > 0.02;
      if (aVis) { ctx.save(); ctx.shadowBlur = 13; ctx.shadowColor = "#6FD3E6"; ctx.fillStyle = "#B7ECF5"; ctx.beginPath(); ctx.arc(ax, ay, 2.7, 0, 7); ctx.fill(); ctx.restore(); ctx.strokeStyle = `rgba(111,211,230,${(0.3 + 0.3 * Math.sin(now * 0.004)).toFixed(2)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(ax, ay, 6 + 2 * Math.sin(now * 0.004), 0, 7); ctx.stroke(); }
      for (let j = threats.length - 1; j >= 0; j--) { const th = threats[j], age = now - th.born; if (age > th.life) { heat.push({ w: th.w, born: now }); threats.splice(j, 1); continue; }
        const tv = project(th.w, yaw, pitch); if (tv[2] <= 0.02) continue; const tx = cx + tv[0] * R, ty = cy - tv[1] * R, k = Math.min(age / 380, 1);
        if (!reduce && age > th.nixAt && !th.nixed) { th.arc = Math.min((age - th.nixAt) / 520, 1); if (th.arc >= 1) th.nixed = true; }
        if (th.arc > 0 && aVis) { const e = th.arc, mx2 = (ax + tx) / 2, my2 = (ay + ty) / 2 - R * 0.3 * Math.min(e, 1); ctx.strokeStyle = `rgba(111,211,230,${(0.85 * (1 - Math.abs(e - 0.55))).toFixed(3)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx2, my2, ax + (tx - ax) * e, ay + (ty - ay) * e); ctx.stroke(); }
        const settle = th.nixed ? Math.max(0, 1 - (age - th.nixAt - 520) / 300) : 1, rad = (2 + (1 - k) * 9) * settle + (th.nixed ? 0 : 1.6);
        ctx.save(); ctx.shadowBlur = 16 * settle; ctx.shadowColor = "#FF5A1F"; ctx.fillStyle = th.nixed ? `rgba(255,255,255,${settle.toFixed(2)})` : "rgba(255,90,31,0.96)"; ctx.beginPath(); ctx.arc(tx, ty, Math.max(rad, 0.5), 0, 7); ctx.fill(); ctx.restore();
        if (k < 1) { ctx.strokeStyle = `rgba(255,90,31,${(0.5 * (1 - k)).toFixed(3)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(tx, ty, 4 + k * 17, 0, 7); ctx.stroke(); } }
      for (let h = heat.length - 1; h >= 0; h--) { const hm = heat[h], ha = (now - hm.born) / 20000; if (ha >= 1) { heat.splice(h, 1); continue; } const hv = project(hm.w, yaw, pitch); if (hv[2] <= 0.02) continue; const hx = cx + hv[0] * R, hy = cy - hv[1] * R, hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, 11); hg.addColorStop(0, `rgba(255,90,31,${(0.13 * (1 - ha)).toFixed(3)})`); hg.addColorStop(1, "rgba(255,90,31,0)"); ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(hx, hy, 11, 0, 7); ctx.fill(); }
    };

    let raf = 0, running = false, spawnAcc = 0, lastFrame = performance.now(), skyAcc = 0;
    const frame = (now: number) => { if (!running) return; const dt = now - lastFrame; lastFrame = now; if (dt > 15) { draw(now); skyAcc += dt; if (skyAcc > 90) { skyAcc = 0; drawSky(now); } spawnAcc += dt; if (spawnAcc > (small ? 1500 : 950)) { spawnAcc = 0; if (threats.length < (small ? 4 : 8)) spawn(); } } raf = requestAnimationFrame(frame); };
    const start = () => { if (running || reduce) return; running = true; lastFrame = performance.now(); raf = requestAnimationFrame(frame); };
    const stop = () => { running = false; cancelAnimationFrame(raf); };
    const staticFrame = () => { threats = []; heat = []; for (let i = 0; i < 7; i++) spawn(); for (let k = 0; k < 3; k++) { const tt = threats[k]; if (tt) { tt.nixed = true; tt.nixAt = 0; tt.arc = 0.55; } heat.push({ w: wvec(LAT0 + (Math.random() * 2 - 1) * 7, LON0 + (Math.random() * 2 - 1) * 24), born: performance.now() - 9000 }); } drawSky(performance.now()); draw(performance.now()); };

    // drag (desktop / fine pointer only, so mobile scroll is unaffected)
    let dragging = false, lx = 0, ly = 0;
    const onDown = (e: PointerEvent) => { dragging = true; lx = e.clientX; ly = e.clientY; cv.classList.add("dragging"); cv.setPointerCapture?.(e.pointerId); };
    const onMove = (e: PointerEvent) => { if (dragging) { dragYaw += (e.clientX - lx) * 0.006; dragPitch += (e.clientY - ly) * 0.006; lx = e.clientX; ly = e.clientY; if (reduce) draw(performance.now()); } else if (fine) { mpx = e.clientX / W - 0.5; mpy = e.clientY / H - 0.5; } };
    const onUp = () => { dragging = false; cv.classList.remove("dragging"); };
    if (fine) { cv.style.pointerEvents = "auto"; cv.addEventListener("pointerdown", onDown); cv.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp); }
    else cv.style.pointerEvents = "none";

    resize();
    const ro = new ResizeObserver(() => resize());
    ro.observe(wrapEl);
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);
    let io: IntersectionObserver | null = null;
    if (reduce) staticFrame();
    else if ("IntersectionObserver" in window) { io = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? start() : stop())), { threshold: 0.04 }); io.observe(wrapEl); }
    else start();

    return () => { stop(); ro.disconnect(); io?.disconnect(); document.removeEventListener("visibilitychange", onVis); if (fine) { cv.removeEventListener("pointerdown", onDown); cv.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); } };
  }, []);

  return (
    <div ref={wrap} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <canvas ref={skyRef} className="absolute inset-0 h-full w-full" />
      <canvas ref={globeRef} className="absolute inset-0 h-full w-full [cursor:grab] [&.dragging]:cursor-grabbing" />
    </div>
  );
}
