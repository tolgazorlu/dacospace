# Case · Air Canada bereavement fare chatbot (2024)

**Category:** Knowledge · **Lessons:** 15, 18 · **Severity:** negligent misrepresentation finding, company held liable for chatbot statements

## The system

Air Canada ran a website chatbot that answered customer questions, including questions about bereavement fares, a discount for travel related to a death in the family. The airline's actual policy, published on a linked static page on the same site, said bereavement fares cannot be claimed retroactively after travel.

## What was observed

In November 2022, Jake Moffatt asked the chatbot about bereavement fares while booking travel after a family member's death. The chatbot told him he could book now and apply for the discount retroactively, within 90 days after travel. Air Canada later denied his retroactive refund request.

## Stop and think

1. The chatbot's answer and the static policy page on the same website contradicted each other. Whose statement should a customer trust, and why would a company expect them to cross-check?
2. What architectural choice would make it structurally impossible for the chatbot to state something the authoritative policy page doesn't say?
3. Air Canada argued it could not be held liable for the chatbot's words. What would have to be true about how the chatbot was built or disclosed for that argument to hold up?

## What actually happened

Air Canada argued before the British Columbia Civil Resolution Tribunal that it could not be held liable for its chatbot's statements, effectively treating the chatbot "as if it were a separate legal entity." The Tribunal rejected that argument outright and found Air Canada liable for negligent misrepresentation, awarding Moffatt C$812.02 in damages plus interest and fees. ([CanLII decision, Moffatt v. Air Canada, 2024 BCCRT 149](https://www.canlii.org/en/bc/bccrt/doc/2024/2024bccrt149/2024bccrt149.html); [law firm summary](https://www.dww.com/articles/bc-tribunal-finds-air-canada-liable-for-inaccurate-advice-given-by-website-chatbot))

The Tribunal specifically noted that Air Canada never explained why the static policy page should be considered more trustworthy than the chatbot, or why a customer should have to cross-check one part of the company's own site against another. There was no verified-against-ground-truth check running before the chatbot's answer reached the customer: it generated a plausible-sounding answer about a process, and that answer happened to contradict the real policy.

## Root causes

**Technical:** the chatbot was not grounded in the same authoritative policy document the static page used, so the two surfaces could diverge with no mechanism to catch it. There was no citation-verification or retrieval-grounding step checking the generated claim against the real policy before serving it.

**Organizational:** nobody treated the chatbot's output as an official company statement requiring the same accuracy bar as the static page; policy updates evidently did not propagate to all surfaces (chatbot and web page) from one source of truth.

## What would have prevented it

- **Grounding the chatbot's answer in the same authoritative policy document the static page uses** (single source of truth for retrieval), so any divergence between surfaces becomes a data problem, not a chatbot-invention problem. Requires investment in a retrieval pipeline but closes the exact gap in this case.
- **Constraining the bot to retrieval-only answers**, quoting policy text rather than generatively paraphrasing it, for any question with a legal or financial consequence. Reduces flexibility of the bot's responses but removes the paraphrase-drift risk entirely.
- **A reconciliation process** so policy updates propagate to every customer-facing surface simultaneously, with legal sign-off that the company owns every public statement the bot makes, treating it with the same duty of care as its static web content.

## The lesson for your system

- Your company is legally responsible for what your customer-facing AI says, with the same duty of care as your static web content; "the bot said it, not us" is not a defense anywhere this has been tested.
- Any chatbot answer that touches policy, pricing, refunds, or legal process should be grounded in the single authoritative source your other surfaces use, not generated independently.
- Check today whether your own chatbot and your own policy pages could ever disagree, and if so, which one wins and why.
- For high-stakes topics, prefer retrieval-and-quote over generate-and-paraphrase; a paraphrase is where drift from the real policy sneaks in.

## Sources

- [Moffatt v. Air Canada, 2024 BCCRT 149](https://www.canlii.org/en/bc/bccrt/doc/2024/2024bccrt149/2024bccrt149.html) · British Columbia Civil Resolution Tribunal · 14 Feb 2024
- [BC Tribunal Finds Air Canada Liable For Inaccurate Advice Given By Website Chatbot](https://www.dww.com/articles/bc-tribunal-finds-air-canada-liable-for-inaccurate-advice-given-by-website-chatbot) · Deeth Williams Wall · 2024
- [What Air Canada Lost In 'Remarkable' Lying AI Chatbot Case](https://www.forbes.com/sites/marisagarcia/2024/02/19/what-air-canada-lost-in-remarkable-lying-ai-chatbot-case/) · Forbes · Feb 2024
