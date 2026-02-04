#!/usr/bin/env node
/**
 * CLI entry point for the IMT Engine server
 *
 * Usage:
 *   npx @stevieraykatz/imt-engine serve [options]
 *   imt-engine serve [options]
 *
 * Options:
 *   --port, -p     Port to listen on (default: 3001)
 *   --host, -h     Host to bind to (default: 0.0.0.0)
 *   --storage, -s  Storage directory (default: /tmp/imt-trees)
 *   --help         Show help
 */
import { startServer } from './server.js';
function parseArgs(args) {
    const result = {
        port: 3001,
        host: '0.0.0.0',
        storageDir: '/tmp/imt-trees',
        help: false,
        command: 'serve',
    };
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const next = args[i + 1];
        switch (arg) {
            case '--port':
            case '-p':
                result.port = parseInt(next, 10) || 3001;
                i++;
                break;
            case '--host':
            case '-h':
                if (next && !next.startsWith('-')) {
                    result.host = next;
                    i++;
                }
                break;
            case '--storage':
            case '-s':
                result.storageDir = next;
                i++;
                break;
            case '--help':
                result.help = true;
                break;
            case 'serve':
                result.command = 'serve';
                break;
            default:
                if (!arg.startsWith('-') && !result.command) {
                    result.command = arg;
                }
        }
    }
    return result;
}
function printHelp() {
    console.log(`
@stevieraykatz/imt-engine - Indexed Merkle Tree Engine

Usage:
  imt-engine [command] [options]

Commands:
  serve     Start the HTTP API server (default)

Options:
  --port, -p <port>       Port to listen on (default: 3001)
  --host, -h <host>       Host to bind to (default: 0.0.0.0)
  --storage, -s <dir>     Storage directory (default: /tmp/imt-trees)
  --help                  Show this help message

Examples:
  # Start server with defaults
  imt-engine serve

  # Start on custom port
  imt-engine serve --port 8080

  # Custom storage directory
  imt-engine serve --storage ./data/trees

API Endpoints (when server is running):
  GET  /           API info and available endpoints
  GET  /trees      List all trees
  POST /trees      Create a tree { depth?: number, treeId?: string }
  GET  /trees/:id  Get tree metadata
  DEL  /trees/:id  Delete a tree
  GET  /root       Get Merkle root { treeId?: string }
  POST /append     Insert key { key: string, treeId?: string, depth?: number }
  GET  /proof      Get proof { key: string, treeId?: string }
  GET  /export     Export tree { treeId?: string }

Tree IDs:
  All endpoints accept an optional treeId parameter (query param or body).
  If not specified, the "default" tree is used.
`);
}
function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        printHelp();
        process.exit(0);
    }
    switch (args.command) {
        case 'serve':
        default:
            startServer({
                port: args.port,
                host: args.host,
                storageDir: args.storageDir,
            });
            break;
    }
}
main();
