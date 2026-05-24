// Unified transport — BroadcastChannel (local) + WebSocket (network)
// Both channels carry the same message format.
// BroadcastChannel always active for same-machine windows.
// WebSocket connects when server is available.

const WS_PORT = 9100;

export class Transport {
  constructor(role = 'control', name = role) {
    this.role = role;
    this.name = name;
    this.listeners = [];
    this.ws = null;
    this.wsConnected = false;
    this.reconnectTimer = null;

    // BroadcastChannel — always available for same-machine
    this.channel = typeof BroadcastChannel !== 'undefined'
      ? new BroadcastChannel('projection-mapper')
      : null;

    if (this.channel) {
      this.channel.onmessage = (e) => {
        this._dispatch(e.data, 'broadcast');
      };
    }

    // Try WebSocket connection
    this._connectWS();
  }

  _connectWS() {
    const host = window.location.hostname || 'localhost';
    const url = `ws://${host}:${WS_PORT}?role=${this.role}&name=${encodeURIComponent(this.name)}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.wsConnected = true;
        clearTimeout(this.reconnectTimer);
        this._dispatch({ type: 'ws-connected' }, 'internal');
      };

      this.ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          this._dispatch(msg, 'ws');
        } catch {}
      };

      this.ws.onclose = () => {
        this.wsConnected = false;
        this._dispatch({ type: 'ws-disconnected' }, 'internal');
        // Reconnect after 3s
        this.reconnectTimer = setTimeout(() => this._connectWS(), 3000);
      };

      this.ws.onerror = () => {
        // Will trigger onclose → reconnect
      };
    } catch {
      // WebSocket not available
      this.reconnectTimer = setTimeout(() => this._connectWS(), 5000);
    }
  }

  // Send message — goes to both BroadcastChannel and WebSocket
  send(msg) {
    if (this.channel) {
      this.channel.postMessage(msg);
    }
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  // Send only via WebSocket (for state broadcast to remote machines)
  sendWS(msg) {
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  // Send only via BroadcastChannel (for same-machine windows)
  sendLocal(msg) {
    if (this.channel) {
      this.channel.postMessage(msg);
    }
  }

  onMessage(fn) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  _dispatch(msg, source) {
    for (const fn of this.listeners) {
      fn(msg, source);
    }
  }

  get connected() {
    return this.wsConnected;
  }
}
