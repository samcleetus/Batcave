import * as THREE from 'three'
import { BatEvent, BatmanState } from '../types'
import {
  THINKING_AFTER, BREAK_AFTER, BROOD_AFTER, ROBIN_LINGER,
  WANDER_PAUSE_MIN, WANDER_PAUSE_MAX,
} from '../config'
import { NAV, NavId, navPath, nearestNode, ROBIN_WANDER } from './nav'

/**
 * Directors — single-character state machines driven by Claude Code events.
 * Movement is constrained to the nav graph (state/nav.ts): characters only
 * stop at stop-nodes and only walk along graph edges.
 *
 * Mutable on purpose: the 3D loop reads/writes every frame without React
 * renders; the UI polls at low frequency.
 */
export abstract class Director {
  state: BatmanState = 'idle'
  /** waypoint queue; head is the current walk target */
  targets: THREE.Vector3[] = []
  nextState: BatmanState = 'idle'
  faceOnArrive: THREE.Vector3 | null = null
  /** current/last nav node */
  place: NavId
  /** live position, written back by the Minifig each frame */
  position = new THREE.Vector3()
  private pendingPlace: NavId

  lastActivity = 0
  currentTool: string | null = null

  constructor(startNode: NavId) {
    this.place = startNode
    this.pendingPlace = startNode
    this.position.copy(NAV[startNode].pos)
  }

  abstract handleEvent(e: BatEvent): void
  abstract tick(now: number): void

  protected touch() {
    this.lastActivity = Date.now()
  }

  goTo(dest: NavId, then: BatmanState) {
    if (this.pendingPlace === dest) {
      if (this.targets.length === 0) this.state = then
      this.nextState = then
      return
    }
    // mid-walk redirects re-enter the graph at the nearest node
    const from = this.targets.length > 0 ? nearestNode(this.position) : this.place
    const path = navPath(from, dest)
    // if the nearest node is behind us, walk to it first so we stay on-path
    if (from !== this.place && from !== dest) path.unshift(NAV[from].pos.clone())
    this.targets = path
    this.place = from
    this.pendingPlace = dest
    this.nextState = then
    this.faceOnArrive = NAV[dest].face?.clone() ?? null
    this.state = 'walking'
  }

  /** called by the Minifig when it reaches the head waypoint */
  reachedWaypoint() {
    this.targets.shift()
    if (this.targets.length === 0) {
      this.place = this.pendingPlace
      this.state = this.nextState
    }
  }
}

export class BatmanDirector extends Director {
  sessionActive = false

  constructor() {
    super('westWalk')
    this.goTo('computer', 'idle') // walk in on load
  }

  handleEvent(e: BatEvent) {
    switch (e.type) {
      case 'session_start':
        this.sessionActive = true
        this.touch()
        this.goTo('computer', 'working')
        break
      case 'prompt':
      case 'tool_start':
        this.currentTool = e.tool ?? this.currentTool
        this.touch()
        this.goTo('computer', 'working')
        break
      case 'tool_end':
        this.touch()
        break
      case 'session_end':
        this.sessionActive = false
        this.currentTool = null
        this.touch()
        break
      // agent_spawn / agent_done belong to Robin
    }
  }

  tick(now: number) {
    if (this.state === 'walking' || this.lastActivity === 0) return
    const quiet = now - this.lastActivity
    if (this.state === 'working' && quiet > THINKING_AFTER) {
      this.state = 'thinking'
      this.currentTool = null
    } else if (this.state === 'thinking' && quiet > BREAK_AFTER) {
      this.goTo('batmobile', 'break')          // wrench on the car
    } else if (this.state === 'break' && quiet > BROOD_AFTER) {
      this.goTo('westWalk', 'brooding')        // brood by the crates
    }
  }
}

export class RobinDirector extends Director {
  activeAgents = 0
  private idleAt = 0
  private nextWanderAt = Date.now() + 3_000

  constructor() {
    super('tableSpot')
  }

  /** Robin is young and restless — strolls between permitted stop spots. */
  private wander() {
    const options = ROBIN_WANDER.filter((id) => id !== this.place)
    const dest = options[Math.floor(Math.random() * options.length)]
    this.goTo(dest, 'idle')
    this.nextWanderAt = Date.now() + WANDER_PAUSE_MIN + Math.random() * (WANDER_PAUSE_MAX - WANDER_PAUSE_MIN)
  }

  handleEvent(e: BatEvent) {
    switch (e.type) {
      case 'agent_spawn':
        this.activeAgents++
        this.currentTool = e.detail || 'agent task'
        this.touch()
        this.goTo('dish', 'working')
        break
      case 'agent_done':
        this.activeAgents = Math.max(0, this.activeAgents - 1)
        this.touch()
        if (this.activeAgents === 0) {
          this.currentTool = null
          this.idleAt = Date.now() + ROBIN_LINGER
        }
        break
      case 'session_end':
        this.activeAgents = 0
        this.currentTool = null
        this.idleAt = Date.now() + ROBIN_LINGER
        break
    }
  }

  tick(now: number) {
    if (this.state === 'walking') return
    if (this.state === 'working' && this.activeAgents === 0 && this.idleAt && now > this.idleAt) {
      this.idleAt = 0
      this.goTo('tableSpot', 'idle')
      this.nextWanderAt = now + WANDER_PAUSE_MIN
      return
    }
    if (this.state === 'idle' && now > this.nextWanderAt) {
      this.wander()
    }
  }
}
