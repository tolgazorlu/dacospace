# Lesson 15 · RAG and its failure points

**Reading time:** 19 min · **Module:** Knowledge · **Concepts:** retrieval-augmented generation, the seven failure points, retrieval metrics
**Cases:** nyc-mycity-chatbot, stanford-legal-rag-hallucinations

## The problem

In October 2023, New York City's Office of Technology and Innovation launched the MyCity Business
Assistant, an Azure-based chatbot meant to help small business owners navigate city regulations.
In March 2024, The Markup's investigation found it telling business owners that landlords are not
required to accept Section 8 housing vouchers (false, and illegal discrimination under NYC law),
that a restaurant could go fully cashless (false, a 2020 city council law requires accepting
cash), and that employers could keep a cut of worker tips (false, illegal under federal law). Ten
separate staff askers got the same wrong answer on the voucher question. The city's response after
being shown the errors was to add a disclaimer and keep the bot running. A follow-up test found the
bot was unaware of its own new disclaimer. ([The Markup](https://themarkup.org/artificial-intelligence/2024/03/29/nycs-ai-chatbot-tells-businesses-to-break-the-law),
[THE CITY follow-up](https://thecity.nyc/2024/04/02/malfunctioning-nyc-ai-chatbot-still-active-false-information))

The bot was grounded in city informational pages. It had retrieval. It still confidently told
people to break the law, consistently, across many independent askers. That consistency is the
detail worth sitting with: this was not a one-off hallucination that a retry would fix. Something
in the pipeline was reliably wrong.

## Why it is hard

A backend engineer's instinct, trained on databases and search indexes, is: "if the right document
is in the index, the system will find it, and if it finds it, the answer will be right." RAG
(retrieval-augmented generation: retrieve relevant documents for a query, then generate an answer
conditioned on them) looks like a join between a search engine and a text generator. It is not one
failure surface, it is at least two, and they fail independently.

Retrieval can succeed while generation fails: the right chunk is in the context window, and the
model still ignores it, misreads it, or pads it with a plausible-sounding elaboration that is not
actually supported by the retrieved text. Generation can look fine while retrieval failed
silently: the model produces a fluent, confident answer from the wrong chunk, or from no chunk that
actually answers the question, and nothing in the output signals that anything went wrong.
Fluency and correctness are uncorrelated in exactly the cases that matter.

The deeper problem for a good engineer's instincts: a RAG system cannot be fully validated before
users hit it with real queries, and its robustness does not get "finished" at launch, it evolves
over the system's life as the corpus, the query distribution, and the model all change underneath
it. This is a direct finding from the first systematic empirical study of RAG failures, built from
three production case studies (Barnett, Kurniawan, Thudumu, Brannelly, Abdelrazek, Deakin
University). Their conclusion: validation is only feasible in operation.
([arXiv:2401.05856](https://arxiv.org/html/2401.05856v1)) That argues against treating a RAG launch
like shipping a REST endpoint with a test suite and calling it done. It argues for continuous
evaluation infrastructure as a day-one requirement, not an afterthought.

## The idea: seven failure points, two stages

The Barnett et al. taxonomy maps failures to the stage of the pipeline where they originate.

**Indexing-time failures** happen before any query is ever asked.

- *Missing content.* The corpus simply has no document that answers the question. The system
  either fabricates an answer from the model's general training (a generic, often wrong, legal or
  policy-sounding statement) or, if well designed, says it does not know. MyCity's wrong answers on
  housing and tipping law look consistent with this: generic, plausible legal language standing in
  for a specific regulation the corpus did not clearly carry or the retriever did not surface.

**Retrieval-time failures** happen between the query and the context window.

- *Missed top-k.* The correct chunk exists in the index but does not rank highly enough to make
  it into the retrieved set.
- *Not in context (consolidation failure).* The correct chunk is retrieved, but gets lost, trimmed,
  or outranked during assembly of the final context sent to the model, so it never actually reaches
  the generation step.

**Generation-time failures** happen after the model has the retrieved context in hand.

- *Wrong format.* The model ignores an explicit format instruction (a required citation style, a
  JSON schema, a required disclaimer).
- *Wrong specificity.* The answer is too general (a vague summary when the question needed an exact
  number or date) or too specific (fabricated precision not actually supported by the source).
- *Incomplete.* The information needed was present in the retrieved context, but the model's answer
  only covers part of it, often because the question itself combined several sub-questions.

A second, independent axis cuts across all seven: retrieval quality and generation quality are
different things to measure, and measuring one tells you almost nothing about the other. The RAGAS
framework (Es, James, Espinosa-Anke, Schockaert, EACL 2024) formalizes this split with reference-free,
LLM-judged metrics that can run continuously without hand-labeled gold answers:

| Metric | Stage | Question it answers |
|---|---|---|
| Recall@k | Retrieval | Did the known-relevant chunk appear in the top k results? |
| nDCG | Retrieval | Were relevant results also ranked correctly, not just included? |
| Context Relevance / Precision | Retrieval | Did the retrieved context contain only what was needed? |
| Faithfulness | Generation | Is every claim in the answer inferable from the retrieved context? |
| Answer Relevance | Generation | Does the answer address the question asked, independent of correctness? |

On RAGAS's own human-alignment test (WikiEval), faithfulness scoring matched human judgment 95% of
the time, versus 72% for a naive GPT-score baseline.
([arXiv:2309.15217](https://arxiv.org/html/2309.15217v1)) That gap is why "did it cite a real-looking
source" is not a substitute for a faithfulness check: a confident, well-formatted answer passes the
naive check and fails the real one.

The scale of the residual problem, even in domains built specifically to solve it, is sobering.
Stanford RegLab and HAI built a preregistered benchmark of 200+ legal queries and tested commercial
RAG-based legal research tools (LexisNexis's Lexis+ AI, Thomson Reuters's Ask Practical Law AI and
Westlaw AI-Assisted Research), all marketed as grounded in verified legal databases and some
explicitly claiming to be "hallucination-free." Each tool hallucinated between 17% and 33% of the
time; Westlaw's AI-Assisted Research hallucinated around 34%, and the best performer (Lexis+ AI)
answered only about 65% of queries fully correctly.
([arXiv:2405.20362](https://arxiv.org/html/2405.20362v1),
[Stanford HAI summary](https://hai.stanford.edu/news/ai-trial-legal-models-hallucinate-1-out-6-queries))
That is far better than a general-purpose chatbot answering legal questions with no retrieval at
all (58-82% hallucination rate in the same research group's earlier study), but it is not zero, and
it is not what "hallucination-free" marketing promised.

The paper names a subtler failure the authors call **improper grounding**: the tool cites a real,
retrievable document, but that document does not actually support the specific claim attributed to
it. A check that only verifies "does this citation resolve to a real document" will pass this case.
Only a claim-level entailment check (does the cited passage actually say what the answer claims it
says) catches it. This is exactly the gap Faithfulness is designed to close, and exactly the gap a
URL-validity check is not.

## In practice at Northwind

Desk, Northwind Supply's assistant, answers dealer questions from price lists, return policy, and
contracts. Before treating any version of Desk's RAG pipeline as launch-ready:

1. Build a labeled eval set that exercises each of the seven failure points separately, not one
   generic "ask it questions and eyeball the answers" pass. Include at least a few questions the
   corpus genuinely cannot answer (to test the missing-content path produces an honest "I don't
   know" rather than a fabricated policy).
2. Measure retrieval and generation as two separate scores on every eval run: Recall@k on retrieval,
   Faithfulness and Answer Relevance on generation. A regression in one without the other tells you
   exactly which half of the pipeline to debug.
3. Treat the launch eval set as a floor, not a ceiling. Barnett et al.'s core warning is that
   production traffic will surface failure modes the pre-launch set never anticipated; wire up
   ongoing sampling of real Desk queries into the same Faithfulness check running continuously, not
   just at ship time.
4. For any answer touching return policy, refund eligibility, or contract terms, specifically test
   the wrong-specificity failure mode: does Desk ever state a dollar figure, date, or percentage
   that is not literally present in the retrieved price list or contract clause?

## What strong engineers know

- A RAG system with perfect retrieval and a model that hallucinates on top of it will still fail;
  retrieval quality is necessary, not sufficient, and the two must be scored independently.
- "It cited a source" is not the same claim as "the source supports this specific statement."
  Improper grounding passes a URL check and fails a claim-level entailment check.
- A RAG launch that passes a fixed pre-launch test suite has not been validated, only sampled.
  Barnett et al.'s own framing: validation is feasible only in operation.
- Consistent wrong answers across many independent askers (as with MyCity) are a stronger signal
  of a systemic pipeline defect than a single bad answer is; treat reproducibility as a severity
  multiplier, not noise.
- "Hallucination-free" is not a falsifiable claim unless the vendor publishes their own evaluation
  methodology. Demand the methodology, not the adjective, before trusting a third-party RAG tool.
- Missing-content failures and retrieval-ranking failures look identical from the outside (the
  answer is wrong) but need opposite fixes: adding documents to the corpus versus tuning or
  reranking the retriever. Diagnose before you patch.
- A disclaimer ("answers may be inaccurate") is not a substitute for correctness in a high-stakes
  domain. NYC added one and the underlying failure mode kept producing the same wrong answers.

## Decide

Northwind is about to launch Desk for dealer-facing questions, including questions about return
eligibility windows that vary by product category and sometimes by dealer contract tier. You have
budget to build exactly one piece of evaluation infrastructure before launch: either (a) a
claim-level Faithfulness checker that flags any answer containing a specific number, date, or
eligibility rule not literally present in the retrieved context, or (b) a Recall@k monitor that
alerts when the correct return-policy chunk fails to appear in the top 5 retrieved results for a
sampled set of real dealer questions. You cannot build both before launch. Which do you build
first, and what failure mode are you explicitly accepting the risk of in the meantime?

## One sentence summary

> RAG failures split into at least seven distinct points across indexing, retrieval and generation,
> and because a system can retrieve perfectly while hallucinating (or retrieve badly while sounding
> confident), retrieval quality and generation quality must be measured as two separate, ongoing
> scores, not inferred from how fluent the final answer sounds.

## Check question

Northwind's support team reports that Desk gave three different dealers three different,
mutually-inconsistent answers to "what is the restocking fee for a returned pallet of fasteners,"
all delivered with full confidence and no hedging. Using the taxonomy in this lesson, name the two
most likely distinct root causes behind this symptom, and describe one diagnostic you would run to
tell them apart before deciding on a fix.

## Sources

- [Seven Failure Points When Engineering a Retrieval Augmented Generation System](https://arxiv.org/html/2401.05856v1) · Barnett et al., Deakin Univ. · Jan 2024 · the failure-point taxonomy this lesson is built on.
- [RAGAS: Automated Evaluation of Retrieval Augmented Generation](https://arxiv.org/html/2309.15217v1) · Es, James, Espinosa-Anke, Schockaert · 2023/EACL 2024 · Faithfulness, Answer Relevance, Context Relevance definitions and the WikiEval alignment numbers.
- [Hallucination-Free? Assessing the Reliability of Leading AI Legal Research Tools](https://arxiv.org/html/2405.20362v1) · Magesh, Surani, Dahl, Suzgun, Manning, Ho (Stanford RegLab/HAI, Yale) · 2024 · the 17-34% legal RAG hallucination rates and the "improper grounding" failure mode.
- [AI on Trial: Legal Models Hallucinate in 1 out of 6 (or More) Benchmarking Queries](https://hai.stanford.edu/news/ai-trial-legal-models-hallucinate-1-out-6-queries) · Stanford HAI · 2024 · plain-language summary of the above.
- [NYC's AI Chatbot Tells Businesses To Break The Law](https://themarkup.org/artificial-intelligence/2024/03/29/nycs-ai-chatbot-tells-businesses-to-break-the-law) · The Markup · Mar 2024 · the MyCity incident, primary investigation.
- [Malfunctioning NYC AI Chatbot Still Active Despite Widespread Evidence It's Encouraging Illegal Behavior](https://thecity.nyc/2024/04/02/malfunctioning-nyc-ai-chatbot-still-active-false-information) · THE CITY · Apr 2024 · the disclaimer-did-not-help follow-up.
