/**
 * Standalone HTTP server for the IMT Engine
 *
 * Provides a REST API for managing Indexed Merkle Trees.
 * Uses Node.js built-in http module to minimize dependencies.
 */
import * as http from 'http';
import * as url from 'url';
import { TreeStore, DEFAULT_TREE_ID, DEFAULT_STORAGE_DIR } from './store.js';
import { exportProof } from './types.js';
import { getRoot } from './engine.js';
const DEFAULT_PORT = 3001;
const DEFAULT_HOST = '0.0.0.0';
/**
 * Simple request logger
 */
function log(method, path, status, durationMs) {
    const statusColor = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m';
    const reset = '\x1b[0m';
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
    console.log(`${timestamp} ${method.padEnd(6)} ${path.padEnd(30)} ${statusColor}${status}${reset} ${durationMs}ms`);
}
/**
 * Parse JSON body from request
 */
async function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            if (!body) {
                resolve({});
                return;
            }
            try {
                resolve(JSON.parse(body));
            }
            catch {
                reject(new Error('Invalid JSON'));
            }
        });
        req.on('error', reject);
    });
}
/**
 * Send JSON response
 */
function sendJson(res, data, status = 200) {
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end(JSON.stringify(data, null, 2));
}
/**
 * Send error response
 */
function sendError(res, message, status = 400) {
    sendJson(res, { error: message }, status);
}
/**
 * Create and start the IMT Engine HTTP server
 */
export function createServer(config = {}) {
    const port = config.port ?? DEFAULT_PORT;
    const host = config.host ?? DEFAULT_HOST;
    const store = new TreeStore({ storageDir: config.storageDir ?? DEFAULT_STORAGE_DIR });
    const server = http.createServer(async (req, res) => {
        const startTime = Date.now();
        const method = req.method ?? 'GET';
        const parsedUrl = url.parse(req.url ?? '/', true);
        const pathname = parsedUrl.pathname ?? '/';
        // Track response status for logging
        let responseStatus = 200;
        const originalWriteHead = res.writeHead.bind(res);
        res.writeHead = (statusCode, ...args) => {
            responseStatus = statusCode;
            return originalWriteHead(statusCode, ...args);
        };
        // Log when response finishes
        res.on('finish', () => {
            if (method !== 'OPTIONS') {
                log(method, pathname, responseStatus, Date.now() - startTime);
            }
        });
        // Handle CORS preflight
        if (method === 'OPTIONS') {
            res.writeHead(204, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            });
            res.end();
            return;
        }
        const query = parsedUrl.query;
        // Extract tree ID from query (defaults to "default")
        const treeId = query.treeId ?? DEFAULT_TREE_ID;
        try {
            // Route handling
            switch (true) {
                // GET / - API info
                case req.method === 'GET' && pathname === '/': {
                    sendJson(res, {
                        name: '@stevieraykatz/imt-engine',
                        version: '0.1.0',
                        endpoints: {
                            'GET /': 'API info',
                            'GET /trees': 'List all trees',
                            'POST /trees': 'Create a new tree (body: { depth, treeId? })',
                            'GET /trees/:treeId': 'Get tree info',
                            'DELETE /trees/:treeId': 'Delete a tree',
                            'GET /root?treeId=': 'Get Merkle root',
                            'POST /append': 'Insert a key (body: { key, treeId?, depth? })',
                            'GET /proof?key=&treeId=': 'Generate proof',
                            'GET /export?treeId=': 'Export tree data',
                        },
                        defaultTreeId: DEFAULT_TREE_ID,
                        storageDir: config.storageDir ?? DEFAULT_STORAGE_DIR,
                    });
                    break;
                }
                // GET /trees - List all trees
                case req.method === 'GET' && pathname === '/trees': {
                    const trees = store.listTrees();
                    sendJson(res, { trees });
                    break;
                }
                // POST /trees - Create a new tree
                case req.method === 'POST' && pathname === '/trees': {
                    const body = await parseBody(req);
                    const depth = typeof body.depth === 'number' ? body.depth : 4;
                    const id = typeof body.treeId === 'string' ? body.treeId : DEFAULT_TREE_ID;
                    if (store.hasTree(id)) {
                        sendError(res, `Tree "${id}" already exists. Delete it first or use a different ID.`);
                        break;
                    }
                    const metadata = store.createTree(depth, id);
                    sendJson(res, metadata, 201);
                    break;
                }
                // GET /trees/:treeId - Get tree info
                case req.method === 'GET' && pathname.startsWith('/trees/'): {
                    const id = pathname.split('/')[2];
                    const metadata = store.getTreeMetadata(id);
                    if (!metadata) {
                        sendError(res, `Tree "${id}" not found.`, 404);
                        break;
                    }
                    sendJson(res, metadata);
                    break;
                }
                // DELETE /trees/:treeId - Delete a tree
                case req.method === 'DELETE' && pathname.startsWith('/trees/'): {
                    const id = pathname.split('/')[2];
                    const deleted = store.deleteTree(id);
                    if (!deleted) {
                        sendError(res, `Tree "${id}" not found.`, 404);
                        break;
                    }
                    sendJson(res, { success: true, message: `Tree "${id}" deleted.` });
                    break;
                }
                // GET /root - Get Merkle root
                case req.method === 'GET' && pathname === '/root': {
                    const result = store.getRoot(treeId);
                    if (typeof result === 'object' && 'error' in result) {
                        sendError(res, result.error, 404);
                        break;
                    }
                    const tree = store.getTree(treeId);
                    sendJson(res, {
                        root: result,
                        treeId,
                        size: tree?.nextIndex ?? 0,
                        depth: tree?.depth ?? 0,
                    });
                    break;
                }
                // POST /append - Insert a key
                case req.method === 'POST' && pathname === '/append': {
                    const body = await parseBody(req);
                    const key = body.key;
                    const id = body.treeId ?? treeId;
                    const depth = typeof body.depth === 'number' ? body.depth : 4;
                    if (!key) {
                        sendError(res, 'Missing required field: key');
                        break;
                    }
                    // Auto-create tree if it doesn't exist
                    if (!store.hasTree(id)) {
                        store.createTree(depth, id);
                    }
                    const result = store.insert(key, id);
                    if ('error' in result) {
                        sendError(res, result.error);
                        break;
                    }
                    const tree = store.getTree(id);
                    sendJson(res, {
                        success: true,
                        treeId: id,
                        root: result.newRoot,
                        size: tree?.nextIndex ?? 0,
                        insertedNode: {
                            key: '0x' + result.node.key.toString(16),
                            index: result.node.index,
                            nextKey: '0x' + result.node.nextKey.toString(16),
                        },
                    });
                    break;
                }
                // GET /proof - Generate proof
                case req.method === 'GET' && pathname === '/proof': {
                    const key = query.key;
                    if (!key) {
                        sendError(res, 'Missing required query parameter: key');
                        break;
                    }
                    const tree = store.getTree(treeId);
                    if (!tree) {
                        sendError(res, `Tree "${treeId}" not found.`, 404);
                        break;
                    }
                    const proof = store.generateProof(key, treeId);
                    if ('error' in proof) {
                        sendError(res, proof.error);
                        break;
                    }
                    // Parse key for export
                    let keyBigInt;
                    try {
                        keyBigInt = BigInt(key);
                    }
                    catch {
                        sendError(res, 'Invalid key format.');
                        break;
                    }
                    const root = getRoot(tree);
                    const serialized = exportProof(keyBigInt, proof, root, tree.depth, tree.nextIndex);
                    sendJson(res, {
                        treeId,
                        ...serialized,
                    });
                    break;
                }
                // GET /export - Export tree data
                case req.method === 'GET' && pathname === '/export': {
                    const result = store.exportTree(treeId);
                    if ('error' in result) {
                        sendError(res, result.error, 404);
                        break;
                    }
                    sendJson(res, {
                        treeId,
                        ...result,
                    });
                    break;
                }
                // 404 for unmatched routes
                default:
                    sendError(res, `Not found: ${req.method} ${pathname}`, 404);
            }
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Internal server error';
            sendError(res, message, 500);
        }
    });
    server.listen(port, host, () => {
        console.log(`IMT Engine server running at http://${host}:${port}`);
        console.log(`Storage directory: ${config.storageDir ?? DEFAULT_STORAGE_DIR}`);
        console.log('');
        console.log('Endpoints:');
        console.log('  GET  /           API info');
        console.log('  GET  /trees      List all trees');
        console.log('  POST /trees      Create tree { depth?, treeId? }');
        console.log('  GET  /trees/:id  Get tree info');
        console.log('  DEL  /trees/:id  Delete tree');
        console.log('  GET  /root       Get root { treeId? }');
        console.log('  POST /append     Insert { key, treeId?, depth? }');
        console.log('  GET  /proof      Get proof { key, treeId? }');
        console.log('  GET  /export     Export tree { treeId? }');
    });
    return server;
}
/**
 * Start the server (convenience function for CLI)
 */
export function startServer(config = {}) {
    return createServer(config);
}
