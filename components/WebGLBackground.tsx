"use client";

import { useEffect, useRef } from "react";

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

// Opaque canvas: the shader composites gradient over the page background colour.
// This guarantees the effect is visible — no CSS alpha-compositing issues.
const FRAG = `
precision mediump float;
uniform float uTime;
uniform float uDark;
uniform vec2  uRes;

float hash(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 19.19);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i),             hash(i + vec2(1,0)), f.x),
    mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x),
    f.y
  );
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float ar = uRes.x / uRes.y;
  float t  = uTime * 0.07;
  vec2 st  = vec2(uv.x * ar, uv.y);

  // domain warp for organic flow
  vec2 q = vec2(vnoise(st * 1.1 + vec2(t * 0.6, t * 0.4)),
                vnoise(st * 1.1 + vec2(t * 0.3, t * 0.7) + 4.7)) * 0.55 - 0.275;
  float n = vnoise((st + q) * 1.5 + vec2(t, t * 0.4)) * 0.6
          + vnoise((st + q) * 3.0 + vec2(-t * 0.3, t * 0.6)) * 0.4;
  n = clamp(n, 0.0, 1.0);

  // gradient colours
  vec3 ca = vec3(0.30, 0.32, 0.94); // indigo
  vec3 cb = vec3(0.54, 0.16, 0.89); // violet
  vec3 grad = mix(ca, cb, uv.x * 0.5 + n * 0.5);

  // page background colours
  vec3 bgLight = vec3(1.00, 1.00, 1.00);  // #ffffff
  vec3 bgDark  = vec3(0.039, 0.039, 0.039); // #0a0a0a

  // blend gradient over background — strength tuned per mode
  vec3 bg = uDark > 0.5 ? bgDark : bgLight;
  float strength = n * (uDark > 0.5 ? 0.32 : 0.18);
  vec3 col = mix(bg, grad, strength);

  gl_FragColor = vec4(col, 1.0); // fully opaque — always visible
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error("[WebGL] shader error:", gl.getShaderInfoLog(s));
  }
  return s;
}

export function WebGLBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    // alpha:false → opaque canvas — simpler, guaranteed visible
    const gl = canvas.getContext("webgl", { alpha: false, antialias: false });
    if (!gl) return;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("[WebGL] link error:", gl.getProgramInfoLog(prog));
      return;
    }
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

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    let dark = mq.matches ? 1.0 : 0.0;
    const onMq = (e: MediaQueryListEvent) => { dark = e.matches ? 1.0 : 0.0; };
    mq.addEventListener("change", onMq);

    let raf = 0, start = 0;

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
