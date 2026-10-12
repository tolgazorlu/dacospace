# Case · Anthropic's three infrastructure bugs (2025)

**Category:** Evals · **Lessons:** 01, 14 · **Severity:** weeks-long, intermittent quality degradation across multiple models, root-caused to three overlapping infra bugs

## The system

Claude, Anthropic's model family (Opus 4/4.1, Sonnet 4, Haiku 3.5), served through Anthropic's own API and through Claude Code, running on a mixed fleet including TPU hardware with an XLA:TPU compilation path.

## What was observed

Between early August and early September 2025, users reported inconsistent quality degradation: wrong-language tokens appearing mid-response, syntax errors, and generally worse output than expected, without a clear pattern of when or for whom it happened.

## Stop and think

1. If your production eval suite is "green" but users are reporting a problem, what are the possible explanations, ranked by how likely each is?
2. What would make a defect "intermittent" and "platform-specific" rather than a clean, reproducible regression? What kind of testing catches that versus misses it?
3. You run pre-deploy benchmarks, not continuous evals on live traffic. What class of bug can a benchmark suite never catch, no matter how comprehensive?

## What actually happened

Anthropic found three separate, overlapping infrastructure bugs, not one:

1. A context-window routing error from Aug 5 misrouted short-context Sonnet 4 requests to servers provisioned for 1M-token context, peaking at 16% of Sonnet 4 requests on Aug 31 after an Aug 29 load-balancing change (baseline impact before that change was 0.8%).
2. A TPU misconfiguration from Aug 25 caused output corruption (wrong-language tokens, syntax errors) in Opus 4/4.1 and Sonnet 4.
3. A latent XLA:TPU compiler bug in the "approximate top-k" sampling optimization, confirmed on Haiku 3.5 and suspected on Sonnet 4/Opus 3.

The deepest root cause was a mixed-precision mismatch (bf16 vs fp32) in token-probability selection across TPU chips. A December 2024 workaround for a related dropped-token bug had been masking this approximate top-k bug; it resurfaced when the workaround was removed on the mistaken belief the underlying issue was already fixed. ([Anthropic, A postmortem of three recent issues](https://www.anthropic.com/engineering/a-postmortem-of-three-recent-issues))

Anthropic states plainly: "the evaluations we ran simply didn't capture the degradation users were reporting, in part because Claude often recovers well from isolated mistakes." Roughly 30% of Claude Code users had at least one message routed to a misconfigured server during the incident window.

## Root causes

**Technical:** a chain of three independent bugs across routing, hardware configuration, and compiler-level numerical precision, any one of which alone might have been minor but which overlapped in time and compounded in user-visible impact. The removal of a workaround, done on an incorrect belief about root cause, reintroduced a latent defect.

**Organizational:** quality evaluation ran periodically against pre-deploy benchmarks rather than continuously on production traffic. A model that "recovers well from isolated mistakes" can look fine on an aggregate benchmark score while a meaningful tail of requests are silently corrupted.

## What would have prevented it

- **Continuous, not periodic, quality evaluation directly on production traffic**, able to catch tail-latent and platform-specific defects that an aggregate benchmark score averages away. This is expensive to build and run at scale, but it is the only layer that catches exactly this class of bug.
- **Treating infra-level changes (routing, load balancing, compiler flags, kernel-level sampling optimizations) as model-quality risk**, with the same regression-eval discipline applied to prompt or model changes, not just serving-stack unit/integration tests.
- **Auditing the reasoning behind removing a workaround**, not just the workaround's removal itself; "we believe the root cause is fixed" needs the same evidence bar as "we believe this new feature is safe to ship."

## The lesson for your system

- Silent infrastructure changes (routing, load balancing, compiler/runtime config) are a model-quality risk indistinguishable from a bad prompt or model swap; they need the same eval discipline, not just infra testing.
- An aggregate benchmark score can hide an intermittent, tail-latent defect if the model "recovers well from isolated mistakes"; sample and score real production traffic continuously, not just at deploy time.
- Before removing a workaround for a known bug, confirm the actual root cause is fixed, not just that the symptom has stopped recurring.
- When multiple bug reports look inconsistent and hard to reproduce, consider that you may be looking at several overlapping bugs, not one.

## Sources

- [A postmortem of three recent issues](https://www.anthropic.com/engineering/a-postmortem-of-three-recent-issues) · Anthropic, written by Sam McAllister · Sep 17, 2025
