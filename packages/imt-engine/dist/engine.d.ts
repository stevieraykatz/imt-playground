/**
 * Core Indexed Merkle Tree engine
 *
 * The IMT maintains a linked list of nodes sorted by key.
 * Each node contains: key, index, nextKey
 *
 * The tree is append-only - new nodes are always added at nextIndex.
 */
import type { IMTNode, IMTState, InsertPreview, InsertResult } from './types.js';
/**
 * Create a new empty IMT with the specified depth.
 * Always includes a sentinel node at index 0 (key 0) so no query key is ever lower than the lowest node.
 */
export declare function createEmptyTree(depth: number): IMTState;
/**
 * Find the predecessor node for a given key.
 * Returns the node where: predecessor.key < key < predecessor.nextKey
 * With the sentinel (key 0) always present, a predecessor exists for any key in (0, MAX_KEY).
 */
export declare function findPredecessor(state: IMTState, key: bigint): IMTNode | null;
/**
 * Find the current head node (smallest key) in the tree.
 * Returns null if tree is empty.
 */
export declare function findHeadNode(state: IMTState): IMTNode | null;
/**
 * Check if a key already exists in the tree
 */
export declare function keyExists(state: IMTState, key: bigint): boolean;
/**
 * Get a node by its key
 */
export declare function getNodeByKey(state: IMTState, key: bigint): IMTNode | null;
/**
 * Get a node by its index
 */
export declare function getNodeByIndex(state: IMTState, index: number): IMTNode | null;
/**
 * Preview what an insertion would look like without modifying state
 */
export declare function previewInsert(state: IMTState, key: bigint): InsertPreview | {
    error: string;
};
/**
 * Insert a new node into the tree
 */
export declare function insert(state: IMTState, key: bigint): {
    state: IMTState;
    result: InsertResult;
} | {
    error: string;
};
/**
 * Build all Merkle tree layers from leaf nodes
 */
export declare function buildMerkleLayers(nodes: IMTNode[], depth: number): string[][];
/**
 * Get the raw Merkle root (without size commitment).
 * This is the root of the internal Merkle tree structure.
 * Used internally for tree traversal and proof generation.
 */
export declare function getRawRoot(state: IMTState): string;
/**
 * Get the current root hash with size commitment.
 *
 * This is the canonical root that should be used for verification.
 * It includes the tree size (nextIndex) hashed into the root to prevent
 * tree size manipulation attacks. See hashRootWithSize for details.
 */
export declare function getRoot(state: IMTState): string;
/**
 * Get all nodes sorted by key (for display purposes)
 */
export declare function getNodesSortedByKey(state: IMTState): IMTNode[];
/**
 * Get all nodes sorted by index (insertion order)
 */
export declare function getNodesSortedByIndex(state: IMTState): IMTNode[];
/**
 * Check tree invariants (for debugging)
 */
export declare function validateTree(state: IMTState): {
    valid: boolean;
    errors: string[];
};
//# sourceMappingURL=engine.d.ts.map