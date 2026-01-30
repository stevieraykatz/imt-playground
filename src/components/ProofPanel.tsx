'use client';

import React, { useState } from 'react';
import type { IMTNode, IMTState, MerkleProof } from '@/lib/imt/types';
import { MAX_KEY } from '@/lib/imt/types';
import { CopyButton } from './CopyButton';
import { hashNode } from '@/lib/imt/hash';

interface ProofPanelProps {
  queryKey: bigint;
  proof: MerkleProof;
  nextKeyNode: IMTNode | null;
  tree: IMTState;
  onClose: () => void;
}

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

// Find low nullifier for a node
function findLowNullifier(tree: IMTState, node: IMTNode): IMTNode | null {
  for (const n of tree.nodes) {
    if (n.nextKey === node.key) {
      return n;
    }
  }
  return null;
}

// Find next key node
function findNextKeyNode(tree: IMTState, node: IMTNode): IMTNode | null {
  if (node.nextKey === MAX_KEY) return null;
  return tree.nodes.find(n => n.key === node.nextKey) ?? null;
}

export function ProofPanel({ queryKey, proof, nextKeyNode, tree, onClose }: ProofPanelProps) {
  const [activeTab, setActiveTab] = useState<'visualization' | 'proof'>('visualization');
  
  const isInclusion = proof.type === 'inclusion';
  
  // Get the appropriate node and proof data based on proof type
  const proofNode = isInclusion ? proof.node : proof.lowNode;
  const siblings = isInclusion ? proof.siblings : proof.lowNodeSiblings;
  const pathIndices = isInclusion ? proof.pathIndices : proof.lowNodePathIndices;
  const nodeHash = hashNode(proofNode);
  
  // For inclusion proofs, find the low nullifier and next key node
  const inclusionLowNullifier = isInclusion ? findLowNullifier(tree, proof.node) : null;
  const inclusionNextKeyNode = isInclusion ? findNextKeyNode(tree, proof.node) : null;

  // Arrow component for linked list visualization
  const RangeArrow = () => {
    return (
      <div className="flex-shrink-0 flex flex-col items-center justify-center px-2">
        <svg width="40" height="24" viewBox="0 0 40 24" fill="none" className="text-zinc-500">
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
      {/* Header with tabs */}
      <div className="px-6 py-3 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-zinc-400">
            Proof
          </span>
          {/* Tabs */}
          <div className="flex bg-zinc-800 rounded-lg p-0.5">
            <button
              onClick={() => setActiveTab('visualization')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'visualization'
                  ? 'bg-purple-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Visualization
            </button>
            <button
              onClick={() => setActiveTab('proof')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'proof'
                  ? 'bg-purple-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Proof Contents
            </button>
          </div>
          <span className={`px-2 py-0.5 text-xs font-medium rounded ${
            isInclusion 
              ? 'bg-green-600 text-white' 
              : 'bg-orange-600 text-white'
          }`}>
            {isInclusion ? 'Inclusion Proof' : 'Exclusion Proof'}
          </span>
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

      {activeTab === 'visualization' ? (
        /* Visualization Tab */
        <div className="p-6">
          <div className="mb-4 text-center">
            <p className="text-sm text-zinc-400">
              {isInclusion ? (
                <>Proving that <span className="font-mono text-green-400">{truncateHex(formatHex(queryKey), 16)}</span> IS in the tree</>
              ) : (
                <>Proving that <span className="font-mono text-purple-400">{truncateHex(formatHex(queryKey), 16)}</span> is NOT in the tree</>
              )}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              {isInclusion 
                ? 'By providing the node data and Merkle path to the root'
                : 'By showing it falls between two consecutive nodes in the sorted linked list'
              }
            </p>
          </div>

          <div className="flex justify-center items-center overflow-x-auto">
            {isInclusion ? (
              /* Inclusion Proof Visualization */
              <>
                {/* Low Nullifier (if exists) */}
                {inclusionLowNullifier ? (
                  <>
                    <div className="flex-shrink-0 bg-zinc-900 border-2 border-zinc-500/60 rounded-xl min-w-[220px]">
                      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-zinc-800">
                        <span className="text-sm font-semibold text-zinc-200">
                          Low Nullifier [{inclusionLowNullifier.index}]
                        </span>
                        <span className="px-2 py-0.5 text-xs font-medium border rounded-md bg-zinc-800 text-zinc-400 border-zinc-600/30">
                          predecessor
                        </span>
                      </div>
                      <div className="p-4 space-y-2 text-sm font-mono">
                        <div className="flex justify-between gap-4">
                          <span className="text-zinc-500 font-medium">key</span>
                          <span className="text-zinc-200 truncate" title={formatHex(inclusionLowNullifier.key)}>
                            {truncateHex(formatHex(inclusionLowNullifier.key), 14)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-zinc-500 font-medium">nextKey</span>
                          <span className="text-zinc-200 truncate" title={formatHex(inclusionLowNullifier.nextKey)}>
                            {truncateHex(formatHex(inclusionLowNullifier.nextKey), 14)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <RangeArrow />
                  </>
                ) : (
                  <>
                    <div className="flex-shrink-0 bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3">
                      <div className="text-zinc-500 text-xs font-medium">HEAD</div>
                      <div className="text-zinc-600 text-[10px]">(start of list)</div>
                    </div>
                    <RangeArrow />
                  </>
                )}

                {/* The Proven Node */}
                <div className="flex-shrink-0 bg-zinc-900 border-2 border-green-500/60 rounded-xl min-w-[260px]">
                  <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-zinc-800">
                    <span className="text-sm font-semibold text-zinc-200">
                      Proven Node [{proof.node.index}]
                    </span>
                    <span className="px-2 py-0.5 text-xs font-medium border rounded-md bg-green-900/50 text-green-400 border-green-600/30">
                      membership proven
                    </span>
                  </div>
                  <div className="p-4 space-y-2 text-sm font-mono">
                    <div className="flex justify-between gap-4">
                      <span className="text-zinc-500 font-medium">key</span>
                      <span className="text-green-300 truncate" title={formatHex(proof.node.key)}>
                        {truncateHex(formatHex(proof.node.key), 14)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-zinc-500 font-medium">nextKey</span>
                      <span className="text-zinc-200 truncate" title={formatHex(proof.node.nextKey)}>
                        {truncateHex(formatHex(proof.node.nextKey), 14)}
                      </span>
                    </div>
                  </div>
                  <div className="px-4 pb-3 pt-1 border-t border-zinc-800">
                    <div className="text-[10px] text-zinc-500 mb-0.5">leaf hash</div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-zinc-400 font-mono truncate" title={nodeHash}>
                        {nodeHash.slice(0, 24)}...
                      </span>
                      <CopyButton value={nodeHash} />
                    </div>
                  </div>
                </div>

                <RangeArrow />

                {/* Next Key Node or MAX */}
                {inclusionNextKeyNode ? (
                  <div className="flex-shrink-0 bg-zinc-900 border-2 border-zinc-500/60 rounded-xl min-w-[220px]">
                    <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-zinc-800">
                      <span className="text-sm font-semibold text-zinc-200">
                        Next Key [{inclusionNextKeyNode.index}]
                      </span>
                      <span className="px-2 py-0.5 text-xs font-medium border rounded-md bg-zinc-800 text-zinc-400 border-zinc-600/30">
                        successor
                      </span>
                    </div>
                    <div className="p-4 space-y-2 text-sm font-mono">
                      <div className="flex justify-between gap-4">
                        <span className="text-zinc-500 font-medium">key</span>
                        <span className="text-zinc-200 truncate" title={formatHex(inclusionNextKeyNode.key)}>
                          {truncateHex(formatHex(inclusionNextKeyNode.key), 14)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-zinc-500 font-medium">nextKey</span>
                        <span className="text-zinc-200 truncate" title={formatHex(inclusionNextKeyNode.nextKey)}>
                          {truncateHex(formatHex(inclusionNextKeyNode.nextKey), 14)}
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
              </>
            ) : (
              /* Exclusion Proof Visualization */
              <>
                {/* Low Nullifier Card */}
                <div className="flex-shrink-0 bg-zinc-900 border-2 border-orange-500/60 rounded-xl min-w-[240px]">
                  <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-zinc-800">
                    <span className="text-sm font-semibold text-zinc-200">
                      Low Nullifier [{proof.lowNode.index}]
                    </span>
                    <span className="px-2 py-0.5 text-xs font-medium border rounded-md bg-orange-900/50 text-orange-400 border-orange-600/30">
                      membership proven
                    </span>
                  </div>
                  <div className="p-4 space-y-2 text-sm font-mono">
                    <div className="flex justify-between gap-4">
                      <span className="text-zinc-500 font-medium">key</span>
                      <span className="text-orange-300 truncate" title={formatHex(proof.lowNode.key)}>
                        {truncateHex(formatHex(proof.lowNode.key), 14)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-zinc-500 font-medium">nextKey</span>
                      <span className="text-zinc-200 truncate" title={formatHex(proof.lowNode.nextKey)}>
                        {truncateHex(formatHex(proof.lowNode.nextKey), 14)}
                      </span>
                    </div>
                  </div>
                  <div className="px-4 pb-3 pt-1 border-t border-zinc-800">
                    <div className="text-[10px] text-zinc-500 mb-0.5">leaf hash</div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-zinc-400 font-mono truncate" title={nodeHash}>
                        {nodeHash.slice(0, 24)}...
                      </span>
                      <CopyButton value={nodeHash} />
                    </div>
                  </div>
                </div>

                <RangeArrow />

                {/* Non-member (query key) shown in the gap */}
                <div className="flex-shrink-0 bg-zinc-900 border-2 border-purple-500 border-dashed rounded-xl min-w-[200px] relative">
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-purple-600 px-2 py-0.5 rounded text-[10px] font-medium text-white">
                    NOT IN TREE
                  </div>
                  <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-zinc-800">
                    <span className="text-sm font-semibold text-zinc-200">
                      Query Key
                    </span>
                    <span className="px-2 py-0.5 text-xs font-medium border rounded-md bg-purple-900/50 text-purple-400 border-purple-600/30">
                      absent
                    </span>
                  </div>
                  <div className="p-4 space-y-2 text-sm font-mono">
                    <div className="flex justify-between gap-4">
                      <span className="text-zinc-500 font-medium">value</span>
                      <span className="text-purple-300 truncate" title={formatHex(queryKey)}>
                        {truncateHex(formatHex(queryKey), 14)}
                      </span>
                    </div>
                  </div>
                  {/* Range indicator */}
                  <div className="px-4 pb-3 pt-1 border-t border-zinc-800">
                    <div className="text-[10px] text-zinc-500 text-center">
                      lowNode.key &lt; <span className="text-purple-400">query</span> &lt; lowNode.nextKey
                    </div>
                  </div>
                </div>

                <RangeArrow />

                {/* Next Key Node or MAX */}
                {nextKeyNode ? (
                  <div className="flex-shrink-0 bg-zinc-900 border-2 border-zinc-500/60 rounded-xl min-w-[240px]">
                    <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-zinc-800">
                      <span className="text-sm font-semibold text-zinc-200">
                        Next Node [{nextKeyNode.index}]
                      </span>
                      <span className="px-2 py-0.5 text-xs font-medium border rounded-md bg-zinc-800 text-zinc-400 border-zinc-600/30">
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
              </>
            )}
          </div>
        </div>
      ) : (
        /* Proof Contents Tab - shows the actual proof data */
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            {/* Info banner */}
            <div className={`mb-4 p-3 rounded-lg ${
              isInclusion 
                ? 'bg-green-900/20 border border-green-600/30'
                : 'bg-orange-900/20 border border-orange-600/30'
            }`}>
              <div className="flex items-start gap-2">
                <svg className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isInclusion ? 'text-green-500' : 'text-orange-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className={`text-sm font-medium ${isInclusion ? 'text-green-300' : 'text-orange-300'}`}>
                    {isInclusion ? 'Direct Membership Proof' : 'Low Nullifier Membership Proof'}
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    {isInclusion 
                      ? 'The inclusion proof demonstrates that this node IS a member of the tree by providing the Merkle path from the leaf to the root.'
                      : 'The non-membership proof is proven by demonstrating that the low nullifier IS a member of the tree, and that the query key falls between its key and nextKey.'
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Node Data */}
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isInclusion ? 'bg-green-500' : 'bg-orange-500'}`}></span>
                  {isInclusion ? 'Proven Node' : 'Low Nullifier Node'}
                </h4>
                <div className="space-y-2 text-sm font-mono">
                  <div className="flex justify-between gap-2">
                    <span className="text-zinc-500">index</span>
                    <span className="text-zinc-200">{proofNode.index}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-zinc-500">key</span>
                    <div className="flex items-center gap-1">
                      <span className={`truncate ${isInclusion ? 'text-green-300' : 'text-orange-300'}`} title={formatHex(proofNode.key)}>
                        {truncateHex(formatHex(proofNode.key), 20)}
                      </span>
                      <CopyButton value={formatHex(proofNode.key)} />
                    </div>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-zinc-500">nextKey</span>
                    <div className="flex items-center gap-1">
                      <span className="text-zinc-200 truncate" title={formatHex(proofNode.nextKey)}>
                        {truncateHex(formatHex(proofNode.nextKey), 20)}
                      </span>
                      <CopyButton value={formatHex(proofNode.nextKey)} />
                    </div>
                  </div>
                  <div className="pt-2 border-t border-zinc-700">
                    <div className="flex justify-between gap-2">
                      <span className="text-zinc-500">hash</span>
                      <div className="flex items-center gap-1">
                        <span className="text-zinc-400 truncate" title={nodeHash}>
                          {nodeHash.slice(0, 16)}...
                        </span>
                        <CopyButton value={nodeHash} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Path Information */}
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  Merkle Path Indices
                </h4>
                <div className="font-mono text-xs">
                  <div className="flex flex-wrap gap-1">
                    {pathIndices.map((idx, i) => (
                      <span
                        key={i}
                        className={`px-2 py-1 rounded ${
                          idx === 0 ? 'bg-blue-900/30 text-blue-400' : 'bg-purple-900/30 text-purple-400'
                        }`}
                        title={idx === 0 ? 'Left child' : 'Right child'}
                      >
                        {idx === 0 ? 'L' : 'R'}
                      </span>
                    ))}
                  </div>
                  <p className="text-zinc-500 mt-2 text-[10px]">
                    Path from leaf to root: {pathIndices.join(' → ')}
                  </p>
                </div>
              </div>
            </div>

            {/* Sibling Hashes */}
            <div className="mt-4 bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
              <h4 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Sibling Hashes (Merkle Path)
                <span className="text-xs text-zinc-500 font-normal">
                  ({siblings.length} levels)
                </span>
              </h4>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {siblings.map((hash, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-mono group">
                    <span className="text-zinc-500 w-8 text-right">L{i}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      pathIndices[i] === 0 ? 'bg-blue-900/30 text-blue-400' : 'bg-purple-900/30 text-purple-400'
                    }`}>
                      {pathIndices[i] === 0 ? 'R' : 'L'}
                    </span>
                    <span className="text-zinc-400 truncate flex-1" title={hash}>
                      {hash}
                    </span>
                    <CopyButton value={hash} />
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-zinc-500 mt-2">
                Each sibling hash is combined with the current hash at that level to compute the parent hash.
                The path index indicates whether this node is the Left (L) or Right (R) sibling.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
