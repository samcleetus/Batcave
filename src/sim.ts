import { BatEvent } from './types'

/**
 * Simulation mode (?sim) — scripted fake Claude Code session so the cave can
 * be developed/demoed without hooks wired up. Loops forever.
 */
const SCRIPT: Array<[number, Omit<BatEvent, 'ts'>]> = [
  [1000,  { type: 'session_start' }],
  [2500,  { type: 'prompt', detail: 'fix the login redirect bug' }],
  [4000,  { type: 'tool_start', tool: 'Grep', detail: 'searching auth/*.ts' }],
  [6000,  { type: 'tool_end', tool: 'Grep' }],
  [7000,  { type: 'tool_start', tool: 'Read', detail: 'src/auth/session.ts' }],
  [9000,  { type: 'tool_end', tool: 'Read' }],
  [11000, { type: 'tool_start', tool: 'Edit', detail: 'src/auth/session.ts' }],
  [14000, { type: 'tool_end', tool: 'Edit' }],
  [15000, { type: 'tool_start', tool: 'Bash', detail: 'npm test' }],
  [21000, { type: 'tool_end', tool: 'Bash' }],
  [22000, { type: 'agent_spawn', tool: 'Agent', detail: 'reviewing the diff' }],
  [30000, { type: 'agent_done', tool: 'Agent' }],
  [32000, { type: 'session_end' }],
  // quiet stretch → Batman takes a break, then broods
  [95000, { type: 'session_start' }],
  [97000, { type: 'tool_start', tool: 'Write', detail: 'README.md' }],
  [99000, { type: 'tool_end', tool: 'Write' }],
  [101000, { type: 'session_end' }],
]
const LOOP_MS = 240_000

export function startSim(onEvent: (e: BatEvent) => void): () => void {
  const timers: ReturnType<typeof setTimeout>[] = []
  const run = () => {
    for (const [delay, ev] of SCRIPT) {
      timers.push(setTimeout(() => onEvent({ ...ev, ts: Date.now() }), delay))
    }
    timers.push(setTimeout(run, LOOP_MS))
  }
  run()
  return () => timers.forEach(clearTimeout)
}
