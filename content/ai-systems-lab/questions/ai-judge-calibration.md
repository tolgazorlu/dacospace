---
id: ai-judge-calibration
title: Diagnose and calibrate a miscalibrated LLM judge
level: senior
topics: [ai, evals, llm-judge, observability]
minutes: 45
---

## Prompt

Your RAG-based support bot shows a 92% "helpfulness" score from an LLM judge on your eval dashboard, but customer complaints say answers about refund policy are confidently wrong. Diagnose the eval and fix it.

## Clarifications

- **Judge setup?** A single LLM judge scores every response 1-5 for "helpfulness" against no explicit rubric beyond a short instruction.
- **Validation history?** The judge has never been checked against human-labeled examples; it was configured once and left alone.
- **Volume?** ~50,000 scored conversations/month; manual review only happens when a complaint is filed.
- **Known judge failure modes?** Position bias in pairwise comparisons, and reward-style sycophancy, the judge rating agreeable-sounding answers higher regardless of correctness, are both documented risks for this kind of judge.
- **Constraint?** You need a fix that ships in the next two weeks, and a plan for ongoing judge-quality monitoring after that.

## Follow-ups

- You pull 20 real transcripts and grade them by hand. What specifically are you looking for before you touch the judge prompt or rubric?
- How do you validate that your fixed judge agrees with human judgment, and what agreement rate would you consider good enough to trust in CI?
- Six months from now, how would you detect that the judge has quietly drifted out of alignment with human judgment again, without re-running a full manual audit every time?
- A teammate proposes using the same model family as the judge that generates the responses. What's the risk, and would you do it anyway?

## Rubric

- Separates retriever failure from generator failure, was the right policy document retrieved, and did the model actually use it, instead of treating "helpfulness" as one undifferentiated score.
- Starts with manual error analysis on a sample of real transcripts before changing the judge, rather than tuning the judge prompt blind.
- Replaces the single blended "helpfulness" score with specific metrics for this failure class (contextual precision/recall for retrieval, faithfulness for generation) validated against human labels.
- Builds a human-labeled validation set and reports judge-human agreement, not just judge score, as the thing that's monitored going forward.
- Names at least one concrete judge failure mode relevant here (position bias in comparisons, or sycophancy rewarding agreeable-but-wrong answers) and designs the fix to be robust to it.
- Proposes an ongoing cadence, not a one-time fix, for re-validating the judge against fresh human-labeled examples as production traffic shifts.
- States the trade-off: a stricter, more specific eval catches more real failures but costs more judge calls and engineering time to maintain.

## Pitfalls

- Tightening the judge's prompt or threshold without first doing manual error analysis to find the actual failure mode.
- Treating "high judge score" as proof of quality with no human-labeled ground truth ever checked against it.
- Fixing this once and not building a recurring recheck, so the same drift recurs silently later.
- Using the same model that generates responses as the judge without considering self-preference bias.
