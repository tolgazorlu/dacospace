# AI Systems Lab · progress

Each row is a lesson. Its case files (real incidents) are listed in the lesson's **Cases:** line.
Reading progress lives in dacospace, so this file stays the same for everyone.

| # | Lesson | Concepts | Module |
|---|---|---|---|
| 01 | An LLM is an unreliable dependency | nondeterminism, pass^k, structured output, timeouts | Foundations |
| 02 | Workflows before agents | workflow vs agent, augmented LLM, when not to build an agent | Foundations |
| 03 | Tools are an API for a model | tool design, idempotent tools, errors as observations, schemas | Agents |
| 04 | Context is a budget | context engineering, context rot, lost in the middle, KV cache, compaction | Agents |
| 05 | Loops that stop | step and cost budgets, stop conditions, runaway loops, durable execution | Agents |
| 06 | Many agents, many failures | multi-agent trade-offs, orchestrator-worker, MAST failure taxonomy | Agents |
| 07 | Blast radius and human approval | least privilege, irreversible actions, approval gates, audit logs | Agents |
| 08 | Prompt injection | direct vs indirect injection, the lethal trifecta, why filters fail | Security |
| 09 | Where data leaks out | exfiltration channels, markdown images, egress control, dual LLM, CaMeL | Security |
| 10 | MCP and the agent supply chain | tool poisoning, rug pulls, rule-file backdoors, confused deputy, OAuth | Security |
| 11 | Error analysis before evals | trace review, failure taxonomy, golden datasets, criteria drift | Evals |
| 12 | Judging the judge | LLM-as-judge, position and verbosity bias, aligning a judge with humans | Evals |
| 13 | Evaluating agents | outcome vs trajectory, pass^k, benchmark contamination | Evals |
| 14 | Seeing inside an AI system | tracing, OpenTelemetry GenAI conventions, silent regressions | Evals |
| 15 | RAG and its failure points | retrieval-augmented generation, the seven failure points, retrieval metrics | Knowledge |
| 16 | Better retrieval | hybrid search, reranking, chunking, contextual retrieval | Knowledge |
| 17 | Permissions follow the document | permission-aware retrieval, oversharing, tenant isolation | Knowledge |
| 18 | Grounding, citations and liability | faithfulness, citation checking, who is liable for the answer | Knowledge |
| 19 | Cost and latency | prompt caching, model routing and cascades, batch, semantic cache risks | Production |
| 20 | When the provider goes down | rate limits, provider outages, fallbacks, degradation modes | Production |
| 21 | Guardrails and their limits | input and output filters, classifiers, policy enforcement outside the model | Production |
| 22 | Governance for engineers | EU AI Act, NIST AI RMF, ISO/IEC 42001, PII and retention | Production |
| 23 | Capstone: an enterprise agent platform | end-to-end design, review and defense | Capstone |
