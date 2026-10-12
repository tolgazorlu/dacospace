# Case · EchoLeak: zero-click data theft from Microsoft 365 Copilot (2025)

**Category:** Security · **Lessons:** 08, 09 · **Severity:** zero-click data exfiltration, CVE-2025-32711, CVSS 9.3

## The system

Microsoft 365 Copilot is an assistant embedded across Outlook, OneDrive, SharePoint and Teams. It answers questions by retrieving the employee's own email, files and chat history (a RAG pipeline) and composing a response, which can include markdown links and images rendered automatically in the Copilot UI. Any employee with Copilot enabled can receive email, and Copilot treats a user's inbox as part of its retrievable context.

## What was observed

Aim Labs privately disclosed a vulnerability to Microsoft in January 2025. Microsoft shipped a server-side fix in May 2025, and the advisory (CVE-2025-32711) went public on 11 June 2025 with a CVSS score of 9.3. The reported effect: an attacker could cause Copilot to exfiltrate sensitive data from a victim's own Microsoft 365 account by sending a single email. The victim did not need to open, read, or click anything in that email.

## Stop and think

1. If the attacker needs zero interaction from the victim, where does the attacker-controlled content actually enter the model's context, and what has to go wrong for Copilot to treat it as instructions rather than data?
2. Copilot's output goes through a markdown link filter before being shown to the user. If a filter catches the common case, what classes of malformed or alternate syntax might it miss?
3. Once Copilot has retrieved private data and wants to put it somewhere the attacker can read it, what does the actual network request look like, and why would the browser make it without asking the user first?

## What actually happened

The attack was a three-stage chain, reconstructed in detail by an independent academic case study ([arXiv 2509.10540](https://arxiv.org/pdf/2509.10540)) and corroborated by BleepingComputer's reporting on Aim Security's disclosure ([BleepingComputer](https://www.bleepingcomputer.com/news/security/zero-click-ai-data-leak-flaw-uncovered-in-microsoft-365-copilot/)).

First, the attacker's email phrased its injected instructions as though addressed to the human recipient, not the AI. Microsoft's cross-prompt-injection (XPIA) classifier had been tuned to catch instructions explicitly addressed to the LLM, so phrasing that reads like ordinary correspondence slipped past it.

Second, once the injected instructions were in Copilot's context (via RAG retrieval of the email, since the user later asked Copilot something that pulled the email in), the model needed a way to leak data without a visibly suspicious link. Copilot's output filter stripped inline markdown links of the form `[text](url)`. It did not recognize reference-style links, where the link text and the URL are defined separately: `[text][ref]` with a `[ref]: https://attacker.example` declaration elsewhere in the output. That second form survived filtering untouched.

Third, the attacker needed the browser to fire the exfiltration request with no click. Copilot was coerced into emitting a markdown image reference pointing at the attacker's URL, with the stolen data appended as a query parameter. Markdown image syntax auto-fetches: the client requests the image URL as soon as it renders the response, with no user action. The attacker's URL was a Microsoft Teams URL-preview endpoint already present on Copilot's allowed Content-Security-Policy domain list, so the request looked internal and was not blocked, even though the endpoint could be made to proxy to an external destination.

Aim Labs categorized the underlying failure as an "LLM Scope Violation": the RAG retrieval step pulled untrusted content (the attacker's email) into the same context, with the same trust level, as the user's own internal data.

## Root causes

**Technical.** The XPIA classifier modeled prompt injection as "instructions addressed to the AI," missing injections phrased as ordinary human-readable text. The output filter enumerated one markdown link syntax and missed a second, equally standard one. The CSP allowlist trusted a same-vendor endpoint as safe by default, without verifying it could not be used as an open proxy for arbitrary external URLs.

**Organizational.** Each of these three layers (classifier, filter, CSP) was built and reviewed somewhat independently, and no single team appears to have asked "does this chain of defenses hold if an attacker controls the full request-response round trip end to end." Security review of markdown rendering treated "we strip links" as sufficient without enumerating the full markdown grammar.

## What would have prevented it

- Separate instruction-bearing and data-bearing content by provenance at ingestion time (tag what came from an external, untrusted sender versus internal, verified sources), so RAG retrieval does not implicitly grant external content the same authority as internal data. Highest leverage, highest engineering cost: it touches the retrieval pipeline itself.
- Build the output filter against the full markdown grammar (inline links, reference-style links, HTML-embedded links, images in all forms), tested with a fixed corpus of syntax variants, not just the common case. Moderate cost, should be table stakes for any markdown-rendering assistant.
- Treat auto-fetching images in the client UI as a feature to question, not assume: an assistant that never auto-fetches remote images cannot be used as a zero-click exfiltration channel through this specific mechanism. Low cost, some loss of UX polish.
- Do not add same-vendor or "internal-looking" endpoints to a CSP allowlist without verifying they cannot be abused as an open proxy to arbitrary external URLs. Low cost if done at design time, expensive to retrofit.

## The lesson for your system

- Enumerate every markdown and HTML rendering path your assistant's output goes through, and test each one against reference-style links, not just inline links, before calling your filter "safe."
- If your assistant does RAG over content an outsider can write (support tickets, emails, public documents), assume any of it may contain instructions, and tag provenance through your retrieval pipeline so downstream code can treat external content differently from internal content.
- Check whether your client auto-fetches images or other remote resources from model output with no user click. If it does, that is a standing zero-click exfiltration channel regardless of what else you fix.
- Audit your CSP or egress allowlist for any entry that is a generic proxy, preview, or redirect endpoint; those are the entries attackers look for first.

## Sources

- [EchoLeak: The First Real-World Zero-Click Prompt Injection Exploit in a Production LLM System](https://arxiv.org/pdf/2509.10540) · academic case study · Sep 2025
- [Zero-click AI data leak flaw uncovered in Microsoft 365 Copilot](https://www.bleepingcomputer.com/news/security/zero-click-ai-data-leak-flaw-uncovered-in-microsoft-365-copilot/) · BleepingComputer, citing Aim Security · Jun 2025
