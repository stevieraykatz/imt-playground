import { NextRequest, NextResponse } from 'next/server';
import { generateProof } from '@/lib/imt/proof';
import { serializeNode } from '@/lib/imt/types';

/**
 * GET /api/proof/[key]
 * Get an inclusion or exclusion proof for a key
 * 
 * URL parameter:
 *   key: hex string (e.g., "0x1234") or decimal
 * 
 * Response (inclusion):
 * {
 *   type: "inclusion",
 *   node: SerializedIMTNode,
 *   siblings: string[],
 *   pathIndices: number[]
 * }
 * 
 * Response (exclusion):
 * {
 *   type: "exclusion",
 *   node: SerializedIMTNode,
 *   siblings: string[],
 *   pathIndices: number[]
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    
    if (!key) {
      return NextResponse.json(
        { error: 'Missing key parameter' },
        { status: 400 }
      );
    }
    
    // Parse the key
    let keyBigInt: bigint;
    try {
      // Handle URL-encoded hex strings
      const decodedKey = decodeURIComponent(key);
      keyBigInt = BigInt(decodedKey);
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
        { error: 'Tree not initialized. Insert a node first via POST /api/nodes' },
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
    
    // Serialize the response
    if (proof.type === 'inclusion') {
      return NextResponse.json({
        type: 'inclusion',
        node: serializeNode(proof.node),
        siblings: proof.siblings,
        pathIndices: proof.pathIndices,
      });
    } else {
      return NextResponse.json({
        type: 'exclusion',
        node: serializeNode(proof.node),
        siblings: proof.siblings,
        pathIndices: proof.pathIndices,
      });
    }
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
