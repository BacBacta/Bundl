'use client'

// Animated mesh-gradient background rendered with a WebGL fragment shader
// (domain-warped fbm noise). This is the signature "premium 2026" ambient look
// — flowing, organic, GPU-cheap. Falls back to a static CSS gradient when WebGL
// is unavailable or the user prefers reduced motion. Pure code, no assets.

import { useEffect, useRef, useState } from 'react'

// Brand palette per theme (RGB 0–1). Kept soft so foreground text stays legible.
const PALETTES = {
  light: [
    [0.92, 0.97, 0.94],
    [0.74, 0.91, 0.84],
    [0.36, 0.78, 0.62],
    [0.11, 0.62, 0.46],
  ],
  dark: [
    [0.03, 0.07, 0.06],
    [0.04, 0.18, 0.14],
    [0.05, 0.36, 0.27],
    [0.14, 0.69, 0.51],
  ],
} as const

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec3 u_c1, u_c2, u_c3, u_c4;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453123); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p);
  vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),u.x),
             mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),u.x),u.y);
}
float fbm(vec2 p){
  float v=0.0, a=0.5;
  for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.0; a*=0.5; }
  return v;
}
void main(){
  vec2 uv = gl_FragCoord.xy/u_res.xy;
  vec2 p = uv*1.8;
  p.x *= u_res.x/u_res.y;
  float t = u_time*0.05;
  vec2 q = vec2(fbm(p+vec2(0.0,t)), fbm(p+vec2(5.2,-t)));
  vec2 r = vec2(fbm(p+3.5*q+vec2(1.7,9.2)+0.15*t), fbm(p+3.5*q+vec2(8.3,2.8)-0.12*t));
  float f = fbm(p+3.5*r);
  vec3 col = mix(u_c1, u_c2, clamp(f*f*1.7,0.0,1.0));
  col = mix(col, u_c3, clamp(length(q),0.0,1.0));
  col = mix(col, u_c4, clamp(r.x*0.65,0.0,1.0));
  gl_FragColor = vec4(col, 1.0);
}`

const VERT = `
attribute vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }`

function cssFallback(dark: boolean) {
  return dark
    ? 'radial-gradient(120% 90% at 20% 0%, #0b3a2c 0%, #06120e 55%, #06120e 100%)'
    : 'radial-gradient(120% 90% at 20% 0%, #d8f0e6 0%, #f2f7f5 55%, #f2f7f5 100%)'
}

export function MeshGradient({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [failed, setFailed] = useState(false)
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark')
    setDark(isDark)

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) {
      setFailed(true)
      return
    }
    const ctx = gl as WebGLRenderingContext

    function compile(type: number, src: string) {
      const s = ctx.createShader(type)!
      ctx.shaderSource(s, src)
      ctx.compileShader(s)
      if (!ctx.getShaderParameter(s, ctx.COMPILE_STATUS)) throw new Error(ctx.getShaderInfoLog(s) || 'shader')
      return s
    }

    let raf = 0
    try {
      const prog = ctx.createProgram()!
      ctx.attachShader(prog, compile(ctx.VERTEX_SHADER, VERT))
      ctx.attachShader(prog, compile(ctx.FRAGMENT_SHADER, FRAG))
      ctx.linkProgram(prog)
      if (!ctx.getProgramParameter(prog, ctx.LINK_STATUS)) throw new Error('link')
      ctx.useProgram(prog)

      const buf = ctx.createBuffer()
      ctx.bindBuffer(ctx.ARRAY_BUFFER, buf)
      ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), ctx.STATIC_DRAW)
      const loc = ctx.getAttribLocation(prog, 'a_pos')
      ctx.enableVertexAttribArray(loc)
      ctx.vertexAttribPointer(loc, 2, ctx.FLOAT, false, 0, 0)

      const uRes = ctx.getUniformLocation(prog, 'u_res')
      const uTime = ctx.getUniformLocation(prog, 'u_time')
      const pal = PALETTES[isDark ? 'dark' : 'light']
      ;(['u_c1', 'u_c2', 'u_c3', 'u_c4'] as const).forEach((n, i) =>
        ctx.uniform3fv(ctx.getUniformLocation(prog, n), pal[i] as unknown as number[]),
      )

      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.4)
        canvas.width = Math.floor(canvas.clientWidth * dpr)
        canvas.height = Math.floor(canvas.clientHeight * dpr)
        ctx.viewport(0, 0, canvas.width, canvas.height)
        ctx.uniform2f(uRes, canvas.width, canvas.height)
      }
      resize()
      window.addEventListener('resize', resize)

      const start = performance.now()
      const draw = () => {
        ctx.uniform1f(uTime, (performance.now() - start) / 1000)
        ctx.drawArrays(ctx.TRIANGLES, 0, 3)
        if (!reduce) raf = requestAnimationFrame(draw)
      }
      draw()

      return () => {
        cancelAnimationFrame(raf)
        window.removeEventListener('resize', resize)
      }
    } catch {
      setFailed(true)
    }
  }, [])

  if (failed) {
    return <div className={className} style={{ background: cssFallback(dark) }} />
  }
  return <canvas ref={canvasRef} className={className} />
}
