/**
 * Core types for Indexed Merkle Tree implementation
 */
/**
 * A Node represents a single leaf in an IMT.
 * Mirrors the Solidity struct from the smart contract.
 */
export interface IMTNode {
    /** The unique identifier in the tree upon which the tree is sorted */
    key: bigint;
    /** The node index (position in the leaves array) */
    index: number;
    /** The linked-list property - points to the next sorted key */
    nextKey: bigint;
}
/**
 * Serializable version of IMTNode for storage/API transport
 * (bigint is not JSON serializable)
 */
export interface SerializedIMTNode {
    key: string;
    index: number;
    nextKey: string;
}
/**
 * The complete state of an Indexed Merkle Tree
 */
export interface IMTState {
    /** Tree depth (number of levels, leaves = 2^depth) */
    depth: number;
    /** The leaf nodes (sparse array, empty slots are zero nodes) */
    nodes: IMTNode[];
    /** Next available index for insertion */
    nextIndex: number;
    /** The Merkle tree layers (layer 0 = leaf hashes, last layer = root) */
    layers: string[][];
}
/**
 * Serializable version of IMTState
 */
export interface SerializedIMTState {
    depth: number;
    nodes: SerializedIMTNode[];
    nextIndex: number;
    layers: string[][];
}
/**
 * Result of a preview insert operation
 */
export interface InsertPreview {
    /** The new node that would be created */
    newNode: IMTNode;
    /** The predecessor node that would be updated (null if inserting first real node) */
    predecessorNode: IMTNode | null;
    /** Index where the predecessor is located */
    predecessorIndex: number | null;
    /** The new nextKey value for the predecessor */
    predecessorNewNextKey: bigint | null;
}
/**
 * Result of an actual insert operation
 */
export interface InsertResult {
    /** The newly inserted node */
    node: IMTNode;
    /** The updated predecessor node */
    updatedPredecessor: IMTNode | null;
    /** The new root hash */
    newRoot: string;
}
/**
 * Inclusion proof - proves a key exists in the tree
 */
export interface InclusionProof {
    type: 'inclusion';
    /** The node containing the key */
    node: IMTNode;
    /** Sibling hashes along the Merkle path */
    siblings: string[];
    /** Path indices (0 = left, 1 = right) */
    pathIndices: number[];
}
/**
 * Exclusion proof - proves a key does NOT exist in the tree
 */
export interface ExclusionProof {
    type: 'exclusion';
    /** The "low" node where node.key < queryKey < node.nextKey */
    node: IMTNode;
    /** Sibling hashes along the Merkle path */
    siblings: string[];
    /** Path indices (0 = left, 1 = right) */
    pathIndices: number[];
}
export type MerkleProof = InclusionProof | ExclusionProof;
/**
 * Sentinel values for the IMT
 */
export declare const ZERO_KEY = 0n;
export declare const MAX_KEY: bigint;
/**
 * Helper to create a zero/empty node
 */
export declare function createZeroNode(index: number): IMTNode;
/**
 * Serialize an IMTNode for JSON transport
 */
export declare function serializeNode(node: IMTNode): SerializedIMTNode;
/**
 * Deserialize a node from JSON
 */
export declare function deserializeNode(node: SerializedIMTNode): IMTNode;
/**
 * Serialize full IMT state
 */
export declare function serializeState(state: IMTState): SerializedIMTState;
/**
 * Deserialize full IMT state
 */
export declare function deserializeState(state: SerializedIMTState): IMTState;
/**
 * Compact export format for JSON files
 */
export interface IMTExportNode {
    key: string;
    nextKey: string;
}
export interface IMTExportData {
    depth: number;
    nodes: IMTExportNode[];
    nextIndex: number;
}
/**
 * Export tree state to compact JSON format
 */
export declare function exportTree(state: IMTState): IMTExportData;
/**
 * Parse exported JSON back to IMTNode array
 */
export declare function parseImportedNodes(data: IMTExportData): {
    depth: number;
    nodes: IMTNode[];
    nextIndex: number;
};
/**
 * Serialized proof node for JSON export
 */
export interface SerializedProofNode {
    key: string;
    index: number;
    nextKey: string;
}
/**
 * Serialized inclusion proof for JSON export
 */
export interface SerializedInclusionProof {
    type: 'inclusion';
    depth: number;
    size: number;
    root: string;
    queryKey: string;
    node: SerializedProofNode;
    siblings: string[];
    pathIndices: number[];
}
/**
 * Serialized exclusion proof for JSON export
 */
export interface SerializedExclusionProof {
    type: 'exclusion';
    depth: number;
    size: number;
    root: string;
    queryKey: string;
    node: SerializedProofNode;
    siblings: string[];
    pathIndices: number[];
}
export type SerializedMerkleProof = SerializedInclusionProof | SerializedExclusionProof;
/**
 * Export a Merkle proof to JSON-serializable format.
 * Siblings are ordered from root to leaf (most significant first, descending depth).
 */
export declare function exportProof(queryKey: bigint, proof: MerkleProof, root: string, depth: number, size: number): SerializedMerkleProof;
//# sourceMappingURL=types.d.ts.map