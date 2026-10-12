# Lesson 01 · An LLM is an unreliable dependency

**Reading time:** 14 min · **Module:** Foundations · **Concepts:** nondeterminism, pass^k, structured output, timeouts
**Cases:** mcdonalds-drive-thru-rollback

## The problem

In 2024 McDonald's ended a roughly three-year pilot of IBM-built AI voice ordering across more than 100 US drive-thrus, after viral videos showed the system adding bacon to ice cream, ordering hundreds of chicken nuggets, and piling nine iced teas onto a single bill. Analysts reported the system's accuracy stuck in the "low-to-mid 80% range," against an informal bar of 95%+ needed to beat a human order-taker on cost and reliability (CNN, Jun 2024).

That is not a story about a bad model. It is a story about a system that treated a probabilistic component like a deterministic one: no clear fallback to a human when the system's confidence was low, so a wrong-but-confident transcription went straight to checkout instead of being escalated. Fifteen to twenty percent of orders coming out wrong is not a rounding error at drive-thru volume, and a system that is confidently wrong a meaningful fraction of the time is often worse for the business than one that visibly asks for help, because wrong-but-confident outputs erode trust faster than visible friction.

You will build systems like Northwind's **Desk**, an assistant that answers dealer questions, looks up orders, and issues credits. Every one of those actions sits downstream of an LLM call. If you treat that call the way you'd treat a database read, your system will fail the way McDonald's did.

## Why it is hard

A backend engineer's instincts are built for deterministic dependencies. Call the same function with the same input twice, get the same output twice. Retry on failure, and the retry either succeeds identically or fails identically. Timeouts protect you from slow calls, not from calls that return confidently and are simply wrong.

An LLM breaks all three assumptions at once:

- **The same prompt can produce different outputs.** Even at temperature 0, numerical noise, batching effects, and provider-side updates mean you cannot assume byte-for-byte determinism across calls, let alone across model versions.
- **A "successful" call (200 OK, well-formed text) can still be wrong.** There is no exception to catch when the model hallucinates a policy or miscounts items. The failure is semantic, not mechanical, so your usual error-handling vocabulary (retry, circuit-break, fall back) does not automatically transfer.
- **Reliability is not a single number.** A model can solve a task once but fail it a meaningful fraction of the time when you run the "same" task again with minor variation. Engineers coming from deterministic systems reach for "does it work" when they should be asking "how often does it work, across how many realistic variations."

The instinct to "just retry" is actively dangerous here: retrying a non-idempotent side-effecting tool call (charge a card, send an email) because the LLM call looked slow or malformed can duplicate a real-world effect. The instinct to trust a clean-looking JSON response is also dangerous: valid JSON schema does not mean valid content.

## The idea: reliability is measured, not assumed

### pass@k vs pass^k

Two different metrics get conflated constantly, and the difference matters for how you report reliability to anyone outside engineering.

- **pass@k** (common in code-generation benchmarks): the probability that *at least one* of k independent attempts at a task succeeds. Useful when you can generate several candidates and pick the best.
- **pass^k** (introduced by τ-bench, Sierra, Jun 2024): the probability that *all* k independent trials of the same underlying task succeed. This is the metric that matters for a customer-facing agent handling thousands of similar-but-not-identical real tickets, because your customers are not going to let you retry until one attempt happens to work; each one gets exactly one shot and expects the same quality every time.

τ-bench measured this directly on simulated customer-service tasks (retail and airline domains, policy-following agents, repeated 8 times per task with lexical variation but the same underlying semantics): GPT-4o with function calling scored roughly pass^1 ≈ 61% on retail and ≈ 35% on airline, dropping to pass^8 < 25% on retail. That is a roughly 60% relative drop in reliability going from one trial to eight. A model that looks strong on a single demo can still be unacceptably unreliable at the volume a real deployment requires.

| Metric | Question it answers | When to use it |
|---|---|---|
| pass@1 | Did it work this one time | Demos, exploratory testing |
| pass@k | Did at least one of k attempts work | Candidate generation you can filter (code gen, draft generation) |
| pass^k | Did all k attempts work | Any system serving many real, similar-but-distinct cases (support, refunds, order lookups) |

### Structured output is a contract, not a guarantee

Forcing the model into JSON mode, a function-call schema, or a Pydantic model buys you *parseability*, not *correctness*. The model can emit perfectly valid JSON with a hallucinated order number or an invented policy clause. Structured output collapses one class of failure (malformed responses that crash your parser) and leaves the harder class (confidently wrong content) completely untouched. Treat schema validation as the floor of your checks, not the ceiling.

### Timeouts, retries, and idempotency

- A **timeout** protects you from a slow or hung call. It tells you nothing about whether a completed call was correct.
- A **retry** is safe only if the underlying action is **idempotent**: calling it twice with the same input produces the same real-world effect as calling it once (an idempotency key on "issue credit" or "send refund," not a bare POST). Durable-execution systems retry activities automatically on transient failure, so any tool with side effects must be designed for safe repetition or retries will silently duplicate real effects.
- A **circuit breaker** for an LLM dependency should trip on more than HTTP error rate: track malformed-output rate, refusal rate, and (where you can measure it) task-level correctness drift, because the provider can be "up" (200s flowing) while your actual reliability has collapsed.

## In practice at Northwind

Desk looks up orders, answers policy questions, and issues credits up to a limit. Before shipping any of that, you would:

1. **Define what "correct" means per task**, concretely enough to grade automatically: for "look up order status," correctness is "the returned order number, status, and ETA match the source system." For "answer a return-policy question," correctness is "the stated policy terms match the current policy document," not "sounds plausible."
2. **Measure pass^k, not pass@1, before launch.** Take 20-30 real-sounding dealer questions per task type, paraphrase each into 5-8 variants, and run every variant through Desk k times. A task that passes 9/10 times on the exact wording you tested but drops hard on paraphrases is not production-ready; it is a demo.
3. **Make credit issuance idempotent and capped outside the model.** The dollar ceiling and the idempotency key live in the credit-issuing service, not in the system prompt, so a retried or duplicated call cannot double-issue a credit and a prompt change cannot silently raise the ceiling.
4. **Treat a malformed or empty tool-call response as a distinct, logged failure mode**, separate from "the model said something but it was wrong." You cannot fix what you cannot tell apart.
5. **Set an explicit low-confidence escalation path** for order lookups and policy answers, mirroring the lesson from McDonald's: a visible "let me get a human for this" beats a confident wrong answer, every time, at scale.

## What strong engineers know

- A clean, schema-valid response is not evidence of correctness; validate content against ground truth, not just shape.
- Report reliability as pass^k over realistic task variation, not pass@1 on your favorite test prompt; leadership will ask for "a reliability number," and a single pass@1 figure quietly implies consistency it does not have.
- Retrying is only safe for idempotent actions; a retry on a side-effecting tool call needs an idempotency key designed into the downstream system, not a hope that the LLM "won't do it again."
- A visible failure (escalate, say "I don't know") is usually cheaper for the business than a confident wrong answer, because wrong-but-confident outputs erode trust faster once users start comparing notes (see McDonald's 15-20% error rate at real volume).
- Even at temperature 0, do not assume byte-identical outputs across calls or across a provider's model-version bump; pin and monitor model versions if your downstream logic depends on exact phrasing.
- Build your eval set from paraphrased variants of real tasks, not just the exact wording that happened to work in your demo; τ-bench's own design (lexical variation, same semantics) is the template.
- A "retry on failure" policy needs a definition of failure that includes "well-formed but wrong," which usually means a second, independent check (a validator, a human sample, a grounding check) rather than relying on the same model to notice its own mistake.

## Decide

Northwind's VP of Support wants a target reliability number before launching Desk's order-lookup feature to all 2,000 dealers. Your current testing shows pass@1 = 94% on the ten questions your team wrote by hand. You have one week before the leadership review. Options:

1. Report the 94% pass@1 number as-is and launch on schedule.
2. Spend the week building a 30-question paraphrase set (6 base questions, 5 variants each) and measuring pass^5 before reporting any number.
3. Launch to a 5% dealer sample first, instrument pass^k in production, and report a number after two weeks of real traffic.
4. Report pass@1 but add a mandatory human-review step on every order lookup for the first month to cover the gap.

Pick one (or a combination) and justify it against the cost of being wrong in each direction: shipping a reliability number that turns out to be optimistic, versus delaying launch to measure more rigorously.

## One sentence summary

> An LLM call is a probabilistic dependency: measure its reliability as pass^k over realistic task variation, not as a single pass@1 demo, and never retry a side-effecting call that isn't idempotent.

## Check question

Northwind's credit-issuance tool currently retries automatically on any 5xx or timeout from the LLM provider, with no idempotency key on the downstream "issue credit" call. A dealer reports two identical $200 credits landed on their account after one request during a network blip. What two changes, in what order, close this gap, and why does order matter?

## Sources

- [τ-bench: A Benchmark for Tool-Agent-User Interaction in Real-World Domains](https://arxiv.org/html/2406.12045) · Sierra (Yao et al.) · Jun 2024 · defines pass^k and reports the pass^1-to-pass^8 reliability drop.
- [McDonald's pulls AI ordering from drive-thrus](https://www.cnn.com/2024/06/17/tech/mcdonalds-ai-drive-thru-program) · CNN · Jun 2024 · the accuracy-vs-bar case for why confident-wrong is worse than visible failure.
- [Of course you can build dynamic AI agents with Temporal](https://temporal.io/blog/of-course-you-can-build-dynamic-ai-agents-with-temporal) · Temporal · 2025/2026 · the idempotency requirement for retried side-effecting tool calls.
- [Building Effective AI Agents](https://www.anthropic.com/engineering/building-effective-agents) · Anthropic · Dec 2024 · foundational framing for treating the LLM as one unreliable component in a larger system.
