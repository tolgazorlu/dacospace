# Lesson 18 · Grounding, citations and liability

**Reading time:** 20 min · **Module:** Knowledge · **Concepts:** faithfulness, citation checking, who is liable for the answer
**Cases:** mata-v-avianca, air-canada-bereavement-fare, cursor-support-bot-policy, stanford-legal-rag-hallucinations

## The problem

In November 2022, Jake Moffatt asked Air Canada's website chatbot about bereavement fares after a
death in his family. The chatbot told him he could book now and apply for the bereavement discount
retroactively, within 90 days. The airline's actual policy, stated on a linked page on the same
website, said the opposite: bereavement fares must be requested before travel. Air Canada denied
the refund and, in front of British Columbia's Civil Resolution Tribunal, argued the chatbot was
effectively a separate legal entity that the company could not be held responsible for. The
Tribunal called this "a remarkable submission," rejected it, and found Air Canada liable for
negligent misrepresentation, awarding Moffatt C$812.02 in damages plus interest and fees.
([CanLII decision](https://www.canlii.org/en/bc/bccrt/doc/2024/2024bccrt149/2024bccrt149.html),
[law firm summary](https://www.dww.com/articles/bc-tribunal-finds-air-canada-liable-for-inaccurate-advice-given-by-website-chatbot))

The dollar amount is trivial. The precedent is not: a company is legally responsible for what its
customer-facing AI says, to the same standard of care as its static web content. "The chatbot said
it, not us" failed as a defense, and there is no reason to expect it to succeed anywhere else
either.

## Why it is hard

A backend engineer's instinct is to think about correctness and liability as downstream of model
quality: use a better model, write a better prompt, and the risk goes down. The four cases in this
lesson's scope show that liability tracks something narrower and more structural: whether a
specific claim the system stated to a user was grounded in an authoritative source the company
actually controls, and whether anyone checked that grounding before the user acted on it. A
better model does not fix an architecture that never forced the check in the first place.

The second trap is conflating two different things that both get called "grounding failures" but
need different fixes. One is a **citation existence** problem: a fabricated source that does not
exist at all, as in Mata v. Avianca, where attorney Steven Schwartz used ChatGPT, with no retrieval
grounding whatsoever, to research case law for a federal court filing. The brief cited six
fabricated court decisions with invented docket numbers, judges, and quoted holdings; Schwartz even
asked ChatGPT to verify the cases and it falsely confirmed they were real. Judge Castel fined
Schwartz, his co-counsel, and their firm $5,000 jointly.
([Wikipedia summary of the opinion](https://en.wikipedia.org/wiki/Mata_v._Avianca,_Inc.)) This was
not, strictly, a RAG failure: it is what retrieval grounding and citation verification are
specifically meant to prevent, which is exactly why the case became the reference point for every
"RAG eliminates hallucination" marketing claim that followed. It did not eliminate it; it was
never present in the first place.

The other is a **citation support** problem, also called improper grounding: the system cites a
real, retrievable document, and that document does not actually support the specific claim
attributed to it. Stanford's controlled study of commercial legal RAG tools found this exact
pattern inside systems built specifically to avoid Mata-style fabrication; the tools hallucinated
17-34% of the time even while mostly citing real documents.
([arXiv:2405.20362](https://arxiv.org/html/2405.20362v1)) A system can pass a "does this citation
resolve to something real" check and still fail the user, because nobody checked whether the cited
passage says what the answer claims it says.

A third trap, distinct from both: a grounded, correct-sounding answer that is simply ungrounded in
anything at all, because the system was never forced to ground its answer in a specific source in
the first place. Air Canada's chatbot was not citing a fabricated document, and it was not
misreading a real one; it generated a plausible-sounding process description that directly
contradicted the company's own published policy on the same site, with no retrieval-and-verify step
at all. The Cursor support bot incident in April 2025 is the same shape: users of the Cursor code
editor noticed they were logged out when switching devices, and an AI support agent named "Sam"
told a user this was expected behavior under a new "one device per subscription" policy. No such
policy existed; the real cause was an unrelated session-security bug. The fabricated explanation
spread on Reddit and Hacker News and triggered real subscription cancellations before Cursor's
co-founder publicly corrected it.
([Ars Technica](https://arstechnica.com/ai/2025/04/cursor-ai-support-bot-invents-fake-policy-and-triggers-user-uproar/))
Users believed "Sam" was a person; the bot was not disclosed as AI, and nothing constrained it to
say "I don't know" when asked about a policy it had no record of.

## The idea: three distinct failure classes, three distinct defenses

| Failure class | Example | What catches it |
|---|---|---|
| Citation existence (fabrication) | Mata v. Avianca: six invented cases | Any real retrieval step against a queryable index of real documents (even a basic lookup would have caught this; there was none) |
| Citation support (improper grounding) | Legal RAG tools citing real cases that don't support the claim | Claim-level entailment check: does the specific cited passage actually say what the answer attributes to it, not just "does the citation resolve to something real" |
| Ungrounded generation (no forced citation at all) | Air Canada bereavement policy; Cursor's "Sam" | A hard constraint: the system is not allowed to state a policy-bearing fact without quoting or directly deriving it from a specific retrieved source, and must say "I don't know, let me check" when it cannot |

### Faithfulness as the generation-side metric

RAGAS's Faithfulness metric (Lesson 15) operationalizes the third row: it decomposes an answer
into individual claims and checks each one against the retrieved context, catching exactly the
"confident but ungrounded" pattern that both Air Canada and Cursor exhibit. It will not, by
itself, catch citation-support failures where the claim really is entailed by the *retrieved*
chunk, just not by what that chunk's source document actually meant in context; that needs a
separate, source-level entailment check, closer to what Stanford's researchers had to build by
hand to find improper grounding in commercial tools.

### Who is liable, and why "the AI said it" keeps failing as a defense

Two independent legal analyses of Moffatt v. Air Canada converge on the same reasoning: a company's
chatbot statements are treated as the company's own representations, with the same duty of care as
its static web pages, because from the customer's perspective there is no meaningful difference
between the two surfaces.
([Forbes reporting](https://www.forbes.com/sites/marisagarcia/2024/02/19/what-air-canada-lost-in-remarkable-lying-ai-chatbot-case/),
[AI & Society, Springer, peer-reviewed analysis](https://link.springer.com/article/10.1007/s00146-024-02096-7))
The Tribunal specifically noted Air Canada never explained why the static page should be
considered more trustworthy than the chatbot, or why a customer should be expected to cross-check
one part of a company's own website against another. The practical implication: a company cannot
treat an AI assistant as a lower-stakes communication channel than its documentation, legally or
operationally, even if it was built and shipped by a different, faster-moving team.

### Regulated-domain verification gates

Stanford's own argument about legal RAG vendors generalizes: transparent, third-party-auditable
benchmarking should precede any "hallucination-free" marketing claim, because without a precise,
falsifiable definition of hallucination the claim cannot be checked by anyone outside the vendor.
([arXiv:2405.20362](https://arxiv.org/html/2405.20362v1)) Translated into an engineering control:
any output heading to a regulated or consequential surface (a court filing, a refund decision, a
public policy statement) needs an explicit human verification gate before release, not because the
model is bad, but because nobody has shown, in any domain studied so far, that retrieval grounding
alone drives hallucination to zero.

## In practice at Northwind

Desk issues credits, quotes return policy, and answers dealer questions that dealers will act on
financially. Before any of those answers reach a dealer:

1. Classify every category of Desk answer by consequence: informational (general product
   questions), financial (credit amounts, refund eligibility), and policy-stating (return windows,
   contract terms). Only the first category should ever be allowed to generate freely; the other
   two should be retrieval-only, meaning Desk quotes or directly derives from a specific retrieved
   clause and refuses to answer if no clause directly supports the claim.
2. Run a Faithfulness check on every financial and policy-stating answer, not just at launch but
   continuously, specifically targeting the Air Canada/Cursor failure pattern: a confident claim
   with no direct source.
3. For financial answers (credit amounts), add a citation-support check, not just a citation-existence
   check: verify the specific dollar figure or percentage Desk states actually appears in the
   retrieved pricing or contract document, the way Stanford's researchers had to check that cited
   legal passages actually supported the claims attributed to them.
4. Decide, explicitly and in writing, who at Northwind owns the statement Desk makes to a dealer.
   The Air Canada precedent says it is Northwind, not a vendor, not "the AI," regardless of who
   built Desk's underlying model. Make sure legal and support leadership know that before, not
   after, an incident.
5. Disclose that Desk is an AI assistant, not a person, in every interaction. Cursor's incident was
   made worse specifically because users believed "Sam" was human and treated its fabricated policy
   as an authoritative statement from a real support agent.

## What strong engineers know

- A real citation is not proof of a correct claim. Mata v. Avianca is a fabrication problem;
  Stanford's legal RAG study is a support problem; they look similar from the output but need
  different detectors.
- "The chatbot said it, not us" has already failed once, in a court of law, as a liability
  defense; building as if that argument will work for your company is a bet against established
  precedent, not an untested theory.
- Faithfulness (claim-level grounding) catches ungrounded generation; it does not catch a claim
  that is entailed by the wrong interpretation of a correctly-retrieved source. Both checks are
  needed in a regulated domain.
- A disclaimer does not substitute for a verification gate. None of the four cases in this lesson
  were fixed by adding a warning label; they needed the system to either ground every stated fact
  in a real source or refuse to answer.
- Treating a support or policy-answering AI agent as a lower-stakes surface than your documentation
  is exactly the gap that produced both the Air Canada and Cursor incidents; the fix is
  organizational (who signs off on what Desk is allowed to state) as much as technical.
- Disclosing that an agent is AI, not a person, changes how users react to a wrong answer; Cursor's
  incident escalated specifically because users believed a human named "Sam" had confirmed a real
  policy.
- "Hallucination-free" is a marketing claim, not an engineering spec, until a vendor publishes the
  benchmark and definition behind it; demand the methodology before trusting the adjective, for
  your own system's claims as much as a vendor's.

## Decide

Desk is about to get a new capability: answering dealer questions about whether a specific invoice
qualifies for an early-payment discount, a calculation that depends on invoice date, payment date,
and a tiered discount schedule in the dealer's contract. Options for how Desk handles this: (a)
let Desk generate the answer from retrieved contract text and invoice data, with a Faithfulness
check as a post-hoc guardrail; (b) require Desk to retrieve the exact tier rule and invoice dates
and compute the discount with a deterministic function call rather than free-text generation,
falling back to "let me get a human to check this" if any required field is missing; (c) have Desk
answer informationally only ("here is the discount schedule, you can calculate it") and never state
a specific dollar figure. Pick one, and justify it against the liability reasoning in this lesson,
not just against accuracy alone.

## One sentence summary

> Retrieval grounding reduces but does not eliminate the gap between a confident answer and a true
> one, and the Air Canada ruling establishes that a company owns every claim its AI assistant
> makes with the same duty of care as its documentation, so citation existence, citation support,
> and forced grounding each need their own check before a consequential answer reaches a user.

## Check question

Northwind's legal team asks why Desk's return-policy answers need both a Faithfulness check and a
separate citation-support check, arguing that Faithfulness alone should be enough since it already
verifies the answer is grounded in retrieved context. Using the distinction between citation
existence, citation support, and ungrounded generation from this lesson, explain the specific
failure scenario Faithfulness alone would miss.

## Sources

- [Moffatt v. Air Canada, 2024 BCCRT 149](https://www.canlii.org/en/bc/bccrt/doc/2024/2024bccrt149/2024bccrt149.html) · BC Civil Resolution Tribunal · Feb 2024 · the primary liability ruling.
- [BC Tribunal Finds Air Canada Liable For Inaccurate Advice Given By Website Chatbot](https://www.dww.com/articles/bc-tribunal-finds-air-canada-liable-for-inaccurate-advice-given-by-website-chatbot) · Deeth Williams Wall · 2024 · legal-analysis summary.
- [What Air Canada Lost In 'Remarkable' Lying AI Chatbot Case](https://www.forbes.com/sites/marisagarcia/2024/02/19/what-air-canada-lost-in-remarkable-lying-ai-chatbot-case/) · Forbes · Feb 2024 · tribunal reasoning in detail.
- [Air Canada's chatbot illustrates persistent agency and responsibility gap problems for AI](https://link.springer.com/article/10.1007/s00146-024-02096-7) · AI & Society (Springer) · 2024 · peer-reviewed analysis.
- [Mata v. Avianca, Inc., 678 F. Supp. 3d 443 (S.D.N.Y. 2023)](https://en.wikipedia.org/wiki/Mata_v._Avianca,_Inc.) · S.D.N.Y. · decided Jun 2023 · the fabricated-citation sanctions case.
- [Company apologizes after AI support agent invents policy that causes user uproar](https://arstechnica.com/ai/2025/04/cursor-ai-support-bot-invents-fake-policy-and-triggers-user-uproar/) · Ars Technica · Apr 2025 · the Cursor "Sam" incident.
- [Hallucination-Free? Assessing the Reliability of Leading AI Legal Research Tools](https://arxiv.org/html/2405.20362v1) · Magesh et al. (Stanford RegLab/HAI, Yale) · 2024 · the improper-grounding failure mode and hallucination-rate numbers.
