import { NextResponse } from 'next/server';
import type { IMTState } from '@stevieraykatz/imt-engine';
import { broadcastTreeUpdate } from '@/lib/events';

/**
 * POST /api/imt/clear
 * Clear all tree state, resetting to empty
 * 
 * Response:
 * {
 *   success: boolean,
 *   message: string
 * }
 */
export async function POST() {
  try {
    // Clear the tree state
    globalThis.__imtTree = undefined;
    
    // Broadcast update to connected SSE clients so they refresh and see empty tree
    broadcastTreeUpdate();
    
    return NextResponse.json({
      success: true,
      message: 'Tree state cleared successfully',
    });
    
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Declare global type for type checking
declare global {
  // eslint-disable-next-line no-var
  var __imtTree: IMTState | undefined;
}
