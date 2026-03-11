/**
 * Standalone HTTP server for the IMT Engine
 *
 * Provides a REST API for managing Indexed Merkle Trees.
 * Uses Node.js built-in http module to minimize dependencies.
 */
import * as http from 'http';
import { type TreeStoreConfig } from './store.js';
import { type LogLevel } from './logger.js';
export interface ServerConfig extends TreeStoreConfig {
    port?: number;
    host?: string;
    logLevel?: LogLevel;
    /** Max requests processed concurrently. Excess requests queue FIFO. Default: 50 */
    maxConcurrency?: number;
    /** How long (ms) a queued request will wait for a slot before getting 503. Default: 30 000 */
    requestTimeoutMs?: number;
}
/**
 * Create and start the IMT Engine HTTP server
 */
export declare function createServer(config?: ServerConfig): http.Server;
/**
 * Start the server (convenience function for CLI)
 */
export declare function startServer(config?: ServerConfig): http.Server;
//# sourceMappingURL=server.d.ts.map