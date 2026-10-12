# Case · Mata v. Avianca (2023)

**Category:** Knowledge · **Lessons:** 18 · **Severity:** court sanctions, $5,000 fine against attorneys and firm

## The system

ChatGPT, used directly by attorney Steven Schwartz as a research tool while preparing a personal injury brief against Avianca airlines. This was a plain generative chatbot: no retrieval grounding, no citation verification, no connection to a real legal database.

## What was observed

The brief Schwartz filed cited six court decisions supporting his argument: Varghese v. China Southern Airlines, Martinez v. Delta, Shaboon v. Egyptair, Petersen v. Iran Air, Estate of Durden v. KLM, and Miller v. United. Opposing counsel and the court could not find any of them.

## Stop and think

1. Schwartz asked ChatGPT itself whether the cases were real, and it said yes. What does that tell you about whether a generative model can be trusted to verify its own output?
2. What single step, inserted anywhere in this workflow, would have caught the problem before the brief was filed?
3. Is this a "RAG failure" or something else entirely? What would have to be different about the system for "RAG failure" to even apply?

## What actually happened

All six cases were fabricated, complete with invented docket numbers, judges, and quoted holdings. Schwartz had asked ChatGPT to verify the cases were real and it falsely confirmed they were findable on Westlaw and LexisNexis. ([Wikipedia summary of the opinion, primary opinion at 678 F. Supp. 3d 443 (S.D.N.Y. 2023)](https://en.wikipedia.org/wiki/Mata_v._Avianca,_Inc.))

Judge Castel fined Schwartz, co-counsel Peter LoDuca, and their firm $5,000 jointly and severally, and ordered letters to the client and to each judge falsely named as an author of a fabricated opinion.

This is not a RAG failure in the technical sense: there was no retrieval step to fail. ChatGPT was used as if it were a legal database, when it was a generative model with no grounding in any actual case-law index. The case became the reference point for every later "does RAG eliminate hallucination" claim precisely because it shows what happens with zero retrieval grounding and zero verification, the baseline RAG and citation checking are meant to fix.

## Root causes

**Technical:** no retrieval step connected the model's output to any real, queryable source (Westlaw, LexisNexis, PACER); the model's confident, well-formatted citation format was indistinguishable in style from a real one.

**Organizational:** no human verification gate existed before court filing; the attorney treated the model's own self-report of accuracy as sufficient verification, rather than checking an independent source.

## What would have prevented it

- **Any retrieval step** checking cited cases against a real, queryable legal database before asserting them as fact. This is the baseline capability RAG is meant to provide, and its complete absence here is the whole incident.
- **A human verification gate before filing**, independent of asking the model itself, for any output that will be submitted as fact to a court or regulator. Costs attorney time; the cost of skipping it was a public sanction.
- **A professional norm or firm policy** treating "ask the AI if it's right" as equivalent to "don't verify", since it provides no independent signal.

## The lesson for your system

- An LLM's confident, well-formatted citation is not evidence that the citation exists; verification against the primary source is mandatory, not optional, in any regulated domain.
- Never ask the same model to verify its own prior output as your only check; that is not independent verification.
- If your system has no retrieval grounding at all, treat every factual claim it makes as unverified by construction, regardless of how confident or well-formatted it looks.
- In any workflow where output reaches a court, regulator, or binding document, require a human verification step against an independent source before submission.

## Sources

- [Mata v. Avianca, Inc., 678 F. Supp. 3d 443 (S.D.N.Y. 2023)](https://en.wikipedia.org/wiki/Mata_v._Avianca,_Inc.) · S.D.N.Y., Judge P. Kevin Castel · decided 22 Jun 2023
