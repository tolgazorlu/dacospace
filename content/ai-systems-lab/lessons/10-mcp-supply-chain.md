# Lesson 10 · MCP and the agent supply chain

**Reading time:** 20 min · **Module:** Security · **Concepts:** tool poisoning, rug pulls, rule-file backdoors, confused deputy, OAuth
**Cases:** mcp-tool-poisoning-rug-pull, rule-file-backdoor, github-mcp-private-repos, supabase-mcp-sql-leak

## The problem

In July 2025, Check Point Research disclosed CVE-2025-54136 in Cursor, nicknamed "MCPoison" (CVSS 8.8). The attack path: an attacker commits a benign-looking MCP server configuration to a shared repository. A developer reviews it, trusts it, and approves it. Days or weeks later, with no new approval prompt and no visible change in the editor, the attacker silently swaps the approved configuration's command to a malicious one. Cursor did not re-validate configs on each use, only at the moment of first approval, so the swap executed with the full trust the developer had granted weeks earlier, for a tool that was no longer the tool they reviewed. Fixed in Cursor 1.3 (late July 2025), which now re-triggers approval on any config change. ([SecureW2](https://securew2.com/blog/mcp-rug-pull-attack))

This is not a prompt injection in the sense of Lessons 08 and 09. Nobody tricked the model into misreading an email. The vulnerability lives one layer below the model, in how the agent's tools themselves get established as trustworthy and whether that trust is ever re-checked. MCP (Model Context Protocol) standardizes how agents discover and call tools across servers, and standardizing that interface also standardized a new place to attack: the tool definitions themselves, before any user task even begins.

## Why it is hard

A backend engineer vetting a third-party dependency thinks in terms of package supply chain: pin a version, check a hash, review the diff on upgrade, maybe use a lockfile. That mental model transfers to MCP servers more directly than most engineers initially assume, and the places it fails to transfer are exactly where the incidents in this lesson live.

The first gap: MCP's `tools/list` response, the list of tools a server advertises along with names, descriptions, and parameter schemas, is injected into the model's context as if it were trusted operational metadata, not treated as untrusted input requiring review the way a new dependency's source code would be. A tool's *description* field, a few sentences of natural-language text meant for the model to read, can carry hidden instructions exactly like any other text in context. Invariant Labs formally named this "Tool Poisoning" in April 2025: a malicious MCP server's description, not its execution, carries adversarial instructions loaded at session start and followed with the same authority as the user's own request. Their example showed a poisoned WhatsApp-adjacent MCP server exfiltrating message history with no direct tool call from the user at all; the tool's own description did the asking. ([CSA Research Note](https://labs.cloudsecurityalliance.org/research/csa-research-note-mcp-tool-poisoning-ai-agent-exfiltration-2/))

The second gap, and the one MCPoison exploits specifically, is that the protocol has no mandated re-verification after initial approval, and no cryptographic attestation of tool description integrity. A package lockfile pins a hash you can diff on every install. MCP has nothing structurally equivalent: once you approve a server, the protocol gives no built-in signal that what you approved has changed. "Tool poisoning" exploits this at first contact. "Rug pull" exploits the lifecycle gap between approval and later use. Both exploit the same missing property: there is no local artifact to diff a currently running tool definition against.

The third gap connects this lesson back to Lesson 07's blast-radius framing: an MCP server's actual permission boundary is set by the credential it holds, not the tool names it exposes. "Read issues" and "read all your private repos" being reachable from the same OAuth/PAT scope is the vulnerability, independent of any specific malicious prompt, because the agent's capability was never actually scoped to the task.

## The idea: the capability supply chain has the same failure modes as the code supply chain, with fewer defenses

### Three attacks on trust establishment

| Attack | Mechanism | When it fires |
|---|---|---|
| Tool poisoning | Adversarial instructions hidden in a tool's description, parameter names, defaults, or enums, loaded into context at discovery time | First contact, before the user's task even begins |
| Rug pull | A tool is clean at approval time, then mutated afterward (remote server change, or a config re-synced from a shared repo), since MCP has no mandated re-verification | After approval, at any later invocation |
| Tool shadowing | A malicious server's description biases how the agent uses an entirely different, legitimate tool it has access to | Any time the poisoned server and the legitimate tool coexist in the same session |

A 2025/2026 benchmarking study (treated by the dossier as indicative, not independently re-verified) found attack success rates exceeding 60% across more than 45 real-world MCP servers in a lab setting, with the highest-performing model reaching 72.8%. A separate controlled cross-model study found unsafe tool invocations in up to 36% of trials under baseline, undefended configurations across GPT-5.3, DeepSeek-V3, and LLaMA-3.5, with per-scenario attack success rates of 0.59-0.73 for rug pull, 0.75-0.97 for shadowing, and 0.42-0.60 for tool poisoning depending on model; a proposed layered defense (descriptor integrity verification, semantic vetting, runtime guardrails) brought unsafe invocations down to 15% while raising the block rate to 74%, which is a meaningful improvement and also, again, not zero. ([CSA Research Note](https://labs.cloudsecurityalliance.org/research/csa-research-note-mcp-tool-poisoning-ai-agent-exfiltration-2/), [arXiv 2512.06556v2](https://arxiv.org/html/2512.06556v2))

### Rule files: configuration as an injection surface, with no MCP required

The rule-file backdoor from Lesson 08 belongs in this lesson's frame too, because it shares the exact same root property as tool poisoning: an artifact labeled "configuration" rather than "code" or "user input," read into the model's context with full developer authority, that nobody reviews as carefully as executable code. Pillar Security's March 2025 disclosure showed AI coding assistant rule files (`.cursor/rules`, Copilot custom instructions) carrying hidden instructions, including invisible Unicode characters, that steer an agent toward planted vulnerabilities or exfiltration logic while the generated code still looks legitimate on review. A poisoned corporate rule-file repository taints every downstream project that imports it, the same supply-chain shape as a poisoned shared library, just without a package manager's existing tooling (checksums, advisory databases, lockfiles) to catch it. ([Pillar Security via GlobeNewswire](https://www.globenewswire.com/news-release/2025/03/18/3044719/0/en/New-Vulnerability-in-GitHub-Copilot-and-Cursor-How-Hackers-Can-Weaponize-Code-Agents-Through-Compromised-Rule-Files.html))

### Confused deputy: a classical vulnerability class reappearing in agent infrastructure

MCP's authorization model is a separate, equally important risk surface from tool poisoning, and it does not require any prompt injection at all. The MCP specification requires OAuth 2.1 with PKCE, audience-bound tokens (RFC 8707 resource indicators), and explicitly bans "token passthrough," where an MCP server forwards a client's token unmodified to a downstream API. The reason the spec had to make this a MUST rather than a SHOULD is a specific, named attack chain: a static client ID at an MCP proxy, combined with dynamic client registration and a stale consent cookie, lets an attacker redirect a victim's authorization code to an attacker-controlled redirect URI without the victim granting fresh consent. This is the classical confused-deputy vulnerability (a component with more privilege than the party it's acting on behalf of, tricked into misusing that privilege), reappearing in agent infrastructure. ([MCP Authorization specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization), [MCP Security Best Practices](https://modelcontextprotocol.io/docs/2025-11-25/tutorials/security/security_best_practices))

Implementing full per-client consent storage, state-parameter validation bound server-side before consent, and audience checks is meaningfully more implementation burden than a naive OAuth passthrough, which is exactly why a naive implementation is tempting and exactly why the spec forbids it outright rather than leaving it to judgment.

### The GitHub and Supabase MCP incidents, reframed as supply-chain failures

Lessons 08 and 09 covered the GitHub MCP and Supabase MCP incidents through the lethal trifecta and the exfiltration-channel lens. The supply-chain lens adds one more layer to both: GitHub's own maintainers, in the public issue thread, pushed back on calling this a disclosable "vulnerability" at all, arguing it is "a very general risk" true of any lethal-trifecta-capable tool combination, not a specific flaw in their server. ([github-mcp-server issue #844](https://github.com/github/github-mcp-server/issues/844)) That disagreement is itself informative: it shows that the MCP ecosystem has not settled whether "this server's token scope allows a dangerous combination" is a bug to patch or an inherent property of connecting a broad credential to an agent, which is a judgment call every team adopting an MCP server has to make for itself, server by server. Supabase's response to the General Analysis disclosure took the opposite framing explicitly, shipping concrete mitigations (read-only mode, project scoping, restricted feature groups) that narrow the credential's scope rather than arguing the report overstated the risk. ([Defense in Depth for MCP Servers](https://supabase.com/blog/defense-in-depth-mcp))

### What a defensible MCP posture actually requires

- **Hash-pin the full tool definition at approval time** (name, description, input schema) and re-check the hash before every invocation, not just at first approval. This is the direct fix for rug pull, and it is exactly the property a package lockfile gives you for ordinary dependencies; MCP does not give it to you by default, so the client has to add it. The proposed ETDI protocol extension and several third-party MCP proxies implement this.
- **Scope every MCP server's credential to the task, not to convenience.** A GitHub MCP server token scoped to the specific repos a task needs, rather than blanket org-wide access, removes the lethal-trifecta combination at the credential layer, independent of what any tool description says.
- **Treat any detected drift as compromised until proven otherwise**, and block rather than silently continue. The MCPoison pattern specifically exploited the absence of this behavior.
- **Require re-confirmation for any write action that follows a read of sensitive data in the same session**, rather than a single "Always Allow" granted once at onboarding. This is the same approval-fatigue problem Lesson 07 names, applied specifically to the MCP trust-establishment moment.
- **Audit rule files and shared configuration with the same review bar as code**, specifically scanning for invisible Unicode and unusual formatting, and do not trust a shared/corporate rule repository without provenance checks.
- **Never implement a naive OAuth token-passthrough**, even though it is the simpler integration path; build per-client consent storage, audience-bound tokens, and state-parameter validation from the start, because retrofitting this after a confused-deputy incident is far more expensive than building it in.

## In practice at Northwind

Desk's own tools and any third-party MCP servers Northwind's engineers connect to their coding agents sit in the same supply-chain risk category as this lesson's cases, even though Desk itself is a first-party product.

1. **If Northwind's engineering org adopts the GitHub MCP server or similar broad-scope tool**, scope tokens per-repo or per-task rather than reusing the org-wide PAT the CI pipeline uses, and require re-confirmation before any write action following a read of private data in the same session.
2. **Hash-pin every third-party MCP server's tool definitions** before putting them in front of any agent with write access to customer data, and build the re-check into the client, since the protocol will not do this for you.
3. **Treat Desk's own prompt templates and shared instruction documents as configuration requiring code-level review**, specifically checking for anomalous Unicode or formatting if edited by anyone outside a small, trusted review group.
4. **If Desk's platform team ever builds an internal MCP proxy** brokering access to third-party SaaS APIs without native MCP support, implement the full OAuth 2.1 flow (PKCE, audience-bound tokens, per-client consent storage) rather than the simpler but explicitly banned token-passthrough shortcut.
5. **Decide explicitly, server by server, whether "broad credential plus agent access" is acceptable for that integration**, rather than assuming a vendor's framing settles the question. GitHub and Supabase answered that question differently for their own products; Northwind has to answer it for Desk's own integrations.

## What strong engineers know

- Approving an MCP server once is not the same as trusting it forever. Any system treating "approved at onboarding" as permanent is vulnerable to supply-chain drift, exactly like npm packages, just without a lockfile to catch it by default.
- A tool's description field is as much an attack surface as its execution. The model reads it with the same authority as any other context, before the user's task even starts.
- An MCP server's real permission boundary is the credential it holds, not the tool names it advertises. "Read issues" and "read all private repos" reachable from the same token is the vulnerability, regardless of the tool's name.
- Confused-deputy and token-passthrough risks exist independent of prompt injection entirely; they are a classical authorization bug reappearing in new infrastructure, with a well-understood fix that's simply more work than the naive shortcut.
- Whether a lethal-trifecta-capable integration counts as "a vulnerability" or "an acceptable inherent risk" is a live disagreement even among the vendors involved; don't let a vendor's framing substitute for your own risk decision.
- Configuration (rule files, MCP tool descriptions, shared prompt templates) deserves the same review rigor as executable code the moment it enters an agent's context, because it carries the same authority once there.
- Defenses that measurably reduce attack success (hash-pinning, descriptor vetting, runtime guardrails) still leave a real residual in the published numbers; treat them as risk reduction, not elimination, the same lesson as prompt-injection filters in Lesson 08.

## Decide

Northwind's platform team is choosing how to roll out MCP server access to 40 engineers using Claude Code and Cursor against the company's internal tools (Jira, a ticketing system, and a read-only analytics database). Given everything in this lesson:

- **Option A**: a single shared MCP proxy server per tool, approved once by the platform team, with broad service-account credentials behind it for simplicity.
- **Option B**: per-engineer, per-task credential scoping behind the proxy, with hash-pinned tool definitions re-checked on every session start, at the cost of more operational overhead.
- **Option C**: Option A, plus a quarterly manual security review of each MCP server's tool descriptions.
- **Option D**: no shared proxy; each engineer configures their own MCP server connections directly with their own credentials.

Pick one, and name the specific attack from this lesson (tool poisoning, rug pull, tool shadowing, confused deputy) your choice is weakest against.

## One sentence summary

> MCP tool definitions and shared configuration carry the same authority as developer instructions the moment they enter an agent's context, so they need the same supply-chain discipline (pinning, re-verification, least-privilege credentials) as any other dependency, with the added complication that the protocol gives you none of that by default.

## Check question

A Northwind engineer reports that a third-party Jira MCP server they approved six weeks ago just started behaving differently: a ticket-creation tool now also appends a comment with an external email address whenever a ticket is tagged "urgent." Using this lesson's framework, name which specific attack this matches, what you would check first, and what you would change about Northwind's MCP approval process regardless of what the investigation finds.

## Sources

- [MCP Tool Poisoning: Adversarial Hijacking of AI Agent Workflows](https://labs.cloudsecurityalliance.org/research/csa-research-note-mcp-tool-poisoning-ai-agent-exfiltration-2/) · Cloud Security Alliance Research · 2025/2026 · consolidates tool poisoning, rug pull, and shadowing with benchmark numbers.
- [CVE-2025-54136 advisory context via SecureW2](https://securew2.com/blog/mcp-rug-pull-attack) · SecureW2 · 2025 · the Cursor "MCPoison" rug-pull vulnerability and the ETDI proposed fix.
- [GitHub issue #844, github-mcp-server](https://github.com/github/github-mcp-server/issues/844) · GitHub repo maintainers · ongoing · GitHub's own position that this is a general risk, not a specific vulnerability.
- [GitHub MCP Exploited: Accessing private repositories via MCP](https://invariantlabs.ai/blog/mcp-github-vulnerability) · Invariant Labs · 2025 · primary disclosure.
- [Supabase MCP can leak your entire SQL database](https://generalanalysis.com/blog/supabase-mcp-blog) · General Analysis · 2025 · the Supabase MCP incident.
- [Defense in Depth for MCP Servers](https://supabase.com/blog/defense-in-depth-mcp) · Supabase engineering blog · 2025 · Supabase's mitigations.
- [New Vulnerability in GitHub Copilot and Cursor: Rules File Backdoor](https://www.globenewswire.com/news-release/2025/03/18/3044719/0/en/New-Vulnerability-in-GitHub-Copilot-and-Cursor-How-Hackers-Can-Weaponize-Code-Agents-Through-Compromised-Rule-Files.html) · Pillar Security · 2025 · the rule-file backdoor disclosure.
- [MCP Authorization specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization) · Model Context Protocol · 2025-11-25 revision · OAuth 2.1 requirements and the token-passthrough ban.
- [MCP Security Best Practices](https://modelcontextprotocol.io/docs/2025-11-25/tutorials/security/security_best_practices) · Model Context Protocol · same revision · the confused-deputy attack chain in detail.
- [arXiv 2512.06556v2](https://arxiv.org/html/2512.06556v2) · cross-model study · per-scenario attack success rates for rug pull, shadowing, and tool poisoning.
