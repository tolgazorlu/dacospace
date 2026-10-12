---
id: ai-legal-regulated-rag-citations
title: Design a legal RAG assistant with trustworthy citations
level: senior
topics: [ai, knowledge, rag, citations, regulated]
minutes: 45
---

## Prompt

A law firm wants an internal research assistant, grounded in a RAG pipeline over case law, that answers questions with citations. Early testing shows it sometimes cites a real, retrievable case that does not actually support the specific legal proposition the assistant attributes to it. Design a system that avoids shipping that failure to a filing or a client.

## Clarifications

- **Corpus?** Case law plus internal memos, continuously updated as new rulings and superseding guidance arrive.
- **Current check?** "Is the citation a real, retrievable document," which passes even when the cited passage doesn't support the claim.
- **Use case severity?** Output may end up quoted in a court filing or sent directly to a client; there is no tolerance for an unverified claim reaching either.
- **Staleness risk?** Some guidance gets superseded; old and new versions sometimes sit in the corpus simultaneously without clear dating.
- **Review process wanted?** A human lawyer reviews output before anything external goes out, but the firm wants the assistant to pre-filter obviously wrong citations.
- **Volume?** ~400 research queries/week across the firm.

## Follow-ups

- How would you build an automated check for citation-claim entailment, does the retrieved passage actually support the claim, not just citation existence?
- What's your SLA for human review before any output reaches a filing, and what changes if that SLA is violated under deadline pressure?
- The corpus contains both a superseded guideline and its replacement, with no date metadata distinguishing them. How does retrieval behave, and how should it?
- How do you measure citation-claim accuracy in production without ground-truth labels for every query?

## Rubric

- Separates citation existence (the case is real and retrievable) from citation support (the retrieved passage actually entails the claim attributed to it), and builds a check for the latter specifically.
- Treats retrieval grounding as necessary but not sufficient for correctness; does not claim RAG prevents hallucination because an answer is grounded in some retrieved passage.
- Designs a human verification gate before any output reaches a client or filing, with a clear SLA and an explicit decision about what happens if that SLA can't be met.
- Addresses staleness as a distinct failure class from hallucination: adds effective-date/versioning metadata and a policy for conflicting superseded-vs-current sources in the index.
- Proposes a production measurement approach for citation-claim accuracy that doesn't require ground-truth labels on every query (sampled review, claim-decomposition checks).
- Names what should happen when no retrieved passage actually supports a claim: refuse or flag rather than generate confidently.
- Covers how a document update (a new ruling supersedes old guidance) propagates into the index and retrieval ranking.

## Pitfalls

- "RAG prevents hallucination because every answer is grounded in a real document," treating retrieval grounding as sufficient without checking entailment.
- Treating a stale-but-real cited document as a grounding success because the check never looks at the document's date or supersession status.
- No automated or sampled check for citation-claim support at all; relying entirely on manual review to catch it.
- No distinction between discoverability of a document and whether a specific claim attributed to it is actually true.
