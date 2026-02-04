import { NextRequest, NextResponse } from 'next/server';
import { generateProof, getRoot, exportProof, type IMTState } from '@stevieraykatz/imt-engine';

/**
 * GET /api/imt/proof?key=0x1234
 * Get an inclusion or exclusion proof for a key
 * 
 * Query parameters:
 *   key: hex string (e.g., "0x1234") or decimal
 * 
 * Response (inclusion):
 * {
 *   type: "inclusion",
 *   depth: number,
 *   size: number,
 *   root: string,
 *   queryKey: string,
 *   node: { key: string, index: number, nextKey: string },
 *   siblings: string[],
 *   pathIndices: number[]
 * }
 * 
 * Response (exclusion):
 * {
 *   type: "exclusion",
 *   depth: number,
 *   size: number,
 *   root: string,
 *   queryKey: string,
 *   node: { key: string, index: number, nextKey: string },
 *   siblings: string[],
 *   pathIndices: number[]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const key = searchParams.get('key');
    
    if (!key) {
      return NextResponse.json(
        { error: 'Missing required query parameter: key' },
        { status: 400 }
      );
    }
    
    // Parse the key
    let keyBigInt: bigint;
    try {
      keyBigInt = BigInt(key);
    } catch {
      return NextResponse.json(
        { error: 'Invalid key format. Use hex string (0x...) or decimal.' },
        { status: 400 }
      );
    }
    
    // Get the tree from global state
    const tree = globalThis.__imtTree;
    
    if (!tree) {
      return NextResponse.json(
        { error: 'Tree not initialized. Append a key first via POST /api/imt/append' },
        { status: 400 }
      );
    }
    
    // Generate the proof
    const proof = generateProof(tree, keyBigInt);
    
    if ('error' in proof) {
      return NextResponse.json(
        { error: proof.error },
        { status: 400 }
      );
    }
    
    // Get the current root and tree metadata
    const root = getRoot(tree);
    const depth = tree.depth;
    const size = tree.nextIndex;
    
    // Export the proof in the standard JSON format
    const serializedProof = exportProof(keyBigInt, proof, root, depth, size);
    
    return NextResponse.json(serializedProof);
    
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
