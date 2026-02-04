import { NextResponse } from 'next/server';
import { getRoot, exportTree, type IMTState } from '@stevieraykatz/imt-engine';

/**
 * GET /api/imt/tree
 * Export the complete tree state as JSON
 * 
 * Response:
 * {
 *   depth: number,
 *   nodes: Array<{ key: string, nextKey: string }>,
 *   nextIndex: number,
 *   root: string
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
    
    // Export the tree in compact format
    const exportData = exportTree(tree);
    
    // Also include the current root
    const root = getRoot(tree);
    
    return NextResponse.json({
      ...exportData,
      root,
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
