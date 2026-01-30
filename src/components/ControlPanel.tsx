'use client';

import React, { useState, useEffect } from 'react';
import { useIMT } from '@/context/IMTContext';

export function ControlPanel() {
  const { 
    tree, 
    isLoading, 
    preview,
    initializeTree, 
    insertNode, 
    setPreview, 
    clearPreview,
    resetTree 
  } = useIMT();

  const [depth, setDepth] = useState(4);
  const [keyInput, setKeyInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Sync depth state with tree's actual depth when loaded from storage
  useEffect(() => {
    if (tree) {
      setDepth(tree.depth);
    }
  }, [tree?.depth]);

  const handleInitialize = () => {
    initializeTree(depth);
    setError(null);
  };

  const parseHexInput = (input: string): bigint | null => {
    try {
      const trimmed = input.trim();
      if (trimmed === '') return null;
      
      // Support both hex (0x...) and decimal
      if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
        return BigInt(trimmed);
      }
      return BigInt(trimmed);
    } catch {
      return null;
    }
  };

  const handlePreview = () => {
    setError(null);
    
    const key = parseHexInput(keyInput);
    
    if (key === null) {
      setError('Invalid key format');
      return;
    }
    
    setPreview(key);
  };

  const handleInsert = () => {
    setError(null);
    
    const key = parseHexInput(keyInput);
    
    if (key === null) {
      setError('Invalid key format');
      return;
    }
    
    const result = insertNode(key);
    
    if ('error' in result) {
      setError(result.error);
      return;
    }
    
    // Clear inputs on success
    setKeyInput('');
  };

  const handleReset = () => {
    resetTree();
    setShowResetConfirm(false);
    setKeyInput('');
    setError(null);
  };

  if (isLoading) {
    return (
      <div className="w-72 border-r border-zinc-800 p-4">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-72 border-r border-zinc-800 p-4 flex flex-col h-full">
      <h2 className="text-lg font-semibold mb-4">IMT Playground</h2>

      {/* Tree initialization */}
      {!tree ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Tree Depth</label>
            <select
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 focus:outline-none focus:border-zinc-500"
            >
              <option value={4}>4 (16 leaves)</option>
              <option value={8}>8 (256 leaves)</option>
              <option value={12}>12 (4,096 leaves)</option>
              <option value={16}>16 (65,536 leaves)</option>
            </select>
          </div>
          <button
            onClick={handleInitialize}
            className="w-full bg-white text-black py-2 rounded hover:bg-zinc-200 transition-colors font-medium"
          >
            Initialize Tree
          </button>
        </div>
      ) : (
        <>
          {/* Tree depth selector */}
          <div className="mb-4">
            <label className="block text-sm text-zinc-400 mb-1">Tree Depth</label>
            <select
              value={depth}
              onChange={(e) => {
                const newDepth = Number(e.target.value);
                setDepth(newDepth);
                initializeTree(newDepth);
              }}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 focus:outline-none focus:border-zinc-500 text-sm"
            >
              <option value={4}>4 (16 leaves)</option>
              <option value={8}>8 (256 leaves)</option>
              <option value={12}>12 (4,096 leaves)</option>
              <option value={16}>16 (65,536 leaves)</option>
            </select>
          </div>

          {/* Tree info */}
          <div className="mb-4 p-3 bg-zinc-900 rounded border border-zinc-800">
            <div className="text-xs text-zinc-500 space-y-1">
              <div className="flex justify-between">
                <span>Nodes:</span>
                <span className="font-mono">{tree.nodes.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Capacity:</span>
                <span className="font-mono">{Math.pow(2, tree.depth)}</span>
              </div>
            </div>
          </div>

          {/* Insert form */}
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Key (hex or decimal)</label>
              <input
                type="text"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="0x1234... or 123"
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 font-mono text-sm focus:outline-none focus:border-zinc-500"
              />
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="mb-4 p-2 bg-red-900/30 border border-red-600/50 rounded text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2">
            <button
              onClick={handlePreview}
              disabled={!keyInput}
              className="w-full bg-zinc-800 border border-zinc-600 py-2 rounded hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Preview Insert
            </button>
            <button
              onClick={handleInsert}
              disabled={!keyInput}
              className="w-full bg-white text-black py-2 rounded hover:bg-zinc-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Insert Node
            </button>
            {preview && (
              <button
                onClick={clearPreview}
                className="w-full bg-zinc-900 border border-zinc-700 py-2 rounded hover:bg-zinc-800 transition-colors text-zinc-400"
              >
                Clear Preview
              </button>
            )}
          </div>

          {/* Reset section */}
          <div className="mt-auto pt-4 border-t border-zinc-800">
            {showResetConfirm ? (
              <div className="space-y-2">
                <p className="text-sm text-zinc-400">Are you sure? This will delete all nodes.</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleReset}
                    className="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded transition-colors text-sm"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 py-2 rounded transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-full bg-zinc-900 border border-zinc-700 py-2 rounded hover:bg-zinc-800 transition-colors text-zinc-400 text-sm"
              >
                Reset Tree
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
