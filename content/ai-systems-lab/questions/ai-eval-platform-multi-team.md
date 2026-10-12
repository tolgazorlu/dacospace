---
id: ai-eval-platform-multi-team
title: Build a shared eval platform for many product teams
level: senior
topics: [ai, evals, observability, platform]
minutes: 45
---

## Prompt

Several product teams at your company each run their own LLM-based feature (support chat, a coding assistant, an internal search bot) and each currently has its own ad hoc way of checking quality. Leadership wants one shared eval platform all teams use. Design it.

## Clarifications

- **Scale?** 6 teams, each shipping prompt or model changes weekly; combined traffic ~2M LLM calls/month across features.
- **Current state?** Each team hand-checks a handful of examples before shipping; no shared definition of "quality," no CI gate.
- **Ask from leadership?** A single dashboard, but teams' failure modes are different: support cares about policy correctness, the coding assistant about code correctness, search about retrieval relevance.
- **Data sensitivity?** Some traces contain customer PII and must not leave an approved review tool.
- **Budget?** Eval/judge spend should not exceed 15% of the combined primary-model spend.
- **Rollout need?** Each team needs a CI gate that blocks a risky prompt or model change before it reaches production.

## Follow-ups

- A team's LLM-judge-based CI gate has been green for 3 months while their production complaints rise. How do you diagnose and prevent this platform-wide?
- Finance asks why the shared judge spend tripled this quarter while primary traffic only grew 20%. Walk through how you'd find out.
- One team wants a trajectory-level check (did the agent call tools correctly) and another only needs final-answer correctness. How does a shared platform serve both without becoming a lowest-common-denominator blended score?
- A new team wants to onboard next week with zero existing eval data. What's their path to a working CI gate, and how long does it realistically take?

## Rubric

- Separates generic model benchmarks from product-specific evals, and lets each team define its own failure taxonomy rather than forcing one blended "quality score."
- Requires error analysis on real traces as the starting point for any new eval, before writing automated checks.
- Splits checks into code-based assertions versus LLM judges by failure type, and supports both outcome-level and trajectory-level checks as first-class, not just final-answer scoring.
- Designs the offline (golden set, CI gate) / online (sampled production, continuous) split as a shared platform capability, not something each team reinvents.
- Addresses judge cost explicitly: sampling strategy, judge model size choice, and how judge spend is tracked separately from tracing/storage spend.
- Builds in a recurring dataset-refresh cadence so golden sets don't go stale as product surfaces change, with a documented versioning/diff process.
- Handles PII: traces containing customer data stay within an approved review tool/environment, not exported to a generic dashboard.

## Pitfalls

- One shared LLM-judge prompt scoring everything 1-5 for "helpfulness," hiding which specific failure mode moved for any given team.
- A CI gate that stays green for months while production quality degrades, because the golden set never gets refreshed.
- Treating judge cost as free; a 100%-sampling, large-judge-model default that makes judge spend exceed primary model spend.
- No trajectory-level checks, so a tool-call sequence bug that doesn't change final-answer text is invisible to the platform.
