---
id: distributed-cache
title: Design a distributed key-value cache
level: senior
topics: [consistent-hashing, replication, consistency]
minutes: 45
---

## Prompt

Design a distributed in-memory cache, like a simplified Memcached or Redis cluster, that application services use to speed up reads from a slower primary database.

## Clarifications

- **Scale?** 2 million GET requests/sec at peak, 200,000 SET requests/sec at peak, across the whole cluster.
- **Data size?** Average value 2 KB, 500 million distinct keys, roughly 1 TB of hot data total.
- **Cluster size?** 50 cache nodes, each with 32 GB of usable memory.
- **Latency requirement?** p99 under 5ms for both GET and SET.
- **Consistency requirement?** Cache is a side cache next to a source-of-truth database; brief staleness (a few seconds) after a write is acceptable, but a node should never silently lose a large chunk of keys without the client noticing via cache misses.
- **Eviction?** LRU per node when a node's memory is full; TTL supported per key, default 10 minutes.
- **Failure tolerance?** Losing 1 of 50 nodes should degrade hit rate, not cause an outage.

## Follow-ups

- One key (a celebrity profile, a trending product) gets 50,000 GETs/sec on its own. How does your partitioning scheme handle that without melting one node?
- A node crashes and is replaced. Walk through what happens to the keys it owned, from the moment of failure to the cluster being fully healthy again.
- You need to add 20 more nodes to handle growth. How much data has to move, and how do clients keep working during the rebalance?
- How would you change the design if the requirement shifted from "cache, stale reads ok" to "must never return stale data"?

## Rubric

- Proposes consistent hashing (or an equivalent, e.g. rendezvous hashing) with virtual nodes to map keys to the 50 physical nodes, explaining why it bounds key movement on node add/remove compared to simple modulo hashing.
- Names the key trade-off explicitly: replication for availability and read throughput (each key stored on N nodes, extra memory and write cost, more complex invalidation) versus a single owner per key (simpler, cheaper, but a node failure drops its keys until it is replaced). States a concrete choice, e.g. replication factor 2 or 3, given the 1-node-failure tolerance requirement.
- Addresses the hot-key problem separately from general partitioning: client-side caching, key-level replication to multiple nodes, or request coalescing for an extremely hot key, since consistent hashing alone does not fix a single overloaded key.
- Covers client routing: a smart client or proxy layer that knows the hash ring, versus a centralized router, and the latency/complexity trade-off between them.
- Discusses what happens on node failure: how clients detect it (health checks, consistent hashing ring update) and how the system avoids a thundering herd on the database while the cache rewarms.
- Addresses rebalancing when adding nodes: consistent hashing's property of moving only roughly 1/N of keys, versus the operational process of warming the new node before sending it full traffic.
- Mentions memory management per node (LRU eviction plus TTL) and estimates whether 1 TB of hot data fits in 50 x 32 GB = 1.6 TB of raw memory with headroom for overhead and replication factor.

## Pitfalls

- Proposing simple modulo-based hashing (key hash mod number of nodes) without addressing that it reshuffles nearly all keys when the node count changes.
- No answer for the hot-key problem beyond "consistent hashing distributes load," missing that one key always maps to one node (or one replica set) regardless of hashing scheme.
- Treating the cache as if it were the system of record and over-engineering strong consistency the requirements explicitly do not need.
- Forgetting to account for replication factor when checking whether the cluster's memory can hold the stated data volume.
