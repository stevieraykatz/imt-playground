## Indexed Merkle Tree Playground and Engine

Confused by cryptography papers? Learn better by doing? This interactive webapp helps you build intuition about Indexed Merkle Trees (IMTs).

### What's an IMT?

An Indexed Merkle Tree is a data structure that enables efficient non-membership proofs proving something *doesn't* exist in a tree. Each leaf stores a value plus pointers to the next-highest value, forming a sorted linked list within a Merkle tree. This allows non-membership proofs in `O(log n)` hashes instead of the `O(n)` required by sparse Merkle trees.

IMTs are used in privacy-preserving systems where you need to prove a note hasn't been spent without revealing which note you're spending.

**Want the full theory?** Read [Aztec's excellent documentation on IMTs](https://docs.aztec.network/developers/docs/foundational-topics/advanced/storage/indexed_merkle_tree).

### Features

- **Visual tree rendering** — Watch the tree structure update as you insert values
- **Step-by-step insertion** — See how low nullifiers are found and pointers updated
- **Linked list overlay** — Toggle the pointer chain to see the sorted order
- **Non-membership proofs** — Verify that a value doesn't exist in the tree

## Project Structure

This is a monorepo with two packages:

```
imt-playground/
├── packages/
│   └── imt-engine/     # Standalone IMT library + HTTP API server
└── apps/
    └── playground/     # Next.js visualization app
```

## `@stevieraykatz/imt-engine` - Standalone Library + API Server

A pure TypeScript implementation of Indexed Merkle Trees with a built-in HTTP API server.

**Only dependency:** `@noble/hashes` for Keccak-256 hashing

### Quick Start - HTTP API

```bash
# Install and build
npm install
npm run build:engine

# Start the API server (default port 3001)
npm run engine:serve

# Or with custom options
node packages/imt-engine/dist/cli.js serve --port 8080 --storage ./data
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API info and available endpoints |
| GET | `/trees` | List all trees |
| POST | `/trees` | Create a new tree `{ depth, treeId? }` |
| GET | `/trees/:id` | Get tree metadata |
| DELETE | `/trees/:id` | Delete a tree |
| GET | `/root?treeId=` | Get Merkle root |
| POST | `/append` | Insert a key `{ key, treeId?, depth? }` |
| GET | `/proof?key=&treeId=` | Generate inclusion/exclusion proof |
| GET | `/export?treeId=` | Export tree data |

### Multi-Tree Support

All endpoints accept an optional `treeId` parameter. If not specified, the `"default"` tree is used.

```bash
# Create a named tree
curl -X POST http://localhost:3001/trees \
  -H "Content-Type: application/json" \
  -d '{"depth": 8, "treeId": "my-tree"}'

# Insert into that tree
curl -X POST http://localhost:3001/append \
  -H "Content-Type: application/json" \
  -d '{"key": "0x1234", "treeId": "my-tree"}'

# Insert into default tree (no treeId needed)
curl -X POST http://localhost:3001/append \
  -H "Content-Type: application/json" \
  -d '{"key": "0x5678"}'
```

### Storage

Trees are persisted as JSON files in a configurable directory (default: `/tmp/imt-trees/`). Each tree is stored in its own file:

```
/tmp/imt-trees/
├── default.json
├── my-tree.json
└── another-tree.json
```

### TypeScript Usage

```typescript
import { 
  createEmptyTree, 
  insert, 
  generateProof, 
  getRoot 
} from '@stevieraykatz/imt-engine';

// Create a tree with depth 4 (16 leaves max)
let tree = createEmptyTree(4);

// Insert some keys
const result = insert(tree, 0x1234n);
if (!('error' in result)) {
  tree = result.state;
  console.log('Root:', result.result.newRoot);
}

// Generate proof
const proof = generateProof(tree, 0x1234n);
console.log('Proof type:', proof.type); // 'inclusion' or 'exclusion'
```

### TreeStore (Multi-tree with Persistence)

```typescript
import { TreeStore } from '@stevieraykatz/imt-engine';

const store = new TreeStore({ storageDir: './data' });

// Create trees with different IDs
store.createTree(4, 'tree-1');
store.createTree(8, 'tree-2');

// Insert into specific tree
store.insert('0x1234', 'tree-1');

// Use default tree
store.insert('0x5678'); // Uses "default" tree

// List all trees
const trees = store.listTrees();
```

### Programmatic Server

```typescript
import { startServer } from '@stevieraykatz/imt-engine';

const server = startServer({ 
  port: 3001, 
  storageDir: '/tmp/imt-trees' 
});
```

## `@imt/playground` - Visual App

A Next.js app providing interactive tree visualization with real-time updates via Server-Sent Events (SSE).

The playground imports `@stevieraykatz/imt-engine` directly and exposes its own REST API at `/api/imt/*`. This is separate from the standalone engine server — the playground is a self-contained app that bundles the engine.

### Running the Playground

```bash
npm install
npm run build:engine
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start exploring.

### Architecture Note

There are two ways to use the IMT engine:

1. **Standalone engine server** (`npm run engine:serve` on port 3001) — Use this for integrating with non-TypeScript languages or external services via HTTP API.

2. **Playground app** (`npm run dev` on port 3000) — A self-contained Next.js app with built-in visualization. Uses the engine library directly via its own internal API routes.

## Development

```bash
# Build the engine
npm run build:engine

# Start engine API server
npm run engine:serve

# Run playground in dev mode
npm run dev

# Build everything
npm run build
```

## CLI Reference

```
imt-engine [command] [options]

Commands:
  serve     Start the HTTP API server (default)

Options:
  --port, -p <port>       Port to listen on (default: 3001)
  --host, -h <host>       Host to bind to (default: 0.0.0.0)
  --storage, -s <dir>     Storage directory (default: /tmp/imt-trees)
  --help                  Show help message
```

## Example: Using from Python

```python
import requests

# Create a tree
requests.post('http://localhost:3001/trees', json={
    'depth': 4,
    'treeId': 'python-tree'
})

# Insert keys
requests.post('http://localhost:3001/append', json={
    'key': '0x1234',
    'treeId': 'python-tree'
})

# Get proof
response = requests.get('http://localhost:3001/proof', params={
    'key': '0x1234',
    'treeId': 'python-tree'
})
proof = response.json()
print(f"Proof type: {proof['type']}")
```

## License

MIT
