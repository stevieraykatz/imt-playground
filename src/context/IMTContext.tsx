'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { IMTState, IMTNode, InsertPreview, InsertResult, MerkleProof, IMTExportData } from '@/lib/imt/types';
import { exportTree, parseImportedNodes } from '@/lib/imt/types';
import { createEmptyTree, insert as imtInsert, previewInsert as imtPreviewInsert, getRoot, getNodeByKey, buildMerkleLayers, validateTree } from '@/lib/imt/engine';
import { generateProof } from '@/lib/imt/proof';
import { storage } from '@/lib/storage/localStorage';

interface PreviewState {
  newNode: IMTNode;
  predecessorNode: IMTNode | null;
  predecessorIndex: number | null;
  predecessorNewNextKey: bigint | null;
  isInserted?: boolean;
}

interface ProofState {
  queryKey: bigint;
  proof: MerkleProof;
  // For exclusion proofs, the node that the low nullifier points to
  nextKeyNode: IMTNode | null;
}

interface IMTContextValue {
  // State
  tree: IMTState | null;
  isLoading: boolean;
  preview: PreviewState | null;
  recentlyInsertedIndex: number | null;
  recentlyUpdatedIndex: number | null;
  membershipProof: ProofState | null;
  
  // Actions
  initializeTree: (depth: number) => void;
  insertNode: (key: bigint) => InsertResult | { error: string };
  setPreview: (key: bigint) => void;
  clearPreview: () => void;
  resetTree: () => void;
  getProof: (key: bigint) => MerkleProof | { error: string };
  clearHighlights: () => void;
  generateMembershipProof: (key: bigint) => { error: string } | void;
  clearMembershipProof: () => void;
  exportTreeData: () => IMTExportData | null;
  importTreeData: (data: IMTExportData) => { error: string } | void;
}

const IMTContext = createContext<IMTContextValue | null>(null);

export function IMTProvider({ children }: { children: ReactNode }) {
  const [tree, setTree] = useState<IMTState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [preview, setPreviewState] = useState<PreviewState | null>(null);
  const [recentlyInsertedIndex, setRecentlyInsertedIndex] = useState<number | null>(null);
  const [recentlyUpdatedIndex, setRecentlyUpdatedIndex] = useState<number | null>(null);
  const [membershipProof, setMembershipProof] = useState<ProofState | null>(null);

  // Load tree from storage on mount
  useEffect(() => {
    const loadTree = async () => {
      setIsLoading(true);
      const stored = await storage.loadTree();
      if (stored) {
        setTree(stored);
      }
      setIsLoading(false);
    };
    loadTree();
  }, []);

  // Save tree to storage whenever it changes
  useEffect(() => {
    if (tree && !isLoading) {
      storage.saveTree(tree);
    }
  }, [tree, isLoading]);

  const initializeTree = useCallback((depth: number) => {
    const newTree = createEmptyTree(depth);
    setTree(newTree);
    setPreviewState(null);
    setRecentlyInsertedIndex(null);
    setRecentlyUpdatedIndex(null);
    setMembershipProof(null);
  }, []);

  const insertNode = useCallback((key: bigint): InsertResult | { error: string } => {
    if (!tree) {
      return { error: 'Tree not initialized' };
    }

    const result = imtInsert(tree, key);
    
    if ('error' in result) {
      return result;
    }

    setTree(result.state);
    
    // Clear membership proof when inserting
    setMembershipProof(null);
    
    // Keep the panel open but update to show inserted state
    setPreviewState({
      newNode: result.result.node,
      predecessorNode: result.result.updatedPredecessor || null,
      predecessorIndex: result.result.updatedPredecessor?.index ?? null,
      predecessorNewNextKey: result.result.updatedPredecessor?.nextKey ?? null,
      isInserted: true,
    });
    
    // Set highlights for recently modified nodes (persist until new preview)
    setRecentlyInsertedIndex(result.result.node.index);
    if (result.result.updatedPredecessor) {
      setRecentlyUpdatedIndex(result.result.updatedPredecessor.index);
    } else {
      setRecentlyUpdatedIndex(null);
    }

    return result.result;
  }, [tree]);

  const setPreview = useCallback((key: bigint) => {
    if (!tree) return;

    // Clear previous highlights and membership proof when initiating a new preview
    setRecentlyInsertedIndex(null);
    setRecentlyUpdatedIndex(null);
    setMembershipProof(null);

    const result = imtPreviewInsert(tree, key);
    
    if ('error' in result) {
      setPreviewState(null);
      return;
    }

    setPreviewState({
      newNode: result.newNode,
      predecessorNode: result.predecessorNode,
      predecessorIndex: result.predecessorIndex,
      predecessorNewNextKey: result.predecessorNewNextKey,
    });
  }, [tree]);

  const clearPreview = useCallback(() => {
    setPreviewState(null);
  }, []);

  const resetTree = useCallback(async () => {
    await storage.clear();
    setTree(null);
    setPreviewState(null);
    setRecentlyInsertedIndex(null);
    setRecentlyUpdatedIndex(null);
    setMembershipProof(null);
  }, []);

  const getProof = useCallback((key: bigint): MerkleProof | { error: string } => {
    if (!tree) {
      return { error: 'Tree not initialized' };
    }
    return generateProof(tree, key);
  }, [tree]);

  const clearHighlights = useCallback(() => {
    setRecentlyInsertedIndex(null);
    setRecentlyUpdatedIndex(null);
  }, []);

  const generateMembershipProof = useCallback((key: bigint): { error: string } | void => {
    if (!tree) {
      return { error: 'Tree not initialized' };
    }

    // Clear any existing preview
    setPreviewState(null);
    setRecentlyInsertedIndex(null);
    setRecentlyUpdatedIndex(null);

    const result = generateProof(tree, key);
    
    if ('error' in result) {
      setMembershipProof(null);
      return result;
    }

    // For exclusion proofs, find the next key node (what the low nullifier points to)
    let nextKeyNode: IMTNode | null = null;
    if (result.type === 'exclusion') {
      nextKeyNode = getNodeByKey(tree, result.node.nextKey);
    }

    setMembershipProof({
      queryKey: key,
      proof: result,
      nextKeyNode,
    });
  }, [tree]);

  const clearMembershipProof = useCallback(() => {
    setMembershipProof(null);
  }, []);

  const exportTreeData = useCallback((): IMTExportData | null => {
    if (!tree) return null;
    return exportTree(tree);
  }, [tree]);

  const importTreeData = useCallback((data: IMTExportData): { error: string } | void => {
    try {
      // Parse the imported data
      const { depth, nodes, nextIndex } = parseImportedNodes(data);
      
      // Rebuild Merkle layers
      const layers = buildMerkleLayers(nodes, depth);
      
      const newTree: IMTState = {
        depth,
        nodes,
        nextIndex,
        layers,
      };
      
      // Validate the tree
      const validation = validateTree(newTree);
      if (!validation.valid) {
        return { error: `Invalid tree: ${validation.errors.join(', ')}` };
      }
      
      setTree(newTree);
      setPreviewState(null);
      setRecentlyInsertedIndex(null);
      setRecentlyUpdatedIndex(null);
      setMembershipProof(null);
    } catch (err) {
      return { error: `Failed to import tree: ${err instanceof Error ? err.message : 'Unknown error'}` };
    }
  }, []);

  const value: IMTContextValue = {
    tree,
    isLoading,
    preview,
    recentlyInsertedIndex,
    recentlyUpdatedIndex,
    membershipProof,
    initializeTree,
    insertNode,
    setPreview,
    clearPreview,
    resetTree,
    getProof,
    clearHighlights,
    generateMembershipProof,
    clearMembershipProof,
    exportTreeData,
    importTreeData,
  };

  return (
    <IMTContext.Provider value={value}>
      {children}
    </IMTContext.Provider>
  );
}

export function useIMT() {
  const context = useContext(IMTContext);
  if (!context) {
    throw new Error('useIMT must be used within an IMTProvider');
  }
  return context;
}
