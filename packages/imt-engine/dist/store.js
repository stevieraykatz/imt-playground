/**
 * TreeStore - Multi-tree management with JSON file persistence
 *
 * Stores trees as JSON files in a configurable directory (default: /tmp/imt-trees/)
 * Each tree is identified by a string ID (default: "default")
 */
import * as fs from 'fs';
import * as path from 'path';
import { exportTree, parseImportedNodes } from './types.js';
import { createEmptyTree, insert, getRoot, buildMerkleLayers } from './engine.js';
import { generateProof } from './proof.js';
export const DEFAULT_TREE_ID = 'default';
export const DEFAULT_STORAGE_DIR = '/tmp/imt';
/**
 * Manages multiple IMT instances with file-based persistence
 */
export class TreeStore {
    constructor(config = {}) {
        this.trees = new Map();
        this.metadata = new Map();
        this.dirtyTrees = new Set();
        this.flushTimer = null;
        this.storageDir = config.storageDir ?? DEFAULT_STORAGE_DIR;
        this.flushIntervalMs = config.flushIntervalMs ?? 100;
        this.ensureStorageDir();
        this.loadAllTrees();
    }
    /**
     * Create storage directory if it doesn't exist
     */
    ensureStorageDir() {
        if (!fs.existsSync(this.storageDir)) {
            fs.mkdirSync(this.storageDir, { recursive: true });
        }
    }
    /**
     * Get the file path for a tree
     */
    getTreePath(treeId) {
        // Sanitize tree ID to prevent path traversal
        const safeId = treeId.replace(/[^a-zA-Z0-9_-]/g, '_');
        return path.join(this.storageDir, `${safeId}.json`);
    }
    /**
     * Load all trees from storage on startup
     */
    loadAllTrees() {
        try {
            const files = fs.readdirSync(this.storageDir);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const treeId = file.replace('.json', '');
                    this.loadTree(treeId);
                }
            }
        }
        catch {
            // Directory might not exist yet, that's fine
        }
    }
    /**
     * Load a tree from disk
     */
    loadTree(treeId) {
        const filePath = this.getTreePath(treeId);
        if (!fs.existsSync(filePath)) {
            return null;
        }
        try {
            const data = fs.readFileSync(filePath, 'utf-8');
            const stored = JSON.parse(data);
            // Parse and rebuild the tree
            const { depth, nodes, nextIndex } = parseImportedNodes(stored);
            const layers = buildMerkleLayers(nodes, depth);
            const tree = {
                depth,
                nodes,
                nextIndex,
                layers,
            };
            this.trees.set(treeId, tree);
            this.metadata.set(treeId, {
                createdAt: stored.createdAt ?? new Date().toISOString(),
                updatedAt: stored.updatedAt ?? new Date().toISOString(),
            });
            return tree;
        }
        catch {
            return null;
        }
    }
    /**
     * Persist a single tree to disk (synchronous I/O).
     */
    persistTree(treeId) {
        const tree = this.trees.get(treeId);
        if (!tree)
            return;
        const meta = this.metadata.get(treeId);
        const exportData = exportTree(tree);
        const stored = {
            ...exportData,
            createdAt: meta?.createdAt ?? new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        const filePath = this.getTreePath(treeId);
        fs.writeFileSync(filePath, JSON.stringify(stored, null, 2));
        this.metadata.set(treeId, {
            createdAt: stored.createdAt,
            updatedAt: stored.updatedAt,
        });
    }
    /**
     * Mark a tree as needing persistence.
     * With flushIntervalMs > 0 the actual write is deferred so
     * rapid mutations within the window are coalesced into one I/O.
     */
    saveTree(treeId) {
        if (this.flushIntervalMs <= 0) {
            this.persistTree(treeId);
            return;
        }
        this.dirtyTrees.add(treeId);
        if (!this.flushTimer) {
            this.flushTimer = setTimeout(() => {
                this.flushTimer = null;
                this.flush();
            }, this.flushIntervalMs);
        }
    }
    /**
     * Immediately persist all dirty trees to disk.
     * Safe to call multiple times; no-ops when nothing is dirty.
     */
    flush() {
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
            this.flushTimer = null;
        }
        for (const treeId of this.dirtyTrees) {
            this.persistTree(treeId);
        }
        this.dirtyTrees.clear();
    }
    /**
     * Flush pending writes and release timers.
     * Call this before letting the process exit.
     */
    close() {
        this.flush();
    }
    /**
     * Create a new empty tree
     *
     * @param depth - Tree depth (determines max capacity: 2^depth leaves)
     * @param treeId - Optional tree identifier (defaults to "default")
     * @returns The tree metadata
     */
    createTree(depth, treeId = DEFAULT_TREE_ID) {
        const tree = createEmptyTree(depth);
        const now = new Date().toISOString();
        this.trees.set(treeId, tree);
        this.metadata.set(treeId, { createdAt: now, updatedAt: now });
        this.saveTree(treeId);
        return {
            id: treeId,
            depth: tree.depth,
            size: tree.nextIndex,
            root: getRoot(tree),
            createdAt: now,
            updatedAt: now,
        };
    }
    /**
     * Get a tree by ID, optionally creating it if it doesn't exist
     */
    getTree(treeId = DEFAULT_TREE_ID) {
        return this.trees.get(treeId) ?? null;
    }
    /**
     * Get tree metadata
     */
    getTreeMetadata(treeId = DEFAULT_TREE_ID) {
        const tree = this.trees.get(treeId);
        const meta = this.metadata.get(treeId);
        if (!tree || !meta)
            return null;
        return {
            id: treeId,
            depth: tree.depth,
            size: tree.nextIndex,
            root: getRoot(tree),
            createdAt: meta.createdAt,
            updatedAt: meta.updatedAt,
        };
    }
    /**
     * List all trees
     */
    listTrees() {
        const result = [];
        for (const [treeId, tree] of this.trees) {
            const meta = this.metadata.get(treeId);
            if (meta) {
                result.push({
                    id: treeId,
                    depth: tree.depth,
                    size: tree.nextIndex,
                    root: getRoot(tree),
                    createdAt: meta.createdAt,
                    updatedAt: meta.updatedAt,
                });
            }
        }
        return result;
    }
    /**
     * Check if a tree exists
     */
    hasTree(treeId = DEFAULT_TREE_ID) {
        return this.trees.has(treeId);
    }
    /**
     * Insert a key into a tree
     *
     * @param key - The key to insert (bigint or hex string)
     * @param treeId - Optional tree identifier
     * @returns Insert result or error
     */
    insert(key, treeId = DEFAULT_TREE_ID) {
        const tree = this.trees.get(treeId);
        if (!tree) {
            return { error: `Tree "${treeId}" not found. Create it first with createTree().` };
        }
        // Parse key if string
        let keyBigInt;
        try {
            keyBigInt = typeof key === 'string' ? BigInt(key) : key;
        }
        catch {
            return { error: 'Invalid key format. Use hex string (0x...) or decimal.' };
        }
        const result = insert(tree, keyBigInt);
        if ('error' in result) {
            return result;
        }
        // Update stored tree and persist
        this.trees.set(treeId, result.state);
        this.saveTree(treeId);
        return result.result;
    }
    /**
     * Get the root hash of a tree
     */
    getRoot(treeId = DEFAULT_TREE_ID) {
        const tree = this.trees.get(treeId);
        if (!tree) {
            return { error: `Tree "${treeId}" not found.` };
        }
        return getRoot(tree);
    }
    /**
     * Generate a proof for a key
     */
    generateProof(key, treeId = DEFAULT_TREE_ID) {
        const tree = this.trees.get(treeId);
        if (!tree) {
            return { error: `Tree "${treeId}" not found.` };
        }
        // Parse key if string
        let keyBigInt;
        try {
            keyBigInt = typeof key === 'string' ? BigInt(key) : key;
        }
        catch {
            return { error: 'Invalid key format. Use hex string (0x...) or decimal.' };
        }
        return generateProof(tree, keyBigInt);
    }
    /**
     * Export tree data (for API responses)
     */
    exportTree(treeId = DEFAULT_TREE_ID) {
        const tree = this.trees.get(treeId);
        if (!tree) {
            return { error: `Tree "${treeId}" not found.` };
        }
        return {
            ...exportTree(tree),
            root: getRoot(tree),
        };
    }
    /**
     * Delete a tree
     */
    deleteTree(treeId) {
        if (!this.trees.has(treeId)) {
            return false;
        }
        this.trees.delete(treeId);
        this.metadata.delete(treeId);
        // Delete file
        const filePath = this.getTreePath(treeId);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        return true;
    }
    /**
     * Clear all trees
     */
    clearAll() {
        for (const treeId of this.trees.keys()) {
            this.deleteTree(treeId);
        }
    }
}
/**
 * Create a singleton store instance for convenience
 */
let defaultStore = null;
export function getDefaultStore(config) {
    if (!defaultStore) {
        defaultStore = new TreeStore(config);
    }
    return defaultStore;
}
export function resetDefaultStore() {
    defaultStore = null;
}
