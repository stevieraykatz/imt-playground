/**
 * Core Indexed Merkle Tree engine
 * 
 * The IMT maintains a linked list of nodes sorted by key.
 * Each node contains: key, index, nextKey
 * 
 * The tree is append-only - new nodes are always added at nextIndex.
 */

import type { IMTNode, IMTState, InsertPreview, InsertResult } from './types';
import { ZERO_KEY, MAX_KEY } from './types';
import { hashNode, hashPair, computeZeroHashes, hashRootWithSize } from './hash';

/**
 * Create a new empty IMT with the specified depth.
 * Starts with no nodes - index 0 is available for real data.
 */
export function createEmptyTree(depth: number): IMTState {
  const nodes: IMTNode[] = [];
  
  // Build initial Merkle tree (all zeros)
  const layers = buildMerkleLayers(nodes, depth);
  
  return {
    depth,
    nodes,
    nextIndex: 0, // First insertion goes to index 0
    layers,
  };
}

/**
 * Find the predecessor node for a given key.
 * Returns the node where: predecessor.key < key < predecessor.nextKey
 * Returns null if:
 * - Tree is empty (first insertion)
 * - Key is smaller than all existing keys (new node becomes head)
 */
export function findPredecessor(state: IMTState, key: bigint): IMTNode | null {
  for (const node of state.nodes) {
    if (node.key < key && key < node.nextKey) {
      return node;
    }
  }
  
  return null;
}

/**
 * Find the current head node (smallest key) in the tree.
 * Returns null if tree is empty.
 */
export function findHeadNode(state: IMTState): IMTNode | null {
  if (state.nodes.length === 0) return null;
  
  let head = state.nodes[0];
  for (const node of state.nodes) {
    if (node.key < head.key) {
      head = node;
    }
  }
  return head;
}

/**
 * Check if a key already exists in the tree
 */
export function keyExists(state: IMTState, key: bigint): boolean {
  return state.nodes.some(node => node.key === key);
}

/**
 * Get a node by its key
 */
export function getNodeByKey(state: IMTState, key: bigint): IMTNode | null {
  return state.nodes.find(node => node.key === key) ?? null;
}

/**
 * Get a node by its index
 */
export function getNodeByIndex(state: IMTState, index: number): IMTNode | null {
  return state.nodes.find(node => node.index === index) ?? null;
}

/**
 * Preview what an insertion would look like without modifying state
 */
export function previewInsert(state: IMTState, key: bigint): InsertPreview | { error: string } {
  // Check if tree is full
  const maxLeaves = Math.pow(2, state.depth);
  if (state.nextIndex >= maxLeaves) {
    return { error: 'Tree is full' };
  }
  
  // Check if key already exists
  if (keyExists(state, key)) {
    return { error: `Key ${key} already exists in the tree` };
  }
  
  // Key must be greater than 0
  if (key <= ZERO_KEY) {
    return { error: 'Key must be greater than 0' };
  }
  
  // Find predecessor (node where predecessor.key < key < predecessor.nextKey)
  const predecessor = findPredecessor(state, key);
  
  if (predecessor) {
    // Normal case: inserting between existing nodes
    const newNode: IMTNode = {
      key,
      index: state.nextIndex,
      nextKey: predecessor.nextKey, // New node points to what predecessor pointed to
    };
    
    return {
      newNode,
      predecessorNode: predecessor,
      predecessorIndex: predecessor.index,
      predecessorNewNextKey: key, // Predecessor will now point to new node
    };
  }
  
  // No predecessor means either:
  // 1. Tree is empty (first insertion)
  // 2. Key is smaller than all existing keys (becomes new head)
  
  const currentHead = findHeadNode(state);
  
  const newNode: IMTNode = {
    key,
    index: state.nextIndex,
    nextKey: currentHead ? currentHead.key : MAX_KEY, // Point to current head or MAX_KEY if empty
  };
  
  return {
    newNode,
    predecessorNode: null,
    predecessorIndex: null,
    predecessorNewNextKey: null, // No predecessor to update
  };
}

/**
 * Insert a new node into the tree
 */
export function insert(state: IMTState, key: bigint): { state: IMTState; result: InsertResult } | { error: string } {
  const preview = previewInsert(state, key);
  
  if ('error' in preview) {
    return preview;
  }
  
  const { newNode, predecessorNode, predecessorIndex } = preview;
  
  // Clone nodes array
  const newNodes = [...state.nodes];
  
  // Update predecessor's nextKey
  if (predecessorNode && predecessorIndex !== null) {
    const updatedPredecessor: IMTNode = {
      ...predecessorNode,
      nextKey: key,
    };
    // Find and replace the predecessor in the array
    const predArrayIndex = newNodes.findIndex(n => n.index === predecessorIndex);
    if (predArrayIndex !== -1) {
      newNodes[predArrayIndex] = updatedPredecessor;
    }
  }
  
  // Add the new node
  newNodes.push(newNode);
  
  // Rebuild Merkle tree
  const layers = buildMerkleLayers(newNodes, state.depth);
  
  const newNextIndex = state.nextIndex + 1;
  
  const newState: IMTState = {
    depth: state.depth,
    nodes: newNodes,
    nextIndex: newNextIndex,
    layers,
  };
  
  // Compute size-committed root: hash(rawRoot || size)
  const rawRoot = layers[layers.length - 1][0];
  const committedRoot = hashRootWithSize(rawRoot, newNextIndex);
  
  const result: InsertResult = {
    node: newNode,
    updatedPredecessor: predecessorNode ? { ...predecessorNode, nextKey: key } : null,
    newRoot: committedRoot,
  };
  
  return { state: newState, result };
}

/**
 * Build all Merkle tree layers from leaf nodes
 */
export function buildMerkleLayers(nodes: IMTNode[], depth: number): string[][] {
  const maxLeaves = Math.pow(2, depth);
  const zeroHashes = computeZeroHashes(depth);
  
  // Layer 0: leaf hashes
  const leafHashes: string[] = new Array(maxLeaves);
  
  // Initialize all leaves with zero hash
  for (let i = 0; i < maxLeaves; i++) {
    leafHashes[i] = zeroHashes[0];
  }
  
  // Fill in actual node hashes
  for (const node of nodes) {
    if (node.index < maxLeaves) {
      leafHashes[node.index] = hashNode(node);
    }
  }
  
  const layers: string[][] = [leafHashes];
  
  // Build tree bottom-up
  let currentLayer = leafHashes;
  for (let level = 1; level <= depth; level++) {
    const nextLayer: string[] = [];
    for (let i = 0; i < currentLayer.length; i += 2) {
      const left = currentLayer[i];
      const right = currentLayer[i + 1] ?? zeroHashes[level - 1];
      nextLayer.push(hashPair(left, right));
    }
    layers.push(nextLayer);
    currentLayer = nextLayer;
  }
  
  return layers;
}

/**
 * Get the raw Merkle root (without size commitment).
 * This is the root of the internal Merkle tree structure.
 * Used internally for tree traversal and proof generation.
 */
export function getRawRoot(state: IMTState): string {
  if (state.layers.length === 0) {
    return computeZeroHashes(state.depth)[state.depth];
  }
  return state.layers[state.layers.length - 1][0];
}

/**
 * Get the current root hash with size commitment.
 * 
 * This is the canonical root that should be used for verification.
 * It includes the tree size (nextIndex) hashed into the root to prevent
 * tree size manipulation attacks. See hashRootWithSize for details.
 */
export function getRoot(state: IMTState): string {
  const rawRoot = getRawRoot(state);
  return hashRootWithSize(rawRoot, state.nextIndex);
}

/**
 * Get all nodes sorted by key (for display purposes)
 */
export function getNodesSortedByKey(state: IMTState): IMTNode[] {
  return [...state.nodes].sort((a, b) => {
    if (a.key < b.key) return -1;
    if (a.key > b.key) return 1;
    return 0;
  });
}

/**
 * Get all nodes sorted by index (insertion order)
 */
export function getNodesSortedByIndex(state: IMTState): IMTNode[] {
  return [...state.nodes].sort((a, b) => a.index - b.index);
}

/**
 * Check tree invariants (for debugging)
 */
export function validateTree(state: IMTState): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check linked list integrity
  const sortedByKey = getNodesSortedByKey(state);
  for (let i = 0; i < sortedByKey.length - 1; i++) {
    const current = sortedByKey[i];
    const next = sortedByKey[i + 1];
    if (current.nextKey !== next.key) {
      errors.push(`Node at index ${current.index} has nextKey=${current.nextKey} but next sorted node has key=${next.key}`);
    }
  }
  
  // Last node should point to MAX_KEY
  if (sortedByKey.length > 0) {
    const lastNode = sortedByKey[sortedByKey.length - 1];
    if (lastNode.nextKey !== MAX_KEY) {
      errors.push(`Last node should have nextKey=MAX_KEY but has nextKey=${lastNode.nextKey}`);
    }
  }
  
  // Check no duplicate keys
  const keys = state.nodes.map(n => n.key);
  const uniqueKeys = new Set(keys.map(k => k.toString()));
  if (uniqueKeys.size !== keys.length) {
    errors.push('Duplicate keys found in tree');
  }
  
  // Check no duplicate indices
  const indices = state.nodes.map(n => n.index);
  const uniqueIndices = new Set(indices);
  if (uniqueIndices.size !== indices.length) {
    errors.push('Duplicate indices found in tree');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
