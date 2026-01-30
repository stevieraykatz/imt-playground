/**
 * Merkle proof generation for the Indexed Merkle Tree
 */

import type { IMTState, IMTNode, InclusionProof, ExclusionProof, MerkleProof } from './types';
import { getNodeByKey, findPredecessor, keyExists } from './engine';

/**
 * Generate a Merkle path (siblings and path indices) for a leaf at the given index
 */
export function getMerklePath(state: IMTState, leafIndex: number): { siblings: string[]; pathIndices: number[] } {
  const siblings: string[] = [];
  const pathIndices: number[] = [];
  
  let currentIndex = leafIndex;
  
  // Walk up the tree, collecting siblings
  for (let level = 0; level < state.depth; level++) {
    const isRightNode = currentIndex % 2 === 1;
    const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;
    
    // Get sibling hash from this level
    const sibling = state.layers[level][siblingIndex];
    if (sibling !== undefined) {
      siblings.push(sibling);
    } else {
      // Sibling doesn't exist (out of bounds), this shouldn't happen with proper tree
      siblings.push('0x0');
    }
    
    // Path index: 0 if we're the left child, 1 if we're the right child
    pathIndices.push(isRightNode ? 1 : 0);
    
    // Move to parent index
    currentIndex = Math.floor(currentIndex / 2);
  }
  
  return { siblings, pathIndices };
}

/**
 * Generate a proof for a given key.
 * Returns an inclusion proof if the key exists, or an exclusion proof if it doesn't.
 */
export function generateProof(state: IMTState, key: bigint): MerkleProof | { error: string } {
  // Check if key exists
  if (keyExists(state, key)) {
    return generateInclusionProof(state, key);
  } else {
    return generateExclusionProof(state, key);
  }
}

/**
 * Generate an inclusion proof for a key that exists in the tree
 */
export function generateInclusionProof(state: IMTState, key: bigint): InclusionProof | { error: string } {
  const node = getNodeByKey(state, key);
  
  if (!node) {
    return { error: `Key ${key} not found in tree` };
  }
  
  const { siblings, pathIndices } = getMerklePath(state, node.index);
  
  return {
    type: 'inclusion',
    node,
    siblings,
    pathIndices,
  };
}

/**
 * Generate an exclusion proof for a key that does NOT exist in the tree.
 * We prove this by showing the "low node" - the node where:
 *   lowNode.key < queryKey < lowNode.nextKey
 * 
 * This proves the key is not in the tree because:
 * 1. The low node is a valid member of the tree (Merkle proof)
 * 2. The linked list property guarantees no key exists between lowNode.key and lowNode.nextKey
 */
export function generateExclusionProof(state: IMTState, key: bigint): ExclusionProof | { error: string } {
  // First verify the key actually doesn't exist
  if (keyExists(state, key)) {
    return { error: `Key ${key} exists in tree - cannot generate exclusion proof` };
  }
  
  // Find the predecessor (low node)
  const lowNode = findPredecessor(state, key);
  
  if (!lowNode) {
    return { error: `Could not find low node for key ${key}` };
  }
  
  // Generate Merkle proof for the low node
  const { siblings, pathIndices } = getMerklePath(state, lowNode.index);
  
  return {
    type: 'exclusion',
    lowNode,
    lowNodeSiblings: siblings,
    lowNodePathIndices: pathIndices,
  };
}

/**
 * Verify an inclusion proof
 */
export function verifyInclusionProof(
  proof: InclusionProof,
  expectedRoot: string
): boolean {
  const { node, siblings, pathIndices } = proof;
  
  // Compute the root from the leaf
  const { hashNode, hashPair } = require('./hash');
  let currentHash = hashNode(node);
  
  for (let i = 0; i < siblings.length; i++) {
    const sibling = siblings[i];
    const isRight = pathIndices[i] === 1;
    
    if (isRight) {
      currentHash = hashPair(sibling, currentHash);
    } else {
      currentHash = hashPair(currentHash, sibling);
    }
  }
  
  return currentHash === expectedRoot;
}

/**
 * Verify an exclusion proof
 */
export function verifyExclusionProof(
  proof: ExclusionProof,
  queryKey: bigint,
  expectedRoot: string
): boolean {
  const { lowNode, lowNodeSiblings, lowNodePathIndices } = proof;
  
  // First check the linked list property: lowNode.key < queryKey < lowNode.nextKey
  if (!(lowNode.key < queryKey && queryKey < lowNode.nextKey)) {
    return false;
  }
  
  // Then verify the Merkle proof for the low node
  const { hashNode, hashPair } = require('./hash');
  let currentHash = hashNode(lowNode);
  
  for (let i = 0; i < lowNodeSiblings.length; i++) {
    const sibling = lowNodeSiblings[i];
    const isRight = lowNodePathIndices[i] === 1;
    
    if (isRight) {
      currentHash = hashPair(sibling, currentHash);
    } else {
      currentHash = hashPair(currentHash, sibling);
    }
  }
  
  return currentHash === expectedRoot;
}
