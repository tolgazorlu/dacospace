# Case · Cursor's support bot invents a policy and cancels its own customers (2025)

**Category:** Agents · **Lessons:** 18, 21 · **Severity:** hallucinated company policy, caused real subscription cancellations

## The system

Cursor, an AI-powered code editor, runs an AI support agent named "Sam" to handle customer support conversations. Users were not told "Sam" was AI; many believed they were talking to a human support representative.

## What was observed

Users noticed they were being logged out when switching between machines. When they asked support about it, "Sam" told at least one user this was expected behavior under a new "one device per subscription" security policy. No such policy existed. The claim spread on Reddit and Hacker News, and triggered real subscription cancellations before Cursor's co-founder publicly corrected it.

## Stop and think

1. "Sam" gave a specific, confident, named-policy answer to a question it apparently had no actual record of the answer to. What should a support agent do instead when it does not have a grounded answer, and what would have to change for it to do that?
2. Different users reportedly got different and inconsistent explanations for the same symptom. What does that inconsistency tell you about whether the agent was retrieving an answer from a real source, versus generating one?
3. Users believed "Sam" was a human. Does that belief change the severity of the fabricated-policy outcome, and if so, how?

## What actually happened

The real cause of the logout behavior was an unrelated session-security bug, not a deliberate policy change. "Sam" had no constraint forcing it to say "I don't know" or escalate when asked about a policy it had no actual record of; instead it generated a plausible-sounding, specific answer, naming a "one device per subscription" security policy that did not exist ([Ars Technica](https://arstechnica.com/ai/2025/04/cursor-ai-support-bot-invents-fake-policy-and-triggers-user-uproar/)).

Because the hallucination was non-deterministic, different users who hit the same underlying bug and asked support about it got different, inconsistent explanations. When users compared notes on Reddit and Hacker News, those inconsistencies compounded the credibility damage: it was not just that one answer was wrong, it was that the company appeared to be making up different explanations for different customers. Some users canceled their subscriptions specifically because they believed a new restrictive device policy had been imposed without notice. Cursor's co-founder publicly corrected the record only after the claim had already spread.

A second, compounding factor: users were not told "Sam" was an AI agent, and many assumed a human support representative had given them this answer, which likely increased how much weight they put on the claim before it was debunked.

## Root causes

**Technical.** The support agent answered open-ended policy questions by free generation rather than being restricted to cite an actual, verified policy document; there was no "ground the answer or decline" constraint for this category of question.

**Organizational.** The agent's AI identity was not disclosed to users, and there was no monitoring in place that treated a sudden spike in a specific, unusual support claim (a brand-new device-limit policy nobody on the product team recognized) as an anomaly worth reviewing before it reached dozens of affected users and spread publicly.

## What would have prevented it

- A strict "cite the policy document or say you don't know" constraint for any support-agent answer involving company policy, rather than allowing free generation on topics without a grounded source. This is the direct fix and the lowest-cost one: it trades a small amount of conversational fluency for never fabricating a named policy.
- Disclose the agent's AI identity to users. This does not prevent hallucination, but it changes how much authority users correctly assign to an unverified claim, and it is a basic honesty requirement independent of the reliability question.
- Monitor for a spike in a specific, unusual support claim and treat it as an anomaly to investigate before it reaches a large number of users, rather than discovering the pattern only after public backlash.

## The lesson for your system

- For any customer-facing agent that can be asked about company policy, confirm today whether it is restricted to cite verified documents or can generate a plausible-sounding answer with no grounding; if the latter, you have this exact exposure.
- Disclose when a support interaction is with an AI agent rather than a human; this is both an honesty obligation and a factor in how much damage a wrong answer does.
- Build monitoring that flags unusual, specific claims appearing in support transcripts (a named policy nobody on the product team recognizes) as an anomaly, not just track aggregate satisfaction scores.
- Remember that non-deterministic hallucination is worse at scale than a single wrong answer: inconsistent explanations across users erode trust faster than a single consistent (even if occasionally wrong) answer would.

## Sources

- [Company apologizes after AI support agent invents policy that causes user uproar](https://arstechnica.com/ai/2025/04/cursor-ai-support-bot-invents-fake-policy-and-triggers-user-uproar/) · Ars Technica · Apr 2025
