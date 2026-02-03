/**
 * Simple event emitter for broadcasting IMT state changes
 * Used to sync server-side tree updates with connected clients via SSE
 */

type Listener = () => void;

class IMTEventEmitter {
  private listeners: Set<Listener> = new Set();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  broadcast(): void {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch {
        // Ignore errors from individual listeners
      }
    });
  }

  get listenerCount(): number {
    return this.listeners.size;
  }
}

// Global singleton for the event emitter
declare global {
  // eslint-disable-next-line no-var
  var __imtEventEmitter: IMTEventEmitter | undefined;
}

export function getEventEmitter(): IMTEventEmitter {
  if (!globalThis.__imtEventEmitter) {
    globalThis.__imtEventEmitter = new IMTEventEmitter();
  }
  return globalThis.__imtEventEmitter;
}

/**
 * Broadcast that the tree state has changed
 */
export function broadcastTreeUpdate(): void {
  getEventEmitter().broadcast();
}
