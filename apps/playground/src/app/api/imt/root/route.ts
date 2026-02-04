import { NextResponse } from 'next/server';
import { getRoot, type IMTState } from '@stevieraykatz/imt-engine';

/**
 * GET /api/imt/root
 * Get the current Merkle root of the tree
 * 
 * Response:
 * {
 *   root: string,
 *   size: number,
 *   depth: number
 * }
 */
export async function GET() {
  try {
    // Get the tree from global state
    const tree = globalThis.__imtTree;
    
    if (!tree) {
      return NextResponse.json(
        { error: 'Tree not initialized. Append a key first via POST /api/imt/append' },
        { status: 400 }
      );
    }
    
    const root = getRoot(tree);
    
    return NextResponse.json({
      root,
      size: tree.nextIndex,
      depth: tree.depth,
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
  var __imtTree: IMTState | undefined;
}
