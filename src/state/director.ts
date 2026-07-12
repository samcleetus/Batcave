import * as THREE from 'three'
import { BatEvent, BatmanState } from '../types'
import { ANCHORS, THINKING_AFTER, BREAK_AFTER, BROOD_AFTER } from '../config'

/**
 * BatmanDirector — the single-character adaptation of Claude-Office's
 * per-agent state machine. Events push Batman toward the Batcomputer;
 * silence gradually pulls him away (thinking → break → brooding).
 *
 * Mutable on purpose: the 3D loop reads/writes it every frame without
 * triggering React renders. UI polls it at low frequency.
 */
export class BatmanDirector {
  state: BatmanState = 'idle'
  /** where Batman is walking to, if anywhere */
  target: THREE.Vector3 | null = null
  /** state to adopt on arrival */
  nextState: BatmanState = 'idle'
  /** what to face on arrival (yaw target point), optional */
  faceOnArrive: THREE.Vector3 | null = null

  lastActivity = 0
  currentTool: string | null = null
  sessionActive = false

  handleEvent(e: BatEvent) {
    switch (e.type) {
      case 'session_start':
        this.sessionActive = true
        this.touch()
        this.goToComputer()
        break
      case 'prompt':
      case 'tool_start':
      case 'agent_spawn':
        this.currentTool = e.tool ?? this.currentTool
        this.touch()
        this.goToComputer()
        break
      case 'tool_end':
      case 'agent_done':
        this.touch() // stay at the computer; thinking timer takes over
        break
      case 'session_end':
        this.sessionActive = false
        this.currentTool = null
        this.touch()
        break
    }
  }

  private touch() {
    this.lastActivity = Date.now()
  }

  private goToComputer() {
    if (this.state === 'working' || (this.target && this.nextState === 'working')) return
    this.walkTo(ANCHORS.batcomputer, 'working', ANCHORS.computerScreens)
  }

  walkTo(dest: THREE.Vector3, then: BatmanState, face: THREE.Vector3 | null = null) {
    this.target = dest.clone()
    this.nextState = then
    this.faceOnArrive = face
    this.state = 'walking'
  }

  /** called by the Batman component when it reaches the current target */
  arrive() {
    this.target = null
    this.state = this.nextState
  }

  /** timers — degrade from working → thinking → break → brooding */
  tick(now: number) {
    if (this.state === 'walking' || this.lastActivity === 0) return
    const quiet = now - this.lastActivity
    if (this.state === 'working' && quiet > THINKING_AFTER) {
      this.state = 'thinking'
      this.currentTool = null
    } else if (this.state === 'thinking' && quiet > BREAK_AFTER) {
      this.walkTo(ANCHORS.breakSpot, 'break', ANCHORS.center)
    } else if (this.state === 'break' && quiet > BROOD_AFTER) {
      this.walkTo(ANCHORS.overlook, 'brooding', ANCHORS.computerScreens)
    }
  }
}
