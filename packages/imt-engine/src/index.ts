/**
 * @stevieraykatz/imt-engine - Indexed Merkle Tree Engine
 * 
 * A pure TypeScript implementation of an Indexed Merkle Tree (IMT).
 * 
 * @example Direct usage:
 * ```typescript
 * import { createEmptyTree, insert, generateProof, getRoot } from '@stevieraykatz/imt-engine';
 * 
 * // Create a tree with depth 4 (16 leaves max)
 * let tree = createEmptyTree(4);
 * 
 * // Insert some keys
 * const result1 = insert(tree, 100n);
 * if (!('error' in result1)) {
 *   tree = result1.state;
 *   console.log('New root:', result1.result.newRoot);
 * }
 * 
 * // Generate a proof
 * const proof = generateProof(tree, 100n);
 * if (!('error' in proof)) {
 *   console.log('Proof type:', proof.type); // 'inclusion'
 * }
 * 
 * // Get the current root
 * const root = getRoot(tree);
 * ```
 * 
 * @example Multi-tree store with persistence:
 * ```typescript
 * import { TreeStore } from '@stevieraykatz/imt-engine';
 * 
 * const store = new TreeStore({ storageDir: './data' });
 * 
 * // Create trees with different IDs
 * store.createTree(4, 'tree-1');
 * store.createTree(8, 'tree-2');
 * 
 * // Insert into specific tree
 * store.insert('0x1234', 'tree-1');
 * 
 * // Use default tree
 * store.insert('0x5678'); // Uses "default" tree
 * ```
 * 
 * @example HTTP API server:
 * ```typescript
 * import { startServer } from '@stevieraykatz/imt-engine';
 * 
 * // Start API server on port 3001
 * startServer({ port: 3001, storageDir: '/tmp/imt-trees' });
 * ```
 * 
 * Or use the CLI:
 * ```bash
 * npx @stevieraykatz/imt-engine serve --port 3001
 * ```
 */

export * from './types.js';
export * from './hash.js';
export * from './engine.js';
export * from './proof.js';
export * from './store.js';
export { createServer, startServer, type ServerConfig } from './server.js';
export { type LogLevel, LOG_LEVELS, DEFAULT_LOG_LEVEL, isValidLogLevel } from './logger.js';
export { AsyncSemaphore } from './concurrency.js';
