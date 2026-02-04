'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CopyButton } from './CopyButton';

interface Position {
  x: number;
  y: number;
}

interface InternalNodePanelProps {
  nodeHash: string;
  leftChildHash: string;
  rightChildHash: string;
  layerIndex: number;
  nodeIndex: number;
  initialPosition: Position;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
}

const PANEL_WIDTH = 240;
const PANEL_HEIGHT = 130;

export function InternalNodePanel({
  nodeHash,
  leftChildHash,
  rightChildHash,
  layerIndex,
  nodeIndex,
  initialPosition,
  containerRef,
  onClose,
}: InternalNodePanelProps) {
  const [position, setPosition] = useState<Position>(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef<Position>({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  // Truncate hash for display (e.g., 0x124...241)
  const truncateHash = (hash: string, prefixLen: number = 10, suffixLen: number = 3): string => {
    if (hash.length <= prefixLen + suffixLen + 3) return hash;
    return hash.slice(0, prefixLen) + '...' + hash.slice(-suffixLen);
  };

  // Clamp position to stay within container bounds
  const clampPosition = useCallback((pos: Position): Position => {
    if (!containerRef.current) return pos;

    const containerRect = containerRef.current.getBoundingClientRect();
    const padding = 8;

    return {
      x: Math.max(padding, Math.min(pos.x, containerRect.width - PANEL_WIDTH - padding)),
      y: Math.max(padding, Math.min(pos.y, containerRect.height - PANEL_HEIGHT - padding)),
    };
  }, [containerRef]);

  // Set initial clamped position
  useEffect(() => {
    setPosition(clampPosition(initialPosition));
  }, [initialPosition, clampPosition]);

  // Handle mouse down on header (start drag)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect();
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (containerRect) {
        dragOffset.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
        setIsDragging(true);
      }
    }
    e.preventDefault();
  };

  // Handle mouse move (during drag)
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      const newPos = {
        x: e.clientX - containerRect.left - dragOffset.current.x,
        y: e.clientY - containerRect.top - dragOffset.current.y,
      };

      setPosition(clampPosition(newPos));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, containerRef, clampPosition]);

  return (
    <div
      ref={panelRef}
      className="absolute bg-zinc-900/95 border border-zinc-700 rounded-lg shadow-xl z-20"
      style={{
        left: position.x,
        top: position.y,
        width: PANEL_WIDTH,
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      {/* Draggable header */}
      <div
        className="flex items-center justify-between gap-2 px-3 py-2 border-b border-zinc-800 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <span className="text-xs font-medium text-zinc-300">
          Internal Node [L{layerIndex}, N{nodeIndex}]
        </span>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
          title="Close"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Hash data */}
      <div className="p-3 space-y-2 text-xs font-mono">
        <div>
          <div className="text-zinc-500 text-[10px] mb-0.5">node hash</div>
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-200 truncate" title={nodeHash}>
              {truncateHash(nodeHash, 14, 4)}
            </span>
            <CopyButton value={nodeHash} />
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-zinc-500 text-[10px] mb-0.5">left child</div>
            <div className="flex items-center gap-1">
              <span className="text-zinc-400 text-[11px] truncate" title={leftChildHash}>
                {truncateHash(leftChildHash, 6, 3)}
              </span>
              <CopyButton value={leftChildHash} />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-zinc-500 text-[10px] mb-0.5">right child</div>
            <div className="flex items-center gap-1">
              <span className="text-zinc-400 text-[11px] truncate" title={rightChildHash}>
                {truncateHash(rightChildHash, 6, 3)}
              </span>
              <CopyButton value={rightChildHash} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
