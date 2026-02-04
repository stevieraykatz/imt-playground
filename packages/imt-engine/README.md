# @stevieraykatz/imt-engine

A pure TypeScript implementation of Indexed Merkle Trees (IMT) with a built-in HTTP API server.

## What's an Indexed Merkle Tree?

An Indexed Merkle Tree enables efficient **non-membership proofs** — proving something *doesn't* exist in a tree. Each leaf stores a value plus a pointer to the next-highest value, forming a sorted linked list within a Merkle tree. This allows non-membership proofs in `O(log n)` hashes instead of `O(n)` required by sparse Merkle trees.

IMTs are used in privacy-preserving systems (like Aztec) where you need to prove a note hasn't been spent without revealing which note you're spending.

## Installation

```bash
npm install @stevieraykatz/imt-engine
```

## Quick Start

### Option 1: HTTP API Server

Start the server and interact via REST API (works with any language):

```bash
# Start server on default port 3001
npx @stevieraykatz/imt-engine serve

# Or with options
npx @stevieraykatz/imt-engine serve --port 8080 --storage ./data
```

Then use curl, Python, Go, or any HTTP client:

```bash
# Insert a key (auto-creates default tree)
curl -X POST http://localhost:3001/append \
  -H "Content-Type: application/json" \
  -d '{"key": "0x1234"}'

# Get inclusion proof
curl "http://localhost:3001/proof?key=0x1234"

# Get Merkle root
curl http://localhost:3001/root
```

### Option 2: TypeScript Library

```typescript
import { createEmptyTree, insert, generateProof, getRoot } from '@stevieraykatz/imt-engine';

// Create a tree with depth 4 (max 16 leaves)
let tree = createEmptyTree(4);

// Insert keys
const result = insert(tree, 0x1234n);
if (!('error' in result)) {
  tree = result.state;
  console.log('Root:', result.result.newRoot);
}

// Generate proof
const proof = generateProof(tree, 0x1234n);
console.log('Type:', proof.type); // 'inclusion' or 'exclusion'
```

### Option 3: TreeStore (Multi-tree with Persistence)

```typescript
import { TreeStore } from '@stevieraykatz/imt-engine';

const store = new TreeStore({ storageDir: './data' });

// Create named trees
store.createTree(4, 'users');
store.createTree(8, 'transactions');

// Insert into specific tree
store.insert('0x1234', 'users');

// Or use default tree
store.insert('0x5678'); // Uses "default" tree
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API info and available endpoints |
| GET | `/trees` | List all trees |
| POST | `/trees` | Create a new tree |
| GET | `/trees/:id` | Get tree metadata |
| DELETE | `/trees/:id` | Delete a tree |
| GET | `/root` | Get Merkle root |
| POST | `/append` | Insert a key |
| GET | `/proof` | Generate inclusion/exclusion proof |
| GET | `/export` | Export full tree data |

### POST /trees

Create a new tree.

```bash
curl -X POST http://localhost:3001/trees \
  -H "Content-Type: application/json" \
  -d '{"depth": 8, "treeId": "my-tree"}'
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `depth` | number | 4 | Tree depth (max leaves = 2^depth) |
| `treeId` | string | "default" | Unique tree identifier |

### POST /append

Insert a key into a tree.

```bash
curl -X POST http://localhost:3001/append \
  -H "Content-Type: application/json" \
  -d '{"key": "0x1234", "treeId": "my-tree"}'
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `key` | string | required | Hex key to insert (e.g., "0x1234") |
| `treeId` | string | "default" | Target tree |
| `depth` | number | 4 | Depth if auto-creating tree |

**Response:**
```json
{
  "success": true,
  "treeId": "default",
  "root": "0x74e7546b...",
  "size": 1,
  "insertedNode": {
    "key": "0x1234",
    "index": 0,
    "nextKey": "0xffff..."
  }
}
```

### GET /proof

Generate a Merkle proof for a key.

```bash
curl "http://localhost:3001/proof?key=0x1234&treeId=my-tree"
```

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `key` | string | required | Key to prove |
| `treeId` | string | "default" | Target tree |

**Response (inclusion proof):**
```json
{
  "type": "inclusion",
  "depth": 4,
  "size": 2,
  "root": "0x43ac1a37...",
  "queryKey": "0x1234",
  "node": {
    "key": "0x1234",
    "index": 0,
    "nextKey": "0x5678"
  },
  "siblings": ["0xe587...", "0x21dd...", "0xb4c1...", "0x2e7b..."],
  "pathIndices": [0, 0, 0, 0]
}
```

**Response (exclusion proof):**
```json
{
  "type": "exclusion",
  "queryKey": "0x3000",
  "lowNullifier": {
    "key": "0x1234",
    "index": 0,
    "nextKey": "0x5678"
  },
  "siblings": ["..."],
  "pathIndices": [0, 0, 0, 0]
}
```

### GET /root

Get the current Merkle root.

```bash
curl "http://localhost:3001/root?treeId=my-tree"
```

### GET /export

Export full tree data (nodes, depth, etc.).

```bash
curl "http://localhost:3001/export?treeId=my-tree"
```

## CLI Reference

```
npx @stevieraykatz/imt-engine [command] [options]

Commands:
  serve     Start the HTTP API server (default)

Options:
  --port, -p <port>       Port to listen on (default: 3001)
  --host, -h <host>       Host to bind to (default: 0.0.0.0)
  --storage, -s <dir>     Storage directory (default: /tmp/imt-trees)
  --help                  Show help message
```

## Storage

Trees are persisted as JSON files:

```
/tmp/imt-trees/
├── default.json
├── my-tree.json
└── another-tree.json
```

## Example: Python Integration

```python
import requests

BASE = 'http://localhost:3001'

# Create a tree
requests.post(f'{BASE}/trees', json={'depth': 4, 'treeId': 'python-tree'})

# Insert keys
requests.post(f'{BASE}/append', json={'key': '0x1234', 'treeId': 'python-tree'})
requests.post(f'{BASE}/append', json={'key': '0x5678', 'treeId': 'python-tree'})

# Get proof
proof = requests.get(f'{BASE}/proof', params={'key': '0x1234', 'treeId': 'python-tree'}).json()
print(f"Proof type: {proof['type']}")
print(f"Root: {proof['root']}")

# Get non-membership proof
exclusion = requests.get(f'{BASE}/proof', params={'key': '0x3000', 'treeId': 'python-tree'}).json()
print(f"Exclusion proof via low nullifier: {exclusion['lowNullifier']['key']}")
```

## License

MIT
