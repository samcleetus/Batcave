// Events arriving from the server (originating from Claude Code hooks)
export type BatEventType =
  | 'session_start'
  | 'prompt'
  | 'tool_start'
  | 'tool_end'
  | 'agent_spawn'
  | 'agent_done'
  | 'session_end'

export interface BatEvent {
  type: BatEventType
  tool?: string        // e.g. "Edit", "Bash", "mcp__github__create_pr"
  detail?: string      // e.g. file path, command snippet
  ts: number
}

// Batman's behavioral states
export type BatmanState =
  | 'idle'              // standing around the cave
  | 'walking'           // en route to a target
  | 'working'           // typing at the Batcomputer
  | 'thinking'          // at the computer, arms crossed, waiting on Claude
  | 'break'             // over by the Batmobile / trophy area
  | 'brooding'          // long idle: standing at the overlook, cape draped

export interface ConsoleLine {
  id: number
  text: string
  kind: 'info' | 'tool' | 'system'
  ts: number
}
