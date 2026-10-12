---
id: ai-permission-aware-enterprise-search
title: Design permission-aware search over enterprise documents
level: senior
topics: [ai, knowledge, rag, permissions, security]
minutes: 45
---

## Prompt

A 3,000-employee insurance company wants an internal chatbot that answers policy and underwriting questions by retrieving from 40,000 internal documents, PDFs, wikis, and chat exports, with mixed and inconsistent folder-level permissions. The CISO is worried about an oversharing incident. Design the retrieval and permission system.

## Clarifications

- **Document access today?** ACLs exist in the source systems but are inconsistent; some folders were shared broadly "temporarily" years ago and never revoked.
- **Scale?** 3,000 employees, 40,000 documents, growing by ~500 documents/week.
- **Freshness requirement?** A user's access change (role change, offboarding) must be reflected in what the chatbot can retrieve within the same business day.
- **Current plan under review?** Index everything once, filter results by the requesting user's role at query time using a role field stored in the vector database.
- **Audit requirement?** Security wants to review, after the fact, exactly what any given query actually surfaced to the user.
- **Launch pressure?** Business wants to launch to all employees in 6 weeks.

## Follow-ups

- A user's access to a department's folder is revoked mid-session (role change). What happens to a chat session that's already open?
- Several documents have missing or conflicting ACL metadata from the source system. How does your system behave by default for those: expose or withhold?
- How would you detect an oversharing incident after the fact, given that queries and answers may differ from what a human would notice by eye?
- Six weeks before launch, a pre-launch audit finds that 12% of documents are discoverable by users who shouldn't have access per the source system's own ACLs. What do you do: delay, fix, or filter and ship?

## Rubric

- Filters retrieval against live ACLs at query time, not a stale snapshot baked into the index at build time.
- Distinguishes restricting discoverability (fast, reversible: hide from retrieval) from fixing underlying permissions (slower, structurally correct: fix the source ACL), and sequences them appropriately before launch.
- Runs a pre-launch permission audit that separates "user has access" from "content should be discoverable by that user," rather than assuming source-system ACLs are already correct.
- Defines a safe default for documents with missing or conflicting ACL metadata, deny-by-default, not expose-by-default.
- Designs logging of what each query actually surfaced, per user, so an oversharing incident can be investigated and scoped after the fact.
- Handles access revocation that happens mid-session, not just at the start of a new session.
- Names the trade-off: real-time ACL checks on every retrieval add latency and complexity versus caching permissions, which risks serving stale access.

## Pitfalls

- "Just filter by role" as the entire design, without addressing permission data quality or real-time revocation.
- Assuming the vector database "handles permissions automatically" without an explicit, testable filtering step.
- Treating a one-time pre-launch ACL audit as sufficient with no ongoing recheck as documents and roles change.
- No plan for detecting an oversharing incident after launch; relying on someone noticing and complaining.
