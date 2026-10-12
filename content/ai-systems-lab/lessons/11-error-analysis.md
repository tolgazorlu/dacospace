# Lesson 11 · Error analysis before evals

**Reading time:** 18 min · **Module:** Evals · **Concepts:** trace review, failure taxonomy, golden datasets, criteria drift
**Cases:** anthropic-three-bugs-postmortem

## The problem

Between early August and early September 2025, Claude users started reporting that the model felt worse: wrong-language tokens, broken syntax, degraded reasoning. Anthropic eventually found three separate, overlapping infrastructure bugs stacked on top of each other: a routing error that sent short-context requests to the wrong server pool (peaking at 16% of Sonnet 4 requests), a TPU misconfiguration corrupting output tokens, and a latent compiler bug in a sampling optimization. The admission that matters most for this lesson is not the bug list. It is this sentence from Anthropic's own postmortem: "the evaluations we ran simply didn't capture the degradation users were reporting, in part because Claude often recovers well from isolated mistakes." ([Anthropic, A postmortem of three recent issues](https://www.anthropic.com/engineering/a-postmortem-of-three-recent-issues))

A frontier lab, with presumably the best internal eval suite in the industry, shipped degraded quality for weeks because its evals were measuring the wrong thing. Users found the failure first, by actually using the product and noticing something felt off. That gap, between what your dashboard says and what your users experience, is the subject of this lesson.

## Why it is hard

If you come from backend engineering, your instinct when something breaks is to write a test that reproduces it, then a regression test that prevents it from coming back. That instinct assumes you already know what "broken" looks like: a 500 status code, a wrong row count, a null where there should be a value.

LLM output does not fail that way. It fails as "subtly worse," "technically correct but unhelpful," "right answer, wrong tone," "cites the right policy but applies it to the wrong case." You cannot write an assertion for a failure mode you have not yet seen, and here is the uncomfortable part: you will not know your application's actual failure modes until you read a stack of real transcripts end to end. Generic benchmarks (MMLU-style accuracy, aggregate helpfulness scores) tell you almost nothing about whether your specific refund bot is mishandling your specific edge cases. Hamel Husain's framing of this is blunt: skipping error analysis is the most common failure mode in teams building LLM evals, because they jump straight to writing automated checks for problems they assume exist instead of problems they have observed. ([Hamel Husain, Your AI Product Needs Evals](https://hamel.dev/blog/posts/evals/))

There is a second trap waiting on the other side. Even once you sit down to grade outputs, the rubric you walk in with will not survive contact with real data. Shreya Shankar and colleagues studied practitioners building LLM evaluators and found that people who wrote grading criteria before looking at outputs consistently revised those criteria once they actually started grading. They called this "criteria drift": you learn what you actually care about by grading, not by writing a spec in a meeting room. ([Who Validates the Validators?](https://arxiv.org/abs/2404.12272)) This contradicts how most engineering teams are trained to work: write the acceptance criteria, then test against it. For open-ended LLM output, the acceptance criteria is a hypothesis, not a spec, until you have graded real examples.

## The idea: read traces like an engineer on call

### Open coding, then axial coding

Error analysis is unglamorous and manual: you pull a sample of real traces (Hamel recommends starting around 100, with at least 30 read and annotated by you personally, not delegated), and for each one you write an open-ended note on what, if anything, went wrong. No categories yet, no rubric, just observation: "answer cited the 2023 price list instead of 2024," "agent asked for order number twice," "tone was dismissive when the dealer was upset." This is open coding.

Once you have enough notes, you cluster them into a smaller set of named failure categories: this is axial coding. The output is a failure taxonomy specific to your product, something like: wrong-document retrieval, policy misapplication, tone mismatch, incomplete tool call sequence, hallucinated order number. This taxonomy, not a generic "helpfulness score," tells you what to build automated checks for. ([Evals FAQ, error analysis](https://hamel.dev/blog/posts/evals-faq/))

Hamel's field guide documents what this buys in practice: in one consulting engagement, systematic error analysis moved a product metric from 33% to 95%, not by a model upgrade, but by finding and fixing the specific, repeated failure classes that a generic dashboard had been averaging away. ([A Field Guide to Rapidly Improving AI Products](https://hamel.dev/blog/posts/field-guide/))

### Golden datasets and regression testing

Once you have a taxonomy, you curate a golden dataset: a versioned set of (input, expected output or grading criteria) pairs, built deliberately to include examples from each failure category you found, not just easy happy-path cases. This set gets wired into CI the way a test suite would be: a pull request that drops the score on the golden set fails the build.

The golden set is only as good as how current it is. A set built from six-month-old traffic stops predicting production quality once your product, users, or failure modes shift; this is dataset drift, and it is why "our eval score has been green for months" is sometimes a sign of a stale eval, not a healthy product.

### Criteria drift as a permanent condition, not a bug to fix once

Because criteria drift is a property of the task, not a one-time mistake, the correct response is procedural: re-run error analysis on a cadence (every two to four weeks, reviewing 100+ fresh traces, is the heuristic the Evals FAQ suggests), expect the rubric to change, and version it with a changelog so you can tell whether a score drop is a real regression or a rubric update.

| Approach | What it catches | What it misses | Cost |
|---|---|---|---|
| Generic aggregate benchmark (MMLU-style, blended helpfulness score) | Gross capability regressions | Application-specific failure modes, silent degradation that "recovers from isolated mistakes" | Low to run, high in false confidence |
| Manual error analysis on real traces | Your product's actual failure taxonomy | Nothing inherently, but does not scale by headcount alone | High per-review, front-loaded |
| Golden-set regression test in CI | Known failure modes recurring | New failure modes outside the set (dataset drift) | Low once built, needs refresh |
| Continuous production sampling | Drift and failures the golden set never anticipated | Requires a sampling strategy and judge-cost discipline | Ongoing, scales with traffic |

## In practice at Northwind

Desk, Northwind's dealer assistant, has a quality dashboard that has shown "94% helpful" for two months. A dealer calls in to complain that Desk issued a $400 credit twice for the same return. The dashboard never flagged it.

Order of operations:

1. Do not trust the dashboard and do not trust the complaint alone either. Pull 100 real Desk transcripts from the last two weeks, weighted toward credit-issuing conversations, and read 30 of them yourself before writing a single new metric.
2. Write open-ended notes per transcript: what Desk did, what the dealer wanted, anything odd. Resist the urge to score 1-5; just describe.
3. Cluster the notes. At Northwind this might surface categories like: duplicate credit issued on retry after a timeout, credit applied against the wrong order ID, correct credit but no ticket opened for the audit trail, tone issues when a dealer is already frustrated.
4. Pick the two or three categories costing the most (duplicate credits are a direct financial loss; missing audit tickets are a compliance risk) and build a golden set of 20-30 examples per category, including the duplicate-credit transcript the dealer reported.
5. Wire a cheap, deterministic check for the mechanical failure (did the tool log show two `issue_credit` calls for the same order ID in one session) into CI as a trajectory assertion, not an LLM judge. Save the judge for genuinely open-ended quality questions like tone.
6. Put a recurring 3-week calendar block on the team's schedule to re-run steps 1-3 on fresh traces. The taxonomy built this month will be incomplete by the time Desk ships its next feature.

## What strong engineers know

- A green dashboard and a user complaint are not contradictory signals; they usually mean the dashboard is measuring the wrong thing, not that the user is wrong. ([Anthropic postmortem](https://www.anthropic.com/engineering/a-postmortem-of-three-recent-issues))
- You cannot write an eval for a failure mode you have not personally read in a transcript. Automating before observing produces evals that measure things that rarely fail.
- Rubrics written in a planning meeting, before anyone has looked at real outputs, are hypotheses. Expect to revise them after the first grading pass, and budget time for that revision instead of treating it as scope creep. ([Who Validates the Validators?](https://arxiv.org/abs/2404.12272))
- Mechanical, checkable failures (did the agent call a tool twice, did it skip a required step) belong in cheap code assertions. Save LLM judges for genuinely subjective quality dimensions like tone or helpfulness.
- "Recovers well from isolated mistakes" is exactly the property that lets an aggregate score hide a real, persistent defect. If your eval only measures final-answer correctness averaged across many trials, a tail-latent bug can live in production for weeks. ([Anthropic postmortem](https://www.anthropic.com/engineering/a-postmortem-of-three-recent-issues))
- A golden set is a snapshot, not a ground truth. Treat its age like you would treat the age of a cached value: stale caches serve wrong answers confidently.
- Moving a metric from 33% to 95% in a real engagement came from systematic error analysis, not from a bigger model or a cleverer prompt. ([Field Guide](https://hamel.dev/blog/posts/field-guide/))
- Error analysis does not scale by adding more reviewers indefinitely. As volume grows, you need tooling: a fast, purpose-built data viewer beats a generic analytics dashboard for this task.

## Decide

Northwind's leadership sees Desk's dashboard at 92% "quality score" (a single blended LLM-judge number) and, separately, three dealer complaints this week about wrong credit amounts. You have one sprint before the next planning review. Pick one, and justify it against the other three:

(a) Trust the 92% dashboard score; three complaints out of thousands of conversations is noise, so no action is needed this sprint.
(b) Immediately roll back last week's prompt change, since it is the most recent variable, without reading any of the complaint transcripts.
(c) Pull the raw traces behind the three complaints plus a random sample of recent credit-issuing conversations, read them yourself, and build a failure taxonomy before deciding whether to roll back, patch, or add a new check.
(d) Add a new generic "accuracy" criterion to the existing LLM judge and re-run it against the same 92%-scoring dataset to see if the number changes.

## One sentence summary

> Before you build a single automated eval, read 100 real traces yourself, because a dashboard cannot measure a failure mode nobody has looked for yet.

## Check question

Northwind just added voice support to Desk (dealers can call in instead of using Slack). The existing golden set, built from text transcripts, still scores 96% every week, but voice-channel complaints are rising. What do you do, and why does a green score on the existing golden set not settle the question?

## Sources

- [Your AI Product Needs Evals](https://hamel.dev/blog/posts/evals/) · Hamel Husain · Mar 2025 · The canonical framing of error analysis as the step most teams skip.
- [AI Evals: Everything You Need to Know (Evals FAQ)](https://hamel.dev/blog/posts/evals-faq/) · Hamel Husain & Shreya Shankar · ongoing · Methodology for sample sizes and re-run cadence.
- [A Field Guide to Rapidly Improving AI Products](https://hamel.dev/blog/posts/field-guide/) · Hamel Husain · Mar 2025 · The 33% to 95% case study from manual error analysis.
- [Who Validates the Validators? Aligning LLM-Assisted Evaluation of LLM Outputs with Human Preferences](https://arxiv.org/abs/2404.12272) · Shankar et al., UIST 2024 · Origin of "criteria drift."
- [A postmortem of three recent issues](https://www.anthropic.com/engineering/a-postmortem-of-three-recent-issues) · Anthropic, Sam McAllister · Sep 17, 2025 · "Evals didn't capture the degradation users were reporting."
