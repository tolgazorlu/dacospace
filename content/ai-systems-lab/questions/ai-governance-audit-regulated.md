---
id: ai-governance-audit-regulated
title: Design AI governance and audit for a regulated company
level: senior
topics: [ai, production, governance, compliance, audit]
minutes: 45
---

## Prompt

Legal asks whether your company's customer-facing LLM feature, deployed to EU users, needs to comply with the EU AI Act, and whether you should pursue ISO/IEC 42001 certification. Design the governance and audit process that answers this on an ongoing basis, not just once.

## Clarifications

- **What the feature does?** Answers customer questions and takes some automated actions (account changes within limits); EU users are a meaningful fraction of traffic.
- **Current state?** No formal risk classification has been done; legal has heard "ISO 42001" and "EU AI Act" used interchangeably internally.
- **Org structure?** No single team currently owns "is this AI system compliant"; it's unclear who re-evaluates it when the feature changes.
- **Pace of change?** The team ships prompt and feature changes to this system roughly weekly.
- **Ask?** A process that produces a defensible answer today and keeps producing a correct answer as the system or the regulation's obligations change.

## Follow-ups

- A new feature is added next quarter that takes a higher-stakes automated action. Who decides whether that changes the system's risk classification, and how fast?
- Does passing an ISO 42001 audit mean the system is legally compliant with the EU AI Act? Explain precisely what each one actually certifies.
- An obligation's enforcement date shifts, as has already happened with parts of this Act. How does your process stay correct without someone remembering to re-check annually?
- Someone proposes "buy a compliance tool and call it done." What does that tool actually cover, and what does it not cover?

## Rubric

- Classifies the system's actual risk tier under the Act (whether any component falls under high-risk obligations, GPAI-provider obligations, or neither) as a concrete first step, not a blanket "we're compliant" claim.
- Distinguishes the binding regulation, real legal obligations and fines, from voluntary supporting frameworks, management-system standards and risk-management frameworks, that support compliance but are not themselves the law.
- States precisely what an ISO 42001-style certification actually certifies, an organizational AI management system, versus what it does not certify, a specific model's legal compliance with a specific regulation.
- Assigns clear, ongoing ownership for re-classification when the system changes, not a one-time review at launch.
- Maps current obligations against their actual staged enforcement timeline, and builds a recurring process to re-check that mapping as dates or scope shift, rather than treating today's answer as permanent.
- Designs an audit trail (decisions, classifications, dates, who signed off) that would hold up if a regulator or auditor asked for it later.
- Treats a purchased compliance tool as covering part of the problem, e.g. documentation or a risk register, and explicitly states what it does not cover.

## Pitfalls

- "Yes, we're compliant because we bought a compliance tool," with no actual risk classification done.
- Treating ISO 42001 certification as equivalent to legal compliance with the Act.
- No owner for re-classification when the system or its features change; compliance status silently goes stale.
- Treating today's enforcement timeline as fixed and never re-checking it as obligations phase in or shift.
