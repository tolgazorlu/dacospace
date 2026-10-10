---
id: payment-ledger
title: Design a payment system with a wallet and ledger
level: senior
topics: [double-entry-ledger, idempotency, consistency, distributed-transactions]
minutes: 45
---

## Prompt

Users hold a balance in an in-app wallet and can transfer money to other
users or pay merchants. Design the backend that tracks balances and records
every transaction so the books always balance.

## Clarifications

- **Scale?** 10 million wallets, 2 million transactions/day, averaging 23 transactions/second with peaks at 10x during promotions.
- **Transaction types?** Top-up from a card, peer-to-peer transfer, merchant payment, and refund.
- **Consistency requirement?** A wallet balance must never go negative and must never double-spend, even under concurrent requests.
- **Idempotency?** Clients may retry a transfer request up to 3 times on timeout; each logical transaction has a unique idempotency key from the client.
- **Latency target?** p99 under 300ms for a peer-to-peer transfer to be marked completed.
- **Audit requirement?** Every balance change must be reconstructable from an immutable ledger entry; balances are a derived/cached view, not the source of truth.
- **Reconciliation?** Nightly job compares ledger-derived balances against cached balances for all 10 million wallets and flags mismatches.

## Follow-ups

- A client times out waiting for a transfer response and retries with the same idempotency key. Walk through what your system does on the retry.
- Two transfers from the same wallet arrive concurrently and together exceed the balance. How do you guarantee only a safe subset succeeds?
- The nightly reconciliation job finds 40 wallets where the cached balance disagrees with the ledger sum. What are the possible causes and how do you resolve them without taking the system down?
- Scale to 100 million wallets and 2,000 transactions/second. What part of this design breaks first?
- A regulator asks you to prove no money was created or destroyed in the system over the last quarter. What do you show them?

## Rubric

- Models the ledger as double-entry: every transaction writes a balanced pair (or set) of debit/credit entries, never a single balance mutation.
- Names the key trade-off: strong consistency on balance checks (locking or serializable transactions) versus throughput, and picks an approach for the stated QPS.
- Uses idempotency keys stored durably so a retried request returns the original result instead of executing twice.
- Treats the ledger as append-only and the source of truth, with the wallet balance as a materialized, rebuildable cache.
- Describes how concurrent debits against the same wallet are serialized (row-level lock, optimistic concurrency with retry, or single-writer-per-wallet queue) to prevent overdraft.
- Covers reconciliation as a continuous or scheduled correctness check, not an afterthought.
- Addresses failure atomicity: a transaction either fully commits (both sides of the ledger) or fully rolls back, no partial writes.

## Pitfalls

- Storing only a mutable balance column with no immutable transaction log, making the system unauditable.
- Ignoring idempotency and allowing retries to double-process a transfer.
- Using eventual consistency for balance checks without acknowledging the overdraft risk it introduces.
- Treating refunds as just another transfer without considering they must reference and reverse a specific prior transaction.
