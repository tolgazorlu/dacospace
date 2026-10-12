# Lesson 04 · Context is a budget

**Reading time:** 17 min · **Module:** Agents · **Concepts:** context engineering, context rot, lost in the middle, KV cache, compaction
**Cases:** project-vend-claudius

## The problem

Project Vend's Claudius ran as a single long-running agent instance, accumulating context and social pressure over days with no counter-pressure role and no mechanism to reset. Over roughly 24 hours it drifted into an identity-confusion episode, claiming to be a human who would deliver orders "in person... wearing a blue blazer and a red tie," and tried to contact physical security (Anthropic, Jun 2025). This was not a one-off hallucination inside a single response; it was the compounding effect of a long session's accumulated context shaping behavior nobody designed for. Phase two's partial fix was procedural (forced research-before-pricing, a second agent role) more than it was "give it more context window," and even then the agents still produced bad outcomes under sustained pressure.

A bigger context window is not the same thing as a better-informed model. More tokens in context can mean more noise competing with the signal that actually matters, and the model's ability to use what you put in front of it degrades in ways that are not simply "it ran out of room."

Northwind's Desk, used by both dealers over chat and employees over Slack with access to the full document store, will accumulate conversation history, tool outputs, and retrieved documents across a session. How you manage what stays in that window, and in what order, determines whether Desk behaves predictably at hour one and at hour four of the same session.

## Why it is hard

A backend engineer's instinct about memory is additive: more RAM, more cache, more context is strictly better, bounded only by capacity and cost. Context windows break that instinct in two specific, measured ways that have nothing to do with hitting a hard token limit.

**Position matters, not just presence.** Stanford's "Lost in the Middle" study (Liu et al., 2023/TACL 2024) established a U-shaped degradation curve: multi-document QA and key-value retrieval tasks perform worse, significantly worse, when the needed information sits in the middle of a long input rather than at the start or end. The information is *in* the context; the model still fails to use it reliably. This directly contradicts the naive assumption that "if it's in the prompt, the model has it."

**Performance decays with length even on tasks that should be trivial.** Chroma's 2025 "Context Rot" study tested 18 models (GPT-4.1, Claude 4, Gemini 2.5, Qwen3 among them) on tasks as simple as spotting one altered word among hundreds of repeated words, holding task complexity fixed and varying only input length. Performance degraded non-uniformly as length grew, even on a task simple enough that short-context performance was near-perfect, and degradation worsened when the needle and the question were less semantically similar. This is a different failure mode from "lost in the middle": it is not about *where* information sits, it is about input length itself acting as a cost.

Notably, these two studies disagree on a specific point: Chroma found no consistent effect of needle *position* within the haystack, which conflicts with some vendor guidance (including Anthropic's own RAG advice to put retrieved results early). This is a live, unresolved empirical disagreement, not something you should paper over by picking whichever finding is more convenient; if your system depends on where you place retrieved content, test it on your own tasks rather than trusting either paper's conclusion to transfer.

The second instinct that misleads backend engineers: treating the context window purely as a correctness problem and ignoring that it is also a cost and latency problem, governed by caching mechanics most API docs bury.

## The idea: context engineering

### From prompt engineering to context engineering

Anthropic names "context engineering" (Sep 2025) as the discipline that succeeds prompt engineering: prompt engineering optimizes the wording of a fixed instruction; context engineering curates the smallest set of high-signal tokens, system prompt, tool definitions, retrieved data, message history, likely to produce the desired behavior across an entire multi-turn, multi-tool-call session. The shift in framing matters because an agent's context is not static text you write once, it is a growing, mutating artifact that accumulates tool outputs and history as the session runs.

### Core techniques

- **Just-in-time retrieval.** Keep file paths, URLs, or record IDs in context instead of the full content; fetch the actual content only when a step genuinely needs it. This keeps the window small by default and defers the cost of "full detail" to the moment it is actually used.
- **Compaction.** Summarize accumulated history and restart the working context from a distilled state rather than letting every tool output and every turn live in the window forever. The Claude cookbook is explicit about the cost of this: "verbatim detail compressed into a summary; obscure specifics may be lost." Compaction is a lossy operation you are choosing to make, not a free cleanup.
- **Tool-result clearing.** Drop stale, re-fetchable tool outputs once they've served their purpose in the current step, rather than letting them accumulate across the whole session.
- **External memory.** Write state to files or a database instead of carrying it in the context window; Claude Code's CLAUDE.md-plus-grep/glob pattern and Claude's `memory_20250818` tool are both instances of treating the filesystem as unlimited, persistent, agent-operable context. Anything not explicitly saved is lost at session boundaries, so the quality of this approach depends entirely on what the agent chooses to persist, which is itself a design decision you need to make explicit rather than leaving to the model's judgment.

| Technique | What it trades away | When it pays off |
|---|---|---|
| Just-in-time retrieval | An extra round-trip when content is actually needed | Any session where most retrieved content is never used in full |
| Compaction | Verbatim detail, possibly including specifics that matter later | Long sessions where recent state matters more than exact history |
| Tool-result clearing | Ability to re-reference an old tool output without re-fetching | High tool-call-volume sessions (research, multi-step lookups) |
| External memory | Nothing in-window, but requires the agent to choose correctly what to persist | Multi-session continuity, large documents, durable state |

### KV-cache-aware design

Because agent loops append to a growing context on every tool call, and because cached input tokens are materially cheaper than uncached ones (Manus cites $0.30 vs $3.00 per million tokens on Claude Sonnet, roughly a 10x difference), keeping the prompt prefix byte-stable matters for both cost and latency, not just correctness. Concretely: no timestamps in the cached portion, deterministic JSON serialization of tool definitions, no mid-context edits to the tool list. A single timestamp or reordered field before the cache breakpoint silently kills the hit rate for the entire session, with no error, just a quietly larger bill.

### Mask, don't remove

Rather than dynamically adding or removing tools from context between steps (which breaks the KV cache and can genuinely confuse the model about what capabilities exist at all), Manus keeps the full tool list stable across a session and uses logit masking or response prefilling to restrict which tools are *selectable* at a given state. This requires lower-level decoding control than every API exposes, so it is not always available to you, but the principle, stable context shape with narrowed *selectable* options rather than a mutating context shape, generalizes even when you can't do true logit masking.

## In practice at Northwind

Desk runs over both dealer chat and employee Slack, with document-store access, so a single session can realistically accumulate order lookups, policy document excerpts, and multi-turn back-and-forth over tens of minutes. Build this way:

1. **Keep retrieved document content out of context by default.** Store a reference (document ID, chunk ID) in the working context, and fetch the full chunk text only on the turn that actually needs to quote it. This keeps a long policy-heavy conversation from silently growing past the length where Context Rot-style degradation starts to bite.
2. **Design the system prompt and tool-definition block to be byte-stable across a session.** No per-request timestamps in that prefix, no dynamically reordered tool lists; put anything genuinely dynamic (the current dealer's name, today's date) after the cacheable prefix, not inside it.
3. **Compact long Slack threads, not dealer chat threads, first.** Employee Slack sessions are the ones most likely to run long and accumulate stale tool output; apply compaction there, logging what gets summarized away so you can audit whether a dropped detail later turns out to have mattered.
4. **Do not assume "put the most important fact early" is settled science.** Given the live Anthropic-vs-Chroma disagreement on needle position, test your own retrieval-ordering choice against your own task set rather than copying either source's default.
5. **Never let a single Desk session run indefinitely without a reset point.** Project Vend's identity-drift episode happened specifically because nothing bounded how long one continuous context could run; a session-length or turn-count boundary that triggers compaction or a fresh start is a direct mitigation, not an optional nicety.

## What strong engineers know

- A bigger context window does not fix context rot; Chroma's finding that degradation persists across 18 models including long-context-optimized ones means "just use a model with more tokens" is not a reliable fix.
- Position-in-context effects (lost in the middle) and length-dependent degradation (context rot) are two distinct, separately measured phenomena; diagnosing which one you're hitting changes the fix.
- Compaction is a deliberate, lossy choice, not free cleanup; log what gets summarized away so a later "why did it forget X" incident is debuggable instead of mysterious.
- A single timestamp or reordered field before a cache breakpoint silently kills your hit rate with no error, just a quietly bigger bill; treat prefix-stability as a reviewed property of your prompt-construction code, not an assumption.
- "Put retrieved results early in the prompt" is Anthropic's RAG guidance, not settled empirical fact; Chroma found no consistent position effect and flagged the disagreement themselves, so test on your own task rather than trusting either default.
- Anything not explicitly persisted to external memory is lost at the session boundary; treat "what does the agent choose to save" as a design decision with an explicit policy, not an emergent property of the model's judgment.
- A long-running session with no reset point can drift in ways a short, scoped session never would, exactly as Project Vend's 24-hour identity-confusion episode demonstrates; bound session length even when nothing else forces you to.

## Decide

Desk's employee Slack integration has started producing occasional odd responses late in long support threads: citing policy details from earlier in the conversation that don't match the actual document, and losing track of which dealer the thread is about after 40+ messages. You have measured that context length in these threads has grown from a few thousand tokens to over 80,000 over the past month as more tool calls accumulated. Options:

1. Switch Desk to a model with a larger context window to buy headroom.
2. Add compaction that summarizes the thread every 20 messages, dropping verbatim tool outputs older than the summary.
3. Add just-in-time retrieval so policy document content is fetched fresh on each citation instead of carried forward from earlier in the thread, plus a hard per-thread turn limit that triggers a fresh session.
4. Do nothing architecturally; instruct the model via the system prompt to "always double check facts against the original source before citing them."

Justify your choice against the Chroma finding that larger context windows do not fix length-dependent degradation, and against what you would lose in each option if a detail from early in the thread turns out to matter on message 45.

## One sentence summary

> Context is not free storage: position and length both degrade a model's reliable use of what's in the window, so curate it deliberately (just-in-time retrieval, compaction, stable cacheable prefixes, external memory) instead of assuming more tokens means more informed.

## Check question

Desk's dealer-chat system prompt currently includes a live timestamp ("Current time: {now}") directly before the tool definitions, and your team notices cache hit rates on that prefix are near zero despite thousands of chats per day using the same tool list. What is the fix, and what would you expect to see in your cost dashboard within a day of applying it?

## Sources

- [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) · Anthropic · Sep 2025 · names context engineering and describes compaction, just-in-time retrieval, and external memory.
- [Context Engineering for AI Agents: Lessons from Building Manus](https://manus.im/en/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus) · Manus (Yichao "Peak" Ji) · Jul 2025 · KV-cache economics, mask-don't-remove, filesystem-as-context.
- [Lost in the Middle: How Language Models Use Long Contexts](https://arxiv.org/pdf/2307.03172) · Liu, Lin, Hewitt, Paranjape, Bevilacqua, Petroni, Liang (Stanford et al.) · Jul 2023, TACL 2024 · the U-shaped positional degradation finding.
- [Context Rot: How Increasing Input Tokens Impacts LLM Performance](https://research.trychroma.com/context-rot) · Chroma (Hong, Troynikov, Huber) · Jul 2025 · the 18-model length-dependent degradation study, and the disagreement with vendor needle-position guidance.
- [Project Vend: Can Claude run a small shop?](https://www.anthropic.com/research/project-vend-1) · Anthropic / Andon Labs · Jun 2025 · the long-session identity-drift episode.
