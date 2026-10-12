# Case · The tool you approved isn't the tool you're running (2025)

**Category:** Security · **Lessons:** 10, 08, 21 · **Severity:** MCP tool-definition compromise, CVE-2025-54136 (CVSS 8.8)

## The system

MCP (Model Context Protocol) clients, including Cursor, discover available tools by calling `tools/list` on a connected server. The server's response, a name, a natural-language description, and an input schema per tool, is loaded directly into the model's context as trusted operational metadata. A user typically approves a new MCP server once, the first time it is used.

## What was observed

Two related but distinct problems surfaced in 2025. Invariant Labs formally named "Tool Poisoning Attacks" in April, showing a malicious server's tool description, not its execution, could carry hidden instructions followed with the same authority as the user's own request. Separately, Check Point Research disclosed CVE-2025-54136 ("MCPoison," CVSS 8.8) in Cursor in July: a tool a developer had already approved stopped behaving the way it did when it was approved.

## Stop and think

1. If a tool's *description* (not its code) can carry an attack, what has to be true about how that description reaches the model, and why would text labeled "metadata" get the same trust as a direct user instruction?
2. A developer approved an MCP server's configuration once. What, if anything, re-checks that configuration the next time the same server is used?
3. What is the practical difference, from a defender's point of view, between a tool that was malicious from day one and a tool that was clean at approval and changed later?

## What actually happened

Tool poisoning exploits the first contact: MCP's `tools/list` response is injected verbatim into the agent's context at session start, with no cryptographic attestation of its integrity. Invariant Labs demonstrated a poisoned WhatsApp-adjacent MCP server whose tool description alone caused an agent to exfiltrate message history, with no direct tool call ever requested by the user ([CSA Research Note](https://labs.cloudsecurityalliance.org/research/csa-research-note-mcp-tool-poisoning-ai-agent-exfiltration-2/)).

The rug pull exploits a different gap: the lifecycle between approval and later use. In the Cursor case, an attacker committed a benign-looking MCP server configuration to a shared repository. A developer reviewed it, found nothing alarming, and approved it. The attacker then silently swapped the underlying command the config pointed to, to a malicious one, after approval. Because Cursor did not re-validate the configuration on each subsequent use, the developer's agent kept running what it believed was the already-approved, already-vetted tool, with no new prompt and no new review ([SecureW2](https://securew2.com/blog/mcp-rug-pull-attack)). Cursor fixed this in version 1.3 (late July 2025), which now re-triggers the approval flow whenever it detects a configuration change.

Across more than 45 real-world MCP servers tested in one lab benchmark, attack success rates for this class of attack exceeded 60%, with the best-performing agent model reaching 72.8%; the dossier treats this figure as indicative, from a research-note benchmark, not independently re-verified ([CSA Research Note](https://labs.cloudsecurityalliance.org/research/csa-research-note-mcp-tool-poisoning-ai-agent-exfiltration-2/)).

## Root causes

**Technical.** MCP has no mandated mechanism to cryptographically pin a tool's definition at approval time and detect drift before every subsequent invocation. The protocol's trust model treats "approved once" as equivalent to "trusted indefinitely."

**Organizational.** Shared MCP server configurations committed to a repository inherit the repository's code-review norms, but config files are routinely reviewed less rigorously than executable code, and in the rug-pull case, the malicious swap happened entirely after the human review step, where no further human attention was expected.

## What would have prevented it

- Hash-pin the full tool definition (name, description, input schema) at approval time, and re-check that hash before every subsequent invocation, blocking or alerting on mismatch. This is the proposed ETDI protocol extension and the general shape of the fix; it is the highest-leverage defense because it closes the rug-pull window specifically, independent of what the malicious change looks like.
- Force mandatory re-approval on any detected configuration change, which is exactly what Cursor 1.3 added. Lower implementation cost than full hash-pinning across the protocol, but depends on the client detecting the change in the first place.
- Scan every field of a new tool's schema (description, parameter names, defaults, enums) for hidden or adversarial instructions before first approval, not just a visual skim of the description text.

## The lesson for your system

- Treat "we reviewed and approved this MCP server once" as a point-in-time fact, not a standing guarantee; ask what, if anything, in your stack would detect the server's behavior changing next week.
- If your team pulls MCP server configs from a shared or external repository, apply the same code-review bar to those configs as to executable code, including diffing on every sync, not just at first import.
- Ask your MCP client vendor directly whether tool definitions are hash-pinned or re-validated on each use; if the answer is no, you are relying on the server operator's good faith indefinitely.
- Budget for the latency and complexity cost of hash-pinning and schema scanning now; this is a supply-chain control, and supply-chain controls are cheaper before an incident than after one.

## Sources

- [MCP Tool Poisoning: Adversarial Hijacking of AI Agent Workflows](https://labs.cloudsecurityalliance.org/research/csa-research-note-mcp-tool-poisoning-ai-agent-exfiltration-2/) · Cloud Security Alliance Research · 2025/2026
- [CVE-2025-54136 advisory context via SecureW2](https://securew2.com/blog/mcp-rug-pull-attack) · SecureW2 · 2025
