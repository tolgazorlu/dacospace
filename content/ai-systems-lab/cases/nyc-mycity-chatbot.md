# Case · NYC MyCity chatbot (2024)

**Category:** Knowledge · **Lessons:** 15, 18 · **Severity:** systematically wrong legal advice, kept online after being shown the errors

## The system

NYC's Office of Technology and Innovation launched a Microsoft Azure-based chatbot, the MyCity Business Assistant, in October 2023 to help business owners navigate city regulations: licensing, labor law, housing rules, and similar. It was grounded in city informational web pages.

## What was observed

The Markup's March 2024 investigation tested the chatbot against known city regulations and found it gave confidently wrong answers on multiple high-stakes legal topics.

## Stop and think

1. A government chatbot answering regulatory questions gets a question wrong once. Is that a tolerable error rate, and what would change your answer?
2. The city added a disclaimer after being shown the errors, instead of fixing or pulling the bot. What does a disclaimer actually change about the risk to the end user?
3. If you had to decide, before launch, which question categories are too high-stakes for open generation, how would you draw that line?

## What actually happened

The chatbot told users that landlords are not required to accept Section 8 housing vouchers (false; this is illegal discrimination under NYC Human Rights Law), that a restaurant could go fully cashless (false; a 2020 city council law requires accepting cash), and that employers could keep a cut of worker tips (false; illegal under federal law). The Markup got the same wrong answer from 10 separate staff members asking independently. ([The Markup's original investigation](https://themarkup.org/artificial-intelligence/2024/03/29/nycs-ai-chatbot-tells-businesses-to-break-the-law))

The city kept the chatbot online after being shown the errors, adding only a disclaimer. A follow-up test by THE CITY found the chatbot was unaware even of its own new disclaimer. ([THE CITY follow-up](https://thecity.nyc/2024/04/02/malfunctioning-nyc-ai-chatbot-still-active-false-information))

The bot appears to have answered with generic, plausible-sounding legal language rather than reliably retrieving and quoting the specific regulation in force. It had no built-in way to verify legal currency or jurisdictional scope, so confident wrong answers were indistinguishable from confident right answers from the output alone.

## Root causes

**Technical:** grounding existed (city informational pages) but was not tight enough to force the model to quote the specific rule rather than generate plausible-sounding legal language; no mechanism flagged low-confidence or unverifiable answers on high-stakes legal topics.

**Organizational:** no pre-deployment adversarial testing against known-answer legal questions before public launch; after the errors were documented and independently reproducible (10/10 testers), the response was a disclaimer rather than a fix or a kill switch.

## What would have prevented it

- **Pre-deployment adversarial testing** against a curated set of high-stakes legal questions with known correct answers, across protected categories (housing, labor, consumer law), before public launch. Costs time before shipping; the alternative cost here was a public investigative story.
- **Routing legally sensitive topics to verified static text or a "consult official source" fallback** instead of open generation, accepting reduced flexibility in exchange for not generating legal advice at all on the highest-stakes categories.
- **An automatic kill-switch policy** triggered once independent testers reproduce consistent wrong answers across many trials, rather than relying on a disclaimer as the response to a demonstrated, reproducible failure.

## The lesson for your system

- A disclaimer is not a fix; if your system is shown to be reliably wrong on a specific question, the correct response is to fix or pull it, not to add a caveat and leave it running.
- A government or regulated-domain assistant that generates plausible legal advice without verified retrieval and without the ability to say "unsure" creates real legal exposure for end users, not just reputational risk for the operator.
- Before launch, build an adversarial test set of known-answer questions in your highest-stakes categories and require it pass before going live.
- Decide in advance which question categories are too high-stakes for open generation and route those to verified static content or an explicit "consult official source" fallback.

## Sources

- [NYC's AI Chatbot Tells Businesses To Break The Law](https://themarkup.org/artificial-intelligence/2024/03/29/nycs-ai-chatbot-tells-businesses-to-break-the-law) · The Markup (Colin Lecher), co-published with Documented NY and THE CITY · 29 Mar 2024
- [Malfunctioning NYC AI Chatbot Still Active Despite Widespread Evidence It's Encouraging Illegal Behavior](https://thecity.nyc/2024/04/02/malfunctioning-nyc-ai-chatbot-still-active-false-information) · THE CITY · 2 Apr 2024
