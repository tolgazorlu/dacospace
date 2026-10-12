# Lesson 13 · Evaluating agents

**Reading time:** 17 min · **Module:** Evals · **Concepts:** outcome vs trajectory, pass^k, benchmark contamination
**Cases:** swe-bench-contamination, mcdonalds-drive-thru-rollback

## The problem

McDonald's ran an AI voice-ordering pilot, built with IBM, across more than 100 US drive-thrus for roughly three years. It ended in June 2024 after viral videos of comically wrong orders: hundreds of chicken nuggets added to a single order, bacon added to ice cream, nine iced teas tacked onto a bill nobody asked for. Analysts cited by CNBC put the system's accuracy in the "low-to-mid 80% range" against an informal bar of 95%+ needed to actually beat a human order-taker on cost and reliability. ([CNN](https://www.cnn.com/2024/06/17/tech/mcdonalds-ai-drive-thru-program); [CNBC](https://www.cnbc.com/2024/06/17/mcdonalds-to-end-ibm-ai-drive-thru-test.html))

Three years is a long pilot. Somewhere in that time, the system almost certainly handled plenty of individual orders correctly; a single successful demo, or even a successful week, was never the question that mattered. The question was whether it was reliable enough, across every order, at scale, unattended, to replace a human. That is a different kind of evaluation than "does it work," and it is the kind most teams building agents skip.

## Why it is hard

A backend engineer evaluating a new service usually asks: does this pass its test suite, does it meet its SLA under load, does it handle the documented edge cases. For an agent making several tool calls to resolve a task (look up an order, apply a credit, send a confirmation), the equivalent discipline is genuinely harder for two reasons that do not show up in a simple pass/fail demo.

First, a single successful trial tells you little about repeated reliability, because LLM agents are stochastic. Sierra's τ-bench measured this directly: GPT-4o with function calling reached about 61% success on retail customer-service tasks measured once per task (pass^1), but when the same task was run eight independent times and required to succeed on every single run (pass^8), success collapsed to under 25%. ([τ-bench](https://arxiv.org/abs/2406.12045)) A 90% single-shot success rate on your agent eval can still mean a real chance the exact same customer, calling back a second time with the identical request, gets a different and wrong result. McDonald's accuracy figure of "low-to-mid 80%" is consistent with this pattern: individually impressive demos, unreliable at the volume and repetition a real drive-thru lane demands.

Second, the benchmarks you might lean on to compare agents or vendors are not neutral measuring sticks. SWE-bench, the most cited coding-agent benchmark, is built from real GitHub issues and pull requests, which means its tasks (and often their exact solutions) exist somewhere in the same public web data frontier models were trained on. OpenAI audited 138 SWE-bench Verified problems that its own o3 model failed inconsistently across 64 runs and found 59.4% had flawed test design, even after an earlier filtering pass had already thrown out 68.3% of the original SWE-bench set for being unfair or underspecified. Separately, in automated red-teaming where one model tried to extract memorized gold-patch details from another, GPT-5.2, Claude Opus 4.5, and Gemini 3 variants reproduced verbatim gold patches, exact parameter names, and inline code comments from problems they should never have seen solved. ([OpenAI, Why SWE-bench Verified no longer measures frontier coding capabilities](https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/)) A leaderboard number, in other words, can reflect memorization rather than reasoning, and you cannot tell which from the score alone.

## The idea: outcome, trajectory, repetition, and contamination

### Outcome vs. trajectory evaluation

Outcome evaluation checks only the final state: was the refund issued, is the database row correct. Trajectory evaluation checks the path the agent took to get there: which tools it called, in what order, with what arguments, whether it recovered correctly from an error, whether it stayed inside policy along the way. Outcome-only judges are structurally blind to failures the final result survives. A 2026 fault-injection study found outcome-only judge recall drops from 0.840 on faults that change the final answer to 0.451 on faults the customer-visible outcome doesn't reveal, meaning roughly half of silent trajectory faults go undetected by an outcome-only check. ([trajectory-judge](https://arxiv.org/html/2609.00038v1)) An agent that calls `cancel_order` twice, redundantly, but still tells the user "done" looks identical to a correct agent if you only read the final message.

### pass^k, not pass^1

pass^k (distinct from pass@k used in code generation, which only requires one of k trials to succeed) is the probability that all k independent trials of the identical task succeed. For a production agent handling large volumes of near-identical requests, consistency across repeated trials is what customers actually experience. Reporting only a single-run success rate hides exactly the reliability collapse τ-bench demonstrated.

### Benchmark contamination

Public benchmarks sourced from widely crawled material (GitHub issues, Stack Overflow, Wikipedia) have a contamination half-life: the longer they are public, the more likely frontier models have memorized parts of them. OpenAI's own trajectory on SWE-bench illustrates how fast this moves: recommend SWE-bench Verified, retract it for contamination, recommend SWE-Bench Pro as the contamination-resistant successor, then retract that too after finding 27.4-34.1% of its public-split tasks independently flagged as broken. ([Separating signal from noise in coding evaluations](https://openai.com/index/separating-signal-from-noise-coding-evaluations/)) Separately, an ICSE 2026 study found that even officially "correct" SWE-bench Verified patches fail the repository's full test suite 7.8% of the time, and differential testing found 29.6% of "plausible" patches behave differently from the ground truth, because the benchmark's grading only runs the PR's own modified test files, not the full regression suite. ([PatchDiff study](https://dl.acm.org/doi/abs/10.1145/3744916.3764576))

| Evaluation axis | What it catches | What it misses |
|---|---|---|
| Outcome-only (pass^1) | Whether the task succeeded once | Repeated-trial reliability, silent trajectory faults |
| pass^k | Reliability collapse under repetition | Nothing about *why* trials fail; needs trajectory data for diagnosis |
| Trajectory evaluation | Silent faults the final answer survives, policy adherence mid-task | Needs a failure taxonomy or an expensive full-trace judge, itself unvalidated by default |
| Public contamination-prone benchmark score | Rough capability ranking against public tasks | Memorization vs. genuine reasoning; score can be inflated with no visible sign |

## In practice at Northwind

Desk has an order-lookup-and-credit agent: look up the order, verify the return window, issue a credit up to policy limit, open a support ticket. Before rolling it out to all 2,000 dealers:

1. Do not evaluate on a single pass through a handful of hand-picked orders. Run each representative task class multiple times (pass^k, k=5 or 8 is a reasonable starting point) and report the pass^k number alongside pass^1, the same way τ-bench exposed GPT-4o's retail-task collapse.
2. Instrument the tool-call sequence, not just the final chat message, so you can tell whether a "successful" credit also involved a redundant `issue_credit` call or a skipped `open_ticket` step. A customer-visible "done" is not proof the trajectory was clean.
3. If Northwind is evaluating a vendor's coding agent (for an internal tooling decision, say) and the vendor cites a SWE-bench Verified score above 70%, do not take the number at face value. Ask whether it was measured before or after the known contamination issues, and whether a private, held-out task set unlikely to be in any public training corpus has been run instead.
4. Treat McDonald's 95%+ bar as a useful anchor for any unattended, high-volume customer-facing automation: a demo-level success rate is not the same claim as "reliable enough to remove the human fallback," and the gap between those two claims is exactly what pass^k and trajectory checks are designed to expose before a rollout, not after a viral video.

## What strong engineers know

- A 90% pass^1 success rate can hide a far worse pass^8; always ask "how many of k identical trials succeed," not just "did it succeed once." ([τ-bench](https://arxiv.org/abs/2406.12045))
- Outcome-only agent evals miss roughly half of silent trajectory faults by design, not by oversight; a clean final answer is not evidence of a clean path to get there. ([trajectory-judge](https://arxiv.org/html/2609.00038v1))
- A benchmark score without a contamination audit is not evidence of generalizable capability; "verified" and "curated" are not permanent properties of a public benchmark.
- An automated grader is itself a system under test. "Passes the benchmark's test files" and "is correct" are different claims unless the test suite is provably exhaustive. ([PatchDiff study](https://dl.acm.org/doi/abs/10.1145/3744916.3764576))
- A multi-year pilot is not proof of reliability; McDonald's ran its drive-thru AI for roughly three years before ending it over an accuracy gap that repeated, viral, individual failures exposed.
- Trajectory evaluation needs either a domain-specific failure taxonomy or a full-trace judge, and that judge itself needs validation against human-labeled traces; there is no shortcut that skips validating the validator.
- If you must report a single headline number to leadership, pair it with the caveat that matters most: pass^1 vs pass^k for reliability claims, contamination status for any public-benchmark comparison.

## Decide

Northwind is choosing between two vendor coding agents to build an internal review tool. Both report SWE-bench Verified scores above 70%, and your VP wants to pick based on that number alone. You have a half-day to form a recommendation. Pick one approach and justify it:

(a) Recommend the higher-scoring vendor; a published, widely cited benchmark score is the standard way the industry compares coding agents.
(b) Recommend running a small, private, held-out task set built from Northwind's own internal codebase (never public, so not in any training corpus) and weighting that result far above the SWE-bench number.
(c) Recommend asking both vendors directly whether their reported scores were measured before or after SWE-bench Verified's contamination findings were public, and basing the decision on their answer alone.
(d) Recommend deferring the decision a full quarter until an uncontaminated public benchmark becomes available.

## One sentence summary

> A single successful trial and a public benchmark score both answer "can it work," not "will it keep working at scale," and only pass^k on your own tasks plus trajectory-level checks answer the question that actually matters before a rollout.

## Check question

Northwind's dealer-facing refund agent passes 95% of its tasks on a single run (pass^1) in offline testing. Before approving it for all 2,000 dealers, what additional measurement would you require, and what two possible designs of that measurement could still miss a real production failure mode?

## Sources

- [McDonald's pulls AI ordering from drive-thrus](https://www.cnn.com/2024/06/17/tech/mcdonalds-ai-drive-thru-program) · CNN · Jun 17, 2024 · Viral failure examples, the pilot's scale and end.
- [McDonald's to end IBM AI drive-thru test](https://www.cnbc.com/2024/06/17/mcdonalds-to-end-ibm-ai-drive-thru-test.html) · CNBC · Jun 17, 2024 · The low-to-mid 80% vs. 95%+ accuracy figures.
- [τ-bench: A Benchmark for Tool-Agent-User Interaction in Real-World Domains](https://arxiv.org/abs/2406.12045) · Yao, Shinn, Razavi, Narasimhan (Sierra) · Jun 2024 · pass^k definition and the GPT-4o reliability collapse.
- [Introducing SWE-bench Verified](https://openai.com/index/introducing-swe-bench-verified/) · OpenAI · Aug 2024 · The original 68.3% filtering rate.
- [Why SWE-bench Verified no longer measures frontier coding capabilities](https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/) · OpenAI · 2026 · Contamination and gold-patch reproduction findings.
- [Separating signal from noise in coding evaluations](https://openai.com/index/separating-signal-from-noise-coding-evaluations/) · OpenAI · 2026 · SWE-Bench Pro's own broken-task rate.
- [Are "Solved Issues" in SWE-bench Really Solved Correctly?](https://dl.acm.org/doi/abs/10.1145/3744916.3764576) · ICSE 2026 · PatchDiff differential testing results.
- [trajectory-judge: What Outcome-Only LLM Judges Miss on Agent Trajectories](https://arxiv.org/html/2609.00038v1) · 2026 · Outcome-only vs. trajectory judge recall.
