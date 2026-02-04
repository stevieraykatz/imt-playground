/**
 * Merkle proof generation for the Indexed Merkle Tree
 */
import type { IMTState, InclusionProof, ExclusionProof, MerkleProof } from './types.js';
/**
 * Generate a Merkle path (siblings and path indices) for a leaf at the given index
 */
export declare function getMerklePath(state: IMTState, leafIndex: number): {
    siblings: string[];
    pathIndices: number[];
};
/**
 * Generate a proof for a given key.
 * Returns an inclusion proof if the key exists, or an exclusion proof if it doesn't.
 */
export declare function generateProof(state: IMTState, key: bigint): MerkleProof | {
    error: string;
};
/**
 * Generate an inclusion proof for a key that exists in the tree
 */
export declare function generateInclusionProof(state: IMTState, key: bigint): InclusionProof | {
    error: string;
};
/**
 * Generate an exclusion proof for a key that does NOT exist in the tree.
 * We prove this by showing the "low node" - the node where:
 *   lowNode.key < queryKey < lowNode.nextKey
 *
 * This proves the key is not in the tree because:
 * 1. The low node is a valid member of the tree (Merkle proof)
 * 2. The linked list property guarantees no key exists between lowNode.key and lowNode.nextKey
 */
export declare function generateExclusionProof(state: IMTState, key: bigint): ExclusionProof | {
    error: string;
};
/**
 * Verify an inclusion proof
 *
 * @param proof - The inclusion proof to verify
 * @param expectedRoot - The expected size-committed root
 * @param size - The tree size (number of elements) used in the root commitment
 */
export declare function verifyInclusionProof(proof: InclusionProof, expectedRoot: string, size: number): boolean;
/**
 * Verify an exclusion proof
 *
 * @param proof - The exclusion proof to verify
 * @param queryKey - The key being proven absent from the tree
 * @param expectedRoot - The expected size-committed root
 * @param size - The tree size (number of elements) used in the root commitment
 */
export declare function verifyExclusionProof(proof: ExclusionProof, queryKey: bigint, expectedRoot: string, size: number): boolean;
//# sourceMappingURL=proof.d.ts.map