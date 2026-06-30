// Subtle film-grain overlay. Adds the fine texture premium apps use to avoid
// flat, "digital" gradients. Pure SVG turbulence — no asset, no runtime cost.

export function Grain({ opacity = 0.04 }: { opacity?: number }) {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none mix-blend-overlay"
      style={{ opacity }}
      aria-hidden
    >
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  )
}
