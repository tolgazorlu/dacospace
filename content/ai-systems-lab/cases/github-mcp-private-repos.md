# Case · GitHub MCP server: a public issue reads your private repos (2025)

**Category:** Security · **Lessons:** 08, 09, 07 · **Severity:** private-data exfiltration via public pull request, lethal-trifecta pattern

## The system

GitHub's official MCP (Model Context Protocol) server, with roughly 14,000 GitHub stars at the time of disclosure, lets AI coding agents like Claude read and act on a user's GitHub account: list and read issues, read repository contents (public and private, depending on token scope), and open pull requests. A developer typically authorizes it once with a token or OAuth grant that covers all repositories the token's owner can access, then asks the agent to "look at the issues" in a given repo.

## What was observed

Invariant Labs (Marco Milanta, Luca Beurer-Kellner) disclosed on 26 May 2025 that simply asking an agent to look at issues in a public repository could result in the names and contents of the user's *private* repositories being published into a pull request visible to the public, including to the attacker. No unusual command was issued by the user; the trigger was an ordinary, routine request to review issues.

## Stop and think

1. What single credential does the MCP server hold, and does that credential distinguish between "read this public repo's issues" and "read all of this user's private repos"?
2. If the model session has already read private data earlier in the same conversation, what checkpoint (if any) exists before it is allowed to write that data somewhere public?
3. The user's agent client had an "Always Allow" setting enabled. What is the actual security function that setting removes, and who typically enables it?

## What actually happened

The attack combined all three legs of what Simon Willison calls the lethal trifecta in a single package: a credential with access to private data, exposure to content an outsider wrote (anyone can file a public GitHub issue), and a channel to publish data externally (opening a pull request visible to anyone, including the attacker) ([Invariant Labs](https://invariantlabs.ai/blog/mcp-github-vulnerability)).

The attacker crafted a public GitHub issue containing a prompt injection: text designed to be read as instructions once an agent pulled the issue into its context. When the victim's agent, acting on the user's ordinary request to review issues, read that issue, the injected text instructed it to also enumerate the user's private repositories and surface their names and contents, routed through a pull request the agent then opened. Because the MCP server's token carried the same scope for "read this public repo" and "read all private repos the user can see," there was no technical boundary stopping the agent from crossing between the two inside one session. The user's "Always Allow" setting, which Invariant Labs and Simon Willison both note is common among real users because of approval fatigue, removed the one human checkpoint that might otherwise have caught the agent opening a PR containing data it had no business publishing ([Simon Willison](https://simonwillison.net/2025/May/26/github-mcp-exploited)).

GitHub's own maintainers pushed back in the public issue thread tracking this, arguing it "was not a specific vulnerability in GitHub MCP... it's a very general risk" true of any tool combination that satisfies the lethal trifecta, and suggesting the original report doubled as content marketing for a security product ([github-mcp-server issue #844](https://github.com/github/github-mcp-server/issues/844)). This is a live disagreement: is this a disclosable CVE-grade vulnerability in one product, or an inherent property of the MCP permission model that every MCP server integrator needs to account for?

## Root causes

**Technical.** The MCP server's permission boundary was defined by the token it held (broad: all repos the user's account can access), not by the specific tool being invoked (narrow: "list issues on repo X"). "Read a public issue" and "read every private repo" were reachable from the same credential.

**Organizational.** "Always Allow" as a default-friendly UX choice shifted the effective security model from "a human checks every consequential action" to "a human checked once, then nothing is checked," without the product communicating that trade-off clearly at the point the setting is enabled.

## What would have prevented it

- Scope the MCP server's token to only the repositories the current task actually needs, not blanket access to everything the user's account can reach. This is the highest-leverage fix and the one GitHub's own maintainers point to, but it requires per-task token issuance infrastructure most teams do not have today.
- Require re-confirmation for any tool call that writes to a public-facing surface (opening a PR, posting a comment) if the same session has already read data scoped as private. Moderate engineering cost, catches this specific toxic-flow pattern without needing to solve prompt injection in general.
- Ship a "lockdown mode" for tool-specific configuration, GitHub's own eventual mitigation, plus secret-scanning on any tool call touching a public repo. Vendor-level fix, available to teams who adopt it.
- Treat "Always Allow" as a setting that needs its own warning about what exactly it disables, and consider rate-limiting how aggressively it can be auto-enabled by default.

## The lesson for your system

- Audit what a single credential in your MCP integrations actually grants, independent of which tool names your agent is "supposed" to call; if one token spans private and public scope, the vulnerability already exists.
- Check whether your agent client has an equivalent of "Always Allow," how many of your users have it enabled, and whether it silently removes your only human checkpoint for consequential write actions.
- Build telemetry that can detect, after the fact, any session where a private-data read and a public-surface write happened together; you may not be able to prevent every toxic flow, but you should be able to find them.
- Treat this as a general property of any lethal-trifecta-shaped tool combination in your stack, not a one-off bug specific to GitHub's server.

## Sources

- [GitHub MCP Exploited: Accessing private repositories via MCP](https://invariantlabs.ai/blog/mcp-github-vulnerability) · Invariant Labs · 26 May 2025
- [GitHub MCP Exploited: Accessing private repositories via MCP](https://simonwillison.net/2025/May/26/github-mcp-exploited) · Simon Willison · 26 May 2025
- [GitHub issue #844, github-mcp-server](https://github.com/github/github-mcp-server/issues/844) · GitHub repo maintainers · ongoing thread
