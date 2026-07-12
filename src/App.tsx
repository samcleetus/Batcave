import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Scene from './scene/Scene'
import Console from './ui/Console'
import { BatmanDirector, RobinDirector } from './state/director'
import { useEventSocket } from './hooks/useEventSocket'
import { startSim } from './sim'
import { BatEvent, BatmanState, ConsoleLine } from './types'

let lineId = 0

function describe(e: BatEvent): string | null {
  switch (e.type) {
    case 'session_start': return 'Claude Code session started'
    case 'prompt': return `> ${e.detail ?? 'new instructions received'}`
    case 'tool_start': return `${e.tool ?? 'tool'} ${e.detail ? `— ${e.detail}` : 'running…'}`
    case 'tool_end': return null // keep the log tight; starts are enough
    case 'agent_spawn': return `Robin deployed ${e.detail ? `— ${e.detail}` : ''}`
    case 'agent_done': return 'Robin reported back'
    case 'session_end': return 'session ended'
  }
}

export default function App() {
  const batman = useMemo(() => new BatmanDirector(), [])
  const robin = useMemo(() => new RobinDirector(), [])
  const [lines, setLines] = useState<ConsoleLine[]>([])
  const [batmanState, setBatmanState] = useState<BatmanState>('idle')
  const [robinState, setRobinState] = useState<BatmanState>('idle')
  const [uiTool, setUiTool] = useState<string | null>(null)
  const sim = useMemo(() => new URLSearchParams(location.search).has('sim'), [])

  const handleEvent = useCallback((e: BatEvent) => {
    batman.handleEvent(e)
    robin.handleEvent(e)
    const text = describe(e)
    if (text) {
      setLines((prev) => [
        ...prev.slice(-80),
        { id: lineId++, text, ts: e.ts, kind: e.type === 'tool_start' ? 'tool' : 'info' },
      ])
    }
  }, [batman, robin])

  const connected = useEventSocket(handleEvent, !sim)

  useEffect(() => {
    if (!sim) return
    return startSim(handleEvent)
  }, [sim, handleEvent])

  // low-frequency poll of the mutable directors for UI chips
  useEffect(() => {
    const iv = setInterval(() => {
      setBatmanState(batman.state)
      setRobinState(robin.state)
      setUiTool(batman.currentTool)
    }, 250)
    return () => clearInterval(iv)
  }, [batman, robin])

  return (
    <>
      <Scene batman={batman} robin={robin} />
      <Console
        lines={lines}
        state={batmanState}
        robinState={robinState}
        tool={uiTool}
        connected={connected}
        sim={sim}
      />
    </>
  )
}
