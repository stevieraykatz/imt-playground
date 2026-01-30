/**
 * Storage interface for IMT persistence.
 * Abstracted to allow swapping localStorage for a database later.
 */

import type { IMTState } from '../imt/types';

export interface IMTStorage {
  /**
   * Save the current tree state
   */
  saveTree(state: IMTState): Promise<void>;

  /**
   * Load the tree state, returns null if no state exists
   */
  loadTree(): Promise<IMTState | null>;

  /**
   * Clear the stored tree state
   */
  clear(): Promise<void>;
}
