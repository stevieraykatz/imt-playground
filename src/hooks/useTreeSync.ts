'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { IMTExportData } from '@/lib/imt/types';

interface TreeSyncData extends IMTExportData {
  root: string;
}

interface UseTreeSyncOptions {
  onSync: (data: TreeSyncData | null) => void;
  enabled?: boolean;
}

/**
 * Hook to subscribe to real-time tree updates via Server-Sent Events
 */
export function useTreeSync({ onSync, enabled = true }: UseTreeSyncOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onSyncRef = useRef(onSync);

  // Keep onSync ref updated
  useEffect(() => {
    onSyncRef.current = onSync;
  }, [onSync]);

  const connect = useCallback(() => {
    if (!enabled) return;

    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource('/api/imt/events');
    eventSourceRef.current = eventSource;

    eventSource.addEventListener('sync', (event) => {
      try {
        const data = JSON.parse(event.data);
        onSyncRef.current(data);
      } catch {
        // Ignore parse errors
      }
    });

    eventSource.addEventListener('update', (event) => {
      try {
        const data = JSON.parse(event.data);
        onSyncRef.current(data);
      } catch {
        // Ignore parse errors
      }
    });

    eventSource.addEventListener('error', () => {
      // Connection lost, attempt to reconnect after delay
      eventSource.close();
      eventSourceRef.current = null;

      // Exponential backoff would be better, but simple delay works for local dev
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    });
  }, [enabled]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [connect]);

  // Return a manual reconnect function
  return {
    reconnect: connect,
  };
}
