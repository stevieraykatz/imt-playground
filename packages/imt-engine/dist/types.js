/**
 * Core types for Indexed Merkle Tree implementation
 */
/**
 * Sentinel values for the IMT
 */
export const ZERO_KEY = 0n;
export const MAX_KEY = BigInt('0x' + 'ff'.repeat(32)); // 2^256 - 1
/**
 * Helper to create a zero/empty node
 */
export function createZeroNode(index) {
    return {
        key: ZERO_KEY,
        index,
        nextKey: ZERO_KEY,
    };
}
/**
 * Serialize an IMTNode for JSON transport
 */
export function serializeNode(node) {
    return {
        key: '0x' + node.key.toString(16),
        index: node.index,
        nextKey: '0x' + node.nextKey.toString(16),
    };
}
/**
 * Deserialize a node from JSON
 */
export function deserializeNode(node) {
    return {
        key: BigInt(node.key),
        index: node.index,
        nextKey: BigInt(node.nextKey),
    };
}
/**
 * Serialize full IMT state
 */
export function serializeState(state) {
    return {
        depth: state.depth,
        nodes: state.nodes.map(serializeNode),
        nextIndex: state.nextIndex,
        layers: state.layers,
    };
}
/**
 * Deserialize full IMT state
 */
export function deserializeState(state) {
    return {
        depth: state.depth,
        nodes: state.nodes.map(deserializeNode),
        nextIndex: state.nextIndex,
        layers: state.layers,
    };
}
/**
 * Export tree state to compact JSON format
 */
export function exportTree(state) {
    // Nodes must be sorted by index for export (index is implicit from array position)
    const sortedNodes = [...state.nodes].sort((a, b) => a.index - b.index);
    return {
        depth: state.depth,
        nodes: sortedNodes.map(node => ({
            key: '0x' + node.key.toString(16),
            nextKey: '0x' + node.nextKey.toString(16),
        })),
        nextIndex: state.nextIndex,
    };
}
/**
 * Parse exported JSON back to IMTNode array
 */
export function parseImportedNodes(data) {
    return {
        depth: data.depth,
        nodes: data.nodes.map((node, index) => ({
            key: BigInt(node.key),
            index,
            nextKey: BigInt(node.nextKey),
        })),
        nextIndex: data.nextIndex,
    };
}
/**
 * Export a Merkle proof to JSON-serializable format.
 * Siblings are ordered from root to leaf (most significant first, descending depth).
 */
export function exportProof(queryKey, proof, root, depth, size) {
    const formatKey = (k) => '0x' + k.toString(16);
    if (proof.type === 'inclusion') {
        return {
            type: 'inclusion',
            depth,
            size,
            root,
            queryKey: formatKey(queryKey),
            node: {
                key: formatKey(proof.node.key),
                index: proof.node.index,
                nextKey: formatKey(proof.node.nextKey),
            },
            siblings: [...proof.siblings].reverse(),
            pathIndices: [...proof.pathIndices].reverse(),
        };
    }
    else {
        return {
            type: 'exclusion',
            depth,
            size,
            root,
            queryKey: formatKey(queryKey),
            node: {
                key: formatKey(proof.node.key),
                index: proof.node.index,
                nextKey: formatKey(proof.node.nextKey),
            },
            siblings: [...proof.siblings].reverse(),
            pathIndices: [...proof.pathIndices].reverse(),
        };
    }
}
