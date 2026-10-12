# Lesson 19 · Cost and latency

**Reading time:** 18 min · **Module:** Production · **Concepts:** prompt caching, model routing and cascades, batch, semantic cache risks
**Cases:** klarna-ai-assistant

## The problem

In February 2024, Klarna announced that its OpenAI-powered customer service assistant had handled 2.3 million chats in its first month, about two-thirds of all support volume. The company framed this as "the equivalent work of 700 full-time agents" and estimated $40M/year in cost avoidance. It was, by the numbers reported, a cost-optimization success story.

Fifteen months later, in May 2025, CEO Sebastian Siemiatkowski told Bloomberg (as reported by Fortune) that "cost unfortunately seems to have been a too predominant evaluation factor when organizing this, what you end up having is lower quality." Klarna announced it was recruiting human agents again in a flexible, "Uber-type" setup so a customer could "always" reach a person. Headcount had fallen from 5,527 (Dec 2022) to 3,422 (Dec 2024), a drop the company attributes partly to AI-driven efficiency and partly to a hiring freeze and natural attrition. Reporting on exactly how many humans were rehired is inconsistent across outlets and should be treated as unverified beyond the CEO's own admission and stated recruitment intent.

You will be asked, at some point, to cut an LLM bill by some aggressive percentage. This lesson is about doing that without becoming the next version of this story.

## Why it is hard

Backend engineers already know how to reduce infrastructure cost: cache aggressively, batch what can wait, right-size the instance. LLM cost optimization reuses the same vocabulary, caching, batching, routing, but each lever has a failure mode that looks nothing like a classic infra bug.

Prompt caching fails silently. A cache hit is an exact byte match on a prefix; one timestamp, one reordered tool definition, one piece of per-request dynamic content inserted before the cache boundary, and your hit rate quietly drops to zero while every dashboard that only tracks latency and error rate looks fine.

Model routing and cascades trade cost for a new reliability risk: misrouting. Sending an easy query to a cheap model is a win. Sending a hard query to a cheap model that answers confidently and wrong is a loss that a cost dashboard will never show you, because the call still returned 200 OK at a lower price.

Semantic caching is the sharpest trap, because it looks exactly like a win on every metric that matters to a cost-focused review: hit rate up, latency down, spend down. The failure, a stale or wrong answer served to a "neighborhood" of similar-but-not-identical queries, is invisible to hit rate, latency, and error rate simultaneously, because none of those measure correctness.

And underneath all three sits the Klarna lesson: if the only number you are optimizing is cost or automation rate, you can ship a real quality regression and not find out until customers and the press find it for you.

## The idea: four levers, four different failure modes

### Prompt caching

Prompt caching reuses the model's precomputed key-value state for a repeated prompt prefix (system prompt, tool definitions, long context) so later requests skip recomputing it. Anthropic's default cache has a 5-minute TTL: a cache write costs 1.25x the base input price, a cache read (hit) costs 0.1x, a 90% discount on the cached portion. An optional 1-hour TTL costs 2x on write. Minimum cacheable prefix length ranges 512-4,096 tokens depending on model. The TTL clock starts at request time, not response time. OpenAI's caching is enabled by default: cache reads are discounted (OpenAI's guide states up to 90% off), writes for explicit breakpoints cost 1.25x, and minimum length/TTL vary by model generation (roughly 5-30+ minutes, up to 24 hours for some models).

The arithmetic: caching only pays off once a prefix is reused enough times within the TTL to amortize the write premium. On Anthropic's 5-minute tier, break-even arrives around the second cache hit. If your traffic for a given prefix is sparser than one request every five minutes, you are paying the 1.25x write premium repeatedly and never collecting the 0.1x read discount.

### Batch APIs

Batch processing trades latency for a flat discount: submit requests asynchronously (as JSONL) and get results back within a guaranteed window. OpenAI's Batch API gives a 50% discount on input and output tokens, a 24-hour completion window (often faster in practice), up to 50,000 requests or 200MB per file, with results retrievable for a limited period. There is no webhook; you poll. This only helps workloads that can tolerate delay: nightly classification, embedding refreshes, eval runs, bulk content moderation. It does nothing for a customer waiting on a chat response.

### LLM cascades and model routing

A cascade or router sends each query to the cheapest model expected to handle it, escalating to a stronger model only when a confidence or agreement signal is low. FrugalGPT (Chen, Zaharia, Zou, Stanford, 2023) demonstrated an LLM cascade that matched GPT-4-level accuracy with up to 98% cost reduction on some datasets (and improved accuracy by up to 4% at equal cost), learning which 3-model sequence and confidence thresholds to use per query, across 12 commercial APIs from 5 providers. RouteLLM (Ong et al., UC Berkeley/Anyscale, ICLR 2025) trains a router between a strong and a weak model from human-preference data, reporting over 2x cost reduction in some settings while preserving quality, and shows the learned router transfers across different strong/weak pairs at test time.

The catch both papers share: you need a labeled or preference dataset to train the router or cascade, and a misrouted hard query is a reliability failure of its own, one that needs separate monitoring from the cost dashboard.

### Semantic caching

Semantic caching keys a cached response by embedding similarity to a prior prompt, rather than exact match, so near-duplicate questions reuse an old answer instead of triggering new generation. The risk, sometimes called semantic cache poisoning: because a hit is a similarity judgment, not an identity match, one wrong or stale cached answer gets served to an entire neighborhood of semantically close-but-not-identical future queries ("cancel my subscription" sitting close in embedding space to "pause my subscription"). The failure is invisible on standard dashboards because hit rate, latency, and error rate all look healthy while the served answer is wrong.

A 2025/2026 paper on this problem (FreshCache) models cache reuse as a risk-constrained staleness-probability estimate rather than a binary similarity threshold, and reports that only about a third of hash-detected content changes actually change answer correctness, meaning naive TTL or hash-based invalidation over-invalidates relative to what actually matters for correctness.

| Lever | What it saves | What it risks | Where it helps |
|---|---|---|---|
| Prompt caching | Up to 90% on cached input tokens | Silent cache misses from unstable prefixes | Stable system prompts, tool defs, long shared context |
| Batch API | Flat 50% on input/output | No latency guarantee, async only | Bulk classification, eval runs, nightly jobs |
| Cascade/router | Up to 98% in some benchmarks, sometimes with an accuracy gain | Confident wrong answers from the weak model on hard queries | High query volume with a clear easy/hard split |
| Semantic cache | Skips generation entirely on a hit | Stale or wrong answers served to a whole neighborhood of queries | Low-stakes, slowly changing, non-personalized questions |

## In practice at Northwind

Desk, Northwind Supply's assistant, has two very different workloads: a latency-sensitive dealer chat and Slack interface, and a latency-tolerant batch job that classifies and tags incoming support emails overnight.

Start by separating the two. Move the overnight email classification to the Batch API: it does not need a response in under a second, and the 50% discount applies to the whole job. Do not put the live dealer chat anywhere near batch; a dealer waiting for an order status answer cannot wait 24 hours.

On the chat path, turn on prompt caching for the system prompt and the tool definitions, which are identical across most requests. Audit the prefix for anything dynamic, a request ID, a timestamp, a per-user greeting, and move it after the cache breakpoint, not before. Measure cache_read vs cache_creation token counts per call; if read tokens stay at zero past the second call to the same prefix, the cache is not hitting and something upstream is breaking byte-identity.

Introduce a cascade for the highest-volume, lowest-stakes query class: "where is my order," "what is my account balance," straightforward lookups against internal APIs. Route these to a cheaper model by default, and escalate to the stronger model when the query touches credits, refunds, or anything outside the lookup pattern the cheap model is tuned for. Before trusting this in production, build a small labeled eval set (20-30 queries, deliberately including hard ones) and measure accuracy, not just dollars, before and after the router ships.

Be cautious with semantic caching on anything derived from Northwind's price lists and return policy documents, which change. If you cache answers to policy questions by embedding similarity, scope the cache key to the document version or source digest, so a policy update invalidates the dependent cache entries rather than leaving a stale discount or return window live for days. Disable or heavily shorten the TTL for anything personalized (a specific dealer's order status should never be a semantic-cache hit for a different dealer's similar-sounding question).

Whatever cost target leadership sets, pair it with a quality metric before you start cutting: a sampled faithfulness or correctness check on the routed/cached path, tracked alongside spend. Klarna's lesson was not that automation is wrong, it is that an automation-rate or cost-avoidance number reported without a paired, tracked quality metric is a vanity metric that can mask a real customer-experience regression.

## What strong engineers know

- A cache hit rate of zero past the first call almost always means a byte-identity break in the prefix, not a configuration bug in the caching feature itself; check for timestamps, request IDs, and non-deterministic JSON ordering first.
- Caching only pays off once traffic density against the TTL window clears the write premium; a 5-minute TTL needs roughly a second hit within five minutes to break even on Anthropic's pricing.
- A router or cascade needs its own eval, separate from the cost dashboard, because a misrouted hard query is a silent accuracy loss that spend numbers cannot surface.
- Semantic cache correctness has to be checked by sampling actual answers for correctness, not by trusting hit rate; a poisoned cache looks perfectly healthy on every operational metric.
- Scope semantic cache keys to document version, source digest, or tenant wherever the correct answer depends on who is asking or what the underlying source currently says.
- Batch processing is for latency-tolerant workloads only; moving a user-facing path to batch for cost savings breaks the product.
- An automation-rate or cost-avoidance number without a tracked quality counter-metric (CSAT, complaint rate, escalation rate) is not evidence of success, it is a number that can hide the opposite.
- Real savings from vendor-documented discounts depend heavily on your actual traffic shape; the headline percentage in a pricing page is a ceiling, not a guarantee.

## Decide

Northwind's monthly LLM bill across Desk's chat interface and its overnight email classification pipeline is $75,000, and finance wants it down 40% without a measurable quality regression. You have: a chat path serving roughly 2,000 dealers with mixed easy/hard queries, and a batch classification job tagging all incoming support emails by category and urgency overnight. Options on the table:

1. Switch the entire chat path to a cheaper model outright, accepting whatever accuracy drop results, and re-evaluate after a month of complaints.
2. Add prompt caching to the chat path, move email classification to the Batch API, and leave model choice unchanged.
3. Build a cascade/router for the chat path (cheap model for routine lookups, escalate to a stronger model for anything involving credits or disputes) in addition to caching and batch.
4. Add semantic caching across both workloads with an aggressive similarity threshold to maximize cache hit rate and cost savings.

Pick one (or a combination) and justify it against the 40% target, the quality-regression constraint, and what you would measure in the first two weeks to know whether it is working.

## One sentence summary

> Cutting an LLM bill without a paired quality metric does not remove the cost, it just moves the failure from your budget to your customers.

## Check question

Desk's cascade now routes 70% of chat queries to a cheap model and 30% to a strong one, and the monthly bill has dropped as planned. Three weeks in, dealer complaints about wrong order totals have ticked up, but your dashboards (latency, error rate, cost) all look green. What would you build to find out whether the router is the cause, and what would you check first?

## Sources

- [Prompt caching | Claude docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) · Anthropic · live docs · cache mechanics, TTL tiers, write/read multipliers
- [Prompt caching | OpenAI API](https://platform.openai.com/docs/guides/prompt-caching) · OpenAI · live docs · cache discount mechanics
- [OpenAI Batch API docs](https://developers.openai.com/api/docs/guides/batch) · OpenAI · live docs · 50% discount, 24h window, rate-limit pool
- [FrugalGPT: How to Use Large Language Models While Reducing Cost and Improving Performance](https://arxiv.org/abs/2305.05176) · Chen, Zaharia, Zou (Stanford) · 2023 · founding cascade paper, up to 98% cost reduction
- [RouteLLM: Learning to Route LLMs with Preference Data](https://arxiv.org/abs/2406.18665) · Ong et al. (UC Berkeley/Anyscale), ICLR 2025 · learned router, >2x cost reduction
- [Risk-Constrained Freshness-Aware Semantic Caching for Open-Web Retrieval-Augmented LLMs](https://arxiv.org/html/2607.04281v1) · arXiv · 2025/2026 · semantic cache staleness risk quantified
- [Klarna plans to hire humans again, as new landmark survey reveals most AI projects fail to deliver](https://fortune.com/2025/05/09/klarna-ai-humans-return-on-investment/) · Fortune · May 2025 · CEO quote on cost vs. quality
- [Klarna CEO says AI helped company shrink workforce by 40%](https://www.cnbc.com/2025/05/14/klarna-ceo-says-ai-helped-company-shrink-workforce-by-40percent.html) · CNBC · May 2025 · headcount numbers
