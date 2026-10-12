---
id: ai-mcp-gateway-security
title: Design an MCP gateway for a company's internal agents
level: senior
topics: [ai, security, mcp, agents, oauth]
minutes: 45
---

## Prompt

Your company wants a central MCP gateway that lets every internal AI agent, a support bot, a coding agent, a Slack bot, talk to three third-party SaaS APIs and your own GitHub org, instead of each agent integrating directly. Design the gateway's security model.

## Clarifications

- **Scale?** ~50 engineers use a coding agent through the gateway; ~10 other internal agents register as clients.
- **What's behind the gateway?** GitHub (private and public repos), a CRM, and a ticketing system, none of which speak MCP natively.
- **Today's state?** Each agent currently uses one shared, org-wide PAT/API key with broad scope, the same scope used by the CI pipeline.
- **Threat model of concern?** A compromised or malicious MCP tool server (supply-chain/rug-pull risk) and token misuse/confused-deputy attacks across clients.
- **Compliance ask?** Security wants to know, for any given week, which agent sessions combined a sensitive read with an external write.
- **Latency budget?** The gateway hop should add no more than ~50ms p99 to a tool call.

## Follow-ups

- How do you validate that a token presented to your gateway was actually issued for your gateway (audience claim), not replayed from another service?
- One of the three SaaS providers doesn't support RFC 8707 resource indicators. What do you do?
- Six months after approval, a third-party MCP tool server silently changes its tool description between two `tools/list` calls. How do you detect and respond to that drift?
- Security asks for a report of every session that read a private GitHub repo and then wrote to a public one in the same flow. Can your current design produce that?
- You need to onboard a fourth SaaS provider in a week. What part of your design lets you do that without a new security review from scratch?

## Rubric

- Rejects token passthrough (forwarding whatever token the client sends) and instead issues audience-bound tokens scoped per client/task, naming the confused-deputy risk by name.
- Replaces the org-wide PAT with per-repo or per-task scoped credentials, explicitly reducing blast radius versus the CI-equivalent broad scope.
- Requires PKCE (S256), server-side state-parameter validation bound before consent, and per-client consent storage rather than a shared consent cookie.
- Designs tool-definition hash-pinning or an equivalent integrity check so a rug-pulled tool server is detected and blocked, not silently adopted.
- Analyzes the lethal-trifecta combination explicitly for at least one downstream integration (private repo read plus public write channel) and proposes a structural control, not just a content filter.
- Produces the audit/telemetry needed to answer "which sessions combined a sensitive read with an external write," naming what gets logged and where.
- Covers onboarding a new provider without re-doing the whole security model from scratch, i.e. the gateway's scoping model generalizes.

## Pitfalls

- Proposing "just use OAuth instead of PAT" without addressing that OAuth alone doesn't prevent the scope-combination (confused-deputy) problem.
- One-time security review of a tool server with no ongoing drift or integrity detection.
- A single shared, broadly-scoped credential for all clients because per-client scoping "adds complexity."
- No answer for auditing cross-session, cross-tool flows; only per-call logging.
