# Lesson 14 · Seeing inside an AI system

**Reading time:** 17 min · **Module:** Evals · **Concepts:** tracing, OpenTelemetry GenAI conventions, silent regressions
**Cases:** anthropic-three-bugs-postmortem

## The problem

Between early August and early September 2025, Claude users reported inconsistent quality degradation: wrong-language tokens, syntax errors, reasoning that felt off. It took Anthropic weeks to find the cause, and when they did, it was not one bug but three overlapping ones: a context-window routing error from August 5 that misrouted short-context Sonnet 4 requests to servers provisioned for 1M-token context, peaking at 16% of Sonnet 4 requests on August 31; a TPU misconfiguration from August 25 causing output corruption in Opus 4/4.1 and Sonnet 4; and a latent compiler bug in a sampling optimization, confirmed on Haiku 3.5 and suspected on Sonnet 4 and Opus 3. Thirty percent of Claude Code users had at least one message routed to a misconfigured server during the incident window. ([Anthropic, A postmortem of three recent issues](https://www.anthropic.com/engineering/a-postmortem-of-three-recent-issues))

The part of the postmortem worth re-reading twice: "the evaluations we ran simply didn't capture the degradation users were reporting, in part because Claude often recovers well from isolated mistakes." Anthropic had internal evals. They ran periodically, against pre-deploy benchmarks. They did not catch three bugs that were already live in production, degrading real traffic, for weeks. This lesson is about the instrumentation gap that made that possible, and what closing it looks like.

## Why it is hard

Backend engineers already know how to observe a service: request logs, error rates, latency percentiles, a stack trace when something throws. An LLM-based agent mostly does not throw. It returns 200 OK with a plausible-looking answer that happens to be subtly wrong, or it recovers from one bad token and finishes the response fine, masking that anything happened at all. Standard APM tells you the request succeeded. It tells you nothing about whether the content was right.

This creates a mismatch between two kinds of monitoring that both feel necessary and neither of which alone is sufficient. Pre-deploy benchmarks (run once before shipping a model or prompt change) catch regressions you anticipated and tested for, but they are blind to anything that only shows up under production's actual traffic mix, actual load-balancing behavior, or actual infrastructure state, exactly the three things that caused Anthropic's incident. Standard infrastructure monitoring (latency, error rate, request volume) catches outages and slowdowns, but a misrouted request that still returns a plausible, wrong answer in 200ms looks completely healthy on every infrastructure dashboard. You need a third thing: continuous evaluation running on live production traffic, paired with tracing detailed enough to tell you not just that something went wrong, but which tool call, which model, which server pool, and in what order.

## The idea: spans, semantic conventions, and continuous evaluation

### The span tree, not a flat log

A trace for an agentic request is a tree of spans: a top-level `invoke_agent` span containing one or more `chat` spans (the model calls) and `execute_tool` spans (the function calls), each with timing, inputs, and outputs. A flat log of "model called, tool called, model called" loses the causal structure: which tool call happened inside which reasoning step, which retry followed which failure. The tree structure is what lets you answer "why did this specific request end up on the wrong server pool" rather than just "something was slow."

### OpenTelemetry GenAI semantic conventions

The industry has converged on a standard attribute namespace for this: `gen_ai.*` (`gen_ai.operation.name`, `gen_ai.request.model`, `gen_ai.usage.input_tokens`, and so on), with a span taxonomy covering `chat`, `execute_tool`, `invoke_agent`, and `create_agent`. This lets different tracing backends interoperate instead of requiring bespoke per-vendor instrumentation. Prompt and completion content capture is an explicit opt-in, not a default, because of PII risk: you choose per-deployment whether to store the actual text alongside the trace metadata. ([OpenTelemetry GenAI semantic conventions](https://opentelemetry.bayern/docs/specs/semconv/gen-ai/gen-ai-agent-spans)) The core chat and completion attributes are stable; the agent and multi-agent conventions (`gen_ai.agent.*`) are still in Development status and change. Auto-instrumentation alone cannot populate agent identity or conversation grouping (`gen_ai.conversation.id`); those require explicit application-level span processors, something a generic APM agent dropped into your stack will not give you for free. ([TripleCloud, instrumenting LLM agents](https://blog.triplecloud.tech/posts/instrument-llm-agent-opentelemetry))

### Periodic benchmark vs. continuous production evaluation

| | Pre-deploy benchmark | Continuous production evaluation |
|---|---|---|
| When it runs | Before shipping a model/prompt change | Continuously, sampled from live traffic |
| What it catches | Anticipated regressions, known test cases | Drift and failure modes the benchmark never anticipated, infra-level defects |
| What it misses | Anything specific to production load, routing, or infrastructure state | Rare slices, unless sampling is stratified to cover them |
| Cost driver | Fixed, runs once per change | Scales with judge calls; naive 100% sampling with a large judge model can make judge spend exceed primary model spend |

Anthropic's incident is close to a textbook case for why relying only on the left column fails: three infrastructure-level bugs, invisible to a benchmark that runs in a controlled pre-deploy environment, degraded real traffic for weeks before anyone connected the scattered user reports to a root cause.

### The tooling landscape

The category has converged on the same underlying primitive (a trace is a tree of spans), with vendors differing mainly in center of gravity. Langfuse is MIT-licensed and self-hostable, ingests OTel traces, and defaults to an open-source-first positioning. Arize Phoenix is source-available (Elastic License 2.0, not OSI open), deeply OpenTelemetry/OpenInference native, free to self-host, with strong RAG-specific eval metrics. LangSmith is LangChain's proprietary platform: best zero-config tracing if you are already inside LangChain/LangGraph, priced per seat, and more tightly coupled to that framework than the alternatives. Braintrust is proprietary and evaluation-first rather than tracing-first: datasets, experiments, and CI regression gates are the core abstraction, with tracing as a supporting feature rather than the product's center of gravity. Picking a framework-coupled tool trades setup effort for lock-in; picking an OTel-native tool trades some ecosystem-specific convenience for backend portability. ([Dossier: tracing tooling landscape](https://hamel.dev/blog/secret.html))

## In practice at Northwind

Desk calls several internal tools per dealer request (`lookup_order`, `check_return_window`, `issue_credit`, `open_ticket`) and runs on a provider-hosted model behind Northwind's own API gateway.

1. Instrument every Desk request as a span tree: one `invoke_agent` span per dealer conversation, `chat` spans per model call, `execute_tool` spans per tool call, each carrying `gen_ai.*` attributes for model, token usage, and latency. Set `gen_ai.conversation.id` explicitly in application code; do not assume auto-instrumentation will group multi-turn conversations correctly.
2. Decide the opt-in content-capture policy deliberately. Dealer messages may contain account numbers or contract terms; capturing full prompt/completion text in traces by default is a PII decision, not a tracing default, and should go through the same review as any other place dealer data is stored.
3. Add continuous, sampled evaluation on live Desk traffic, not just a pre-deploy golden-set run before each prompt change. Stratify the sample so a safety-critical slice (credit-issuing conversations) gets high coverage while low-stakes traffic (general FAQ answers) can run at a lower sampling rate to control judge cost.
4. Watch for the specific symptom Anthropic named: a model that "recovers well from isolated mistakes" can mask a persistent, low-rate defect behind a healthy-looking aggregate score. If Desk's weekly quality score stays flat while scattered one-off dealer complaints trickle in, treat that pattern as a signal worth a trace-level investigation, not noise to average away.
5. Pick a tracing tool based on where Northwind's engineering org already lives. If Desk is built on a specific agent framework, the zero-config option may be worth the lock-in; if portability across future framework changes matters more, prefer the OTel-native option even if initial setup takes longer.

## What strong engineers know

- A 200 OK response and a healthy latency graph tell you the request completed, not that the content was correct; standard APM is necessary but not sufficient for an LLM system.
- "Recovers well from isolated mistakes" is precisely the property that lets a persistent defect hide inside an aggregate score for weeks; watch for a flat dashboard alongside rising scattered complaints as a specific pattern, not generic noise. ([Anthropic postmortem](https://www.anthropic.com/engineering/a-postmortem-of-three-recent-issues))
- Agent and multi-agent OpenTelemetry conventions are still in Development status; expect them to change, and do not assume auto-instrumentation alone will populate conversation grouping or agent identity. ([OpenTelemetry GenAI spec](https://opentelemetry.bayern/docs/specs/semconv/gen-ai/gen-ai-agent-spans))
- Prompt/completion content capture is opt-in by design because of PII risk; decide the capture policy as a data-governance question, not a tracing default.
- A naive "sample everything, judge with the biggest model" online eval configuration can make judge spend exceed primary model spend; stratified sampling is a cost control, not just an engineering nicety.
- Infrastructure-level changes (routing rules, compiler flags, kernel-level sampling optimizations) are a model-quality risk indistinguishable from a bad prompt or model swap from the user's point of view, and need the same regression-eval discipline as a prompt change, not just serving-stack integration tests.
- A tracing tool tightly coupled to your agent framework trades setup effort for lock-in; an OTel-native tool trades some convenience for portability. Neither choice is free.
- Even a frontier lab with a mature eval suite missed a multi-week, multi-bug production degradation because its evals ran periodically against pre-deploy benchmarks rather than continuously against live traffic.

## Decide

Desk's weekly quality dashboard has stayed at 93-95% for two months. This week, three dealers independently reported credit amounts that looked slightly off, no two in the same way. Infrastructure dashboards show normal latency and error rates. You have a day to decide where to look first. Choose one and justify it against the others:

(a) Treat it as noise; three reports out of thousands of weekly conversations is within normal variance for a 93-95% score.
(b) Immediately suspect a prompt or model regression and roll back the most recent prompt change, without checking infrastructure-level changes first.
(c) Pull the full span trees for the three reported conversations plus a random sample from the same time window, looking specifically for anything correlated across them (same server pool, same model version, same tool call pattern), before assuming either a prompt regression or pure noise.
(d) Add a new dashboard panel tracking credit-amount variance over time and wait a week to see if the pattern repeats before investigating further.

## One sentence summary

> A healthy aggregate score and a healthy infrastructure dashboard can both be true at the same time a real defect is degrading production, because an LLM system that "recovers well from isolated mistakes" hides exactly the kind of failure neither periodic benchmarks nor standard APM are built to catch.

## Check question

Northwind's finance team notices the Desk observability bill tripled this quarter while dealer traffic only grew 20%. Using the distinction between tracing cost and evaluation cost from this lesson, what two questions would you ask before changing the sampling configuration, and why might simply lowering the sampling rate be the wrong first move?

## Sources

- [A postmortem of three recent issues](https://www.anthropic.com/engineering/a-postmortem-of-three-recent-issues) · Anthropic, Sam McAllister · Sep 17, 2025 · Full incident timeline, the three bugs, and the "evals didn't capture the degradation" admission.
- [OpenTelemetry Semantic Conventions for GenAI](https://opentelemetry.bayern/docs/specs/semconv/gen-ai/gen-ai-agent-spans) · OpenTelemetry GenAI SIG · ongoing · `gen_ai.*` namespace and span taxonomy.
- [TripleCloud: OpenTelemetry GenAI semantic conventions guide](https://blog.triplecloud.tech/posts/instrument-llm-agent-opentelemetry) · practitioner guide · Why auto-instrumentation alone cannot capture agent/conversation structure.
- ["It's Hard to Eval" Is a Product Smell](https://hamel.dev/blog/secret.html) · Hamel Husain · Oct 2025 · Tracing/eval tooling landscape commentary including Langsmith, Braintrust, Arize Phoenix.
