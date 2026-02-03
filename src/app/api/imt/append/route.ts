import { NextRequest, NextResponse } from 'next/server';
import { createEmptyTree, insert } from '@/lib/imt/engine';
import { broadcastTreeUpdate } from '@/lib/imt/events';

/**
 * POST /api/imt/append
 * Append a new key to the Indexed Merkle Tree
 * 
 * Request body:
 * {
 *   key: string,    // hex string (e.g., "0x1234") or decimal
 *   depth?: number  // optional tree depth, defaults to 4 if tree doesn't exist
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   root: string,
 *   size: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { key, depth = 4 } = body;

    console.log(request.body);
    
    if (!key) {
      return NextResponse.json(
        { error: 'Missing required field: key' },
        { status: 400 }
      );
    }
    
    // Parse hex string to bigint
    let keyBigInt: bigint;
    
    try {
      keyBigInt = BigInt(key);
    } catch {
      return NextResponse.json(
        { error: 'Invalid key format. Use hex string (0x...) or decimal.' },
        { status: 400 }
      );
    }
    
    // Load or create tree
    let tree = globalThis.__imtTree;
    
    if (!tree) {
      tree = createEmptyTree(depth);
      globalThis.__imtTree = tree;
    }
    
    // Insert the key
    const result = insert(tree, keyBigInt);
    
    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
    
    // Update global tree
    globalThis.__imtTree = result.state;
    
    // Broadcast update to connected SSE clients
    broadcastTreeUpdate();
    
    return NextResponse.json({
      success: true,
      root: result.result.newRoot,
      size: result.state.nextIndex,
    });
    
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Declare global type for the in-memory tree
declare global {
  // eslint-disable-next-line no-var
  var __imtTree: import('@/lib/imt/types').IMTState | undefined;
}
