import React from 'react'
import { ConsoleLine, BatmanState } from '../types'

const STATE_LABEL: Record<BatmanState, string> = {
  idle: 'IDLE',
  walking: 'EN ROUTE',
  working: 'AT THE BATCOMPUTER',
  thinking: 'ANALYZING',
  break: 'GARAGE BREAK',
  brooding: 'BROODING',
}

const ROBIN_LABEL: Record<BatmanState, string> = {
  ...STATE_LABEL,
  working: 'ON AGENT DUTY',
}

interface Props {
  lines: ConsoleLine[]
  state: BatmanState
  robinState: BatmanState
  tool: string | null
  connected: boolean
  sim: boolean
}

export default function Console({ lines, state, robinState, tool, connected, sim }: Props) {
  const robinBusy = robinState === 'working' || robinState === 'walking'
  return (
    <>
      <div className="status-chip">
        <span className={`dot ${sim ? 'sim' : connected ? 'on' : 'off'}`} />
        <span className="brand">BATCAVE</span>
        <span className="state">{STATE_LABEL[state]}</span>
        {tool && <span className="tool">{tool}</span>}
        {robinBusy && <span className="robin">ROBIN: {ROBIN_LABEL[robinState]}</span>}
        {sim && <span className="simtag">SIM</span>}
      </div>
      <div className="console">
        <div className="console-title">BAT-COMPUTER ▮ ACTIVITY LOG</div>
        {lines.slice(-9).map((l) => (
          <div key={l.id} className={`line ${l.kind}`}>
            <span className="ts">{new Date(l.ts).toLocaleTimeString([], { hour12: false })}</span>
            {l.text}
          </div>
        ))}
        {lines.length === 0 && <div className="line info">— awaiting signal —</div>}
      </div>
    </>
  )
}
