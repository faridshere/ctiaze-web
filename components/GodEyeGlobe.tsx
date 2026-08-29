"use client";
import { useEffect, useRef } from "react";

// Photorealistic WebGL Earth (real NASA day/night satellite textures from
// /public/textures), day/night terminator, atmosphere, and the lit
// Caucasus/Central-Asia/Türkiye region with live threat pings. Decorative
// (aria-hidden); the hero value prop, stats and CTA are real DOM above it.
export function GodEyeGlobe() {
  const wrap = useRef<HTMLDivElement>(null);
  const skyRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrapEl = wrap.current, sky = skyRef.current, glc = glRef.current;
    if (!wrapEl || !sky || !glc) return;
    const sctx = sky.getContext("2d")!;
    const GL = (glc.getContext("webgl", { antialias: true, alpha: true, premultipliedAlpha: false }) ||
      glc.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!GL) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = matchMedia("(pointer: fine)").matches;
    const D2R = Math.PI / 180;
    let W = 0, H = 0, DPR = 1;

    let stars: { x: number; y: number; r: number; t: number; s: number }[] = [];
    const buildStars = () => { stars = []; const n = 260; for (let i = 0; i < n; i++) stars.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.3 + 0.2, t: Math.random() * 6.28, s: 0.4 + Math.random() }); };
    const drawSky = (now: number) => { sctx.clearRect(0, 0, W, H); for (const st of stars) { const tw = reduce ? 0.7 : 0.5 + 0.5 * Math.sin(now * 0.001 * st.s + st.t); sctx.fillStyle = `rgba(200,220,240,${(0.08 + tw * 0.42).toFixed(3)})`; sctx.beginPath(); sctx.arc(st.x * W, st.y * H, st.r, 0, 7); sctx.fill(); } };

    const ident = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    const persp = (fovy: number, asp: number, n: number, f: number) => { const t = 1 / Math.tan(fovy / 2), o = ident(); o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f); o[15] = 0; return o; };
    const transZ = (z: number) => { const o = ident(); o[14] = z; return o; };
    const rotX = (a: number) => { const c = Math.cos(a), s = Math.sin(a), o = ident(); o[5] = c; o[6] = s; o[9] = -s; o[10] = c; return o; };
    const rotY = (a: number) => { const c = Math.cos(a), s = Math.sin(a), o = ident(); o[0] = c; o[2] = -s; o[8] = s; o[10] = c; return o; };
    const mul = (a: number[], b: number[]) => { const o = new Array(16); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o as number[]; };
    const m3 = (m: number[]) => [m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]];

    const sphere = (seg: number) => { const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = []; for (let y = 0; y <= seg; y++) { const v = y / seg, lat = 90 - v * 180, la = lat * D2R; for (let x = 0; x <= seg; x++) { const u = x / seg, lon = -180 + u * 360, lo = lon * D2R, cl = Math.cos(la); const px = cl * Math.cos(lo), py = Math.sin(la), pz = cl * Math.sin(lo); pos.push(px, py, pz); nor.push(px, py, pz); uv.push(u, v); } } for (let y = 0; y < seg; y++) for (let x = 0; x < seg; x++) { const a = y * (seg + 1) + x, b = a + seg + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); } return { pos, nor, uv, idx }; };
    const shd = (t: number, src: string) => { const s = GL.createShader(t)!; GL.shaderSource(s, src); GL.compileShader(s); return s; };
    const prog = (vs: string, fs: string) => { const p = GL.createProgram()!; GL.attachShader(p, shd(GL.VERTEX_SHADER, vs)); GL.attachShader(p, shd(GL.FRAGMENT_SHADER, fs)); GL.linkProgram(p); return p; };

    const earthVS = "attribute vec3 position;attribute vec3 normal;attribute vec2 uv;uniform mat4 uP,uV,uM;uniform mat3 uN;varying vec3 vN;varying vec2 vUv;varying vec3 vVP;void main(){vec4 vp=uV*uM*vec4(position,1.0);vVP=vp.xyz;vN=uN*normal;vUv=uv;gl_Position=uP*vp;}";
    const earthFS = "precision highp float;varying vec3 vN;varying vec2 vUv;varying vec3 vVP;uniform sampler2D day;uniform sampler2D night;uniform vec3 sun;uniform float time;void main(){vec3 N=normalize(vN);float s=dot(N,normalize(sun));vec3 d=texture2D(day,vUv).rgb;vec3 nl=texture2D(night,vUv).rgb;float df=smoothstep(-0.10,0.26,s);vec3 col=mix(nl*1.68,d*0.92,df);vec3 cam=normalize(-vVP);float fres=pow(1.0-max(dot(N,cam),0.0),3.0);col+=vec3(0.20,0.46,0.70)*fres*0.82;col+=vec3(0.92,0.44,0.20)*pow(max(df,0.0),2.0)*0.06;float lon=vUv.x*360.0-180.0;float lat=90.0-vUv.y*180.0;float a=(lat-41.0)/11.0;float b=(lon-56.0)/33.0;float rf=clamp(1.0-(a*a+b*b),0.0,1.0);float pulse=0.6+0.4*sin(time*1.6);col+=vec3(1.0,0.40,0.16)*rf*(0.16+0.12*pulse);gl_FragColor=vec4(col,1.0);}";
    const ptVS = "attribute vec3 position;attribute float aSize;attribute float aAge;uniform mat4 uP,uV,uM;varying float vAge;void main(){vec4 vp=uV*uM*vec4(position*1.008,1.0);gl_Position=uP*vp;gl_PointSize=aSize;vAge=aAge;}";
    const ptFS = "precision highp float;varying float vAge;uniform vec3 uCol;void main(){vec2 c=gl_PointCoord-0.5;float d=length(c);if(d>0.5)discard;float g=smoothstep(0.5,0.0,d);gl_FragColor=vec4(uCol,g*(1.0-vAge*0.8));}";

    const pEarth = prog(earthVS, earthFS), pPt = prog(ptVS, ptFS);
    const glUseProgram = GL.useProgram.bind(GL);
    const AU = (pr: WebGLProgram, n: string) => GL.getAttribLocation(pr, n);
    const UU = (pr: WebGLProgram, n: string) => GL.getUniformLocation(pr, n);
    const eL = { pos: AU(pEarth, "position"), nor: AU(pEarth, "normal"), uv: AU(pEarth, "uv"), uP: UU(pEarth, "uP"), uV: UU(pEarth, "uV"), uM: UU(pEarth, "uM"), uN: UU(pEarth, "uN"), sun: UU(pEarth, "sun"), time: UU(pEarth, "time"), day: UU(pEarth, "day"), night: UU(pEarth, "night") };
    const pL = { pos: AU(pPt, "position"), size: AU(pPt, "aSize"), age: AU(pPt, "aAge"), uP: UU(pPt, "uP"), uV: UU(pPt, "uV"), uM: UU(pPt, "uM"), uCol: UU(pPt, "uCol") };
    const geo = sphere(64);
    const buf = (data: number[], el?: boolean) => { const b = GL.createBuffer()!; GL.bindBuffer(el ? GL.ELEMENT_ARRAY_BUFFER : GL.ARRAY_BUFFER, b); GL.bufferData(el ? GL.ELEMENT_ARRAY_BUFFER : GL.ARRAY_BUFFER, el ? new Uint16Array(data) : new Float32Array(data), GL.STATIC_DRAW); return b; };
    const vboP = buf(geo.pos), vboN = buf(geo.nor), vboU = buf(geo.uv), ibo = buf(geo.idx, true), ptBuf = GL.createBuffer();
    let texDay: WebGLTexture | null = null, texNight: WebGLTexture | null = null, ready = false;
    const loadTex = (url: string) => new Promise<WebGLTexture>((res) => { const img = new Image(); img.onload = () => { const t = GL.createTexture()!; GL.bindTexture(GL.TEXTURE_2D, t); GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.REPEAT); GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE); GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.LINEAR_MIPMAP_LINEAR); GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.LINEAR); GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, GL.RGBA, GL.UNSIGNED_BYTE, img); GL.generateMipmap(GL.TEXTURE_2D); res(t); }; img.src = url; });

    const LAT0 = 41, LON0 = 56, DLAT = 10, DLON = 34;
    const wvec = (lat: number, lon: number) => { const la = lat * D2R, lo = lon * D2R, cl = Math.cos(la); return [cl * Math.cos(lo), Math.sin(la), cl * Math.sin(lo)]; };
    const regionF = (lat: number, lon: number) => { const a = (lat - LAT0) / DLAT, b = ((lon - LON0 + 540) % 360 - 180) / DLON, r = a * a + b * b; return r < 1 ? 1 - r : 0; };
    type Threat = { w: number[]; born: number; life: number; nixAt: number; nixed: boolean };
    const threats: Threat[] = []; const anchor = wvec(40.4, 49.9);
    const spawn = () => { let lat = 0, lon = 0, rf = 0, tr = 0; do { lat = LAT0 + (Math.random() * 2 - 1) * DLAT; lon = LON0 + (Math.random() * 2 - 1) * DLON; rf = regionF(lat, lon); tr++; } while (rf < 0.14 && tr < 10); threats.push({ w: wvec(lat, lon), born: performance.now(), life: 3000 + Math.random() * 3200, nixAt: 1100 + Math.random() * 2400, nixed: false }); };

    const yawBase = -34 * D2R, pitchBase = 20 * D2R, t0 = performance.now();
    let dragYaw = 0, dragPitch = 0, mpx = 0, mpy = 0;

    const resize = () => { DPR = Math.min(window.devicePixelRatio || 1, 1.7); W = wrapEl.clientWidth; H = wrapEl.clientHeight;
      [sky, glc].forEach((c) => { c.width = Math.floor(W * DPR); c.height = Math.floor(H * DPR); }); sctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      GL.viewport(0, 0, glc.width, glc.height); buildStars(); drawSky(performance.now()); };

    let saLast = 0;
    const draw = (now: number) => {
      const tsec = (now - t0) / 1000;
      GL.clearColor(0, 0, 0, 0); GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT); GL.enable(GL.DEPTH_TEST); GL.depthFunc(GL.LEQUAL);
      const asp = glc.width / glc.height, P = persp(42 * D2R, asp, 0.1, 10), camZ = W < 1000 ? 3.15 : 2.95;
      let Vv = transZ(-camZ); if (W >= 1000) { const tx = ident(); tx[12] = 1.05; Vv = mul(tx, Vv); }
      const yaw = yawBase + dragYaw + (reduce ? 0 : tsec * 0.012 + mpx * 0.05);
      const pitch = Math.max(-1.2, Math.min(1.2, pitchBase + dragPitch + mpy * 0.04));
      const Mm = mul(rotX(pitch), rotY(yaw)), Nm = m3(Mm);
      glUseProgram(pEarth);
      const bindA = (l: number, vbo: WebGLBuffer | null, size: number) => { GL.bindBuffer(GL.ARRAY_BUFFER, vbo); GL.enableVertexAttribArray(l); GL.vertexAttribPointer(l, size, GL.FLOAT, false, 0, 0); };
      bindA(eL.pos, vboP, 3); bindA(eL.nor, vboN, 3); bindA(eL.uv, vboU, 2);
      GL.uniformMatrix4fv(eL.uP, false, new Float32Array(P));
      GL.uniformMatrix4fv(eL.uV, false, new Float32Array(Vv));
      GL.uniformMatrix4fv(eL.uM, false, new Float32Array(Mm));
      GL.uniformMatrix3fv(eL.uN, false, new Float32Array(Nm));
      GL.uniform3f(eL.sun, -0.52, 0.26, -0.81); GL.uniform1f(eL.time, tsec);
      GL.activeTexture(GL.TEXTURE0); GL.bindTexture(GL.TEXTURE_2D, texDay); GL.uniform1i(eL.day, 0);
      GL.activeTexture(GL.TEXTURE1); GL.bindTexture(GL.TEXTURE_2D, texNight); GL.uniform1i(eL.night, 1);
      GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, ibo); GL.drawElements(GL.TRIANGLES, geo.idx.length, GL.UNSIGNED_SHORT, 0);
      if (!reduce && now - saLast > 950) { saLast = now; if (threats.length < 9) spawn(); }
      const pd: number[] = [];
      for (let j = threats.length - 1; j >= 0; j--) { const th = threats[j], age = now - th.born; if (age > th.life) { threats.splice(j, 1); continue; } if (!reduce && age > th.nixAt) th.nixed = true; const k = Math.min(age / 380, 1), size = (th.nixed ? 5 : 6 + (1 - k) * 22) * DPR, agev = th.nixed ? Math.min((age - th.nixAt) / 700, 1) : 0; pd.push(th.w[0], th.w[1], th.w[2], size, agev, 0); }
      pd.push(anchor[0], anchor[1], anchor[2], (7 + 2 * Math.sin(now * 0.004)) * DPR, 0, 1);
      glUseProgram(pPt);
      GL.uniformMatrix4fv(pL.uP, false, new Float32Array(P));
      GL.uniformMatrix4fv(pL.uV, false, new Float32Array(Vv));
      GL.uniformMatrix4fv(pL.uM, false, new Float32Array(Mm));
      GL.enable(GL.BLEND); GL.blendFunc(GL.SRC_ALPHA, GL.ONE); GL.depthMask(false);
      const stride = 24; GL.bindBuffer(GL.ARRAY_BUFFER, ptBuf); GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(pd), GL.DYNAMIC_DRAW);
      GL.enableVertexAttribArray(pL.pos); GL.vertexAttribPointer(pL.pos, 3, GL.FLOAT, false, stride, 0);
      GL.enableVertexAttribArray(pL.size); GL.vertexAttribPointer(pL.size, 1, GL.FLOAT, false, stride, 12);
      GL.enableVertexAttribArray(pL.age); GL.vertexAttribPointer(pL.age, 1, GL.FLOAT, false, stride, 16);
      const count = pd.length / 6;
      GL.uniform3f(pL.uCol, 1.0, 0.38, 0.14); GL.drawArrays(GL.POINTS, 0, count - 1);
      GL.uniform3f(pL.uCol, 0.72, 0.92, 0.98); GL.drawArrays(GL.POINTS, count - 1, 1);
      GL.depthMask(true); GL.disable(GL.BLEND);
    };

    let raf = 0, running = false, lastF = performance.now(), skyAcc = 0;
    const frame = (now: number) => { if (!running) return; const dt = now - lastF; lastF = now; if (dt > 15 && ready) { draw(now); skyAcc += dt; if (skyAcc > 90) { skyAcc = 0; drawSky(now); } } raf = requestAnimationFrame(frame); };
    const start = () => { if (running) return; running = true; lastF = performance.now(); raf = requestAnimationFrame(frame); };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    let dragging = false, lx = 0, ly = 0;
    const onDown = (e: PointerEvent) => { dragging = true; lx = e.clientX; ly = e.clientY; glc.classList.add("dragging"); };
    const onMove = (e: PointerEvent) => { if (dragging) { dragYaw += (e.clientX - lx) * 0.006; dragPitch += (e.clientY - ly) * 0.006; lx = e.clientX; ly = e.clientY; } else { mpx = e.clientX / W - 0.5; mpy = e.clientY / H - 0.5; } };
    const onUp = () => { dragging = false; glc.classList.remove("dragging"); };
    if (fine) { glc.style.pointerEvents = "auto"; glc.addEventListener("pointerdown", onDown); glc.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp); } else glc.style.pointerEvents = "none";

    resize();
    const ro = new ResizeObserver(() => resize()); ro.observe(wrapEl);
    const onVis = () => (document.hidden ? stop() : start());
    let io: IntersectionObserver | null = null;
    Promise.all([loadTex("/textures/earth-day.jpg"), loadTex("/textures/earth-night.png")]).then(([d, n]) => {
      texDay = d; texNight = n; ready = true;
      if (reduce) { draw(performance.now()); return; }
      document.addEventListener("visibilitychange", onVis);
      if ("IntersectionObserver" in window) { io = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? start() : stop())), { threshold: 0.03 }); io.observe(wrapEl); }
      else start();
    });

    return () => { stop(); ro.disconnect(); io?.disconnect(); document.removeEventListener("visibilitychange", onVis); if (fine) { glc.removeEventListener("pointerdown", onDown); glc.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); } };
  }, []);

  return (
    <div ref={wrap} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <canvas ref={skyRef} className="absolute inset-0 h-full w-full" />
      <canvas ref={glRef} className="absolute inset-0 h-full w-full [cursor:grab] [&.dragging]:cursor-grabbing" />
    </div>
  );
}
