"use client";

import { useEffect, useRef, useState } from "react";

// The aurora silk, rendered live. Xintra ships this as a looping video; we draw
// it as a fragment shader instead — a few KB, resolution-independent, and no
// loop seam. Long fibres of domain-warped noise along the -24° silk axis; two
// bright bands travel across the fibres at different speeds (the motion you
// actually see — sliding noise along a stretched fibre barely reads), one faint
// orange pass, and a single load-time sweep timed to the headline landing.
//
// Cost discipline: half-resolution buffer (capped), 60fps on fine pointers /
// 30fps on touch, paused when the hero is off-screen or the tab is hidden, a
// single frame under reduced motion, and the old CSS streaks as the fallback
// when WebGL is unavailable.
const VS = "attribute vec2 p;varying vec2 v;void main(){v=p*0.5+0.5;gl_Position=vec4(p,0.0,1.0);}";
const FS = `precision mediump float;varying vec2 v;uniform float t;uniform vec2 r;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(h(i),h(i+vec2(1.0,0.0)),f.x),mix(h(i+vec2(0.0,1.0)),h(i+vec2(1.0,1.0)),f.x),f.y);}
float fbm(vec2 p){float s=0.0,a=0.5;for(int i=0;i<4;i++){s+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=0.5;}return s;}
float band(float y,float c,float w){return exp(-pow((y-c)*w,2.0));}
void main(){
  vec2 uv=v;uv.x*=r.x/r.y;
  float c=cos(-0.42),s=sin(-0.42);
  vec2 q=mat2(c,-s,s,c)*(uv-vec2(0.85,0.55));
  // fibres: stretched 16x across, sliding slowly along and across
  vec2 w=vec2(q.x*0.9+t*0.20,q.y*16.0-t*0.06);
  float f=fbm(w+0.5*fbm(w*1.5-t*0.05));
  float silk=smoothstep(0.58,0.96,f);
  // two bands travelling across the fibres at different rates (counter-phase)
  float b1=band(q.y,-0.05+0.42*sin(t*0.50),1.9);
  float b2=band(q.y,0.30+0.36*sin(t*0.31+2.1),2.6)*0.7;
  // one-shot sweep on load: crosses the hero as the headline lands (0.35s → 1.6s)
  float st=clamp((t-0.35)/1.25,0.0,1.0);
  float sweep=band(q.y,mix(-0.9,0.9,st),3.2)*sin(st*3.14159)*1.6;
  float vign=smoothstep(1.35,0.15,length((v-0.5)*vec2(1.5,1.25)));
  vec3 cyan=vec3(0.36,0.82,0.92),blue=vec3(0.16,0.36,0.66),orange=vec3(1.0,0.42,0.14),white=vec3(0.82,0.96,1.0);
  vec3 col=mix(blue,cyan,silk)*silk*(b1+b2);
  col+=white*silk*sweep;
  float ob=band(q.y,0.55,3.2)*smoothstep(0.55,0.92,fbm(w*0.8+3.1));
  col+=orange*ob*0.22;
  col*=vign*1.05;
  gl_FragColor=vec4(col,1.0);
}`;

const FALLBACK: React.CSSProperties[] = [
  { width: 1600, height: 330, left: -220, top: 40, background: "linear-gradient(100deg, transparent 5%, rgba(38,90,150,0.5) 30%, rgba(111,211,230,0.46) 52%, rgba(38,70,140,0.32) 72%, transparent 95%)" },
  { width: 1500, height: 210, left: -120, top: 240, background: "linear-gradient(100deg, transparent 8%, rgba(111,211,230,0.38) 40%, rgba(150,200,235,0.3) 60%, transparent 92%)" },
  { width: 1200, height: 150, left: 60, top: 400, background: "linear-gradient(100deg, transparent, rgba(255,90,31,0.14) 45%, rgba(255,140,80,0.09) 62%, transparent)" },
];

const MAX_W = 1200;

export function AuroraCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false, powerPreference: "low-power" });
    if (!gl) { setFallback(true); return; }

    const compile = (type: number, src: string) => { const sh = gl.createShader(type)!; gl.shaderSource(sh, src); gl.compileShader(sh); return sh; };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { setFallback(true); return; }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aP = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(aP);
    gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 0, 0);
    const uT = gl.getUniformLocation(prog, "t");
    const uR = gl.getUniformLocation(prog, "r");

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frameMs = matchMedia("(pointer: fine)").matches ? 0 : 1000 / 30;
    const t0 = performance.now();
    let raf = 0, last = 0, visible = true, alive = true;

    const resize = () => {
      const w = canvas.clientWidth, hgt = canvas.clientHeight;
      const scale = Math.min(0.5, MAX_W / Math.max(1, w));
      canvas.width = Math.max(1, Math.floor(w * scale));
      canvas.height = Math.max(1, Math.floor(hgt * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uR, canvas.width, canvas.height);
    };
    const draw = (now: number) => {
      gl.uniform1f(uT, (now - t0) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const frame = (now: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden || now - last < frameMs) return;
      last = now;
      draw(now);
    };

    resize();
    // the static frame shows the silk settled (sweep already passed)
    draw(reduce ? t0 + 4000 : t0);
    if (!reduce) raf = requestAnimationFrame(frame);

    const ro = new ResizeObserver(() => { resize(); draw(performance.now()); });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.02 });
    io.observe(canvas);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  if (fallback) {
    return (
      <>
        {FALLBACK.map((st, i) => (
          <div
            key={i}
            aria-hidden
            className="aurora-streak pointer-events-none absolute rounded-full"
            style={{ ...st, filter: "blur(70px)", transform: "rotate(-24deg)", mixBlendMode: "screen", animationDelay: `${i * -3.2}s` }}
          />
        ))}
      </>
    );
  }
  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ mixBlendMode: "screen" }}
    />
  );
}
