import { useEffect, useRef, useState } from 'react'
import { BatEvent } from '../types'
import { WS_URL } from '../config'

/**
 * WebSocket client with auto-reconnect (ported from Claude-Office's useAgentSocket).
 * Calls onEvent for every event broadcast by the server.
 */
export function useEventSocket(onEvent: (e: BatEvent) => void, enabled: boolean) {
  const [connected, setConnected] = useState(false)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  useEffect(() => {
    if (!enabled) return
    let ws: WebSocket | null = null
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let dead = false

    const connect = () => {
      if (dead) return
      try {
        ws = new WebSocket(WS_URL)
      } catch {
        retryTimer = setTimeout(connect, 3000)
        return
      }
      ws.onopen = () => setConnected(true)
      ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data)
          if (data && data.type) onEventRef.current({ ts: Date.now(), ...data })
        } catch { /* ignore malformed */ }
      }
      ws.onclose = () => {
        setConnected(false)
        if (!dead) retryTimer = setTimeout(connect, 3000)
      }
      ws.onerror = () => ws?.close()
    }

    connect()
    return () => {
      dead = true
      if (retryTimer) clearTimeout(retryTimer)
      ws?.close()
    }
  }, [enabled])

  return connected
}
