---
id: product-search
title: Design an e-commerce product search system
level: mid
topics: [inverted-index, ranking, faceted-search, indexing-pipeline]
minutes: 45
---

## Prompt

Shoppers type queries like "running shoes" into a search box and expect
relevant, in-stock results with filters for size, color, and price. Design
the search system behind the product catalog.

## Clarifications

- **Catalog size?** 40 million products, with 2 million added or updated per day (price changes, stock updates, new listings).
- **Query volume?** 15,000 search queries/second at peak.
- **Latency target?** Search results must return in under 200ms at p95.
- **Freshness requirement?** A price or stock change must be reflected in search results within 2 minutes; a brand-new product listing can take up to 30 minutes to become searchable.
- **Faceting?** Results support filters on category, brand, price range, size, and color, with live counts per filter value.
- **Ranking inputs?** Text relevance to the query, in-stock status, historical click-through rate, and price, combined into a single ranking score.
- **Out-of-stock behavior?** Out-of-stock items are shown lower in results but not hidden entirely, since some users want to see them for future availability.

## Follow-ups

- A flash sale drops the price on 50,000 items simultaneously. How quickly does this reflect in both ranking and the displayed price, and what is the update path?
- A query like "red shoes size 9" needs to combine full-text relevance with structured filters (size, color) efficiently. How does your index support both?
- Scale query volume 5x during a holiday shopping peak. What part of the system is most likely to become the bottleneck?
- How would you detect and fix a ranking regression where a popular, in-stock, well-reviewed product stopped appearing in the top 10 results for its main query?
- Facet counts (e.g. "Brand: Nike (1,204)") need to stay accurate as results and filters are combined. How expensive is computing these at query time, and how do you keep it fast?

## Rubric

- Uses an inverted index for text search (mapping terms to product IDs) combined with filterable/facetable fields stored alongside for structured queries.
- Names the key trade-off: index freshness versus indexing throughput and query performance, since re-indexing 2 million products/day at low latency competes with serving 15,000 queries/second.
- Describes a separate ingestion/indexing pipeline from the serving/query path, so catalog updates do not block or slow down live search.
- Covers ranking as a composite score (relevance, stock, CTR, price) and discusses where this scoring happens (index-time boosting vs query-time re-ranking).
- Addresses near-real-time updates for volatile fields (price, stock) distinctly from full re-indexing for new or heavily changed listings, given their different freshness SLAs.
- Discusses facet count computation, acknowledging it requires aggregating across the filtered result set and naming at least one approach to keep it within the 200ms budget (e.g. index-time facet fields, approximate counts, or caching).
- Mentions sharding the index across nodes given 40 million products and merging results across shards at query time.

## Pitfalls

- Treating the search index as a single monolithic structure rebuilt wholesale on every update, ignoring the stated 2-minute freshness SLA for price/stock.
- No distinction between full-text relevance scoring and structured filter matching, conflating the two into an ad hoc single mechanism.
- Ignoring facet count cost, assuming filter counts are free to compute at query time at this scale.
- Hiding out-of-stock items entirely instead of handling the stated requirement to rank them lower but still show them.
