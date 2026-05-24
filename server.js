// WebSocket server for cross-machine communication
// Runs on control PC — media servers, remotes, and executors connect to this

import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { readFileSync } from 'fs';

const PORT = 9100;

const httpServer = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Projection Mapper WebSocket Server');
});

const wss = new WebSocketServer({ server: httpServer });

// Track clients by role
const clients = new Map(); // ws -> { role, name }
let latestState = null;

wss.on('connection', (ws, req) => {
  const params = new URL(req.url, `http://localhost:${PORT}`).searchParams;
  const role = params.get('role') || 'unknown';
  const name = params.get('name') || role;
  clients.set(ws, { role, name });

  console.log(`[+] ${role} connected: ${name} (${wss.clients.size} total)`);

  // Send current state to new output/executor clients
  if (latestState && (role === 'output' || role === 'executor' || role === 'remote')) {
    ws.send(JSON.stringify(latestState));
  }

  // Send client list to all
  broadcastClientList();

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      handleMessage(ws, msg);
    } catch (e) {
      console.error('Bad message:', e.message);
    }
  });

  ws.on('close', () => {
    const info = clients.get(ws);
    clients.delete(ws);
    console.log(`[-] ${info?.role} disconnected: ${info?.name} (${wss.clients.size} total)`);
    broadcastClientList();
  });
});

function handleMessage(sender, msg) {
  const senderInfo = clients.get(sender);

  switch (msg.type) {
    // Control PC pushes full state → forward to outputs, executors, remotes
    case 'full-state':
      latestState = msg;
      broadcast(msg, sender, ['output', 'executor', 'remote', 'status']);
      break;

    // Cue list update → forward to remotes and executors
    case 'cue-list-update':
      broadcast(msg, sender, ['remote', 'executor']);
      break;

    // Cue change notification
    case 'cue-change':
      broadcast(msg, sender, ['output', 'remote', 'executor']);
      break;

    // Remote/executor commands → forward to control
    case 'remote-go-next':
    case 'remote-go-prev':
    case 'remote-goto-cue':
    case 'remote-blackout':
    case 'remote-restore':
    case 'remote-request-cues':
    case 'request-state':
    // Executor commands
    case 'exec-activate-scene':
    case 'exec-deactivate-scene':
    case 'exec-trigger-overlay':
    case 'exec-fire-cue':
    case 'exec-blackout':
    case 'exec-restore':
    case 'exec-flash-scene':
    case 'exec-release-scene':
    case 'exec-set-test-pattern':
      broadcast(msg, sender, ['control']);
      break;

    // Executor page config updates → broadcast to all executors
    case 'executor-config-update':
      broadcast(msg, sender, ['executor']);
      break;

    default:
      // Unknown — relay to control
      broadcast(msg, sender, ['control']);
  }
}

function broadcast(msg, exclude, targetRoles) {
  const data = JSON.stringify(msg);
  for (const [ws, info] of clients) {
    if (ws === exclude) continue;
    if (targetRoles && !targetRoles.includes(info.role)) continue;
    if (ws.readyState === 1) { // OPEN
      ws.send(data);
    }
  }
}

function broadcastClientList() {
  const list = [];
  for (const [, info] of clients) {
    list.push({ role: info.role, name: info.name });
  }
  const msg = JSON.stringify({ type: 'client-list', clients: list });
  for (const [ws] of clients) {
    if (ws.readyState === 1) ws.send(msg);
  }
}

httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  Port ${PORT} is already in use.`);
    console.error(`  Kill the existing process: lsof -ti :${PORT} | xargs kill`);
    console.error(`  Or use a different port: PORT=9101 node server.js\n`);
    process.exit(1);
  }
  throw err;
});

const port = parseInt(process.env.PORT || PORT);
httpServer.listen(port, '0.0.0.0', () => {
  console.log(`\n  Projection Mapper WS Server`);
  console.log(`  ────────────────────────────`);
  console.log(`  WebSocket: ws://0.0.0.0:${port}`);
  console.log(`  Waiting for connections...\n`);
});
