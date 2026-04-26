"use client";

import { useEffect, useRef } from "react";

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

// Value noise, 2 octaves, domain-warped for organic flow.
// alpha: up to 0.28 (light) / 0.55 (dark) so it's clearly visible.
const FRAG = `
precision mediump float;
uniform float uTime;
uniform float uDark;
uniform vec2  uRes;

float hash(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i),             hash(i + vec2(1,0)), f.x),
    mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x),
    f.y
  );
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float t  = uTime * 0.06;
  float ar = uRes.x / uRes.y;
  vec2  st = vec2(uv.x * ar, uv.y);

  // domain-warp: offset st by a slow noise field
  vec2 warp = vec2(
    noise(st * 1.2 + vec2(t * 0.5, t * 0.3)),
    noise(st * 1.2 + vec2(t * 0.3, t * 0.7) + 5.2)
  ) * 0.6 - 0.3;

  float n = noise((st + warp) * 1.4 + vec2(t, t * 0.5)) * 0.65
          + noise((st + warp) * 2.8 + vec2(-t * 0.4, t * 0.8)) * 0.35;
  n = clamp(n, 0.0, 1.0);

  // indigo → violet colour band
  vec3 ca  = vec3(0.33, 0.35, 0.96);
  vec3 cb  = vec3(0.55, 0.18, 0.90);
  vec3 col = mix(ca, cb, uv.x * 0.5 + n * 0.5);

  // more visible alpha: light 0-0.28, dark 0-0.55
  float maxA = uDark > 0.5 ? 0.55 : 0.28;
  float alpha = n * maxA;
  gl_FragColor = vec4(col, alpha);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return s;
}

export function WebGLBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false });
    if (!gl) return;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, "uTime");
    const uDark = gl.getUniformLocation(prog, "uDark");
    const uRes  = gl.getUniformLocation(prog, "uRes");

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    let dark = mq.matches ? 1.0 : 0.0;
    const onMq = (e: MediaQueryListEvent) => { dark = e.matches ? 1.0 : 0.0; };
    mq.addEventListener("change", onMq);

    let raf = 0;
    let start = 0;

    const resize = () => {
      canvas.width  = window.innerWidth  * devicePixelRatio;
      canvas.height = window.innerHeight * devicePixelRatio;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    const tick = (ts: number) => {
      if (!start) start = ts;
      gl.uniform1f(uTime, (ts - start) * 0.001);
      gl.uniform1f(uDark, dark);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      mq.removeEventListener("change", onMq);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
