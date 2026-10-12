# Lesson 22 · Governance for engineers

**Reading time:** 19 min · **Module:** Production · **Concepts:** EU AI Act, NIST AI RMF, ISO/IEC 42001, PII and retention
**Cases:** nyc-mycity-chatbot

## The problem

In October 2023, New York City's Office of Technology and Innovation launched a Microsoft Azure-based chatbot, the MyCity Business Assistant, to help business owners navigate city regulations. In March 2024, The Markup's investigation found it telling users that landlords are not required to accept Section 8 housing vouchers (false, illegal discrimination under NYC Human Rights Law), that a restaurant could go fully cashless (false, a 2020 city council law requires accepting cash), and that employers could keep a cut of worker tips (false, illegal under federal law). The city kept the chatbot online after being shown the errors, adding only a disclaimer. A follow-up investigation by THE CITY found the chatbot was unaware even of its own disclaimer.

This is a product problem (covered in Lesson 18, grounding and citations) and also a governance problem: nobody appears to have had a pre-launch process requiring the system to pass adversarial testing against known-correct legal answers before shipping to the public, and nobody had a defined trigger for pulling the system once independent testers documented consistent, repeatable legal errors. Governance is the layer that is supposed to catch exactly this gap before an incident becomes a news story, and this lesson is about what that layer actually requires of an engineer, not a lawyer.

## Why it is hard

Most backend engineers have some exposure to compliance from adjacent domains, SOC 2, GDPR, PCI DSS, and the instinct is to treat AI governance as more of the same: a checklist, a vendor tool, a once-a-year audit. That instinct underestimates two things specific to this space.

First, the legal landscape is genuinely in motion, not settled. The EU AI Act is a binding regulation with real fines, phased in over a multi-year schedule that has itself already been amended once (the 2026 "Digital Omnibus" deferrals). NIST's AI RMF and ISO/IEC 42001 are voluntary frameworks that are becoming de facto mandatory through procurement requirements and insurance underwriting rather than through law. An engineer who treats "we're ISO 42001 certified" as equivalent to "we comply with the EU AI Act" has made a category error that a regulator will not accept as a defense.

Second, and more directly relevant to daily engineering work: courts have already established that a company is liable for what its own chatbot says, with the same duty of care as its static web pages, there is no "the AI said it, not us" defense. That means every design decision about what an AI system is allowed to generate unsupervised, is a governance decision with legal consequences, whether or not anyone labeled it that way at the time.

## The idea: binding law, voluntary frameworks, and your own exposure

### The EU AI Act: binding, staged, and already amended once

The EU AI Act (Regulation (EU) 2024/1689) entered into force 1 August 2024 and applies in stages: prohibited practices and AI-literacy duties from 2 February 2025; general-purpose AI model obligations from 2 August 2025; the bulk of transparency obligations and general application from 2 August 2026; Annex III high-risk obligations deferred to 2 December 2027 and Annex I product-embedded high-risk obligations to 2 August 2028 (both deferred from earlier 2026/2027 dates by the 2026 Digital Omnibus amendment). Maximum penalty for the most serious violations (prohibited practices): up to €35M or 7% of worldwide annual turnover, whichever is higher.

The practical engineering question the Act forces: what risk tier does your system fall into? A system that is high-risk under Annex III, or falls under general-purpose AI model provider obligations, carries different and heavier obligations than one that is neither. This classification is not a one-time decision; a new feature can move a system into a higher tier, and someone inside the company needs to own re-classification on an ongoing basis, not just at initial launch.

### NIST AI 600-1: a voluntary, named risk list

NIST AI 600-1 (July 2024) is a voluntary companion profile to the base AI RMF 1.0, specific to generative AI. It names 12 generative-AI-specific risk categories, confabulation/hallucination, CBRN uplift, data privacy, information security, human-AI configuration, among others, as a bounded, evidence-based list that explicitly excludes speculative future-system risks, and maps suggested actions to the RMF's Govern/Map/Measure/Manage functions. It does not replace the base framework, and it carries no fine for non-compliance; its force comes from procurement and audit expectations, not statute.

### ISO/IEC 42001: certifying the organization, not the model

ISO/IEC 42001:2023, published December 2023, is the first certifiable AI management system standard (AIMS), structured like ISO 27001 under Annex SL. It requires documented AI risk assessment, risk treatment, and an impact assessment process. The certification applies to an organization's management system, the process by which the company governs its AI systems, not to any specific model or product. A certificate does not mean any particular feature is safe or compliant with the EU AI Act; it means the organization has a documented process for managing AI risk.

### The liability precedent that applies regardless of framework

Independent of any of the above frameworks, court and tribunal rulings have already established the baseline exposure an engineer needs to carry in their head: whatever a company's customer-facing AI system states is treated as the company's own representation, with ordinary negligence and misrepresentation law applying. This did not require the EU AI Act, NIST, or ISO 42001 to be in effect; it is general legal principle applied to a new kind of statement-generating system. NYC's MyCity chatbot operated in a regulatory gray zone specific to government services, but the underlying principle, that confident wrong statements from a public-facing AI create real exposure for the operator, whether legal liability or reputational, is the same one that bit Air Canada and nearly bit Chevrolet's dealership.

### Data retention and PII, the part engineers actually implement

Prompts and completions sent to a third-party LLM API are, by default, logged and retained for some period by the provider, creating PII-exposure, subpoena, and breach-surface risk unless explicitly configured otherwise. Anthropic's default: inputs and outputs auto-delete within 30 days unless flagged (flagged content up to 2 years, trust/safety classifier scores up to 7 years). Zero Data Retention (ZDR) is an approval-gated, per-organization arrangement under which prompts and responses are not stored at rest after the response returns, but it does not cover every feature, stateful features like the Files API or Batch results are excluded, and newer "Covered Models" can require mandatory 30-day retention even for ZDR customers. Stricter retention reduces breach and subpoena surface but also removes the provider's ability to retroactively investigate abuse, and some advanced or safety-gated models may simply be unavailable under ZDR.

| Instrument | Binding? | Applies to | What it actually requires |
|---|---|---|---|
| EU AI Act | Yes, real fines | Systems serving EU users, staged by risk tier | Risk classification, staged compliance obligations by deadline |
| NIST AI 600-1 | No, voluntary | Any GenAI system, via procurement pressure | 12 named risk categories mapped to Govern/Map/Measure/Manage |
| ISO/IEC 42001 | No, voluntary (certifiable) | The organization's AI management system | Documented risk assessment and treatment process |
| Data retention config (e.g. ZDR) | Contractual, provider-specific | Any API call to a third-party LLM | Controls what happens to prompts/completions after the call |
| General negligence/misrepresentation law | Yes, case law | Any public-facing statement, AI-generated or not | The company owns what its chatbot says, no AI-specific defense |

## In practice at Northwind

Northwind's legal team asks whether Desk, used by 2,000 dealer customers and by employees over Slack, is "EU AI Act compliant" and whether the company needs ISO/IEC 42001 certification. The first job is not answering yes or no, it is classification: does Desk's dealer-facing feature set (answering questions from internal documents, looking up orders, issuing credits up to a limit, opening tickets) fall under Annex III high-risk obligations, under general-purpose AI model provider obligations (unlikely, Northwind is a deployer, not a model provider), or under neither? That classification decision needs an owner inside the company, and a process for re-running it whenever Desk gains a new capability, since adding an automated decision with legal effect (say, automatically denying a credit request past a threshold) could move the classification.

Separately, treat ISO/IEC 42001 and NIST AI 600-1 as what they are: useful internal discipline and a procurement/audit signal, not a substitute for the EU AI Act classification exercise. If Northwind pursues ISO 42001 certification, it certifies that Northwind has a documented process for AI risk assessment and treatment, it does not certify that Desk's credit-issuance feature is legally compliant with the Act.

On retention: audit what Desk's conversations, dealer document queries, employee Slack messages, actually get sent to the LLM provider and what the provider's default retention is. Given that employee Slack access touches the company's document store, and dealer interactions can include account and order details, decide explicitly whether Zero Data Retention or an equivalent arrangement is warranted for this traffic, understanding that it also removes the provider's ability to help investigate a future abuse incident, a real trade-off, not a pure security win.

And independent of every framework above, treat Desk's generated statements with the same editorial control the company gives its website: any policy, pricing, or legal claim Desk generates needs the same accountability as a page on northwindsupply.com, because a tribunal or court will not distinguish between the two. The MyCity lesson, kept online with only a disclaimer after documented, repeatable legal errors, is the specific mistake not to repeat: a disclaimer is not a fix, and the right response to documented, consistent wrong answers is to pull the feature or constrain it to retrieval-only mode until the underlying grounding is fixed (Lesson 18 covers how).

## What strong engineers know

- "Compliant" is not a binary property; it starts with a risk-tier classification under the specific regulation in question, and that classification can change as the system gains capabilities.
- A voluntary framework (NIST AI RMF, ISO 42001) and a binding regulation (EU AI Act) are not substitutes for each other; certification under one says nothing about compliance with the other.
- ISO/IEC 42001 certifies the organization's management system, not any specific model or feature; do not let a certificate be mistaken for a product-level compliance guarantee.
- Courts already treat a company's chatbot statements as the company's own representations; this liability exists independent of whether any AI-specific regulation applies yet.
- A disclaimer is not a correctness fix; NYC's own experience shows a disclaimer added after documented errors does not stop the underlying wrong answers from continuing to reach users.
- Data retention defaults at the provider level (30 days, longer for flagged content) apply unless you explicitly configure otherwise; know what your traffic actually sends before assuming a retention policy protects you.
- Zero Data Retention is a real trade-off, not a free security upgrade: it removes the provider's own ability to retroactively investigate abuse on your account.
- Someone inside the company needs explicit, ongoing ownership of AI risk classification; it is not a one-time launch-day decision.

## Decide

Northwind's legal team wants a recommendation this quarter: pursue ISO/IEC 42001 certification, conduct an EU AI Act risk classification for Desk, both, or neither yet, given limited compliance budget and Desk currently serving EU dealer customers in a pilot. Options:

1. Pursue ISO/IEC 42001 certification first, on the reasoning that it demonstrates governance maturity to EU customers and partners even before a formal Act classification is done.
2. Conduct the EU AI Act risk classification for Desk's specific features (credit issuance, document retrieval, ticket creation) first, and defer ISO 42001 until the classification clarifies actual legal exposure.
3. Do both in parallel, treating ISO 42001 as internal process discipline and the Act classification as the legally load-bearing exercise, accepting the combined cost.
4. Defer both for now, given Desk is still a pilot with limited EU dealer volume, and revisit once the pilot scales.

Pick one and justify it, including what you would tell legal about the difference between what each instrument actually guarantees.

## One sentence summary

> Voluntary frameworks certify your process, binding regulation carries the fine, and the courts have already decided your chatbot's words are your company's words regardless of either.

## Check question

Northwind adds a new Desk capability that automatically denies credit requests above a risk score threshold with no human review. Legal asks whether this changes Desk's EU AI Act risk classification. What would you check, and who inside Northwind should own the answer going forward?

## Sources

- [NYC's AI Chatbot Tells Businesses To Break The Law](https://themarkup.org/artificial-intelligence/2024/03/29/nycs-ai-chatbot-tells-businesses-to-break-the-law) · The Markup · 29 Mar 2024 · primary investigative report
- [Malfunctioning NYC AI Chatbot Still Active Despite Widespread Evidence It's Encouraging Illegal Behavior](https://thecity.nyc/2024/04/02/malfunctioning-nyc-ai-chatbot-still-active-false-information) · THE CITY · 2 Apr 2024 · confirms the city kept the bot running after being shown the errors
- [Timeline for the Implementation of the EU AI Act](https://ai-act-service-desk.ec.europa.eu/en/ai-act/timeline/timeline-implementation-eu-ai-act) · European Commission AI Act Service Desk · live · staged obligation dates including 2026 Digital Omnibus deferrals
- [Artificial Intelligence Risk Management Framework: Generative Artificial Intelligence Profile (NIST AI 600-1)](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf) · NIST · July 2024 · 12 named GenAI risk categories
- [ISO/IEC 42001:2023](https://www.iso.org/standard/42001) · ISO/IEC · published Dec 2023 · first certifiable AI management system standard
- [API and data retention](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention) · Anthropic · live docs · zero data retention scope and exclusions
- [What Air Canada Lost In 'Remarkable' Lying AI Chatbot Case](https://www.forbes.com/sites/marisagarcia/2024/02/19/what-air-canada-lost-in-remarkable-lying-ai-chatbot-case/) · Forbes · Feb 2024 · the chatbot-as-company-statement liability precedent
