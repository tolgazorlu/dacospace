---
id: web-crawler
title: Design a web crawler
level: mid
topics: [distributed-systems, queues, dedup]
minutes: 45
---

## Prompt

Design a web crawler that discovers and downloads web pages at scale, following links to find new pages.

## Clarifications

- **Scale?** Crawl 1 billion pages per month, sustained throughput of about 400 pages/sec, bursting to 1,500/sec.
- **Seed set?** Starts from 10,000 seed URLs and follows outbound links.
- **Politeness?** Must respect robots.txt and avoid hitting any single domain faster than 1 request per second, regardless of overall crawler throughput.
- **Freshness?** Popular/high-traffic pages (top 1% by estimated importance) should be recrawled every 24 hours; the long tail is recrawled roughly every 30 days.
- **Content size?** Average page is 500 KB including assets referenced but not downloaded (HTML only is fetched, about 80 KB average).
- **Dedup requirement?** Must avoid re-downloading identical content reachable via different URLs, and avoid infinite loops from circular links.
- **Storage?** Downloaded HTML is stored for downstream indexing, out of scope for this design beyond "write it somewhere durable."

## Follow-ups

- Two crawler workers pick up the same URL from the frontier queue at nearly the same time. How do you avoid wasting a fetch on the duplicate?
- A domain hosts 2 million pages from your seed set. How do you crawl it fully without violating the 1 req/sec politeness limit, while still hitting 400 pages/sec overall across all domains?
- A malicious or misconfigured site generates infinite distinct URLs via query parameters (a crawler trap). How do you detect and stop that?
- How would you prioritize recrawling the top 1% of pages every 24 hours without starving the long tail entirely?

## Rubric

- Designs the frontier as a priority queue (or set of per-domain queues) so politeness and priority can both be enforced, rather than one global FIFO queue.
- Names the key trade-off: one queue per domain with per-domain rate limiting (strong politeness guarantees, more bookkeeping, needs a domain-to-queue router) versus a single global queue with timestamp-based throttling per domain (simpler, harder to guarantee no domain gets hammered under skewed load).
- Addresses URL-seen and content-seen deduplication separately: a URL dedup set/bloom filter to avoid re-fetching, and a content hash (e.g. simhash or exact hash) to avoid storing duplicate content fetched via different URLs.
- Covers robots.txt fetching and caching per domain, checked before any fetch to that domain.
- Discusses distributing crawl workers and partitioning the frontier/dedup state (e.g. by domain hash) so workers do not need a single shared lock for every URL.
- Mentions crawler traps (infinite URL generation) and a mitigation such as max URL depth, max pages per domain, or detecting low-value URL patterns.
- Addresses recrawl scheduling as a priority score combining page importance and staleness, not a fixed interval for everyone.

## Pitfalls

- A single global frontier queue with no per-domain structure, making the 1 req/sec politeness limit impossible to enforce cleanly.
- URL dedup only, with no content-level dedup, missing that different URLs can serve identical content.
- No mention of robots.txt or politeness at all until prompted.
- No bound on crawl depth or per-domain page count, vulnerable to crawler traps.
