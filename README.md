## Indexed Merkle Tree Playground

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

### Getting Started

```bash
git clone git@github.com:stevieraykatz/imt-playground.git
cd imt-playground
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start exploring.
