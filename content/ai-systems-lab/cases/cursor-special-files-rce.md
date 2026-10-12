# Case · The approval gate that only checked half the cases (2025)

**Category:** Security · **Lessons:** 08, 07, 21 · **Severity:** remote code execution, CVE-2025-54130, CVSS 7.5

## The system

Cursor, an AI-powered code editor, gates certain file operations behind user approval when its agent wants to touch security-sensitive files, such as editor dotfiles like `.vscode/settings.json`. Settings files like this can control the shell the editor launches, among other configuration that affects what code actually runs.

## What was observed

GHSA-vqv7-vq92-x87f (CVE-2025-54130, CVSS 7.5), disclosed 2 August 2025, showed that Cursor's agent could write to these sensitive files without triggering any approval prompt at all, under one specific condition: the file did not already exist.

## Stop and think

1. Cursor's approval gate was designed to protect sensitive dotfiles. What is the difference between "editing an existing file" and "creating a new file at the same path," and why might a security control only check one of those?
2. If an attacker can get arbitrary text into the agent's context (through a chained prompt injection elsewhere), and the agent can write `.vscode/settings.json` with no approval, what is the shortest path from that to running arbitrary commands?
3. Is the interesting part of this vulnerability the injection that gets attacker instructions into the agent's context, or the approval gate itself? What does your answer imply about where you'd spend limited security budget?

## What actually happened

The approval gate's implementation checked whether a security-sensitive file already existed and, if so, required user confirmation before modifying it. It did not apply the same check to file *creation*. If the target path did not yet exist, the agent could create `.vscode/settings.json` (or an equivalent sensitive config file) with no approval prompt whatsoever ([Cursor Security Advisory GHSA-vqv7-vq92-x87f](https://github.com/cursor/cursor/security/advisories/GHSA-vqv7-vq92-x87f)).

Chained with a separate, assumed prompt injection (the advisory does not claim a specific novel injection vector; it treats the injection as a given precondition), an attacker could hijack the agent's context enough to make it create a settings file that changes the user's default shell. Because file creation bypassed the approval gate entirely, that shell change happened with no human checkpoint, and from there, achieving remote code execution is a matter of the new shell configuration running attacker-chosen commands the next time the editor invokes it.

## Root causes

**Technical.** This was an approval-gate implementation gap, not a novel prompt-injection technique: the security team implementing the gate reasoned about "editing a sensitive file" and did not separately reason about "creating a file at that same sensitive path," even though both result in an attacker-controlled file at a security-relevant location.

**Organizational.** The underlying injection vector that would feed malicious intent into the agent's context is assumed, not disclosed as new, in the advisory. That is itself a finding: the severity of a prompt injection is capped by what the agent is subsequently allowed to do without a human checkpoint, so a gap in capability restriction can turn an otherwise-ordinary injection into remote code execution.

## What would have prevented it

- Apply approval gates uniformly to file creation and modification for any security-sensitive path, so "does this file already exist" is never a bypass. This is the direct, cheap fix, and it is exactly what closing this CVE required.
- Treat "least agency" (minimizing what an agent is allowed to do without a checkpoint, independent of whether a specific injection exists) as a more durable investment than trying to catch every possible injection payload; the advisory's own framing supports this, since the injection itself is not the novel part.
- Maintain an explicit, reviewed list of security-sensitive paths and operations (not just dotfiles, but shell configuration, environment files, startup scripts) and test every code path that can reach them, including the ones that look like edge cases (file doesn't exist yet, path is a symlink, path is case-different on a case-insensitive filesystem).

## The lesson for your system

- For every approval gate or permission check in your own agent tooling, explicitly test both "the resource exists" and "the resource does not exist yet" branches; creation and modification are not the same operation and often get different code paths.
- Enumerate the full set of paths and operations in your environment that can change what code runs next (shell config, startup scripts, environment variables, PATH), and confirm your approval logic covers every one of them, not just the ones you thought of first.
- Remember that prompt injection severity is bounded by agent capability, not by injection cleverness; closing capability gaps protects you even against injection techniques you have not seen yet.
- When you ship a security fix for an approval-gate gap, write a regression test that specifically exercises the "file doesn't exist" branch, since that is exactly the kind of case that reappears in the next similar feature.

## Sources

- [Cursor Security Advisory GHSA-vqv7-vq92-x87f](https://github.com/cursor/cursor/security/advisories/GHSA-vqv7-vq92-x87f) · Cursor/Anysphere · 2 Aug 2025
