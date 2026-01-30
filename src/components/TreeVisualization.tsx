'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useIMT } from '@/context/IMTContext';
import { InternalNodePanel } from './InternalNodePanel';
import { CopyButton } from './CopyButton';
import type { IMTNode, IMTState } from '@/lib/imt/types';
import { MAX_KEY } from '@/lib/imt/types';
import type { RawNodeDatum, CustomNodeElementProps } from 'react-d3-tree';
import { getNodeByKey } from '@/lib/imt/engine';
import { hashNode } from '@/lib/imt/hash';

// Dynamically import react-d3-tree to avoid SSR issues
const Tree = dynamic(() => import('react-d3-tree').then(mod => mod.default), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full text-zinc-500">Loading tree...</div>,
});

/**
 * Find the low nullifier for a node (the node whose nextKey points to this node's key)
 */
function findLowNullifier(tree: IMTState, node: IMTNode): IMTNode | null {
  for (const n of tree.nodes) {
    if (n.nextKey === node.key) {
      return n;
    }
  }
  return null;
}

interface TreeNodeData extends RawNodeDatum {
  name: string;
  attributes?: Record<string, string | number>;
  nodeData?: IMTNode;
  isLeaf?: boolean;
  isEmpty?: boolean;
  isNew?: boolean;
  isUpdated?: boolean;
  isPreview?: boolean;
  isReference?: boolean;
  hash?: string;
  nodeIndex?: number;
  layerIndex?: number;
  leftChildHash?: string;
  rightChildHash?: string;
}

interface ClickPosition {
  x: number;
  y: number;
}

// Tree layout constants
const NODE_SIZE = { x: 24, y: 28 }; // Spacing between nodes
const LEAF_WIDTH = 20;
const LEAF_HEIGHT = 14;

// Format bigint as hex
const formatHex = (value: bigint): string => {
  if (value === MAX_KEY) return 'MAX';
  return '0x' + value.toString(16);
};

// Truncate long hex for display
const truncateHex = (hex: string, maxLen: number = 12): string => {
  if (hex === 'MAX') return hex;
  if (hex.length <= maxLen) return hex;
  return hex.slice(0, 8) + '...' + hex.slice(-4);
};

// Preview panel component - fixed to bottom of screen
interface PreviewPanelProps {
  preview: {
    newNode: IMTNode;
    predecessorNode: IMTNode | null;
    predecessorIndex: number | null;
    predecessorNewNextKey: bigint | null;
    isInserted?: boolean;
  };
  nextKeyNode: IMTNode | null;
  tree: { nodes: IMTNode[] };
}

function PreviewPanel({ preview, nextKeyNode, tree }: PreviewPanelProps) {
  const isInserted = preview.isInserted ?? false;
  
  // Determine if this is a "new head" insertion (only relevant for preview, not after insert)
  const isNewHead = !isInserted && !preview.predecessorNode && tree.nodes.length > 0;

  // Build array of cards with their data - will be sorted by key to show linked list order
  const cards: Array<{
    key: string;
    title: string;
    type: 'new' | 'updated' | 'reference';
    node: IMTNode;
    nextKeyChange?: { from: bigint; to: bigint };
  }> = [];

  // Add predecessor card if exists
  if (preview.predecessorNode) {
    cards.push({
      key: 'predecessor',
      title: 'Low Nullifier',
      type: 'updated',
      node: preview.predecessorNode,
      // Show the nextKey change in preview mode (before insert)
      // After insert, the node already has the updated nextKey
      nextKeyChange: !isInserted && preview.predecessorNewNextKey ? {
        from: preview.predecessorNode.nextKey,
        to: preview.predecessorNewNextKey,
      } : undefined,
    });
  }

  // Add new node card
  cards.push({
    key: 'new-node',
    title: isInserted ? 'Inserted Node' : (isNewHead ? 'New Node (Head)' : 'New Node'),
    type: 'new',
    node: preview.newNode,
  });

  // Add next key node card if exists
  if (nextKeyNode) {
    cards.push({
      key: 'next-key',
      title: isInserted ? 'Next Key Node' : (isNewHead ? 'Current Head' : 'Next Key Node'),
      type: 'reference',
      node: nextKeyNode,
    });
  }

  // Sort by key value to show linked list order (smallest key first)
  cards.sort((a, b) => {
    if (a.node.key < b.node.key) return -1;
    if (a.node.key > b.node.key) return 1;
    return 0;
  });

  const getBorderColor = (type: string) => {
    switch (type) {
      case 'new': return 'border-green-500/60';
      case 'updated': return 'border-orange-500/60';
      case 'reference': return 'border-blue-500/60';
      default: return 'border-zinc-700';
    }
  };

  const getBadgeStyle = (type: string, inserted: boolean) => {
    if (inserted) {
      // Solid, more prominent style for completed inserts
      switch (type) {
        case 'new': return 'bg-green-600 text-white border-green-500';
        case 'updated': return 'bg-orange-600 text-white border-orange-500';
        case 'reference': return 'bg-blue-600 text-white border-blue-500';
        default: return 'bg-zinc-600 text-white border-zinc-500';
      }
    }
    switch (type) {
      case 'new': return 'bg-green-900/50 text-green-400 border-green-600/30';
      case 'updated': return 'bg-orange-900/50 text-orange-400 border-orange-600/30';
      case 'reference': return 'bg-blue-900/50 text-blue-400 border-blue-600/30';
      default: return 'bg-zinc-800 text-zinc-400 border-zinc-600/30';
    }
  };

  const getBadgeText = (type: string, inserted: boolean) => {
    if (inserted) {
      switch (type) {
        case 'new': return 'inserted';
        case 'updated': return 'updated';
        default: return '';
      }
    }
    switch (type) {
      case 'new': return 'insert';
      case 'updated': return 'update';
      case 'reference': return 'unchanged';
      default: return '';
    }
  };

  // Arrow component for linked list visualization
  const LinkedListArrow = ({ isLast }: { isLast: boolean }) => {
    if (isLast) return null;
    return (
      <div className="flex-shrink-0 flex flex-col items-center justify-center px-2">
        <div className="text-zinc-500 text-xs mb-1">nextKey</div>
        <svg width="40" height="24" viewBox="0 0 40 24" fill="none" className="text-zinc-400">
          <path 
            d="M0 12H32M32 12L24 4M32 12L24 20" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-zinc-900/95 border-t border-zinc-800 z-20">
      <div className="px-6 py-3 border-b border-zinc-800 flex items-center gap-3">
        <span className="text-sm font-medium text-zinc-400">
          Node Inspector
        </span>
        <span className="text-xs text-zinc-600">Sorted by key (linked list order)</span>
        {isInserted && (
          <span className="px-2 py-0.5 text-xs font-medium bg-green-600 text-white rounded">
            Success
          </span>
        )}
      </div>
      <div className="flex justify-center items-center p-6 overflow-x-auto">
        {cards.map((card, index) => (
          <React.Fragment key={card.key}>
            <div
              className={`flex-shrink-0 bg-zinc-900 border-2 ${getBorderColor(card.type)} rounded-xl min-w-[240px]`}
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-zinc-800">
                <span className="text-sm font-semibold text-zinc-200">
                  {card.title} [{card.node.index}]
                </span>
                <span className={`px-2 py-0.5 text-xs font-medium border rounded-md ${getBadgeStyle(card.type, isInserted)}`}>
                  {getBadgeText(card.type, isInserted)}
                </span>
              </div>

              {/* Node data */}
              <div className="p-4 space-y-2 text-sm font-mono">
                <div className="flex justify-between gap-4">
                  <span className="text-zinc-500 font-medium">key</span>
                  <span className="text-zinc-200 truncate" title={formatHex(card.node.key)}>
                    {truncateHex(formatHex(card.node.key), 14)}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-zinc-500 font-medium">nextKey</span>
                  {card.nextKeyChange ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-500 line-through" title={formatHex(card.nextKeyChange.from)}>
                        {truncateHex(formatHex(card.nextKeyChange.from), 8)}
                      </span>
                      <span className="text-orange-400">→</span>
                      <span className="text-orange-300" title={formatHex(card.nextKeyChange.to)}>
                        {truncateHex(formatHex(card.nextKeyChange.to), 8)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-zinc-200 truncate" title={formatHex(card.node.nextKey)}>
                      {truncateHex(formatHex(card.node.nextKey), 14)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <LinkedListArrow isLast={index === cards.length - 1} />
          </React.Fragment>
        ))}
        {/* Show MAX terminator if last card points to MAX */}
        {cards.length > 0 && cards[cards.length - 1].node.nextKey === MAX_KEY && (
          <>
            <div className="flex-shrink-0 flex flex-col items-center justify-center px-2">
              <div className="text-zinc-500 text-xs mb-1">nextKey</div>
              <svg width="40" height="24" viewBox="0 0 40 24" fill="none" className="text-zinc-400">
                <path 
                  d="M0 12H32M32 12L24 4M32 12L24 20" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="flex-shrink-0 bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3">
              <div className="text-zinc-500 text-xs font-medium">MAX</div>
              <div className="text-zinc-600 text-[10px]">(end of list)</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Selected node linked list panel - shows when clicking a leaf node
interface SelectedNodePanelProps {
  selectedNode: IMTNode;
  tree: IMTState;
  onClose: () => void;
}

function SelectedNodePanel({ selectedNode, tree, onClose }: SelectedNodePanelProps) {
  // Find the low nullifier (node whose nextKey points to this node)
  const lowNullifier = findLowNullifier(tree, selectedNode);
  
  // Find the next key node (node this one points to)
  const nextKeyNode = selectedNode.nextKey !== MAX_KEY 
    ? getNodeByKey(tree, selectedNode.nextKey) 
    : null;

  // Compute the node hash
  const nodeHash = hashNode(selectedNode);

  const getBorderColor = (type: string) => {
    switch (type) {
      case 'selected': return 'border-purple-500/60';
      case 'low-nullifier': return 'border-zinc-500/60';
      case 'next-key': return 'border-zinc-500/60';
      default: return 'border-zinc-700';
    }
  };

  const getBadgeStyle = (type: string) => {
    switch (type) {
      case 'selected': return 'bg-purple-900/50 text-purple-400 border-purple-600/30';
      case 'low-nullifier': return 'bg-zinc-800 text-zinc-400 border-zinc-600/30';
      case 'next-key': return 'bg-zinc-800 text-zinc-400 border-zinc-600/30';
      default: return 'bg-zinc-800 text-zinc-400 border-zinc-600/30';
    }
  };

  // Arrow component for linked list visualization
  const LinkedListArrow = ({ label }: { label: string }) => {
    return (
      <div className="flex-shrink-0 flex flex-col items-center justify-center px-2">
        <div className="text-zinc-500 text-xs mb-1">{label}</div>
        <svg width="40" height="24" viewBox="0 0 40 24" fill="none" className="text-zinc-400">
          <path 
            d="M0 12H32M32 12L24 4M32 12L24 20" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-zinc-900/95 border-t border-zinc-800 z-20">
      <div className="px-6 py-3 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-zinc-400">
            Node Details
          </span>
          <span className="text-xs text-zinc-600">Linked list context</span>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
          title="Close"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
      <div className="flex justify-center items-center p-6 overflow-x-auto">
        {/* Low Nullifier (if exists) */}
        {lowNullifier ? (
          <>
            <div
              className={`flex-shrink-0 bg-zinc-900 border-2 ${getBorderColor('low-nullifier')} rounded-xl min-w-[240px]`}
            >
              <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-zinc-800">
                <span className="text-sm font-semibold text-zinc-200">
                  Low Nullifier [{lowNullifier.index}]
                </span>
                <span className={`px-2 py-0.5 text-xs font-medium border rounded-md ${getBadgeStyle('low-nullifier')}`}>
                  predecessor
                </span>
              </div>
              <div className="p-4 space-y-2 text-sm font-mono">
                <div className="flex justify-between gap-4">
                  <span className="text-zinc-500 font-medium">key</span>
                  <span className="text-zinc-200 truncate" title={formatHex(lowNullifier.key)}>
                    {truncateHex(formatHex(lowNullifier.key), 14)}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-zinc-500 font-medium">nextKey</span>
                  <span className="text-zinc-200 truncate" title={formatHex(lowNullifier.nextKey)}>
                    {truncateHex(formatHex(lowNullifier.nextKey), 14)}
                  </span>
                </div>
              </div>
            </div>
            <LinkedListArrow label="nextKey" />
          </>
        ) : (
          // Show "start of list" indicator when there's no low nullifier
          <>
            <div className="flex-shrink-0 bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3">
              <div className="text-zinc-500 text-xs font-medium">HEAD</div>
              <div className="text-zinc-600 text-[10px]">(start of list)</div>
            </div>
            <LinkedListArrow label="" />
          </>
        )}

        {/* Selected Node (center) */}
        <div
          className={`flex-shrink-0 bg-zinc-900 border-2 ${getBorderColor('selected')} rounded-xl min-w-[280px]`}
        >
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-zinc-800">
            <span className="text-sm font-semibold text-zinc-200">
              Selected Node [{selectedNode.index}]
            </span>
            <span className={`px-2 py-0.5 text-xs font-medium border rounded-md ${getBadgeStyle('selected')}`}>
              selected
            </span>
          </div>
          <div className="p-4 space-y-2 text-sm font-mono">
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500 font-medium">key</span>
              <span className="text-purple-300 truncate" title={formatHex(selectedNode.key)}>
                {truncateHex(formatHex(selectedNode.key), 14)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500 font-medium">nextKey</span>
              <span className="text-zinc-200 truncate" title={formatHex(selectedNode.nextKey)}>
                {truncateHex(formatHex(selectedNode.nextKey), 14)}
              </span>
            </div>
          </div>
          {/* Hash */}
          <div className="px-4 pb-3 pt-1 border-t border-zinc-800">
            <div className="text-[10px] text-zinc-500 mb-0.5">leaf hash</div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-zinc-400 font-mono truncate" title={nodeHash}>
                {nodeHash.slice(0, 32)}...
              </span>
              <CopyButton value={nodeHash} />
            </div>
          </div>
        </div>

        {/* Next Key Node (if exists) or MAX indicator */}
        <LinkedListArrow label="nextKey" />
        {nextKeyNode ? (
          <div
            className={`flex-shrink-0 bg-zinc-900 border-2 ${getBorderColor('next-key')} rounded-xl min-w-[240px]`}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-zinc-800">
              <span className="text-sm font-semibold text-zinc-200">
                Next Key [{nextKeyNode.index}]
              </span>
              <span className={`px-2 py-0.5 text-xs font-medium border rounded-md ${getBadgeStyle('next-key')}`}>
                successor
              </span>
            </div>
            <div className="p-4 space-y-2 text-sm font-mono">
              <div className="flex justify-between gap-4">
                <span className="text-zinc-500 font-medium">key</span>
                <span className="text-zinc-200 truncate" title={formatHex(nextKeyNode.key)}>
                  {truncateHex(formatHex(nextKeyNode.key), 14)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-zinc-500 font-medium">nextKey</span>
                <span className="text-zinc-200 truncate" title={formatHex(nextKeyNode.nextKey)}>
                  {truncateHex(formatHex(nextKeyNode.nextKey), 14)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-shrink-0 bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3">
            <div className="text-zinc-500 text-xs font-medium">MAX</div>
            <div className="text-zinc-600 text-[10px]">(end of list)</div>
          </div>
        )}
      </div>
    </div>
  );
}

export function TreeVisualization() {
  const { tree, preview, recentlyInsertedIndex, recentlyUpdatedIndex, clearPreview } = useIMT();
  const [selectedLeafNode, setSelectedLeafNode] = useState<IMTNode | null>(null);
  const [selectedInternalNode, setSelectedInternalNode] = useState<{
    hash: string;
    leftChildHash: string;
    rightChildHash: string;
    layerIndex: number;
    nodeIndex: number;
  } | null>(null);
  const [internalNodeClickPosition, setInternalNodeClickPosition] = useState<ClickPosition | null>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);
  const [containerMounted, setContainerMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Combined ref callback that sets both the ref and triggers state update
  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    setContainerMounted(!!node);
  }, []);

  // Track container size for dynamic zoom calculation
  useEffect(() => {
    if (!containerMounted || !containerRef.current) return;
    
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setContainerSize({ width: rect.width, height: rect.height });
        }
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [containerMounted]);

  // Generate a key to force Tree re-initialization when tree structure or container changes
  const treeKey = useMemo(() => {
    if (!tree || !containerSize) return 'no-tree';
    return `tree-${tree.depth}-${tree.nodes.length}-${containerSize.width}-${containerSize.height}`;
  }, [tree, containerSize]);

  // Calculate zoom and translate to fit tree in viewport
  const { zoom, translate } = useMemo(() => {
    if (!tree || !containerSize) return { zoom: 1, translate: { x: 400, y: 40 } };
    
    const depth = tree.depth;
    const leafCount = Math.pow(2, depth);
    
    // Calculate tree dimensions based on node spacing
    const treeWidth = leafCount * NODE_SIZE.x;
    const treeHeight = (depth + 1) * NODE_SIZE.y;
    
    // Add margin around the tree (percentage-based)
    const marginPercent = 0.1; // 10% margin on each side
    const marginX = containerSize.width * marginPercent;
    const marginY = containerSize.height * marginPercent;
    
    // Add padding for UI elements (legend on right, root hash on left)
    const uiPaddingX = 280; // Account for sidebars/legends
    const uiPaddingTop = 80; // Space for root hash display
    // Reserve space for preview panel at bottom when visible
    const previewPanelHeight = preview ? 220 : 0;
    
    const availableWidth = containerSize.width - uiPaddingX - (marginX * 2);
    const availableHeight = containerSize.height - uiPaddingTop - previewPanelHeight - (marginY * 2);
    
    // Calculate zoom to fit both dimensions
    const zoomX = availableWidth / treeWidth;
    const zoomY = availableHeight / treeHeight;
    const fitZoom = Math.min(zoomX, zoomY);
    
    // Cap zoom for very small trees to avoid overly large nodes
    const maxZoom = 3;
    const finalZoom = Math.min(fitZoom, maxZoom);
    
    // Center the tree horizontally, with slight offset for UI panels
    const translateX = containerSize.width / 2;
    const translateY = uiPaddingTop + marginY;
    
    return { zoom: finalZoom, translate: { x: translateX, y: translateY } };
  }, [tree, containerSize, preview]);

  // Build tree data structure for react-d3-tree
  const treeData = useMemo((): TreeNodeData | null => {
    if (!tree) return null;

    const { layers, nodes, depth } = tree;
    
    // Create a map of index to node for quick lookup
    const nodeMap = new Map<number, IMTNode>();
    for (const node of nodes) {
      nodeMap.set(node.index, node);
    }

    // Add preview node to map if exists
    if (preview) {
      nodeMap.set(preview.newNode.index, preview.newNode);
    }

    // Find the "next key" node index (the node the new node points to)
    let nextKeyNodeIndex: number | null = null;
    if (preview && preview.newNode.nextKey !== MAX_KEY) {
      // Find the node with this key
      for (const node of nodes) {
        if (node.key === preview.newNode.nextKey) {
          nextKeyNodeIndex = node.index;
          break;
        }
      }
    }

    // Recursive function to build tree from layers
    const buildNode = (layerIndex: number, nodeIndex: number): TreeNodeData => {
      const hash = layers[layerIndex]?.[nodeIndex] || '0x0';

      // Leaf node
      if (layerIndex === 0) {
        const leafNode = nodeMap.get(nodeIndex);
        const isEmpty = !leafNode; // Only empty if no node exists at this index
        const isPreviewLeaf = preview?.newNode.index === nodeIndex;
        const isNew = recentlyInsertedIndex === nodeIndex;
        const isUpdated = recentlyUpdatedIndex === nodeIndex || preview?.predecessorIndex === nodeIndex;
        const isReference = nextKeyNodeIndex === nodeIndex;

        if (isEmpty && !isPreviewLeaf) {
          return {
            name: '',
            isLeaf: true,
            isEmpty: true,
            hash,
            nodeIndex,
          };
        }

        const node = isPreviewLeaf ? preview!.newNode : leafNode!;

        return {
          name: '',
          nodeData: node,
          isLeaf: true,
          isEmpty: false,
          isNew,
          isUpdated,
          isPreview: isPreviewLeaf,
          isReference,
          hash,
          nodeIndex,
        };
      }

      // Internal node
      const leftChildIndex = nodeIndex * 2;
      const rightChildIndex = nodeIndex * 2 + 1;
      
      // Get child hashes
      const leftChildHash = layers[layerIndex - 1]?.[leftChildIndex] || '0x0';
      const rightChildHash = layers[layerIndex - 1]?.[rightChildIndex] || '0x0';

      const children: TreeNodeData[] = [];
      
      // Only add children if they exist in the layer below
      if (layerIndex > 0) {
        children.push(buildNode(layerIndex - 1, leftChildIndex));
        children.push(buildNode(layerIndex - 1, rightChildIndex));
      }

      return {
        name: '',
        children,
        isLeaf: false,
        hash,
        layerIndex,
        nodeIndex,
        leftChildHash,
        rightChildHash,
      };
    };

    // Start from root (last layer, index 0)
    return buildNode(depth, 0);
  }, [tree, preview, recentlyInsertedIndex, recentlyUpdatedIndex]);

  // Custom node renderer - small compact rectangles
  const renderNode = useCallback(({ nodeDatum }: CustomNodeElementProps) => {
    const data = nodeDatum as TreeNodeData;
    const isLeaf = data.isLeaf;
    const isEmpty = data.isEmpty;
    const isNew = data.isNew;
    const isUpdated = data.isUpdated;
    const isPreview = data.isPreview;
    const isReference = data.isReference;

    // Determine node styling
    let strokeColor = 'rgba(255, 255, 255, 0.4)';
    let fillColor = '#18181b';
    let strokeDasharray = '';

    if (isNew) {
      strokeColor = '#22c55e';
      fillColor = '#1a2e22'; // Solid dark green - opaque to hide graph lines
    } else if (isUpdated) {
      strokeColor = '#f97316';
      fillColor = '#2e231a'; // Solid dark orange - opaque to hide graph lines
    } else if (isPreview) {
      strokeColor = '#22c55e';
      fillColor = '#1a2e22'; // Solid dark green - opaque to hide graph lines
      strokeDasharray = '2 1';
    } else if (isReference) {
      strokeColor = '#3b82f6';
      fillColor = '#1a2230'; // Solid dark blue - opaque to hide graph lines
    } else if (isEmpty) {
      strokeColor = 'rgba(255, 255, 255, 0.15)';
      fillColor = '#18181b'; // Solid fill so graph lines don't show through
    }

    // Compact sizes for dense tree visualization
    const leafWidth = LEAF_WIDTH;
    const leafHeight = LEAF_HEIGHT;
    const internalRadius = 3;

    const handleClick = (event: React.MouseEvent) => {
      const containerRect = containerRef.current?.getBoundingClientRect();
      
      if (isLeaf && data.nodeData) {
        // Handle leaf node click - show linked list panel
        // Clear any existing preview (e.g., after an insert)
        clearPreview();
        setSelectedLeafNode(data.nodeData);
        // Clear any selected internal node
        setSelectedInternalNode(null);
        setInternalNodeClickPosition(null);
      } else if (!isLeaf && data.hash && data.leftChildHash && data.rightChildHash) {
        // Handle internal node click
        if (containerRect) {
          setInternalNodeClickPosition({
            x: event.clientX - containerRect.left,
            y: event.clientY - containerRect.top + 20, // Offset below the node
          });
        }
        setSelectedInternalNode({
          hash: data.hash,
          leftChildHash: data.leftChildHash,
          rightChildHash: data.rightChildHash,
          layerIndex: data.layerIndex!,
          nodeIndex: data.nodeIndex!,
        });
        // Clear any selected leaf node
        setSelectedLeafNode(null);
      }
    };

    const isClickable = (isLeaf && data.nodeData) || (!isLeaf && data.hash);

    return (
      <g className="custom-node" onClick={handleClick} style={{ cursor: isClickable ? 'pointer' : 'default' }}>
        {isLeaf ? (
          <>
            <rect
              className="custom-node-rect"
              x={-leafWidth / 2}
              y={-leafHeight / 2}
              width={leafWidth}
              height={leafHeight}
              rx={2}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={1}
              strokeDasharray={strokeDasharray}
            />
            <foreignObject
              x={-leafWidth / 2}
              y={-leafHeight / 2}
              width={leafWidth}
              height={leafHeight}
              className="custom-node-label"
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isEmpty ? '#666666' : '#ffffff',
                  fontSize: '9px',
                  fontWeight: 600,
                  lineHeight: 1,
                }}
              >
                {data.nodeIndex}
              </div>
            </foreignObject>
          </>
        ) : (
          <circle
            className="custom-node-circle"
            r={internalRadius}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={0.5}
          />
        )}
      </g>
    );
  }, [recentlyInsertedIndex, recentlyUpdatedIndex, preview]);

  // Get the nextKey node for preview panel (the node that the new node will point to)
  // Don't show if nextKey is MAX_KEY (end of list)
  const previewNextKeyNode = useMemo(() => {
    if (!preview || !tree) return null;
    // Don't show card for MAX_KEY - it means end of the linked list
    if (preview.newNode.nextKey === MAX_KEY) return null;
    // The new node's nextKey is what it points to
    // This was the predecessor's old nextKey
    return getNodeByKey(tree, preview.newNode.nextKey);
  }, [preview, tree]);

  if (!tree) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500">
        <div className="text-center">
          <p className="text-lg mb-2">No tree initialized</p>
          <p className="text-sm">Use the control panel to create a new tree</p>
        </div>
      </div>
    );
  }

  if (!treeData || !containerSize) {
    return (
      <div ref={setContainerRef} className="flex-1 flex items-center justify-center text-zinc-500 bg-black">
        Building tree visualization...
      </div>
    );
  }

  return (
    <div ref={setContainerRef} className="flex-1 relative bg-black overflow-hidden">
      {/* Legend */}
      <div className="absolute top-4 right-4 bg-zinc-900/90 border border-zinc-800 rounded p-3 text-xs space-y-2 z-10">
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 rounded border border-green-500 bg-green-500/10"></div>
          <span className="text-zinc-400">New node</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 rounded border border-orange-500 bg-orange-500/10"></div>
          <span className="text-zinc-400">Updated (low nullifier)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 rounded border border-blue-500 bg-blue-500/10"></div>
          <span className="text-zinc-400">Referenced node</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 rounded border border-green-500 border-dashed bg-green-500/10"></div>
          <span className="text-zinc-400">Preview</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 rounded border border-zinc-700 bg-zinc-900"></div>
          <span className="text-zinc-400">Empty slot</span>
        </div>
      </div>

      {/* Root hash display */}
      <div className="absolute top-4 left-4 bg-zinc-900/90 border border-zinc-800 rounded p-3 text-xs z-10">
        <div className="text-zinc-500 mb-1">Root Hash</div>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-zinc-300 truncate max-w-[200px]" title={tree.layers[tree.layers.length - 1]?.[0]}>
            {tree.layers[tree.layers.length - 1]?.[0]?.slice(0, 20)}...
          </span>
          <CopyButton value={tree.layers[tree.layers.length - 1]?.[0] || ''} />
        </div>
      </div>

      {/* Internal node details floating panel */}
      {selectedInternalNode && internalNodeClickPosition && (
        <InternalNodePanel
          nodeHash={selectedInternalNode.hash}
          leftChildHash={selectedInternalNode.leftChildHash}
          rightChildHash={selectedInternalNode.rightChildHash}
          layerIndex={selectedInternalNode.layerIndex}
          nodeIndex={selectedInternalNode.nodeIndex}
          initialPosition={internalNodeClickPosition}
          containerRef={containerRef}
          onClose={() => {
            setSelectedInternalNode(null);
            setInternalNodeClickPosition(null);
          }}
        />
      )}

      {/* Preview panel - fixed to bottom (for insert preview/complete) */}
      {preview && <PreviewPanel preview={preview} nextKeyNode={previewNextKeyNode} tree={tree} />}

      {/* Selected node panel - fixed to bottom (for clicked leaf nodes) */}
      {!preview && selectedLeafNode && (
        <SelectedNodePanel
          selectedNode={selectedLeafNode}
          tree={tree}
          onClose={() => setSelectedLeafNode(null)}
        />
      )}

      {/* Tree */}
      <Tree
        key={treeKey}
        data={treeData}
        orientation="vertical"
        pathFunc="step"
        translate={translate}
        separation={{ siblings: 1, nonSiblings: 1 }}
        nodeSize={NODE_SIZE}
        renderCustomNodeElement={renderNode}
        pathClassFunc={() => 'tree-link'}
        zoom={zoom}
        scaleExtent={{ min: 0.1, max: 5 }}
        draggable
        zoomable
      />
    </div>
  );
}
