/**
 * Server-only exports for @stevieraykatz/imt-engine
 *
 * These modules depend on Node.js built-ins (fs, path, http) and must not
 * be imported in browser / client-side bundles.
 *
 * @example
 * ```typescript
 * import { TreeStore, startServer } from '@stevieraykatz/imt-engine/server';
 * ```
 */
export * from './store.js';
export { createServer, startServer, type ServerConfig } from './server.js';
export { AsyncSemaphore } from './concurrency.js';
//# sourceMappingURL=server-entry.d.ts.map