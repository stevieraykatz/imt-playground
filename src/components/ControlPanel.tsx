'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useIMT } from '@/context/IMTContext';
import type { IMTExportData } from '@/lib/imt/types';

export function ControlPanel() {
  const { 
    tree, 
    isLoading, 
    preview,
    membershipProof,
    initializeTree, 
    insertNode, 
    setPreview, 
    clearPreview,
    resetTree,
    generateMembershipProof,
    clearMembershipProof,
    exportTreeData,
    importTreeData,
  } = useIMT();
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [depth, setDepth] = useState(4);
  const [keyInput, setKeyInput] = useState('');
  const [proofInput, setProofInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

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
    setProofInput('');
    setError(null);
    setProofError(null);
  };

  const handleGenerateProof = () => {
    setProofError(null);
    
    const key = parseHexInput(proofInput);
    
    if (key === null) {
      setProofError('Invalid key format');
      return;
    }
    
    const result = generateMembershipProof(key);
    
    if (result && 'error' in result) {
      setProofError(result.error);
      return;
    }
  };

  const handleExport = () => {
    const data = exportTreeData();
    if (!data) return;
    
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `imt-tree-depth${data.depth}-${data.nodes.length}nodes.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const data = JSON.parse(text) as IMTExportData;
      
      // Basic validation of required fields
      if (typeof data.depth !== 'number' || !Array.isArray(data.nodes) || typeof data.nextIndex !== 'number') {
        setImportError('Invalid file format: missing required fields');
        return;
      }
      
      const result = importTreeData(data);
      if (result && 'error' in result) {
        setImportError(result.error);
      }
    } catch (err) {
      setImportError(`Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
    
    // Reset file input so the same file can be imported again
    e.target.value = '';
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

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />

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
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-700"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-zinc-950 px-2 text-zinc-500">or</span>
            </div>
          </div>
          
          <button
            onClick={handleImportClick}
            className="w-full bg-zinc-800 border border-zinc-600 py-2 rounded hover:bg-zinc-700 transition-colors"
          >
            Import Tree from JSON
          </button>
          
          {importError && (
            <div className="p-2 bg-red-900/30 border border-red-600/50 rounded text-sm text-red-400">
              {importError}
            </div>
          )}
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

          {/* Proof generation section */}
          <div className="mt-6 pt-4 border-t border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-300 mb-3">Generate Proof</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Key to prove</label>
                <input
                  type="text"
                  value={proofInput}
                  onChange={(e) => setProofInput(e.target.value)}
                  placeholder="0x1234... or 123"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 font-mono text-sm focus:outline-none focus:border-zinc-500"
                />
              </div>
              
              {/* Proof error display */}
              {proofError && (
                <div className="p-2 bg-red-900/30 border border-red-600/50 rounded text-sm text-red-400">
                  {proofError}
                </div>
              )}
              
              <button
                onClick={handleGenerateProof}
                disabled={!proofInput || tree?.nodes.length === 0}
                className="w-full bg-purple-600 hover:bg-purple-700 py-2 rounded transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate Proof
              </button>
              
              {membershipProof && (
                <button
                  onClick={clearMembershipProof}
                  className="w-full bg-zinc-900 border border-zinc-700 py-2 rounded hover:bg-zinc-800 transition-colors text-zinc-400"
                >
                  Clear Proof
                </button>
              )}
            </div>
          </div>

          {/* Import/Export section */}
          <div className="mt-6 pt-4 border-t border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-300 mb-3">Import / Export Tree</h3>
            <div className="space-y-2">
              <button
                onClick={handleExport}
                className="w-full bg-zinc-800 border border-zinc-600 py-2 rounded hover:bg-zinc-700 transition-colors text-sm"
              >
                Export Tree to JSON
              </button>
              <button
                onClick={handleImportClick}
                className="w-full bg-zinc-800 border border-zinc-600 py-2 rounded hover:bg-zinc-700 transition-colors text-sm"
              >
                Import Tree from JSON
              </button>
              {importError && (
                <div className="p-2 bg-red-900/30 border border-red-600/50 rounded text-sm text-red-400">
                  {importError}
                </div>
              )}
            </div>
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
