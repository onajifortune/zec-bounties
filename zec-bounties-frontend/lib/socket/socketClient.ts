import { backendWebSpocketUrl } from "../configENV";
import { getAuthToken } from "../api";

export interface SocketMessage {
  type: string;
  payload: any;
}

type Listener = (msg: SocketMessage) => void;

const INITIAL_RETRY_MS = 1000;
const MAX_RETRY_MS = 30000;
const AUTH_REJECTED_CODE = 4001; // server closed us: don't retry

/**
 * One socket for the whole app. React-free on purpose so any provider can
 * subscribe without caring about nesting order.
 *
 * connect()/disconnect() are driven by useSocketConnection(userId).
 */
class SocketClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private retryDelay = INITIAL_RETRY_MS;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private active = false;

  connect() {
    if (this.active) return;
    this.active = true;
    this.retryDelay = INITIAL_RETRY_MS;
    this.open();
  }

  disconnect() {
    this.active = false;
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    const ws = this.ws;
    this.ws = null;
    if (ws) {
      // Detach first so a late onclose can't schedule a reconnect.
      ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null;
      if (
        ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING
      ) {
        ws.close();
      }
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Deliver an event to local listeners as if the server had pushed it.
   * Lets one domain tell the others about a change it just made (e.g. a new
   * bounty) without importing them. Handlers must be idempotent, since the
   * real server push for the same change may arrive afterwards.
   */
  emitLocal(type: string, payload: any) {
    this.dispatch({ type, payload });
  }

  private dispatch(msg: SocketMessage) {
    this.listeners.forEach((listener) => {
      try {
        listener(msg);
      } catch (err) {
        // One bad handler must not stop the others.
        console.error(`WebSocket handler failed for "${msg.type}":`, err);
      }
    });
  }

  private open() {
    // No token, no socket. The backend would reject it anyway.
    const token = getAuthToken();
    if (!token) return;

    const ws = new WebSocket(
      `${backendWebSpocketUrl}?token=${encodeURIComponent(token)}`,
    );
    this.ws = ws;

    ws.onopen = () => {
      this.retryDelay = INITIAL_RETRY_MS;
    };

    ws.onmessage = (event) => {
      let msg: SocketMessage;
      try {
        msg = JSON.parse(event.data);
      } catch {
        console.error("WebSocket: invalid message", event.data);
        return;
      }
      this.dispatch(msg);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = (event) => {
      if (this.ws === ws) this.ws = null;
      if (!this.active || event.code === AUTH_REJECTED_CODE) return;

      this.retryTimer = setTimeout(() => {
        this.retryTimer = null;
        if (this.active) this.open();
      }, this.retryDelay);
      this.retryDelay = Math.min(this.retryDelay * 2, MAX_RETRY_MS);
    };
  }
}

export const socketClient = new SocketClient();
