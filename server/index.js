/**
 * Batcave event server — adapted from W17ant/Claude-Office.
 *
 * - Claude Code hook POSTs events to http://127.0.0.1:3334/event
 * - Frontend connects to ws://localhost:3334/ws and receives broadcasts
 * - Bearer token auth on /event, generated at startup → ~/.batcave/auth-token
 */
import express from 'express'
import { createServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { writeFileSync, mkdirSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { randomBytes } from 'crypto'

const PORT = 3334
const AUTH_TOKEN = randomBytes(32).toString('hex')
const RUNTIME_DIR = join(homedir(), '.batcave')

try {
  mkdirSync(RUNTIME_DIR, { recursive: true })
  writeFileSync(join(RUNTIME_DIR, 'auth-token'), AUTH_TOKEN, { mode: 0o600 })
} catch (err) {
  console.warn('[auth] could not write token file:', err.message)
}

const ALLOWED_ORIGINS = new Set([
  'http://localhost:3333',
  'http://127.0.0.1:3333',
])

const app = express()
app.use(express.json({ limit: '256kb' }))

const httpServer = createServer(app)
const wss = new WebSocketServer({ server: httpServer, path: '/ws' })

wss.on('connection', (ws, req) => {
  const origin = req.headers.origin
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    ws.close(1008, 'origin not allowed')
    return
  }
  console.log('[ws] client connected —', wss.clients.size, 'total')
  ws.on('close', () => console.log('[ws] client left —', wss.clients.size, 'total'))
})

function broadcast(event) {
  const payload = JSON.stringify(event)
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(payload)
  }
}

const VALID_TYPES = new Set([
  'session_start', 'prompt', 'tool_start', 'tool_end',
  'agent_spawn', 'agent_done', 'session_end',
])

app.post('/event', (req, res) => {
  const auth = req.headers.authorization ?? ''
  if (auth !== `Bearer ${AUTH_TOKEN}`) {
    return res.status(401).json({ error: 'unauthorized' })
  }
  const { type, tool, detail } = req.body ?? {}
  if (!VALID_TYPES.has(type)) return res.status(400).json({ error: 'bad type' })
  const event = {
    type,
    tool: typeof tool === 'string' ? tool.slice(0, 120) : undefined,
    detail: typeof detail === 'string' ? detail.slice(0, 200) : undefined,
    ts: Date.now(),
  }
  broadcast(event)
  res.json({ ok: true })
})

app.get('/health', (_req, res) =>
  res.json({ ok: true, clients: wss.clients.size }),
)

httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[batcave] port ${PORT} is already in use — a stale server is running.`)
    console.error(`[batcave] fix: lsof -ti :${PORT} | xargs kill   (then npm start again)`)
  } else {
    console.error('[batcave] server error:', err)
  }
  process.exit(1)
})

httpServer.listen(PORT, '127.0.0.1', () => {
  console.log(`[batcave] server on http://127.0.0.1:${PORT} (ws: /ws)`)
  console.log(`[batcave] auth token → ~/.batcave/auth-token`)
})
