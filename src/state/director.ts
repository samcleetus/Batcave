import * as THREE from 'three'
import { BatEvent, BatmanState } from '../types'
import { WAYPOINTS, findPath, PlaceId, THINKING_AFTER, BREAK_AFTER, BROOD_AFTER, ROBIN_LINGER } from '../config'

/**
 * Directors — single-character adaptations of Claude-Office's per-agent
 * state machine. Mutable on purpose: the 3D loop reads/writes every frame
 * without React renders; the UI polls at low frequency.
 *
 * Movement is a waypoint queue along hand-mapped walkable routes (see
 * config.PATHS — derived from raycasting the cave floor in Blender).
 */
export abstract class Director {
  state: BatmanState = 'idle'
  /** waypoint queue; head is the current walk target */
  targets: THREE.Vector3[] = []
  nextState: BatmanState = 'idle'
  faceOnArrive: THREE.Vector3 | null = null
  place: PlaceId
  private pendingPlace: PlaceId

  lastActivity = 0
  currentTool: string | null = null

  constructor(startPlace: PlaceId) {
    this.place = startPlace
    this.pendingPlace = startPlace
  }

  abstract handleEvent(e: BatEvent): void
  abstract tick(now: number): void

  protected touch() {
    this.lastActivity = Date.now()
  }

  goTo(dest: PlaceId, then: BatmanState, face: THREE.Vector3 | null = null) {
    if (this.pendingPlace === dest) {
      // already there or already en route — just make sure the end state fits
      if (this.targets.length === 0) this.state = then
      this.nextState = then
      this.faceOnArrive = face ?? this.faceOnArrive
      return
    }
    this.targets = findPath(this.place, dest).map((v) => v.clone())
    this.pendingPlace = dest
    this.nextState = then
    this.faceOnArrive = face
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
    super('entrance')
    // walk in on load
    this.goTo('computer', 'idle', WAYPOINTS.screensLook)
  }

  handleEvent(e: BatEvent) {
    switch (e.type) {
      case 'session_start':
        this.sessionActive = true
        this.touch()
        this.goTo('computer', 'working', WAYPOINTS.screensLook)
        break
      case 'prompt':
      case 'tool_start':
        this.currentTool = e.tool ?? this.currentTool
        this.touch()
        this.goTo('computer', 'working', WAYPOINTS.screensLook)
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
      this.goTo('break', 'break', WAYPOINTS.batmobileLook)
    } else if (this.state === 'break' && quiet > BROOD_AFTER) {
      this.goTo('overlook', 'brooding', WAYPOINTS.caveLook)
    }
  }
}

export class RobinDirector extends Director {
  activeAgents = 0
  private idleAt = 0

  constructor() {
    super('robinIdle')
  }

  handleEvent(e: BatEvent) {
    switch (e.type) {
      case 'agent_spawn':
        this.activeAgents++
        this.currentTool = e.detail || 'agent task'
        this.touch()
        this.goTo('robinStation', 'working', WAYPOINTS.robinScreensLook)
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
      this.goTo('robinIdle', 'idle', WAYPOINTS.caveLook)
    }
  }
}
