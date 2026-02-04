/**
 * Keccak256 hashing utilities for the IMT
 */
import type { IMTNode } from './types.js';
/**
 * Hash a single IMTNode to produce its leaf hash.
 * Hashes: keccak256(key || nextKey)
 * Each field is padded to 32 bytes (uint256).
 */
export declare function hashNode(node: IMTNode): string;
/**
 * Hash two sibling nodes to produce parent hash.
 * keccak256(left || right)
 */
export declare function hashPair(left: string, right: string): string;
/**
 * Hash for an empty/zero leaf.
 * This is keccak256 of 64 zero bytes (2 x 32-byte zero fields: key, nextKey).
 */
export declare function zeroHash(): string;
/**
 * Precompute zero hashes for each level of the tree.
 * zeroHashes[0] = hash of empty leaf
 * zeroHashes[i] = hash(zeroHashes[i-1], zeroHashes[i-1])
 */
export declare function computeZeroHashes(depth: number): string[];
/**
 * Compute keccak256 of arbitrary hex string
 */
export declare function keccak256(hexData: string): string;
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
export declare function hashRootWithSize(merkleRoot: string, size: number): string;
//# sourceMappingURL=hash.d.ts.map