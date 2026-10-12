# Case · SWE-bench Verified contamination (2026)

**Category:** Evals · **Lessons:** 13, 12 · **Severity:** benchmark retracted by its own publisher after contamination audit

## The system

SWE-bench Verified is a 500-task coding benchmark, a human-filtered subset of the original SWE-bench, built from real GitHub issues and pull requests in widely used open-source repositories (Django, Astropy, and similar). OpenAI and other labs reported frontier model scores against it as a headline capability number.

## What was observed

OpenAI audited 138 SWE-bench Verified problems that its o3 model failed to solve consistently across 64 runs. Separately, it ran automated red-teaming where one model tried to extract memorized gold-patch details from another.

## Stop and think

1. SWE-bench tasks are mined from public GitHub history. What does that imply about whether those exact tasks could already be inside a frontier model's training data?
2. If a model reproduces a bugfix's exact variable names and inline code comments, what does that tell you about whether it reasoned its way to the fix?
3. Three vendors all report scores above 70% on the same public benchmark. What single number would you ask for instead, and why?

## What actually happened

The 138-problem audit found 59.4% had flawed tests (narrow/strict tests, or "wide" tests checking unspecified behavior) even after SWE-bench Verified's original human filtering had already dropped 68.3% of the raw SWE-bench set for being unfair or underspecified.

The sharper finding came from the red-teaming exercise: GPT-5.2, Claude Opus 4.5, and Gemini 3 variants reproduced verbatim gold patches, exact parameter names, and even inline code comments from problems they should never have seen solutions to. ([OpenAI, Why SWE-bench Verified no longer measures frontier coding capabilities](https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/))

SWE-bench tasks are sourced from public GitHub issues and PRs in repositories that are also present in frontier pretraining corpora. A model that has memorized the fix outperforms a model that actually reasons about the issue, which inflates apparent capability gains without reflecting real generalizable capability. OpenAI subsequently retracted its own earlier recommendation of SWE-Bench Pro as a contamination-resistant successor, after finding roughly 27-34% of its public-split tasks were also broken. ([OpenAI, Separating signal from noise in coding evaluations](https://openai.com/index/separating-signal-from-noise-coding-evaluations/))

## Root causes

**Technical:** benchmark construction from public, widely-crawled web data (GitHub) overlaps with the pretraining corpora of the models being evaluated on it; there is no built-in mechanism preventing memorization from masquerading as reasoning.

**Organizational:** the industry adopted a single public leaderboard number as a proxy for general capability, without a standing contamination audit process, and without distinguishing "passes the specific test files modified by the fixing PR" from "is actually correct."

## What would have prevented it

- **Canary strings and access controls on benchmark data** before public release, so exact-reproduction probes like the one OpenAI ran become a detectable, known indicator.
- **Sourcing tasks from private or freshly-created repositories** unlikely to be in any training corpus, at the cost of more expensive and slower benchmark construction (and losing the ability to compare against historical public scores).
- **Password-protecting datasets and filtering canaries out of training data**, OpenAI's own explicit recommendation, which requires cooperation across labs rather than one vendor acting alone.

## The lesson for your system

- A leaderboard number without a contamination audit is not evidence of generalizable capability; ask what the benchmark is built from and whether that overlaps with training data.
- "Verified" and "curated" are not permanent properties of a benchmark; a benchmark fixed for one known flaw (SWE-bench Verified) can still need re-auditing as models and the benchmark's own public visibility change.
- If you must report one number to a non-technical stakeholder, pair it with an explicit caveat about contamination risk rather than presenting it unqualified.
- Build your own private, held-out task set from your actual codebase or domain if a vendor comparison decision carries real weight; public benchmarks built from web-scraped data have a contamination half-life.

## Sources

- [Introducing SWE-bench Verified](https://openai.com/index/introducing-swe-bench-verified/) · OpenAI · Aug 2024
- [Why SWE-bench Verified no longer measures frontier coding capabilities](https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/) · OpenAI · 2026
- [Separating signal from noise in coding evaluations](https://openai.com/index/separating-signal-from-noise-coding-evaluations/) · OpenAI · 2026
