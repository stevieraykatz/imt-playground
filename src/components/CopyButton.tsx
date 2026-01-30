'use client';

import React, { useState, useCallback } from 'react';

interface CopyButtonProps {
  value: string;
  size?: 'sm' | 'md';
}

export function CopyButton({ value, size = 'sm' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = value;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [value]);

  const iconSize = size === 'sm' ? 12 : 14;

  return (
    <button
      onClick={handleCopy}
      className={`flex-shrink-0 transition-colors ${
        copied 
          ? 'text-green-400' 
          : 'text-zinc-600 hover:text-zinc-300'
      }`}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      {copied ? (
        <svg width={iconSize} height={iconSize} viewBox="0 0 16 16" fill="none">
          <path 
            d="M13.5 4.5L6 12L2.5 8.5" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg width={iconSize} height={iconSize} viewBox="0 0 16 16" fill="none">
          <rect 
            x="5.5" 
            y="5.5" 
            width="8" 
            height="8" 
            rx="1.5" 
            stroke="currentColor" 
            strokeWidth="1.25"
          />
          <path 
            d="M10.5 5.5V3.5C10.5 2.67157 9.82843 2 9 2H3.5C2.67157 2 2 2.67157 2 3.5V9C2 9.82843 2.67157 10.5 3.5 10.5H5.5" 
            stroke="currentColor" 
            strokeWidth="1.25"
          />
        </svg>
      )}
    </button>
  );
}
