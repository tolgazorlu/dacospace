---
id: typeahead
title: Design search autocomplete (typeahead)
level: mid
topics: [tries, caching, ranking]
minutes: 45
---

## Prompt

Design the backend for a search box's autocomplete feature: as a user types, show the top matching suggestions within a couple hundred milliseconds.

## Clarifications

- **Scale?** 10 million searches per day, each search triggers roughly 5 keystroke-level autocomplete requests, so about 50 million autocomplete requests/day, average 580/sec, peak 4,000/sec.
- **Latency requirement?** p99 under 100ms end to end, since it fires on every keystroke.
- **Suggestion source?** Ranked by historical search frequency over the trailing 30 days; top 10 suggestions shown per query prefix.
- **Vocabulary size?** About 20 million distinct historical queries tracked, prefixes up to 20 characters considered.
- **Freshness?** New trending terms should influence suggestions within about 1 hour, not real time.
- **Personalization?** Out of scope for this interview; suggestions are the same for all users given the same prefix.
- **Typos?** Out of scope; assume exact prefix matching only.

## Follow-ups

- Walk through how you build and serve the prefix index for 20 million distinct queries so a 1-character prefix doesn't return a huge unranked list.
- A new term suddenly spikes (breaking news). How does it become a top suggestion within the 1-hour freshness window?
- Reduce the latency budget to 50ms p99. What do you change?
- How would you shard this if the vocabulary grew to 500 million distinct queries across many languages?

## Rubric

- Proposes a trie (prefix tree) or equivalent prefix index as the core serving data structure, with each node or a compressed subtree caching its own top-k suggestions precomputed, so lookups do not scan and rank at request time.
- Names the key trade-off: precomputing top-k suggestions at every trie node (fast reads, but expensive and complex updates when rankings change) versus computing top-k on the fly from a smaller candidate set per request (simpler updates, slower reads). States which fits the 100ms budget and 1-hour freshness window.
- Separates the write path (aggregating search logs into query frequency counts, done offline/batch) from the read path (serving the precomputed trie), rebuilt or incrementally updated roughly hourly.
- Addresses caching the hottest, shortest prefixes (1-3 characters) at an edge/CDN layer or in-memory cache since those get disproportionate traffic.
- Discusses sharding the trie by prefix range or first character(s) when it stops fitting on one machine.
- Covers how the offline aggregation job swaps in a new trie/index without downtime (e.g. build new version, atomically swap pointer).

## Pitfalls

- Proposing a SQL `LIKE 'prefix%'` query against a live table as the serving path and calling it done, without addressing the 100ms/4000 QPS requirement.
- Recomputing top-k rankings from raw logs synchronously on every request instead of precomputing offline.
- No discussion of how the index is updated over time, treating it as built once and static forever.
