# Lesson 16 · Better retrieval

**Reading time:** 19 min · **Module:** Knowledge · **Concepts:** hybrid search, reranking, chunking, contextual retrieval
**Cases:** stanford-legal-rag-hallucinations

## The problem

Say Northwind Supply's dealer-support team builds Desk's first retrieval pipeline the way most RAG
tutorials show it: split documents into fixed 512-token chunks, embed them with an off-the-shelf
model, store them in a vector database, and retrieve the top-5 nearest neighbors by cosine
similarity for every query. It works, more or less, on general questions like "what is your return
policy." It falls over on specific ones: a dealer asks about "error code TS-451" on a shipment, and
the retriever returns chunks about shipment tracking in general, missing the one paragraph that
actually defines TS-451, because an embedding model treats a rare alphanumeric code as noise rather
than the single most important token in the query.

This is not a bug in the embedding model. It is a predictable property of how dense retrieval
works, and it is one of several default choices in a naive RAG pipeline that quietly caps how good
the system can ever be, independent of how good the underlying language model is. The same
pattern of "the tool is marketed as solved, the controlled study finds a real gap" shows up at the
far end of the pipeline too: Stanford RegLab's study of commercial legal RAG tools found 17-34%
hallucination rates even in systems built specifically to ground every answer in retrieved case
law. ([arXiv:2405.20362](https://arxiv.org/html/2405.20362v1)) Some of that residual error traces
back to retrieval quality itself, not just generation. Better retrieval does not make hallucination
impossible, but it closes a large and measurable share of the gap.

## Why it is hard

A backend engineer who has built full-text search before has real, useful intuition here, and that
intuition is also where the traps are. Lexical search (BM25: TF-IDF-based ranking with saturation
and length normalization) is familiar, and the instinct "this is just Elasticsearch with extra
steps" is half right. The missing half is that dense embeddings and lexical search fail on
*opposite* query types, and most engineers pick one without realizing they have silently excluded
the other's strengths. Dense embeddings generalize across paraphrase and synonym ("fee" vs
"charge") but blur or ignore exact rare tokens (SKUs, error codes, docket numbers, people's names in
some models). BM25 nails exact matches but has no notion of meaning: a synonym or a differently
worded question gets no credit at all. Neither is strictly better; they are complementary, and that
means a production system that only runs one is leaving a known, specific class of query to fail
by design, not by accident.

Chunking has the same trap: it looks like a single config parameter (chunk size), and it is
actually a different optimum for every workload. A chunk-size study sweeping 64 to 1024 tokens
across four datasets found opposite optima depending on answer density: SQuAD (short, fact-based
answers) peaked at 64 tokens (64.1% Recall@1) and *lost* 10-15% recall by 512 tokens because larger
chunks add noise around the one sentence that mattered; TechQA (long, explanation-heavy technical
answers) went the other way, rising from 4.8% Recall@1 at 64 tokens to 71.5% at 1024 tokens, because
the answer itself needed the surrounding context to be coherent.
([arXiv:2505.21700](https://arxiv.org/html/2505.21700v1)) There is no single "best" chunk size to
copy from a tutorial; the right value depends on how your specific documents carry answers.

## The idea: four levers that compound

### Hybrid search: BM25 plus embeddings, fused by rank

Run a lexical (BM25) index and a dense embedding index in parallel over the same corpus, retrieve
candidates from each, and fuse the two ranked lists, typically with Reciprocal Rank Fusion (RRF),
which combines results based on each item's *rank position* in each list rather than its raw score.
This matters because BM25 scores are unbounded and embedding cosine similarities are bounded
between -1 and 1; comparing the raw numbers directly is comparing incompatible scales, and RRF
sidesteps that entirely. The combination consistently beats either retriever alone.
([Anthropic, Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval))

**Trade-off:** roughly doubles indexing and query infrastructure (two indexes, one fusion step).
The size of the win is domain-dependent: larger where queries contain exact identifiers (legal
citations, product SKUs, error codes), smaller on purely semantic, conversational query sets where
nothing unique needs an exact lexical match.

### Reranking: a second, more expensive pass over fewer candidates

A cross-encoder reranker jointly encodes the query and each candidate chunk together (rather than
independently, as a bi-encoder embedding model does when it embeds documents once, ahead of time,
and queries separately at request time). Joint encoding produces a materially more accurate
relevance score, but it is too slow to run over an entire corpus, which is why reranking is always
a second stage applied to a small set of candidates (typically the top 20-150) already surfaced by
a cheaper first-stage retriever.

Anthropic's own measurement, stacking techniques on top of each other and comparing each
combination's top-20-chunk retrieval failure rate against a 5.7% baseline:

| Pipeline | Top-20 retrieval failure rate | Reduction vs. baseline |
|---|---|---|
| Baseline (embeddings only) | 5.7% |, |
| + Contextual Embeddings | 3.7% | 35% |
| + Contextual Embeddings + Contextual BM25 | 2.9% | 49% |
| + reranking (Cohere) | 1.9% | 67% |

([Anthropic, Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval))

**Trade-off:** every candidate chunk gets scored at request time, adding real latency and
per-query cost. Reranking buys the single largest incremental improvement in this stack, but it is
also the step you feel on every request, not just at indexing time.

### Chunking strategy: match the split to how answers live in the documents

Beyond chunk size, *how* a document is split matters as much as how big the pieces are. A
large-scale benchmark of 36 chunking methods across six domains found content-aware,
structure-aware chunking (splitting along paragraph or section boundaries rather than a blind
character count) substantially outperforms naive fixed-size chunking: paragraph-group chunking
scored nDCG@5 ≈ 0.459 against under 0.244 for naive fixed-size splitting, and the paper's key
finding is that chunking method and embedding model quality provide *complementary*, not
substitutable, gains, meaning a better embedding model does not rescue a bad chunking strategy.
([arXiv:2603.06976](https://arxiv.org/abs/2603.06976))

**Trade-off:** smaller, more structure-aware chunks mean more chunks per document, which raises
index size, preprocessing cost, and query-time latency over a larger candidate set.

### Contextual Retrieval: give every chunk back the context it lost

Standard chunking strips the surrounding context a reader (or a retriever) would need to know
which "the company" or "that quarter" a sentence is talking about. Contextual Retrieval
(Anthropic) has an LLM generate a short (50-100 token) explanatory blurb for each chunk before it
is embedded and before it enters the BM25 index, so the chunk itself now carries the context it
previously depended on surrounding text to supply. Because this runs once at indexing time with
prompt caching, Anthropic's own figures put the one-time cost at $1.02 per million document tokens
(assuming 800-token chunks from 8k-token source documents).
([Anthropic, Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval))

**Trade-off:** requires re-indexing (and re-generating every chunk's contextual blurb) whenever
chunking boundaries or strategy change; Anthropic found the size of the gain depends on which
embedding model you are using (Gemini and Voyage embeddings benefited most in their own testing).

### How the four levers stack

The table above already shows the point: these are not competing options, they compound. Hybrid
search and contextual retrieval both improve what makes it into the candidate set; reranking
improves what survives from that set into the final context; chunking strategy determines how much
signal each individual candidate even carries in the first place. Skipping any one of them leaves
a specific, identifiable class of query failure on the table.

## In practice at Northwind

Desk's corpus mixes very different document shapes: short, exact-identifier content (SKUs, order
numbers, error codes) and long, explanation-heavy content (contract terms, return policy
rationale). Build it in this order:

1. Separate the corpus by content shape before picking a single chunking strategy. SKU and
   error-code reference material should use short, exact-boundary chunks (closer to the SQuAD end
   of the chunk-size study); contract and policy text should use larger, structure-aware chunks
   that keep a clause intact.
2. Add a BM25 index alongside the embedding index from day one, specifically because dealer
   questions routinely contain exact order numbers and SKUs that an embedding model will treat as
   noise. Fuse with RRF.
3. Add reranking only after measuring whether hybrid search alone clears your retrieval eval bar;
   it is the most expensive lever per query, so spend it last and verify it is worth its latency
   for Desk's actual traffic.
4. Treat Contextual Retrieval as a preprocessing investment to revisit once the corpus and chunking
   strategy stabilize, since it has to be regenerated on any chunking change.

## What strong engineers know

- Dense embeddings and BM25 fail on opposite query types; running only one is a design decision to
  fail a known class of query, not an oversight you discover later.
- There is no universal best chunk size. The right size depends on whether your documents answer
  questions in one sentence or one paragraph, and that is a property of your content, not a
  constant to copy from a blog post.
- Reranking gives the largest single improvement in Anthropic's own stacked measurement (67% vs.
  49% without it), but it is also the lever with the most per-query cost; sequence it last in a
  build, not first.
- A better embedding model does not substitute for better chunking. The 36-method chunking study
  found the two gains are complementary, meaning teams chasing a model upgrade while shipping naive
  fixed-size chunks are leaving a separate, independent gain unclaimed.
- RRF combines ranked lists by position specifically because BM25 and cosine-similarity scores
  live on incompatible scales; fusing raw scores directly is a silent correctness bug, not a
  simplification.
- Contextual Retrieval is a preprocessing-time fix with a real re-indexing cost on every chunking
  change; it is not free to iterate on the way a prompt change is.
- Even the best-engineered retrieval stack in a regulated domain (legal RAG tools, built
  specifically around grounding) still shows a real residual hallucination rate; better retrieval
  narrows the gap, it does not close it to zero, which is why generation-side faithfulness checks
  (Lesson 15) remain necessary even after every retrieval lever here is pulled.

## Decide

Desk's retrieval eval shows two separate problems: Recall@5 is weak (62%) for questions containing
an exact order number or SKU, and Faithfulness is weak (71%) for questions about contract terms
with long, nuanced eligibility language. You have one sprint before the next review. Option A:
add a BM25 index and RRF fusion, targeting the SKU/order-number failures directly. Option B: add a
reranking stage over the existing embeddings-only retriever, which should help both query types
somewhat but not as sharply as a targeted fix. Option C: rework chunking for the contract corpus to
use structure-aware, section-boundary splitting. Pick one for this sprint, and state which of the
two measured problems you are deliberately leaving unresolved until next sprint.

## One sentence summary

> Hybrid search, reranking, chunking strategy and contextual retrieval each close a specific,
> measurable gap in retrieval quality, they compound rather than compete, and none of them is a
> universal default you can copy without checking it against your own corpus's query and content
> shape.

## Check question

Northwind adds a new product line with highly technical, multi-page installation manuals, and
dealer questions about them start coming back with Recall@5 under 30%, far worse than the rest of
the corpus. Using what you know about chunk size and content shape from this lesson, what is the
single most likely configuration mistake to check first, and what experiment would confirm it?

## Sources

- [Introducing Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval) · Anthropic Engineering · Sep 2024 · the stacked retrieval failure-rate numbers, RRF rationale, and the $1.02/M token contextual retrieval cost.
- [Rethinking Chunk Size for Long-Document Retrieval: A Multi-Dataset Analysis](https://arxiv.org/html/2505.21700v1) · arXiv preprint · May 2025 · the chunk-size sweep across SQuAD, TechQA, COVID-QA, NewsQA.
- [A Systematic Investigation of Document Chunking Strategies and Embedding Sensitivity](https://arxiv.org/abs/2603.06976) · Shaukat, Adnan, Kuhn · 2026 preprint · the 36-method chunking taxonomy and the complementary-gains finding.
- [Hallucination-Free? Assessing the Reliability of Leading AI Legal Research Tools](https://arxiv.org/html/2405.20362v1) · Magesh et al. (Stanford RegLab/HAI, Yale) · 2024 · residual hallucination even in retrieval-grounded commercial tools.
