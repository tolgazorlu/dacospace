---
id: ai-data-exfiltration-review
title: Review a RAG copilot for data exfiltration risk
level: senior
topics: [ai, security, rag, exfiltration, prompt-injection]
minutes: 45
---

## Prompt

A security researcher asks you to assess the data-exfiltration risk of your company's internal copilot. It's a RAG system over an internal wiki, and it renders model output as markdown in the chat UI, including links and images. Design the review and the fixes.

## Clarifications

- **What can the copilot read?** Every wiki space the requesting employee has access to, including spaces with externally-shared or externally-editable pages.
- **What does the UI do with model output?** Renders markdown client-side; images and link previews auto-fetch by default.
- **Attack surface considered?** Any page reachable by the copilot could contain attacker-controlled instructions or formatting (indirect injection via a page someone pasted in).
- **Current output filter?** Strips the exact pattern `[text](url)` only.
- **Business constraint?** Product wants image and link previews to stay, because employees rely on them for visual wiki content.
- **Timeline?** Ship the review and fix within 2 weeks; there's no budget for a full external pentest this quarter.

## Follow-ups

- How would you red-team your own output filter against every markdown link/image syntax variant: inline, reference-style, HTML-embedded, and encoded?
- What's your actual CSP allowlist for auto-fetched images and link previews, and have you verified none of those domains proxy arbitrary external URLs?
- A vendor's "AI guardrails" product claims to block 97% of known exfiltration patterns. Does buying it change your answer here?
- Six weeks after launch, you learn an attacker-controlled wiki page caused a real exfiltration via an image URL with query-string-encoded data. Walk through root cause and the fix.

## Rubric

- Enumerates every markdown link/image syntax variant (inline, reference-style, HTML img, nested/encoded) and checks the filter against all of them, not just the common one.
- Questions whether auto-fetching images or link previews client-side is necessary at all, and treats it as an exfiltration channel if kept.
- Proposes a CSP/allowlist that does not implicitly trust same-vendor proxy or preview endpoints as safe by default.
- Proposes provenance tagging so the UI can distinguish content sourced from broadly-writable or externally-editable documents from verified-internal ones.
- Does not treat a single output filter or a third-party guardrails product as sufficient; frames it as one layer in defense-in-depth.
- Covers how to detect exfiltration after the fact (logging of outbound URLs/images actually rendered) in addition to preventing it.
- Addresses the trade-off with the product requirement (previews stay useful) rather than just disabling the feature.

## Pitfalls

- "We already strip markdown links" without testing reference-style syntax or image auto-fetch, which is exactly the known gap class.
- Buying a guardrails product and considering prompt injection or exfiltration "handled."
- No plan for detecting exfiltration that already happened; prevention-only design.
- Ignoring that content from externally-editable or broadly-writable pages is attacker-reachable even though it lives inside the "internal" boundary.
