import { NextResponse } from 'next/server';
import { getEventEmitter } from '@/lib/imt/events';
import { getRoot } from '@/lib/imt/engine';
import { exportTree } from '@/lib/imt/types';

/**
 * GET /api/imt/events
 * Server-Sent Events endpoint for real-time tree updates
 * 
 * Clients can subscribe to this endpoint to receive notifications
 * when the tree state changes (e.g., after an append operation)
 */
export async function GET() {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const sendEvent = (eventType: string, data: unknown) => {
        const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      // Send current state immediately on connect
      const tree = globalThis.__imtTree;
      if (tree) {
        const exportData = exportTree(tree);
        const root = getRoot(tree);
        sendEvent('sync', { ...exportData, root });
      } else {
        sendEvent('sync', null);
      }

      // Subscribe to tree updates
      const unsubscribe = getEventEmitter().subscribe(() => {
        const currentTree = globalThis.__imtTree;
        if (currentTree) {
          const exportData = exportTree(currentTree);
          const root = getRoot(currentTree);
          sendEvent('update', { ...exportData, root });
        } else {
          sendEvent('update', null);
        }
      });

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          sendEvent('heartbeat', { timestamp: Date.now() });
        } catch {
          // Connection closed, clean up
          clearInterval(heartbeatInterval);
          unsubscribe();
        }
      }, 30000);

      // Clean up on close (note: this won't be called in all cases)
      // The client should handle reconnection
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}

// Declare global type for the in-memory tree
declare global {
  // eslint-disable-next-line no-var
  var __imtTree: import('@/lib/imt/types').IMTState | undefined;
}
