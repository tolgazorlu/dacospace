# Lesson 17 · Permissions follow the document

**Reading time:** 18 min · **Module:** Knowledge · **Concepts:** permission-aware retrieval, oversharing, tenant isolation
**Cases:** m365-copilot-oversharing

## The problem

As organizations rolled out Microsoft 365 Copilot, many discovered it could surface payroll data,
confidential legal files, and strategy documents to end users who technically had "view" access,
but who should never in practice have been able to find those files. The underlying cause was not
new: years of permissive default SharePoint sharing (public sites, default "everyone" links,
missing sensitivity labels) meant many employees already had latent, nominal access to sensitive
content. A Gartner survey of 132 IT leaders, cited in trade press, found data-oversharing concerns
caused 40% of respondents to delay their Copilot rollout by three months or more, and 64% said
information-governance and security review required significant time and resources.
([Computerworld](https://www.computerworld.com/article/3616459/microsoft-moves-to-stop-m365-copilot-from-oversharing-data.html))

Microsoft's own documentation is explicit that this was not Copilot bypassing access control: the
Semantic Index "presents only data that each individual can access," using the existing M365
permission model.
([Microsoft Learn](https://learn.microsoft.com/en-us/copilot/microsoft-365/microsoft-365-copilot-privacy))
Both things are true at once, and that is exactly what makes this case instructive rather than a
simple software bug: Copilot enforced the access control that existed, and the access control that
existed was already broken in a way nobody felt before, because finding an overshared file by
browsing required knowing it existed and searching for it directly. A semantic search layer with
natural-language query turned that same latent overexposure into something discoverable at scale
by anyone who could phrase the right question.

## Why it is hard

A backend engineer building authorization logic is used to one boundary: does this user have
permission to access this resource, checked at read time, enforced by the data layer. RAG adds a
second boundary that looks similar but is a genuinely different question: given that a user is
authorized to query the assistant at all, which of the millions of documents in the corpus should
be *candidates* for retrieval on their specific query. Conflating these two checks is the exact
mistake that enables oversharing. "The user's org has a Copilot license" is not the same claim as
"this specific document should be retrievable by this specific user," and a system that only
checks the first is not doing access control, it is doing authentication.

The instinct to filter "by role" compounds the problem. Role-based filtering assumes clean,
current role-to-document mappings; most enterprise document stores accumulate permission debt for
years before anyone builds a RAG system on top of them; folders get shared "just for this one
project" and never unshared, sites get marked public during a migration and never locked back
down, sensitivity labels are optional metadata that most authors skip. A RAG retriever that trusts
this data at face value inherits every one of those years of drift, and inherits them all at once,
the day it goes live.

The second non-obvious trap is temporal: permission state changes (someone leaves a project, a
contractor's access is revoked, a document's sensitivity label changes), but a vector index is
typically built once and refreshed on a schedule. If the permission check happens against a
snapshot baked into the index at indexing time rather than against the live permission system at
query time, a user whose access was revoked yesterday can still retrieve content through the
assistant today, even though browsing the file directly would correctly deny them.

## The idea: access control is a retrieval-time filter, not an index-time label

### Permission-aware retrieval (ACL-filtered RAG)

An enterprise RAG system must filter retrieval candidates by the requesting user's actual
document-level permissions at query time, before relevance ranking, not after. The distinction
matters: filtering after ranking means a forbidden document can still occupy a top-k slot and get
discarded late, wasting the retrieval budget and risking leakage if the filter has a bug anywhere
downstream; filtering before ranking means the forbidden document was never a candidate at all.

### Two different questions that need two different controls

"Does this user have nominal access to this document" and "should this document be easily
discoverable by anyone's natural-language prompt" are different risk thresholds, and Microsoft's
own post-incident tooling reflects that split explicitly. Restricted Content Discovery lets admins
exclude a site from AI retrieval specifically, without changing who can open the file directly by
URL; this is fast and reversible. Fixing the underlying permission state (removing "everyone"
defaults, auditing public sites, applying sensitivity labels) is slower and structurally correct,
because it also fixes the non-AI exposure (anyone who already knew the file existed could open it
all along). Both are needed; neither substitutes for the other.

| Control | Speed | What it actually fixes |
|---|---|---|
| Restricted Content Discovery (exclude from AI retrieval) | Fast, reversible | AI-surfaced discoverability only; the file is still openable by anyone with the link |
| Site/permission audit (remove default-everyone, add sensitivity labels) | Slow, structural | The underlying access-control debt, for AI retrieval and every other access path |

### Real-time ACL lookup vs. a stale snapshot

Implementing per-query permission filtering against a live permission system adds real-time lookup
latency on every retrieval call. Baking a permission snapshot into the index at indexing time is
cheaper per query but risks exactly the staleness problem above: a revoked user retrieving content
their access was pulled from yesterday. There is no cost-free option here; the trade-off is latency
and infrastructure complexity against the staleness window you are willing to tolerate, and that
window should be a deliberate choice stated out loud, not an accident of how the index happens to
be rebuilt.

### Tenant isolation is the same problem at a harder boundary

Everything above applies inside one organization's own employees. Multi-tenant systems (a SaaS
product serving many separate customer organizations from shared infrastructure) face a strictly
harder version: a retrieval bug that leaks one employee's document to another employee is a bad
day; a retrieval bug that leaks Tenant A's document into Tenant B's retrieved context is a breach
notification, a contract violation, and possibly a regulatory event. The design implication is
that tenant isolation should be enforced as a hard boundary at the data layer (separate indexes, or
a mandatory tenant-id filter that cannot be bypassed by any query path), not as an optional
metadata field that a retrieval function is merely supposed to remember to check.

## In practice at Northwind

Desk serves two genuinely different populations against the same underlying document store:
2,000 dealer customers (each of whom should only ever see their own contract, pricing tier, and
order history) and 600 Northwind employees over Slack (who have broader internal access, but not
unlimited access: payroll, legal, and HR documents should not be retrievable by most of them
either).

1. Treat dealer-facing Desk and employee-facing Desk as two tenant boundaries, not one assistant
   with a permission gradient. The dealer-facing index must enforce a hard per-dealer filter (dealer
   A's query can never retrieve a chunk tagged to dealer B's contract) at the data layer, the same
   way you would isolate tenants in a multi-tenant SaaS database, not as an application-level "if"
   statement that a future refactor could accidentally skip.
2. Before launching the employee-facing Slack version, run a permission audit across Northwind's
   document store that separates "has nominal access" from "should be discoverable by a Slack
   query," the exact split the M365 Copilot incident exposed. Do this before launch, not after a
   complaint.
3. Decide explicitly, and document, whether Desk's retrieval filter checks a live permission
   system per query or a permission snapshot refreshed on a schedule, and if the latter, what the
   maximum staleness window is and whether that is acceptable for Northwind's data sensitivity.
4. Build the equivalent of Restricted Content Discovery for Desk: a fast, reversible way to pull a
   specific document or folder out of retrieval candidacy the moment someone flags an oversharing
   concern, separate from and faster than a full permission remediation project.
5. Log what each user's queries actually surfaced, so an oversharing incident can be detected and
   scoped after the fact, not only prevented in theory beforehand.

## What strong engineers know

- "Has access to use the assistant" and "this document should be retrievable by this user" are two
  different authorization checks; a system that only implements the first is not doing document-level
  access control at all.
- Permission debt (stale sharing settings, missing sensitivity labels) predates the RAG system and
  gets inherited wholesale on day one; a pre-launch permission audit is not optional hygiene, it is
  the actual security control.
- A natural-language search layer does not create new access, it makes existing access easier to
  find; that reframing matters for who is accountable (platform owners, not the AI vendor, in
  Microsoft's own stated position) and for what the real fix looks like.
- Restricting AI discoverability and fixing underlying permissions are different projects with
  different timelines; shipping the fast, reversible one first is a legitimate interim mitigation,
  not a substitute for the slow, structural one.
- A permission filter checked against a stale index snapshot has a staleness window during which
  revoked access still works through the assistant; state that window as a number, don't leave it
  implicit.
- Multi-tenant isolation for an AI retrieval layer deserves the same hard-boundary treatment
  (separate indexes or mandatory, unbypassable tenant filters) that a multi-tenant database schema
  would get; an "if" statement in application code is not a substitute for a structural boundary.
- Logging what each query actually retrieved, per user, is what turns "we hope the filter worked"
  into "we can prove what the filter did," and is the only way to detect an oversharing incident
  that your pre-launch testing missed.

## Decide

Northwind's legal team wants Desk's employee Slack version live in six weeks for a trade-show
demo. Your permission audit of the internal document store (SharePoint-equivalent) finds roughly
15% of folders have overly broad "everyone" sharing, mostly on old project folders nobody has
touched in two years, and fixing all of them properly (re-scoping ownership, adding sensitivity
labels) is estimated at ten weeks of IT work. Options: (a) delay launch until the full remediation
finishes, (b) launch on time but apply a Restricted-Content-Discovery-style exclusion to every
flagged folder until remediation completes, (c) launch on time with no change, betting that
employees querying Desk will not stumble onto the 15%, (d) launch a reduced-scope Desk that only
indexes a pre-approved allowlist of folders rather than the whole document store. Pick one and
state what residual risk you are accepting.

## One sentence summary

> Permission-aware retrieval is a query-time filter against actual document-level access, not an
> index-time label or an organization-level license check, and the Copilot oversharing episode
> shows that pre-existing permission debt becomes exploitable at a much larger scale the moment a
> natural-language search layer sits on top of it.

## Check question

A Northwind employee in finance asks Desk, over Slack, "summarize the Q3 dealer rebate exceptions
flagged by regional managers." Desk retrieves and summarizes three documents, one of which is a
draft HR memo about a regional manager's performance review that happens to mention Q3 rebate
exceptions in passing. The employee has no HR access. Using this lesson's distinction between
access-control questions, explain what check should have prevented this and at which stage of the
retrieval pipeline it belongs.

## Sources

- [Microsoft moves to stop M365 Copilot from 'oversharing' data](https://www.computerworld.com/article/3616459/microsoft-moves-to-stop-m365-copilot-from-oversharing-data.html) · Computerworld · 2024 · the oversharing mechanism, the Gartner survey figures, and Microsoft's Restricted Content Discovery / Purview response.
- [Data, Privacy, and Security for Microsoft Copilot](https://learn.microsoft.com/en-us/copilot/microsoft-365/microsoft-365-copilot-privacy) · Microsoft Learn · current · the stated design intent that the Semantic Index respects the identity-based access boundary.
