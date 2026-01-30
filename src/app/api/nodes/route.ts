import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage/localStorage';
import { createEmptyTree, insert } from '@/lib/imt/engine';
import { serializeNode } from '@/lib/imt/types';

/**
 * POST /api/nodes
 * Insert a new node into the IMT
 * 
 * Request body:
 * {
 *   key: string,    // hex string (e.g., "0x1234")
 *   value: string,  // hex string (e.g., "0xabcd")
 *   depth?: number  // optional, defaults to 4 if tree doesn't exist
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   node: SerializedIMTNode,
 *   updatedPredecessor: SerializedIMTNode | null,
 *   newRoot: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { key, value, depth = 4 } = body;
    
    if (!key || !value) {
      return NextResponse.json(
        { error: 'Missing required fields: key and value' },
        { status: 400 }
      );
    }
    
    // Parse hex strings to bigint
    let keyBigInt: bigint;
    let valueBigInt: bigint;
    
    try {
      keyBigInt = BigInt(key);
      valueBigInt = BigInt(value);
    } catch {
      return NextResponse.json(
        { error: 'Invalid key or value format. Use hex strings (0x...) or decimal.' },
        { status: 400 }
      );
    }
    
    // Load or create tree
    // Note: In a server context, localStorage won't work
    // This API is designed for local development where state is managed client-side
    // For a real API, you'd use a database
    
    // For now, we'll create a fresh tree or use an in-memory singleton
    // This is a simplified implementation for local use
    let tree = globalThis.__imtTree;
    
    if (!tree) {
      tree = createEmptyTree(depth);
      globalThis.__imtTree = tree;
    }
    
    // Insert the node
    const result = insert(tree, keyBigInt, valueBigInt);
    
    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
    
    // Update global tree
    globalThis.__imtTree = result.state;
    
    return NextResponse.json({
      success: true,
      node: serializeNode(result.result.node),
      updatedPredecessor: result.result.updatedPredecessor 
        ? serializeNode(result.result.updatedPredecessor)
        : null,
      newRoot: result.result.newRoot,
    });
    
  } catch (error) {
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
