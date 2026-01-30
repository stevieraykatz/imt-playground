/**
 * Keccak256 hashing utilities for the IMT
 */

import { keccak_256 } from '@noble/hashes/sha3';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import type { IMTNode } from './types';

/**
 * Hash a single IMTNode to produce its leaf hash.
 * Hashes: keccak256(key || nextKey)
 * Each field is padded to 32 bytes (uint256).
 */
export function hashNode(node: IMTNode): string {
  const buffer = new Uint8Array(32 * 2); // 2 uint256 fields: key, nextKey
  
  // Pack key (32 bytes)
  const keyBytes = bigintToBytes32(node.key);
  buffer.set(keyBytes, 0);
  
  // Pack nextKey (32 bytes)
  const nextKeyBytes = bigintToBytes32(node.nextKey);
  buffer.set(nextKeyBytes, 32);
  
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
 * This is keccak256 of 64 zero bytes (2 x 32-byte zero fields: key, nextKey).
 */
export function zeroHash(): string {
  const buffer = new Uint8Array(32 * 2);
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
