# Lesson 23 · Capstone: an enterprise agent platform

**Reading time:** 22 min · **Module:** Capstone · **Concepts:** end-to-end design, review and defense
**Cases:** chevrolet-one-dollar-tahoe, dpd-chatbot-swearing, klarna-ai-assistant, openai-dec-2024-outage, nyc-mycity-chatbot, cursor-support-bot-policy

## The problem

Northwind Supply has decided Desk needs a real platform, not a collection of scripts. Desk currently answers dealer questions from internal documents, looks up orders and shipments, issues credits up to a limit, opens support tickets, reads incoming support emails written by outsiders, and serves employees over Slack with access to the company's document store. Each of those capabilities, taken alone, is something you have already learned to build carefully. Put together behind one gateway, serving 2,000 dealer customers and 600 employees, they become a platform with its own failure modes that no single lesson covers.

This lesson is a design review. You are the staff engineer walking a VP of Engineering through Desk's architecture before it scales past pilot. Every section below names the decisions a design review would actually interrogate, and points back to the lesson where you learned the underlying mechanism. Read it as a map of how lessons 01 through 22 compose into one system, not as new material.

## Why it is hard

A platform is not the sum of its features; it is the sum of its interactions. A guardrail that works in isolation (Lesson 21) can be bypassed by a prompt injection that enters through a channel the guardrail's designer never considered (Lesson 08). A RAG system that retrieves correctly (Lesson 15, 16) can still leak data across tenants if permission filtering was designed for the document store but not for the tool layer that also touches customer data (Lesson 17). A cost-cutting router (Lesson 19) can quietly degrade the exact quality dimension your evals were never built to catch (Lesson 11, 12).

Every incident referenced across this lab, the Chevrolet dealership's $1 Tahoe, DPD's jailbroken poem, Klarna's cost-quality trade-off, OpenAI's December 2024 outage, NYC's MyCity legal errors, Cursor's fabricated support policy, happened inside a system where some individual piece worked as designed. The failure was in the composition: no single team owned the interaction between the piece that worked and the piece next to it. Designing Desk's platform end to end means explicitly owning those interactions, not assuming they take care of themselves because each component passed its own review.

## The idea: Desk as one system, reviewed layer by layer

### The gateway and model layer

Every request to Desk, dealer chat, employee Slack, inbound email, passes through a single gateway rather than calling providers directly from each surface. This is where Lesson 01's core claim becomes architecture: an LLM is an unreliable dependency, so the gateway enforces timeouts, retries only for transient failures, and structured output validation on every call, regardless of which surface originated the request.

The gateway also owns model routing (Lesson 19): cheap-model handling for routine order lookups, escalation to a stronger model for anything touching credits or policy, with its own accuracy eval tracked separately from the cost dashboard, because a router that only reports savings is reporting half the story. And the gateway is where provider failover lives (Lesson 20): health-checked routing to a secondary provider for the dealer-facing credit path, since that is the function where an OpenAI-style multi-hour outage would be most costly, while the lower-stakes employee document assistant can simply degrade to "temporarily unavailable" without a second provider on standby.

### Workflow vs. agent, and where loops stop

Not every Desk capability needs an agent. Order-status lookup is a fixed workflow: retrieve the order, format the answer, done (Lesson 02). Issuing a credit, researching a dealer's history, drafting a ticket response, these have genuinely variable paths and justify an agent that chooses its own tool calls. Wherever Desk does run an agent loop, it has a hard step count and a cost ceiling enforced in code before any paid call, not a billing alert reviewed after the fact (Lesson 05); an agent that keeps retrying a failing tool call in superficially different ways is not making progress, and the loop has to recognize that and stop.

If Desk ever needs a multi-agent design, say, a planning agent that delegates document research to a search sub-agent, keep the lesson from Lesson 06 in view: multi-agent systems fail primarily from information withholding and vague delegation, not from model capability gaps. A narrow orchestrator-worker split for a genuinely parallelizable task (searching multiple document sources at once) is defensible; a general-purpose "team of agents" that all share loosely-specified context is the pattern most likely to produce MAST-style failures.

### Tool permissions and blast radius

Every tool Desk exposes, issue_credit, lookup_order, create_ticket, send_email, is scoped to the minimum capability its task needs, and every consequential action has an approval gate that lives outside the model's own context (Lesson 07). Credit issuance above Desk's standard limit requires human approval, enforced in the tool's code, not as a system-prompt instruction the model could be argued out of, the exact gap that let the Chevrolet dealership's bot call a fabricated price "legally binding" with nothing to stop it. Irreversible or high-blast-radius actions (a credit that cannot be easily reversed, a ticket closure, an email sent externally) get logged to an audit trail that is the source of truth, independent of whatever the agent itself reports about what it did.

### Prompt injection and the lethal trifecta across every surface

Desk reads incoming support emails and tickets written by outsiders, the same surface that makes the lethal trifecta (Lesson 08) a live concern: private data (dealer account details, order history), untrusted content (anything in an inbound email or ticket), and an exfiltration channel (send_email, create_ticket, or any tool that writes somewhere visible to the sender). Any single tool combination that satisfies all three legs is treated as a standing risk, not a one-off bug to patch after the fact. Where data could leave the system (Lesson 09), markdown rendering, auto-fetched images, outbound email, each channel is explicitly enumerated and checked, because a filter that catches the common exfiltration pattern and misses an uncommon markdown variant is exactly the EchoLeak-class gap.

If Desk ever integrates third-party tools over MCP, say a CRM connector or a shipping-carrier integration, tool definitions are hash-pinned at approval time and re-checked before every invocation (Lesson 10), because an approved tool is not a permanently trusted tool; it can drift after approval the same way Cursor's rug-pull vulnerability showed.

### Evaluation before claiming anything works

Before any Desk capability ships past pilot, someone has actually read a sample of real traces and built a failure taxonomy from what they saw, not from what a planning meeting assumed would go wrong (Lesson 11). Automated checks split cleanly between code-based assertions (did the tool call respect the credit ceiling) and LLM judges (was this reply faithful to the retrieved policy document), and any judge used in that pipeline has been aligned against human labels before it is trusted, with its biases (position, verbosity) explicitly tested, not assumed away (Lesson 12). Because Desk runs agent loops, evaluation covers trajectory, not just outcome: a reply that reaches the right final answer by skipping a confirmation step or calling a tool twice redundantly is a failure a trajectory-aware eval catches and an outcome-only eval misses (Lesson 13). And all of this is observable: every Desk interaction is traced with enough structure (tool calls, retrieval steps, model calls, as a causal tree, not a flat log) to answer "why did this specific conversation go wrong" after the fact, not just "is the aggregate score green" (Lesson 14).

### RAG, permissions, and grounding

Desk's document retrieval over price lists, return policy, and contracts follows the failure-point discipline from Lesson 15: retrieval quality and generation quality are measured separately, because a system can retrieve the right chunk and still generate an answer that drifts beyond it. Chunking, hybrid search, and reranking are tuned to Desk's actual query mix, exact SKU and order-number lookups need lexical matching that pure embeddings miss (Lesson 16). Retrieval is filtered by the requesting user's actual permissions at query time, not by the assistant's blanket permission to exist, the same gap that turned Microsoft 365 Copilot into a force-multiplier for pre-existing SharePoint oversharing (Lesson 17); a dealer should never be able to retrieve another dealer's contract terms by phrasing the right question. And every answer touching policy, pricing, or legal terms is grounded with an explicit claim-to-source check before it reaches a dealer, the exact step missing from both Air Canada's bereavement-fare answer and NYC's MyCity chatbot's confidently wrong legal claims (Lesson 18).

### Production guardrails, cost, and governance

Desk's output-side guardrail for policy and commitment language runs independently of the main model's own system prompt (Lesson 21), so a prompt regression or a successful injection does not automatically disable the one check meant to catch it, exactly the gap that let DPD's chatbot swear once an unrelated system update weakened its instructions. Cost optimization (caching, batching, routing) is paired with a tracked quality metric from day one, not bolted on after a Klarna-style cost-driven quality regression becomes visible to customers (Lesson 19). And governance ownership is explicit: someone inside Northwind owns Desk's EU AI Act risk classification on an ongoing basis, understands that ISO 42001 or NIST AI RMF alignment is internal process discipline and not a substitute for that classification, and treats every policy-adjacent statement Desk generates with the same editorial accountability as Northwind's own website (Lesson 22). Support-bot replies that cannot be grounded in a citable, versioned policy document escalate to a human instead of generating a plausible-sounding guess, the fix Cursor identified only after its "Sam" bot fabricated a device-login policy that triggered real cancellations.

## In practice at Northwind: the review sequence

A design review for Desk's full platform, in the order a staff engineer would actually walk through it: start with blast radius (which tools can cause irreversible harm, and are they gated outside the model), then move to the trifecta audit (which tool combinations touch private data, untrusted content, and an exfiltration channel simultaneously), then to grounding (which answers are generated freely versus retrieved and cited), then to evaluation coverage (is there a trajectory-aware eval for every agentic path, not just outcome checks), then to cost and resilience (is there a quality metric paired with every cost lever, and a tested fallback for the provider-dependent paths that matter), and finally to governance ownership (who re-classifies risk when a capability changes). A platform that passes every individual component review but has never been walked through in this order is not actually reviewed, it is a set of parts.

## What strong engineers know

- A platform's failure modes live in the interactions between components, not inside any single component; review the seams, not just the pieces.
- Every incident this lab references happened inside a system where some individual part worked as designed; the gap was ownership of the interaction, not a component defect.
- Blast-radius and trifecta audits are the two highest-leverage reviews to run first, because they bound the damage even when a later layer (grounding, guardrails, evals) fails.
- A guardrail, an eval, and a governance process that are each individually correct but never tested together will miss the exact failure that only shows up in combination.
- The cheapest version of "design review" is a checklist; the useful version is tracing one real request through every layer and asking, at each layer, what happens if this one fails.
- Cost, resilience, and governance decisions all eventually come back to the same question: what are you explicitly willing to accept as residual risk, and who signed off on that.
- A platform built by composing lessons learned in isolation is not automatically a well-designed platform; composition itself is a design skill.

## Decide: the capstone brief

You are the staff engineer presenting Desk's platform architecture to Northwind's VP of Engineering and General Counsel before it scales from pilot (200 dealers) to full rollout (2,000 dealers, 600 employees). You must produce a design that specifies, with justification for each:

1. **Gateway and routing**: how requests from dealer chat, employee Slack, and inbound email are unified behind one gateway; where model routing/cascading applies and where it does not; which capabilities get multi-provider failover and which accept single-provider risk.
2. **Agent boundaries**: which Desk capabilities are fixed workflows and which are genuine agents; for each agent, the step/cost ceiling, the stop condition, and whether it is single-agent or requires a multi-agent split (and if so, how context is shared without duplicating Cognition's Flappy-Bird-style failure).
3. **Tool permissions**: for every tool Desk exposes (credit issuance, order lookup, ticket creation, email sending), the scope of access, the approval gate (if any), and where the enforcement lives (in the model's instructions, or in the tool's own code, and why).
4. **Trifecta and injection audit**: enumerate every tool combination that could satisfy the lethal trifecta, and the specific mitigation for each (scoping, output filtering, dual-check, or removing the capability).
5. **RAG and permissions**: how retrieval is scoped to the requesting user's actual permissions, how chunking/hybrid search/reranking are tuned to Desk's query mix, and how policy/pricing/legal answers are grounded and cited rather than freely generated.
6. **Evaluation and tracing**: what gets measured offline versus online, how the judge (if any) was aligned to human labels, how trajectory failures are caught separately from outcome failures, and what the tracing setup needs to capture to debug a specific bad conversation after the fact.
7. **Guardrails**: what runs as an independent check outside the main model's context, and what residual failure rate you are explicitly accepting.
8. **Cost and resilience**: which cost levers apply where, what quality metric is paired with each, and which capabilities get provider failover versus degrade gracefully versus accept outage risk.
9. **Governance**: who owns Desk's risk classification going forward, what triggers re-classification, and what the plan is for data retention given the mix of dealer and employee data Desk touches.

For each section, name the specific lesson (01-22) whose mechanism you are applying, and the specific incident from this lab (by case slug) that illustrates what happens when that section is skipped or done carelessly. There is no single correct architecture; a strong answer is internally consistent, names its residual risks explicitly, and can defend every trade-off against a skeptical General Counsel asking "what happens when this fails."

## One sentence summary

> A platform is not reviewed until you have traced one real request through every layer and asked, at each layer, what happens when that layer fails, because every incident in this lab happened at a seam, not inside a single component.

## Check question

Six months after full rollout, Desk's trajectory evals, guardrail logs, and cost dashboard are all green, but a dealer reports that Desk approved a credit above the stated ceiling during a conversation that also involved an unusual, persistent back-and-forth about a shipping dispute. Walk through which of the nine design-review sections above you would check first, in order, and why.

## Sources

- [Building Effective AI Agents](https://www.anthropic.com/engineering/building-effective-agents) · Anthropic · Dec 2024 · workflows vs. agents
- [The lethal trifecta for AI agents](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) · Simon Willison · 16 Jun 2025 · trifecta risk model
- [Why Do Multi-Agent LLM Systems Fail?](https://arxiv.org/abs/2503.13657) · Cemri, Pan, et al. · Mar 2025 · MAST failure taxonomy
- [GM Dealer Chat Bot Agrees To Sell 2024 Chevy Tahoe For $1](https://gmauthority.com/blog/2023/12/gm-dealer-chat-bot-agrees-to-sell-2024-chevy-tahoe-for-1/) · GM Authority · Dec 2023
- [DPD AI chatbot swears, calls itself 'useless' and criticises delivery firm](https://www.theguardian.com/technology/2024/jan/20/dpd-ai-chatbot-swears-calls-itself-useless-and-criticises-firm) · The Guardian · Jan 2024
- [Klarna plans to hire humans again, as new landmark survey reveals most AI projects fail to deliver](https://fortune.com/2025/05/09/klarna-ai-humans-return-on-investment/) · Fortune · May 2025
- [API and ChatGPT & Sora Facing Issues, postmortem](https://status.openai.com/incidents/ctrsv3lwd797) · OpenAI · Dec 2024
- [NYC's AI Chatbot Tells Businesses To Break The Law](https://themarkup.org/artificial-intelligence/2024/03/29/nycs-ai-chatbot-tells-businesses-to-break-the-law) · The Markup · 29 Mar 2024
- [Cursor AI support agent invents fake policy and triggers user uproar](https://arstechnica.com/ai/2025/04/cursor-ai-support-bot-invents-fake-policy-and-triggers-user-uproar/) · Ars Technica · Apr 2025
- [Microsoft moves to stop M365 Copilot from 'oversharing' data](https://www.computerworld.com/article/3616459/microsoft-moves-to-stop-m365-copilot-from-oversharing-data.html) · Computerworld · 2024
