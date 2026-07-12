import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Scene from './scene/Scene'
import Console from './ui/Console'
import { BatmanDirector } from './state/director'
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
    case 'agent_spawn': return `agent deployed ${e.detail ? `— ${e.detail}` : ''}`
    case 'agent_done': return 'agent reported back'
    case 'session_end': return 'session ended'
  }
}

export default function App() {
  const director = useMemo(() => new BatmanDirector(), [])
  const [lines, setLines] = useState<ConsoleLine[]>([])
  const [uiState, setUiState] = useState<BatmanState>('idle')
  const [uiTool, setUiTool] = useState<string | null>(null)
  const sim = useMemo(() => new URLSearchParams(location.search).has('sim'), [])

  const handleEvent = useCallback((e: BatEvent) => {
    director.handleEvent(e)
    const text = describe(e)
    if (text) {
      setLines((prev) => [
        ...prev.slice(-80),
        { id: lineId++, text, ts: e.ts, kind: e.type === 'tool_start' ? 'tool' : 'info' },
      ])
    }
  }, [director])

  const connected = useEventSocket(handleEvent, !sim)

  useEffect(() => {
    if (!sim) return
    return startSim(handleEvent)
  }, [sim, handleEvent])

  // low-frequency poll of the mutable director for UI chips
  useEffect(() => {
    const iv = setInterval(() => {
      setUiState(director.state)
      setUiTool(director.currentTool)
    }, 250)
    return () => clearInterval(iv)
  }, [director])

  return (
    <>
      <Scene director={director} />
      <Console lines={lines} state={uiState} tool={uiTool} connected={connected} sim={sim} />
    </>
  )
}
