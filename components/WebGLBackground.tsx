"use client";

import { useEffect, useRef } from "react";

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

// Warm-toned 3D shader:
//   1. Domain-warped value noise as a height field
//   2. Approximate surface normals → diffuse + specular lighting (3D look)
//   3. Faint perspective grid that slowly scrolls toward viewer
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

// Sample the layered noise at point p
float sampleH(vec2 p, float t) {
  return vnoise(p * 1.4 + vec2(t, t * 0.45)) * 0.60
       + vnoise(p * 2.9 + vec2(-t * 0.3, t * 0.62)) * 0.40;
}

// Subtle perspective grid: lines receding to horizon, scrolling forward
float perspGrid(vec2 uv, float t) {
  float hy = 0.44;
  float dy = uv.y - hy;
  if (dy < 0.003) return 0.0;
  float pz   = 1.0 / (dy * 7.0 + 0.001);
  float px   = (uv.x - 0.5) * pz * 0.9;
  float lineZ = 1.0 - smoothstep(0.0, 0.06 / (dy * 6.0 + 0.5),
                  abs(fract(pz * 0.13 - t * 0.07) - 0.5));
  float lineX = 1.0 - smoothstep(0.0, 0.06 / (dy * 6.0 + 0.5),
                  abs(fract(px * 0.55) - 0.5));
  float fade  = clamp(dy * 2.5, 0.0, 1.0) * clamp((1.0 - uv.y) * 6.0, 0.0, 1.0);
  return max(lineZ, lineX) * fade * 0.14;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float ar = uRes.x / uRes.y;
  float t  = uTime * 0.055;
  vec2 st  = vec2(uv.x * ar, uv.y);

  // --- Domain warp ---
  vec2 q = vec2(vnoise(st * 1.0 + vec2(t * 0.5, t * 0.35)),
                vnoise(st * 1.0 + vec2(t * 0.28, t * 0.65) + 5.1)) * 0.55 - 0.275;
  vec2 wst = st + q;

  // --- Height field + normals for 3D lighting ---
  float e = 1.2 / max(uRes.y, 1.0);
  float h  = sampleH(wst, t);
  float hx = sampleH(wst + vec2(e, 0.0), t);
  float hy2 = sampleH(wst + vec2(0.0, e), t);
  vec3 norm = normalize(vec3((h - hx) / e, (h - hy2) / e, 0.28));

  // Warm key light from upper-right, soft fill
  vec3 keyLight  = normalize(vec3(0.7, 0.9, 1.5));
  vec3 fillLight = normalize(vec3(-0.5, 0.3, 1.0));
  float diffuse  = max(dot(norm, keyLight),  0.0);
  float fill     = max(dot(norm, fillLight), 0.0) * 0.25;
  float specular = pow(max(dot(reflect(-keyLight, norm), vec3(0,0,1)), 0.0), 12.0) * 0.08;
  float lighting = 0.38 + 0.52 * diffuse + fill + specular;

  // --- Warm gradient colours ---
  vec3 ca = vec3(0.88, 0.54, 0.16); // amber
  vec3 cb = vec3(0.76, 0.30, 0.12); // rust / terra-cotta
  vec3 cc = vec3(0.91, 0.72, 0.38); // warm gold highlight
  vec3 grad = mix(ca, cb, uv.x * 0.5 + h * 0.5);
  grad = mix(grad, cc, specular * 3.5);
  grad *= lighting;

  // --- Page background colours ---
  vec3 bgLight = vec3(0.992, 0.973, 0.953); // #fdf8f3
  vec3 bgDark  = vec3(0.071, 0.051, 0.035); // #120d09
  vec3 bg = uDark > 0.5 ? bgDark : bgLight;

  float strength = h * lighting * (uDark > 0.5 ? 0.32 : 0.17);
  vec3 col = mix(bg, grad, strength);

  // --- Perspective grid overlay ---
  float grid = perspGrid(uv, t);
  vec3 gridCol = uDark > 0.5 ? vec3(0.82, 0.60, 0.28) : vec3(0.72, 0.46, 0.18);
  col = mix(col, gridCol, grid * (uDark > 0.5 ? 0.55 : 0.35));

  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    console.error("[WebGL] shader:", gl.getShaderInfoLog(s));
  return s;
}

export function WebGLBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { alpha: false, antialias: false });
    if (!gl) return;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("[WebGL] link:", gl.getProgramInfoLog(prog));
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
