# Case · Microsoft 365 Copilot "oversharing" (2024, ongoing)

**Category:** Security · **Lessons:** 17, 15 · **Severity:** latent permission debt made discoverable at scale, delayed 40% of surveyed rollouts 3+ months

## The system

Microsoft 365 Copilot is an enterprise AI assistant grounded over an organization's own SharePoint and OneDrive content through what Microsoft calls its "Semantic Index". Microsoft's documentation states Copilot "presents only data that each individual can access" using the organization's existing permission model: Copilot is designed to respect the identity-based access boundary, not to bypass it.

## What was observed

As organizations rolled out Copilot, many discovered it could surface payroll data, confidential legal files, and strategy documents to end users who technically had "view" access but, in practice, had never found or seen those files before Copilot existed.

## Stop and think

1. If a user technically had "view" access to a file before Copilot, and Copilot only shows files a user has access to, who or what is actually responsible for the exposure?
2. What is the difference between "has access to a file" and "can easily discover a file by typing a natural-language question"? Are those the same risk?
3. If permission hygiene in your document store has been accumulating for years, what would it take to find out how bad it already is, before you turn on an AI search layer?

## What actually happened

This was not Copilot bypassing access control. Microsoft's own documentation is explicit that Copilot enforces the existing M365 permission model. The failure was upstream: years of permissive default sharing settings and un-audited public SharePoint sites meant many users already had technical access to sensitive files. Copilot made that latent overexposure discoverable at scale, by anyone who could phrase the right natural-language query, whereas before, finding the file required already knowing it existed and searching for it directly. ([Microsoft Learn, M365 Copilot privacy docs](https://learn.microsoft.com/en-us/copilot/microsoft-365/microsoft-365-copilot-privacy); [Computerworld](https://www.computerworld.com/article/3616459/microsoft-moves-to-stop-m365-copilot-from-oversharing-data.html))

A Gartner survey of 132 IT leaders, cited in the Computerworld report, found data oversharing concerns caused 40% of respondents to delay Copilot rollouts by three months or more, and 64% said information governance and security review required significant time and resources. Microsoft's response, announced at its Ignite event, added SharePoint Advanced Management features (site access reviews, Restricted Content Discovery) and Purview oversharing assessments and DLP for Copilot.

## Root causes

**Technical:** the access-control check Copilot relies on is only as good as the underlying permission data; it enforces the boundary correctly, but the boundary itself (public sites, default-everyone sharing links, missing sensitivity labels) was already far too permissive.

**Organizational:** "has access" and "should be easily discoverable by anyone's prompt" were treated as the same risk threshold for years, because discovering a file required effort; nobody had audited permission hygiene because the cost of bad permissions was previously hidden by how hard the files were to find.

## What would have prevented it

- **Permission hygiene audits done before enabling an org-wide semantic search assistant**, not after: site access reviews, removing "everyone" and public-site defaults, adding sensitivity labels. Slower and more structurally correct, but requires real remediation work across the whole document estate.
- **Restricted Content Discovery**, letting admins exclude a site from AI retrieval without changing who can directly open the file. Fast and reversible, but does not fix the underlying permission debt, only the AI-specific symptom.
- **Treating "has access" and "should be discoverable by a prompt" as two separate controls** requiring separate decisions, rather than assuming existing ACLs are sufficient once a semantic search layer sits on top of them.

## The lesson for your system

- An enterprise knowledge assistant is a force-multiplier for whatever access-control debt already exists in your document store; it does not create new permission problems, it makes old ones discoverable at scale.
- Before turning on org-wide retrieval over your document store, audit what "has access" actually means today: public sites, default-everyone links, and missing sensitivity labels are where the exposure lives.
- "Has access" and "should be easily discoverable by anyone's prompt" are different risk thresholds; decide separately whether each document needs the second control, not just the first.
- A permission-aware retrieval layer is necessary but not sufficient; it enforces whatever ACL state you already have, correctly or not.

## Sources

- [Microsoft moves to stop M365 Copilot from 'oversharing' data](https://www.computerworld.com/article/3616459/microsoft-moves-to-stop-m365-copilot-from-oversharing-data.html) · Computerworld · 2024
- [Data, Privacy, and Security for Microsoft Copilot](https://learn.microsoft.com/en-us/copilot/microsoft-365/microsoft-365-copilot-privacy) · Microsoft Learn · current
