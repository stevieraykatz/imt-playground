/**
 * TreeStore - Multi-tree management with JSON file persistence
 *
 * Stores trees as JSON files in a configurable directory (default: /tmp/imt-trees/)
 * Each tree is identified by a string ID (default: "default")
 */
import type { IMTState, IMTExportData } from './types.js';
import type { MerkleProof, InsertResult } from './types.js';
export declare const DEFAULT_TREE_ID = "default";
export declare const DEFAULT_STORAGE_DIR = "/tmp/imt";
export interface TreeStoreConfig {
    /** Directory to store tree JSON files */
    storageDir?: string;
}
export interface TreeMetadata {
    id: string;
    depth: number;
    size: number;
    root: string;
    createdAt: string;
    updatedAt: string;
}
/**
 * Manages multiple IMT instances with file-based persistence
 */
export declare class TreeStore {
    private trees;
    private metadata;
    private storageDir;
    constructor(config?: TreeStoreConfig);
    /**
     * Create storage directory if it doesn't exist
     */
    private ensureStorageDir;
    /**
     * Get the file path for a tree
     */
    private getTreePath;
    /**
     * Load all trees from storage on startup
     */
    private loadAllTrees;
    /**
     * Load a tree from disk
     */
    private loadTree;
    /**
     * Save a tree to disk
     */
    private saveTree;
    /**
     * Create a new empty tree
     *
     * @param depth - Tree depth (determines max capacity: 2^depth leaves)
     * @param treeId - Optional tree identifier (defaults to "default")
     * @returns The tree metadata
     */
    createTree(depth: number, treeId?: string): TreeMetadata;
    /**
     * Get a tree by ID, optionally creating it if it doesn't exist
     */
    getTree(treeId?: string): IMTState | null;
    /**
     * Get tree metadata
     */
    getTreeMetadata(treeId?: string): TreeMetadata | null;
    /**
     * List all trees
     */
    listTrees(): TreeMetadata[];
    /**
     * Check if a tree exists
     */
    hasTree(treeId?: string): boolean;
    /**
     * Insert a key into a tree
     *
     * @param key - The key to insert (bigint or hex string)
     * @param treeId - Optional tree identifier
     * @returns Insert result or error
     */
    insert(key: bigint | string, treeId?: string): InsertResult | {
        error: string;
    };
    /**
     * Get the root hash of a tree
     */
    getRoot(treeId?: string): string | {
        error: string;
    };
    /**
     * Generate a proof for a key
     */
    generateProof(key: bigint | string, treeId?: string): MerkleProof | {
        error: string;
    };
    /**
     * Export tree data (for API responses)
     */
    exportTree(treeId?: string): (IMTExportData & {
        root: string;
    }) | {
        error: string;
    };
    /**
     * Delete a tree
     */
    deleteTree(treeId: string): boolean;
    /**
     * Clear all trees
     */
    clearAll(): void;
}
export declare function getDefaultStore(config?: TreeStoreConfig): TreeStore;
export declare function resetDefaultStore(): void;
//# sourceMappingURL=store.d.ts.map