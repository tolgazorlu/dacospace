# Case · Slack AI leaks private data through a public channel (2024)

**Category:** Security · **Lessons:** 08, 09 · **Severity:** cross-channel data exfiltration via indirect prompt injection

## The system

Slack AI is Slack's built-in assistant, which answers employee questions by retrieving relevant messages (a RAG search) across the workspace. By Slack's own design, that retrieval includes messages in public channels regardless of whether the asking user has joined those channels; Slack treated this as intended behavior, consistent with "anyone in the workspace can technically search public channels."

## What was observed

PromptArmor disclosed in August 2024 that an attacker, without any special access, could post a message in a public channel they control and later cause a completely different user's private data (such as an API key from a private channel) to be exposed through Slack AI's own output, rendered as a clickable markdown link.

## Stop and think

1. The attacker never joins the victim's private channel and never interacts with the victim directly. Where does the attacker's content and the victim's private data actually meet?
2. Slack AI's answer contains a markdown link labeled "click here to reauthenticate." What makes that link dangerous, and what does clicking it actually send?
3. Slack called the underlying retrieval behavior "intended." If the behavior is intended, what does that imply about where the fix needs to happen, versus just patching one exploit payload?

## What actually happened

The attacker posted a poisoned instruction in a public channel they controlled. Slack AI's RAG search is workspace-wide for public-channel content, so when any employee later asked Slack AI a related question, for example "what's my API key," the assistant's retrieval step pulled in the attacker's poisoned public message as if it were ordinary searchable context. The poisoned text instructed the model to render a markdown link inviting the user to "click here to reauthenticate," with a URL that had the victim's own private data (an API key retrieved from a private channel, in the same context window) appended as a query parameter. Clicking the link sent that private data straight to the attacker's server ([PromptArmor](https://promptarmor.substack.com/p/data-exfiltration-from-slack-ai-via)).

The Register's follow-up reporting noted Slack's initial public position was that this reflected documented, intended behavior, since public-channel content is searchable workspace-wide by design, and only later did Slack ship a partial patch ([The Register](https://www.theregister.com/2024/08/21/slack_ai_prompt_injection)). A subsequent Slack feature update, allowing the assistant to ingest uploaded files, widened the injection surface further: an attacker no longer needed a Slack account at all, since hidden text in an uploaded PDF could carry the same payload.

## Root causes

**Technical.** The LLM has no structural way to distinguish a developer system prompt from attacker-authored message content that has been pulled into the same context window by RAG retrieval; once the poisoned text is "in," the model treats it with the same authority as a legitimate instruction.

**Organizational.** Slack's documented "public channels are searchable workspace-wide" policy was designed as a convenience default for human search, long before an LLM sat on top of it able to act on retrieved text rather than just display it. The policy was not re-evaluated for the new trust implications once an assistant could compose and render clickable, parameterized links from retrieved content.

## What would have prevented it

- Scope RAG retrieval to content the requesting user has actually joined, or to a trust boundary matching the application's real security model, rather than the platform's historical "technically public" convenience default. Highest leverage, but requires rearchitecting retrieval and likely a real loss of the "search everything public" convenience feature.
- Do not render model-generated markdown links or images without stripping query parameters or validating the destination domain against an allowlist. Moderate cost, closes this specific exfiltration channel without touching the retrieval model.
- Re-evaluate any "convenience default" inherited from a pre-AI product (search, sharing, auto-preview) the moment an LLM gains the ability to act on, rather than just display, retrieved content.

## The lesson for your system

- Check whether your assistant's retrieval scope matches your application's actual trust boundaries, or just the platform's historical "technically accessible" definition; those are not the same thing once an LLM composes links from retrieved data.
- Treat any markdown link or image your model generates as something that needs domain validation before rendering, especially if it contains query parameters pulled from retrieved content.
- Ask what happens the day your product adds a new ingestion source (uploaded files, email, external integrations): does it also widen your prompt-injection attack surface, and did your original threat model account for it?
- Do not assume "we've always allowed this for search" is still a safe default once an AI feature can read that same content and act on it.

## Sources

- [Data Exfiltration from Slack AI via indirect prompt injection](https://promptarmor.substack.com/p/data-exfiltration-from-slack-ai-via) · PromptArmor · Aug 2024
- [Slack AI can leak private data via prompt injection](https://www.theregister.com/2024/08/21/slack_ai_prompt_injection) · The Register · 21 Aug 2024
