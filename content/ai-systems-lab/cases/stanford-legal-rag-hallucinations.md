# Case · Stanford study of legal AI research tools (2024)

**Category:** Knowledge · **Lessons:** 15, 18 · **Severity:** 17-34% hallucination rate in commercial tools marketed as "hallucination-free"

## The system

LexisNexis's Lexis+ AI and Thomson Reuters's Westlaw AI-Assisted Research / Ask Practical Law AI are commercial legal research products, both marketed as RAG-based and both marketed as reducing or eliminating hallucination compared to a plain chatbot. Researchers at Stanford RegLab/HAI and Yale built a preregistered benchmark of 200+ legal queries to test that claim.

## What was observed

All three RAG-based tools produced incorrect or unsupported answers on a meaningful share of queries, despite the marketing claims.

## Stop and think

1. A legal RAG tool cites a real, retrievable case for its answer. Is that sufficient evidence the answer is correct? What else would you need to check?
2. "Hallucination-free" is a specific, falsifiable claim. What would a vendor need to publish for an outside party to actually verify it?
3. If RAG tools still hallucinate 17-34% of the time, what does that imply about where RAG sits on the spectrum between "solves hallucination" and "does nothing"?

## What actually happened

The study found all three tools "hallucinate between 17% and 33% of the time", with Westlaw's AI-Assisted Research around 34% and Lexis+ AI the most accurate, answering about 65% of queries fully correctly. For comparison, the same research group's earlier study found general-purpose chatbots (GPT-4, no retrieval) hallucinate 58-82% of the time on legal queries. ([arXiv paper](https://arxiv.org/html/2405.20362v1); [Stanford HAI summary](https://hai.stanford.edu/news/ai-trial-legal-models-hallucinate-1-out-6-queries))

The paper documents a subtler failure mode beyond outright fabrication: "improper grounding", where the tool cites a real, retrievable document, but that document does not actually support the specific claim it is cited for. A naive check of "did it link to a real source" misses this entirely, because the citation resolves. Legal retrieval is intrinsically hard: finding the single best authority among many superficially similar cases, and correctly handling overruled or jurisdiction-specific law, both of which are exactly the places a retriever can surface a real but wrong-for-this-claim document.

## Root causes

**Technical:** retrieval grounding reduces but does not structurally eliminate hallucination; a retriever can return a real document that fails to support the claim attributed to it, and nothing downstream checks claim-level entailment against the retrieved source.

**Organizational:** vendors marketed these tools as "hallucination-free" without a transparent, third-party-auditable benchmark backing the claim, and without a precise definition of "hallucination" the claim could be held to.

## What would have prevented it

- **Claim-level entailment checking**, verifying that the specific assertion made actually follows from the retrieved passage, not just that the citation resolves to a real document. This is more expensive than a simple "citation exists" check but is the only thing that catches improper grounding.
- **Transparent, third-party-auditable benchmarking** before marketing claims of "hallucination-free" are made, with a precise, falsifiable definition of hallucination the claim can be tested against.
- **Human review of any legal citation before it reaches a filing or a paying customer's reliance decision**, treating RAG as a meaningful reduction in risk, not an elimination of it.

## The lesson for your system

- RAG reduces but does not eliminate hallucination; a correct-looking citation is not proof of a correct claim.
- Verify that the cited passage actually supports the specific assertion made, not just that the citation resolves to a real, retrievable document; a system can pass a naive citation check and still be wrong.
- Treat any vendor's "hallucination-free" or similarly absolute claim as unverifiable marketing language unless backed by a transparent, third-party-auditable benchmark with a precise definition of the term.
- If your domain is regulated or high-stakes, budget for a human review step on any AI-generated citation before it is relied upon, regardless of how good the retrieval system is.

## Sources

- [Hallucination-Free? Assessing the Reliability of Leading AI Legal Research Tools](https://arxiv.org/html/2405.20362v1) · Magesh, Surani, Dahl, Suzgun, Manning, Ho (Stanford RegLab/HAI, Yale) · 2024 preprint, JELS 2025
- [AI on Trial: Legal Models Hallucinate in 1 out of 6 (or More) Benchmarking Queries](https://hai.stanford.edu/news/ai-trial-legal-models-hallucinate-1-out-6-queries) · Stanford HAI · 2024
