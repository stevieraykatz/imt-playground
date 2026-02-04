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
export const ZERO_KEY = 0n;
export const MAX_KEY = BigInt('0x' + 'ff'.repeat(32)); // 2^256 - 1

/**
 * Helper to create a zero/empty node
 */
export function createZeroNode(index: number): IMTNode {
  return {
    key: ZERO_KEY,
    index,
    nextKey: ZERO_KEY,
  };
}

/**
 * Serialize an IMTNode for JSON transport
 */
export function serializeNode(node: IMTNode): SerializedIMTNode {
  return {
    key: '0x' + node.key.toString(16),
    index: node.index,
    nextKey: '0x' + node.nextKey.toString(16),
  };
}

/**
 * Deserialize a node from JSON
 */
export function deserializeNode(node: SerializedIMTNode): IMTNode {
  return {
    key: BigInt(node.key),
    index: node.index,
    nextKey: BigInt(node.nextKey),
  };
}

/**
 * Serialize full IMT state
 */
export function serializeState(state: IMTState): SerializedIMTState {
  return {
    depth: state.depth,
    nodes: state.nodes.map(serializeNode),
    nextIndex: state.nextIndex,
    layers: state.layers,
  };
}

/**
 * Deserialize full IMT state
 */
export function deserializeState(state: SerializedIMTState): IMTState {
  return {
    depth: state.depth,
    nodes: state.nodes.map(deserializeNode),
    nextIndex: state.nextIndex,
    layers: state.layers,
  };
}

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
export function exportTree(state: IMTState): IMTExportData {
  // Nodes must be sorted by index for export (index is implicit from array position)
  const sortedNodes = [...state.nodes].sort((a, b) => a.index - b.index);
  
  return {
    depth: state.depth,
    nodes: sortedNodes.map(node => ({
      key: '0x' + node.key.toString(16),
      nextKey: '0x' + node.nextKey.toString(16),
    })),
    nextIndex: state.nextIndex,
  };
}

/**
 * Parse exported JSON back to IMTNode array
 */
export function parseImportedNodes(data: IMTExportData): { depth: number; nodes: IMTNode[]; nextIndex: number } {
  return {
    depth: data.depth,
    nodes: data.nodes.map((node, index) => ({
      key: BigInt(node.key),
      index,
      nextKey: BigInt(node.nextKey),
    })),
    nextIndex: data.nextIndex,
  };
}

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
export function exportProof(queryKey: bigint, proof: MerkleProof, root: string, depth: number, size: number): SerializedMerkleProof {
  const formatKey = (k: bigint): string => '0x' + k.toString(16);
  
  if (proof.type === 'inclusion') {
    return {
      type: 'inclusion',
      depth,
      size,
      root,
      queryKey: formatKey(queryKey),
      node: {
        key: formatKey(proof.node.key),
        index: proof.node.index,
        nextKey: formatKey(proof.node.nextKey),
      },
      siblings: [...proof.siblings].reverse(),
      pathIndices: [...proof.pathIndices].reverse(),
    };
  } else {
    return {
      type: 'exclusion',
      depth,
      size,
      root,
      queryKey: formatKey(queryKey),
      node: {
        key: formatKey(proof.node.key),
        index: proof.node.index,
        nextKey: formatKey(proof.node.nextKey),
      },
      siblings: [...proof.siblings].reverse(),
      pathIndices: [...proof.pathIndices].reverse(),
    };
  }
}
