'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import type { IMTState, IMTNode, InsertPreview, InsertResult, MerkleProof, IMTExportData } from '@/lib/imt/types';
import { exportTree, parseImportedNodes } from '@/lib/imt/types';
import { createEmptyTree, insert as imtInsert, previewInsert as imtPreviewInsert, getRoot, getNodeByKey, buildMerkleLayers, validateTree } from '@/lib/imt/engine';
import { generateProof } from '@/lib/imt/proof';
import { storage } from '@/lib/storage/localStorage';
import { useTreeSync } from '@/hooks/useTreeSync';

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
  recentlyReferencedIndex: number | null;
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
  const [recentlyReferencedIndex, setRecentlyReferencedIndex] = useState<number | null>(null);
  const [membershipProof, setMembershipProof] = useState<ProofState | null>(null);
  
  // Track if we're currently syncing from server to avoid save loops
  const isSyncingRef = useRef(false);
  // Track the last known tree size to detect new insertions from server
  const lastSizeRef = useRef<number>(0);

  // Handle real-time updates from the server via SSE
  const handleServerSync = useCallback((data: IMTExportData & { root: string } | null) => {
    if (!data) {
      // Server has no tree, but we might have one locally - don't clear it
      return;
    }

    try {
      isSyncingRef.current = true;
      
      // Parse the incoming data
      const { depth, nodes, nextIndex } = parseImportedNodes(data);
      
      // Rebuild Merkle layers
      const layers = buildMerkleLayers(nodes, depth);
      
      const newTree: IMTState = {
        depth,
        nodes,
        nextIndex,
        layers,
      };
      
      // Check if this is a new insertion (size increased)
      const isNewInsertion = nextIndex > lastSizeRef.current && lastSizeRef.current > 0;
      
      setTree(newTree);
      lastSizeRef.current = nextIndex;
      
      // If new insertion from server, highlight the relevant nodes
      if (isNewInsertion && nodes.length > 0) {
        // Find the most recently inserted node (highest index)
        const latestNode = nodes.reduce((max, node) => 
          node.index > max.index ? node : max, nodes[0]);
        
        // Find the predecessor (low nullifier) - the node whose nextKey points to the new node
        const predecessorNode = nodes.find(n => n.nextKey === latestNode.key);
        
        // Find the referenced node - the node that the new node points to
        const referencedNode = nodes.find(n => n.key === latestNode.nextKey);
        
        // Set highlights
        setRecentlyInsertedIndex(latestNode.index);
        setRecentlyUpdatedIndex(predecessorNode?.index ?? null);
        setRecentlyReferencedIndex(referencedNode?.index ?? null);
        
        // Clear highlights after a delay
        setTimeout(() => {
          setRecentlyInsertedIndex(prev => 
            prev === latestNode.index ? null : prev);
          setRecentlyUpdatedIndex(prev => 
            prev === predecessorNode?.index ? null : prev);
          setRecentlyReferencedIndex(prev => 
            prev === referencedNode?.index ? null : prev);
        }, 2000);
      }
    } catch {
      // Failed to parse server data, keep local state
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  // Subscribe to real-time server updates
  useTreeSync({
    onSync: handleServerSync,
    enabled: !isLoading,
  });

  // Load tree from storage on mount
  useEffect(() => {
    const loadTree = async () => {
      setIsLoading(true);
      const stored = await storage.loadTree();
      if (stored) {
        setTree(stored);
        lastSizeRef.current = stored.nextIndex;
      }
      setIsLoading(false);
    };
    loadTree();
  }, []);

  // Save tree to storage whenever it changes (but not during server sync)
  useEffect(() => {
    if (tree && !isLoading && !isSyncingRef.current) {
      storage.saveTree(tree);
    }
  }, [tree, isLoading]);

  const initializeTree = useCallback((depth: number) => {
    const newTree = createEmptyTree(depth);
    setTree(newTree);
    lastSizeRef.current = 0;
    setPreviewState(null);
    setRecentlyInsertedIndex(null);
    setRecentlyUpdatedIndex(null);
    setRecentlyReferencedIndex(null);
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
    lastSizeRef.current = result.state.nextIndex;
    
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
    setRecentlyReferencedIndex(null);
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
    lastSizeRef.current = 0;
    setPreviewState(null);
    setRecentlyInsertedIndex(null);
    setRecentlyUpdatedIndex(null);
    setRecentlyReferencedIndex(null);
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
    setRecentlyReferencedIndex(null);
  }, []);

  const generateMembershipProof = useCallback((key: bigint): { error: string } | void => {
    if (!tree) {
      return { error: 'Tree not initialized' };
    }

    // Clear any existing preview
    setPreviewState(null);
    setRecentlyInsertedIndex(null);
    setRecentlyUpdatedIndex(null);
    setRecentlyReferencedIndex(null);

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
      lastSizeRef.current = nextIndex;
      setPreviewState(null);
      setRecentlyInsertedIndex(null);
      setRecentlyUpdatedIndex(null);
      setRecentlyReferencedIndex(null);
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
    recentlyReferencedIndex,
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
