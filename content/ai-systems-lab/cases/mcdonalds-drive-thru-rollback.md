# Case · McDonald's rolls back drive-thru AI ordering (2024)

**Category:** Production · **Lessons:** 18, 21 · **Severity:** enterprise-scale reliability failure, full rollback after ~3 years

## The system

McDonald's piloted IBM-built AI voice ordering across more than 100 US drive-thrus for roughly three years, taking spoken customer orders in real time at checkout without a human order-taker.

## What was observed

Viral videos circulated showing comically wrong orders: hundreds of chicken nuggets, bacon added to ice cream, nine iced teas added to a single bill. In June 2024, McDonald's ended the pilot.

## Stop and think

1. Analysts cited an informal bar of 95%+ accuracy needed to beat a human order-taker on cost and reliability, while the system reportedly stuck in the "low-to-mid 80% range." What does that gap mean in terms of how many orders per shift go wrong, and who absorbs that cost?
2. A drive-thru is a high-ambiguity, real-time audio environment (accents, dialects, background noise). What design choice determines whether a low-confidence transcription becomes a wrong order on someone's bill, or gets caught before it does?
3. This ran successfully enough to stay deployed for roughly three years before rollback. What does that tell you about the difference between "works often enough to ship" and "works reliably enough to scale without a human safety net"?

## What actually happened

Speech recognition in the drive-thru environment struggled with the ordinary variation real customers bring: accents, dialects, background noise, overlapping speech from multiple car occupants. Analysts reported the system's accuracy stuck in the "low-to-mid 80% range," against an informal bar of 95%+ that would be needed to actually beat a human order-taker on cost and reliability at this task ([CNN](https://www.cnn.com/2024/06/17/tech/mcdonalds-ai-drive-thru-program); [AP News](https://apnews.com/article/mcdonalds-ai-drive-thru-ibm-bebc898363f2d550e1a0cd3c682fa234)).

Critically, there was no clear fallback to a human when the system's confidence in a transcription was low. Rather than escalating ambiguous or uncertain orders to a person, the system committed its best guess, and incorrect orders reached checkout instead of being caught earlier. The viral failures (hundreds of nuggets, bacon on ice cream, nine iced teas) are the visible symptom of that missing escalation path, not isolated one-off bugs; they are what a committed low-confidence guess looks like at drive-thru volume.

## Root causes

**Technical.** Speech recognition accuracy in a genuinely high-noise, high-variance real-world environment fell well short of the threshold needed for unattended operation, and the system had no confidence-based routing to a human for low-certainty transcriptions.

**Organizational.** The pilot ran for roughly three years before rollback, which suggests the deployment was time-gated or footprint-gated rather than gated on a measured accuracy threshold; scaling and continuation decisions do not appear to have been tied to hitting a specific, pre-agreed reliability bar before expanding past the pilot.

## What would have prevented it

- An explicit confidence threshold with automatic handoff to a human for low-confidence transcriptions, rather than silently committing a best guess to the order. This is the single highest-leverage fix: it converts "wrong and confident" into "visibly uncertain and escalated," which is a much cheaper failure mode for both the customer and the brand.
- Staged rollout gated on measured accuracy thresholds, not on elapsed time or a fixed location count, before scaling past the pilot footprint. This requires committing to a number up front and being willing to not scale if the number isn't hit.
- Continuous, environment-specific accuracy monitoring (per location, per time of day, accounting for noise conditions) rather than a single aggregate figure that can mask where and when the system is actually failing.

## The lesson for your system

- If your AI system interacts with customers unattended in a noisy, ambiguous, real-time setting, define your actual accuracy requirement before launch, in writing, and gate rollout on measuring it, not on calendar time.
- Build a confidence-based escalation path to a human for any customer-facing automation; a system that visibly asks for help when uncertain is usually better for trust than one that silently commits a wrong answer with no warning sign.
- Remember that a system working well enough to stay deployed for years is not the same as a system working well enough to scale past a pilot; "it mostly worked" and "it's ready to be the only option" are different bars.
- Treat viral public failures as a symptom, not the root cause; the real fix target here is the missing escalation path, not the specific orders that went viral.
- Separate the accuracy question from the escalation-design question in your own postmortems: a team that only chases a better speech model without also building a confidence-based human handoff will hit the same wall again at the next accuracy plateau, just with a different headline.

## A note on what is not fully resolved

The dossier does not give a precise, independently audited accuracy figure, only an analyst-cited range ("low-to-mid 80%"), and it does not specify what confidence threshold, if any, the deployed system actually used before committing an order. Treat the specific percentages here as directionally correct, reported by analysts and multiple outlets, rather than as an exact, vendor-confirmed number.

## Sources

- [McDonald's pulls AI ordering from drive-thrus](https://www.cnn.com/2024/06/17/tech/mcdonalds-ai-drive-thru-program) · CNN / multiple outlets · Jun 17, 2024
- [Low-to-mid 80% accuracy vs. a 95%+ needed-to-beat-a-human bar](https://www.cnbc.com/2024/06/17/mcdonalds-to-end-ibm-ai-drive-thru-test.html) · CNBC · Jun 17, 2024
