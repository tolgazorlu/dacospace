# Case · A wiper prompt shipped inside a coding agent's own update (2025)

**Category:** Security · **Lessons:** 10, 07, 21 · **Severity:** supply-chain compromise, destructive AWS CLI payload, CVE-2025-8217

## The system

The Amazon Q Developer extension for VS Code is an AI coding agent, open-sourced as part of the `aws-toolkit-vscode` repository, with roughly 950,000 installs. Like most coding agents, it can be instructed in natural language to run shell and cloud-CLI commands on behalf of the developer using it, including against whatever AWS profiles are configured on that machine.

## What was observed

On 17 July 2025, version 1.84.0 of the extension shipped publicly to the VS Code Marketplace. It contained an injected prompt instructing the agent to "clear a system to a near-factory state and delete file-system and cloud resources." AWS pulled the compromised build and shipped a fix within roughly two days.

## Stop and think

1. The attacker did not target an end user's conversation with the agent. Where in the system did the malicious instruction actually originate, and what does that imply about what "prompt injection" needs to cover?
2. The payload included real AWS CLI commands (`ec2 terminate-instances`, `s3 rm`, `iam delete-user`). What would have had to be true, technically, for those commands to run successfully against a victim's AWS account the moment they installed the update?
3. AWS said the destructive code had a syntax error and never executed against customer resources. If it had been syntactically correct, what single control (if any) would have stood between "the agent received this instruction" and "the agent executed it"?

## What actually happened

This was not a prompt injection against an end user's conversation; it was a supply-chain compromise of the agent's own distribution pipeline. An attacker used an improperly, over-scoped CodeBuild/GitHub token to commit a prompt directly into the open-source `aws-toolkit-vscode` repository on 13 July 2025. The build pipeline funneled the malicious file into the production build only when `STAGE=prod`, so it evaded whatever testing happened in non-production environments ([BleepingComputer/404 Media](https://bleepingcomputer.com/news/security/amazon-ai-coding-agent-hacked-to-inject-data-wiping-commands/amp)).

The injected prompt instructed the agent to run destructive AWS CLI commands against the victim's own configured profiles: terminating EC2 instances, deleting S3 buckets, deleting IAM users. AWS's security bulletin states the destructive code contained a syntax error and never executed against any customer resources in the wild ([AWS Security Bulletin AWS-2025-015](https://aws.amazon.com/security/security-bulletins/AWS-2025-015/)). The attacker's own stated position, reported by 404 Media, was that the payload was deliberately made non-functional, intended as a demonstration of "AI security theater" rather than a real attack. The compromised build was live for roughly two days (17-19 July) before AWS pulled it and released version 1.85.0. The incident is tracked as CVE-2025-8217.

The design flaw this exposed sits below the specific payload's bug: a coding agent that can be instructed, in plain natural language, to run irreversible shell and cloud-CLI operations with no required human approval gate. Whether or not this particular syntax error saved anyone, the architecture would have let a correctly-written version of the same instruction run unattended.

## Root causes

**Technical.** An over-scoped CI/CD token let an outside contributor commit directly to a repository that fed production builds, with a build pipeline that routed malicious changes into the production artifact under a specific stage flag, evading non-production testing. Beneath that: the agent itself had no required approval gate for bulk-deletion or cloud-teardown commands.

**Organizational.** The token scope AWS cites as the actual root cause reflects a separation-of-duties gap: an external contributor's merged code should not also be able to control what ships to production, but in this pipeline it could.

## What would have prevented it

- Least-privilege scoping of CI/CD tokens, the fix AWS explicitly cites, so an external contribution cannot reach production build configuration regardless of what it contains. Highest leverage, and it is the control that actually failed here.
- Separation of duties between the people and tokens that can merge code and the pipeline stage that decides what ships to production. Moderate organizational cost, standard practice in mature software supply chains.
- A mandatory human-approval or dry-run step before an agent executes bulk-deletion or cloud-teardown commands, independent of how the instruction entered the agent's context. This is the control that bounds blast radius even when every upstream defense fails.

## The lesson for your system

- Treat your coding agent's own CI/CD pipeline and its tokens as part of the agent's attack surface, not just the prompts end users type into it; this incident originated in the build pipeline, not a user conversation.
- Audit who can merge code that ends up in a production build of any tool your developers run with shell or cloud-CLI access, and what scope their credentials actually carry.
- Require a non-bypassable human approval or dry-run gate before any agent-triggered bulk-deletion or infrastructure-teardown command runs, so a correctly-written version of this payload would still have been stopped.
- Do not assume "the destructive code had a bug" is a repeatable safety margin; design for the version of the attack that works.

## Sources

- [Amazon AI coding agent hacked to inject data wiping commands](https://bleepingcomputer.com/news/security/amazon-ai-coding-agent-hacked-to-inject-data-wiping-commands/amp) · BleepingComputer, citing 404 Media · Jul 2025
- [AWS Security Bulletin AWS-2025-015](https://aws.amazon.com/security/security-bulletins/AWS-2025-015/) · AWS · Jul 2025
