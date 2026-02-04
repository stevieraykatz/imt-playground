/**
 * TreeStore - Multi-tree management with JSON file persistence
 * 
 * Stores trees as JSON files in a configurable directory (default: /tmp/imt-trees/)
 * Each tree is identified by a string ID (default: "default")
 */

import * as fs from 'fs';
import * as path from 'path';
import type { IMTState, IMTExportData } from './types.js';
import { exportTree, parseImportedNodes } from './types.js';
import { createEmptyTree, insert, getRoot, buildMerkleLayers } from './engine.js';
import { generateProof } from './proof.js';
import type { MerkleProof, InsertResult } from './types.js';

export const DEFAULT_TREE_ID = 'default';
export const DEFAULT_STORAGE_DIR = '/tmp/imt';

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
export class TreeStore {
  private trees: Map<string, IMTState> = new Map();
  private metadata: Map<string, { createdAt: string; updatedAt: string }> = new Map();
  private storageDir: string;

  constructor(config: TreeStoreConfig = {}) {
    this.storageDir = config.storageDir ?? DEFAULT_STORAGE_DIR;
    this.ensureStorageDir();
    this.loadAllTrees();
  }

  /**
   * Create storage directory if it doesn't exist
   */
  private ensureStorageDir(): void {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  /**
   * Get the file path for a tree
   */
  private getTreePath(treeId: string): string {
    // Sanitize tree ID to prevent path traversal
    const safeId = treeId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.storageDir, `${safeId}.json`);
  }

  /**
   * Load all trees from storage on startup
   */
  private loadAllTrees(): void {
    try {
      const files = fs.readdirSync(this.storageDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const treeId = file.replace('.json', '');
          this.loadTree(treeId);
        }
      }
    } catch {
      // Directory might not exist yet, that's fine
    }
  }

  /**
   * Load a tree from disk
   */
  private loadTree(treeId: string): IMTState | null {
    const filePath = this.getTreePath(treeId);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const data = fs.readFileSync(filePath, 'utf-8');
      const stored = JSON.parse(data) as IMTExportData & { 
        createdAt?: string; 
        updatedAt?: string;
      };
      
      // Parse and rebuild the tree
      const { depth, nodes, nextIndex } = parseImportedNodes(stored);
      const layers = buildMerkleLayers(nodes, depth);
      
      const tree: IMTState = {
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
    } catch {
      return null;
    }
  }

  /**
   * Save a tree to disk
   */
  private saveTree(treeId: string): void {
    const tree = this.trees.get(treeId);
    if (!tree) return;

    const meta = this.metadata.get(treeId);
    const exportData = exportTree(tree);
    
    const stored = {
      ...exportData,
      createdAt: meta?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const filePath = this.getTreePath(treeId);
    fs.writeFileSync(filePath, JSON.stringify(stored, null, 2));
    
    // Update metadata
    this.metadata.set(treeId, {
      createdAt: stored.createdAt,
      updatedAt: stored.updatedAt,
    });
  }

  /**
   * Create a new empty tree
   * 
   * @param depth - Tree depth (determines max capacity: 2^depth leaves)
   * @param treeId - Optional tree identifier (defaults to "default")
   * @returns The tree metadata
   */
  createTree(depth: number, treeId: string = DEFAULT_TREE_ID): TreeMetadata {
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
  getTree(treeId: string = DEFAULT_TREE_ID): IMTState | null {
    return this.trees.get(treeId) ?? null;
  }

  /**
   * Get tree metadata
   */
  getTreeMetadata(treeId: string = DEFAULT_TREE_ID): TreeMetadata | null {
    const tree = this.trees.get(treeId);
    const meta = this.metadata.get(treeId);
    
    if (!tree || !meta) return null;
    
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
  listTrees(): TreeMetadata[] {
    const result: TreeMetadata[] = [];
    
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
  hasTree(treeId: string = DEFAULT_TREE_ID): boolean {
    return this.trees.has(treeId);
  }

  /**
   * Insert a key into a tree
   * 
   * @param key - The key to insert (bigint or hex string)
   * @param treeId - Optional tree identifier
   * @returns Insert result or error
   */
  insert(key: bigint | string, treeId: string = DEFAULT_TREE_ID): InsertResult | { error: string } {
    const tree = this.trees.get(treeId);
    
    if (!tree) {
      return { error: `Tree "${treeId}" not found. Create it first with createTree().` };
    }
    
    // Parse key if string
    let keyBigInt: bigint;
    try {
      keyBigInt = typeof key === 'string' ? BigInt(key) : key;
    } catch {
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
  getRoot(treeId: string = DEFAULT_TREE_ID): string | { error: string } {
    const tree = this.trees.get(treeId);
    
    if (!tree) {
      return { error: `Tree "${treeId}" not found.` };
    }
    
    return getRoot(tree);
  }

  /**
   * Generate a proof for a key
   */
  generateProof(key: bigint | string, treeId: string = DEFAULT_TREE_ID): MerkleProof | { error: string } {
    const tree = this.trees.get(treeId);
    
    if (!tree) {
      return { error: `Tree "${treeId}" not found.` };
    }
    
    // Parse key if string
    let keyBigInt: bigint;
    try {
      keyBigInt = typeof key === 'string' ? BigInt(key) : key;
    } catch {
      return { error: 'Invalid key format. Use hex string (0x...) or decimal.' };
    }
    
    return generateProof(tree, keyBigInt);
  }

  /**
   * Export tree data (for API responses)
   */
  exportTree(treeId: string = DEFAULT_TREE_ID): (IMTExportData & { root: string }) | { error: string } {
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
  deleteTree(treeId: string): boolean {
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
  clearAll(): void {
    for (const treeId of this.trees.keys()) {
      this.deleteTree(treeId);
    }
  }
}

/**
 * Create a singleton store instance for convenience
 */
let defaultStore: TreeStore | null = null;

export function getDefaultStore(config?: TreeStoreConfig): TreeStore {
  if (!defaultStore) {
    defaultStore = new TreeStore(config);
  }
  return defaultStore;
}

export function resetDefaultStore(): void {
  defaultStore = null;
}
