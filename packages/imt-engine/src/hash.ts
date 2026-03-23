/**
 * Keccak256 hashing utilities for the IMT
 */

import { keccak_256 } from '@noble/hashes/sha3.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import type { IMTNode } from './types.js';

/**
 * Hash a single IMTNode to produce its leaf hash.
 * Double-hashes each field to prevent second preimage attacks:
 *   keccak256(keccak256(key) || keccak256(nextKey))
 *
 * This mirrors the Solidity implementation:
 *   keccak256(bytes.concat(keccak256(abi.encode(node.key)), keccak256(abi.encode(node.nextKey))))
 */
export function hashNode(node: IMTNode): string {
  const keyHash = keccak_256(bigintToBytes32(node.key));
  const nextKeyHash = keccak_256(bigintToBytes32(node.nextKey));

  const buffer = new Uint8Array(64);
  buffer.set(keyHash, 0);
  buffer.set(nextKeyHash, 32);

  const hash = keccak_256(buffer);
  return '0x' + bytesToHex(hash);
}

/**
 * Hash two sibling nodes to produce parent hash.
 * keccak256(left || right)
 */
export function hashPair(left: string, right: string): string {
  const leftBytes = hexToBytes(left.slice(2)); // Remove 0x prefix
  const rightBytes = hexToBytes(right.slice(2));
  
  const buffer = new Uint8Array(64);
  buffer.set(leftBytes, 0);
  buffer.set(rightBytes, 32);
  
  const hash = keccak_256(buffer);
  return '0x' + bytesToHex(hash);
}

/**
 * Hash for an empty/zero leaf.
 * Uses the same double-hashing scheme as hashNode:
 *   keccak256(keccak256(0x00..00) || keccak256(0x00..00))
 */
export function zeroHash(): string {
  const zeroBytes = new Uint8Array(32);
  const fieldHash = keccak_256(zeroBytes);

  const buffer = new Uint8Array(64);
  buffer.set(fieldHash, 0);
  buffer.set(fieldHash, 32);

  const hash = keccak_256(buffer);
  return '0x' + bytesToHex(hash);
}

/**
 * Precompute zero hashes for each level of the tree.
 * zeroHashes[0] = hash of empty leaf
 * zeroHashes[i] = hash(zeroHashes[i-1], zeroHashes[i-1])
 */
export function computeZeroHashes(depth: number): string[] {
  const zeroHashes: string[] = new Array(depth + 1);
  zeroHashes[0] = zeroHash();
  
  for (let i = 1; i <= depth; i++) {
    zeroHashes[i] = hashPair(zeroHashes[i - 1], zeroHashes[i - 1]);
  }
  
  return zeroHashes;
}

/**
 * Convert a bigint to a 32-byte big-endian Uint8Array
 */
function bigintToBytes32(value: bigint): Uint8Array {
  const hex = value.toString(16).padStart(64, '0');
  return hexToBytes(hex);
}

/**
 * Compute keccak256 of arbitrary hex string
 */
export function keccak256(hexData: string): string {
  const data = hexToBytes(hexData.startsWith('0x') ? hexData.slice(2) : hexData);
  const hash = keccak_256(data);
  return '0x' + bytesToHex(hash);
}

/**
 * Hash the Merkle root with the tree size to create a size-committed root.
 * 
 * This is a critical security measure that binds the root to a specific tree state.
 * Without size commitment, an attacker could construct valid proofs for "virtual" 
 * empty leaves that were never actually inserted, or claim the tree has a different 
 * number of elements than it really does.
 * 
 * With size commitment, the root uniquely identifies both the tree's contents AND 
 * its size. A proof is only valid for the exact tree state (number of insertions) 
 * it was generated from.
 * 
 * Format: keccak256(merkleRoot || size)
 * where size is encoded as a uint256 (32 bytes, big-endian)
 */
export function hashRootWithSize(merkleRoot: string, size: number): string {
  const rootBytes = hexToBytes(merkleRoot.slice(2)); // Remove 0x prefix
  const sizeBytes = bigintToBytes32(BigInt(size));
  
  const buffer = new Uint8Array(64); // 32 bytes root + 32 bytes size
  buffer.set(rootBytes, 0);
  buffer.set(sizeBytes, 32);
  
  const hash = keccak_256(buffer);
  return '0x' + bytesToHex(hash);
}
