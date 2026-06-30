'use client'

// Plays a Rive animation if the .riv asset is present, otherwise renders the
// SVG fallback. This lets designer-made Rive files drop in without any code
// change, while the app always looks complete in the meantime.
//
// Asset contract (see public/rive/README.md):
//   - file:          public/rive/<name>.riv  →  src="/rive/<name>.riv"
//   - state machine: pass the exact name; defaults to "State Machine 1"
//   - optional number input "progress" (0–100) is driven by the active slide.

import { useEffect, useState } from 'react'
import { useRive, useStateMachineInput, Layout, Fit, Alignment } from '@rive-app/react-canvas'

interface Props {
  src: string
  stateMachine?: string
  active?: boolean
  fallback: React.ReactNode
}

type Status = 'checking' | 'ready' | 'missing'

export function RiveScene({ src, stateMachine = 'State Machine 1', active = true, fallback }: Props) {
  const [status, setStatus] = useState<Status>('checking')

  // Probe for the asset so a missing file shows the fallback (no console noise).
  useEffect(() => {
    let alive = true
    fetch(src, { method: 'HEAD' })
      .then((r) => alive && setStatus(r.ok ? 'ready' : 'missing'))
      .catch(() => alive && setStatus('missing'))
    return () => {
      alive = false
    }
  }, [src])

  if (status !== 'ready') return <>{fallback}</>
  return <RivePlayer src={src} stateMachine={stateMachine} active={active} />
}

function RivePlayer({ src, stateMachine, active }: { src: string; stateMachine: string; active: boolean }) {
  const { rive, RiveComponent } = useRive({
    src,
    stateMachines: stateMachine,
    autoplay: true,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
  })

  // Optional: replay from the start whenever this slide becomes active.
  const replay = useStateMachineInput(rive, stateMachine, 'replay')
  useEffect(() => {
    if (active && replay) replay.fire()
  }, [active, replay])

  return <RiveComponent className="w-full h-full" />
}
