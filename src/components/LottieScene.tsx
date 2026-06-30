'use client'

// Plays a professionally-made Lottie animation. Loads the JSON at runtime so the
// (sometimes large) animation data stays out of the JS bundle, and falls back to
// the in-app SVG illustration if the file is missing or fails to load.
//
// Swap any file in public/lottie/ to change a scene — no code change needed.

import { useEffect, useState } from 'react'
import Lottie from 'lottie-react'

interface Props {
  src: string
  active?: boolean
  fallback: React.ReactNode
}

export function LottieScene({ src, active = true, fallback }: Props) {
  const [data, setData] = useState<object | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    fetch(src)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => alive && setData(j))
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [src])

  if (failed) return <>{fallback}</>
  // Show the SVG fallback until the JSON arrives — no blank flash.
  if (!data) return <>{fallback}</>

  return (
    <Lottie
      animationData={data}
      loop
      autoplay={active}
      rendererSettings={{ preserveAspectRatio: 'xMidYMid meet' }}
      className="w-full h-full"
    />
  )
}
