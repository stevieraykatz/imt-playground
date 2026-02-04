/**
 * localStorage adapter for IMT persistence
 */

import type { IMTStorage } from './interface';
import type { IMTState, SerializedIMTState } from '@stevieraykatz/imt-engine';
import { serializeState, deserializeState } from '@stevieraykatz/imt-engine';

const STORAGE_KEY = 'imt-playground-state';

export class LocalStorageAdapter implements IMTStorage {
  async saveTree(state: IMTState): Promise<void> {
    if (typeof window === 'undefined') {
      return; // SSR guard
    }
    
    const serialized = serializeState(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  }

  async loadTree(): Promise<IMTState | null> {
    if (typeof window === 'undefined') {
      return null; // SSR guard
    }
    
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }
    
    try {
      const serialized: SerializedIMTState = JSON.parse(stored);
      return deserializeState(serialized);
    } catch {
      // Corrupted storage, clear it
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  async clear(): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }
    
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Singleton instance for use throughout the app
 */
export const storage = new LocalStorageAdapter();
