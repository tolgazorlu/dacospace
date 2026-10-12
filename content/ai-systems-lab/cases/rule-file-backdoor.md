# Case · The config file that writes vulnerable code on purpose (2025)

**Category:** Security · **Lessons:** 08, 21 · **Severity:** hidden instructions in configuration, no special access required

## The system

AI coding assistants like GitHub Copilot and Cursor read "rule files" (Cursor's `.cursor/rules`, Copilot's custom instructions) into the model's context to steer code generation: house style, preferred libraries, architectural conventions. Teams commonly share rule files across projects, sometimes pulling them from a shared internal repository so every project gets the same conventions.

## What was observed

Pillar Security disclosed in March 2025 that these rule files could be made to carry hidden instructions, including invisible Unicode characters, that silently steered the agent into generating code with planted vulnerabilities or data-exfiltration logic (leaking environment variables, database credentials, API keys), while the generated code looked legitimate to a human reviewer.

## Stop and think

1. A rule file is configuration, not code. What does your team's review process actually apply to configuration files versus to the code those files influence?
2. If an instruction in a rule file is invisible (hidden Unicode, unusual formatting), what would a normal code review catch, and what would it miss entirely?
3. If a corporate rule-file repository is shared across many projects, what happens to every downstream project the moment that one shared file is poisoned?

## What actually happened

Rule files are read into the model's context with the same authority as developer-written instructions, but they are treated with far less scrutiny than executable code during review, since they look like settings rather than logic. Pillar Security's disclosure showed an attacker could embed instructions, including characters invisible in a normal editor or diff view, that caused the agent to quietly generate code planting vulnerabilities (insecure defaults, missing validation) or exfiltration logic (writing secrets to a log line, an outbound call, a comment an attacker later scrapes), while the visible, human-reviewable parts of the generated code looked ordinary ([Pillar Security via GlobeNewswire](https://www.globenewswire.com/news-release/2025/03/18/3044719/0/en/New-Vulnerability-in-GitHub-Copilot-and-Cursor-How-Hackers-Can-Weaponize-Code-Agents-Through-Compromised-Rule-Files.html)).

The disclosure characterizes attack requirements as needing "no special privileges, administrative access, or sophisticated tools," which is consistent with the attack surface being configuration a contributor can submit through an ordinary pull request. No quantified prevalence figure for real-world exploitation was verifiable from the primary disclosure.

The second-order effect is the one that matters for enterprise scale: a shared corporate rule-file repository, once poisoned, taints every downstream project that imports it, multiplying a single successful attack across an entire organization's codebase without any additional attacker effort.

## Root causes

**Technical.** Rule files enter the model's context as trusted instructions, with no distinction in the model's handling between "the developer wrote this rule" and "someone else's contribution to this rule file wrote this." Invisible Unicode characters are, by construction, not something a visual diff or a quick human skim will surface.

**Organizational.** Code review practices at most teams apply real scrutiny to executable code and much lighter scrutiny, often none, to configuration files, formatting rules, and linter settings, because those have historically been low-stakes. That assumption no longer holds once an LLM reads the configuration as instructions with the power to shape generated logic.

## What would have prevented it

- Audit rule files with the same review rigor as executable code: require review, diff, and approval for any change to a shared rule file, same as for a source file. Low cost, directly closes the gap that let this attack work.
- Specifically scan rule files for invisible Unicode and unusual formatting before they are merged or imported, since this is the one attacker technique that defeats a normal visual review. Cheap to automate with a linter or pre-commit check.
- Do not import shared or corporate rule-file repositories without provenance checks (verified source, signed commits, or at minimum a known-good hash); treat an unaudited external rule file the same as an unaudited external dependency.

## The lesson for your system

- Identify every artifact that enters your AI coding assistant's context as "configuration" rather than "code" or "user input" (rule files, lint configs, custom instructions, system prompts loaded from a repo) and confirm it gets the same review bar as executable code.
- Add an automated scan for invisible Unicode and anomalous formatting to your CI pipeline for any file your coding agent reads as instructions.
- If your organization maintains a shared rule-file repository, treat changes to it like changes to a shared library: reviewed, versioned, and auditable, not edited casually.
- Ask whether your current code review tooling even renders invisible Unicode visibly; if it doesn't, a clean-looking diff is not evidence of a clean file.
- Remember that the scale of damage here comes from reuse, not from any single file: one poisoned rule file imported by many teams multiplies a single successful attack across every project that trusted it, with no extra effort from the attacker. Budget review effort for shared configuration proportional to how many downstream projects depend on it, not to how innocuous it looks.

## Sources

- [New Vulnerability in GitHub Copilot and Cursor: Rules File Backdoor](https://www.globenewswire.com/news-release/2025/03/18/3044719/0/en/New-Vulnerability-in-GitHub-Copilot-and-Cursor-How-Hackers-Can-Weaponize-Code-Agents-Through-Compromised-Rule-Files.html) · Pillar Security · 18 Mar 2025
