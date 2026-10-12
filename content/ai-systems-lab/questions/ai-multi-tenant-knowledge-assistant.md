---
id: ai-multi-tenant-knowledge-assistant
title: Design a multi-tenant enterprise knowledge assistant
level: senior
topics: [ai, knowledge, rag, multi-tenancy, hybrid-search]
minutes: 45
---

## Prompt

Your company sells a knowledge assistant to enterprise customers: each customer, a tenant, uploads its own documents, and the assistant answers questions by retrieving from that tenant's corpus only, including exact lookups like SKU numbers and ticket IDs. Design the retrieval architecture and the tenant isolation guarantees.

## Clarifications

- **Scale?** 200 enterprise tenants, corpora ranging from 500 to 500,000 documents each, shared infrastructure across tenants for cost reasons.
- **Query types?** A mix of free-text troubleshooting questions and exact-identifier lookups (SKU, error code, ticket number) that must match precisely.
- **Isolation requirement?** Zero cross-tenant document leakage, even under a misconfiguration, is a contractual requirement with financial penalties.
- **Current architecture under review?** A single shared vector index with a `tenant_id` metadata field, filtered after similarity search.
- **Observed problem?** Exact-identifier queries ("error code TS-999") sometimes retrieve topically related but wrong chunks, because the embedding model treats the identifier as noise.
- **Cost constraint?** Per-tenant dedicated infrastructure is too expensive at this scale; some sharing is required.

## Follow-ups

- A new engineer suggests filtering by `tenant_id` after the similarity search runs, to simplify the query path. What's wrong with that compared to filtering before ranking?
- How would you test, with confidence, that cross-tenant leakage is actually zero rather than just "not observed yet"?
- One large tenant's corpus grows to 2M documents while most tenants stay under 10,000. Does your shared-infrastructure design still hold, or does this tenant need to be split out?
- A tenant asks for a corpus-wide synthesis answer, "what are our three most common failure causes across all our incident reports," that no single retrieved chunk set can answer. What changes?

## Rubric

- Filters by `tenant_id` as a hard pre-filter on the retrieval query itself, before similarity ranking, not as a post-hoc filter on results, closing the class of leakage where a wrong-tenant chunk ranks highly enough to appear before filtering.
- Adds a hybrid search component (lexical/BM25-style matching alongside embeddings) specifically for exact-identifier queries, since embeddings alone miss them.
- Builds an explicit, repeatable test suite that queries as every tenant and asserts zero cross-tenant document IDs appear in any result set, rather than relying on manual spot checks.
- Addresses the shared-infrastructure cost trade-off directly: what's shared (compute, index infrastructure) versus what must be strictly isolated (tenant data, query results), and where the line is drawn.
- Has a plan for a tenant whose corpus size breaks the shared-infrastructure assumption, needing dedicated resources or a different sharding strategy.
- Covers reranking's cost/latency trade-off versus relying on hybrid search's fused ranking alone.
- Names what changes for corpus-wide synthesis queries that flat chunk retrieval structurally cannot answer, regardless of tenant.

## Pitfalls

- Filtering by tenant after similarity search runs, so a wrong-tenant document can rank in the raw top-k even if it's filtered before being shown, leaving the design fragile to any bug in the filtering step.
- Embeddings-only retrieval for a workload that includes exact-identifier queries.
- "The vector database handles multi-tenancy automatically" without an explicit, tested isolation boundary.
- No automated cross-tenant leakage test; treating "we haven't seen a leak" as evidence of isolation.
