---
id: llm-chat-streaming
title: Design a chat product backed by an LLM with streaming responses
level: mid
topics: [llm, streaming, websockets, backpressure, rate-limiting]
minutes: 45
---

## Prompt

We want to build a chat product where users type a message and see the model's
reply appear word by word, like it's typing. Design the backend that sits
between the client and the model.

## Clarifications

- **Who are the users and scale?** Consumer app, 500k daily active users, each
  sending about 8 messages per session, average session 10 minutes.
- **Peak concurrency?** About 15k concurrent open chat sessions at peak hour.
- **How is the model served?** A hosted LLM API that supports server-sent
  token streaming, average generation is 400 tokens per reply at roughly 40
  tokens/second.
- **Latency expectation?** First token within 1.5 seconds, p95 for the full
  reply under 15 seconds.
- **History?** Each conversation keeps the last 20 messages as context, older
  messages are summarized, conversations are persisted for 90 days.
- **Delivery channel?** Client connects over WebSocket or HTTP chunked
  response, must survive brief network blips without losing partial output.
- **Cost constraint?** Model calls are billed per token, so retries and
  duplicate generations must be avoided.

## Follow-ups

- A user's WiFi drops for 3 seconds mid-stream, how do they resume without
  re-sending the prompt or getting billed twice for generation?
- Traffic grows 10x to 150k concurrent sessions, where does the system break
  first and what changes?
- One model provider starts timing out 5% of requests, how do you fail over
  without the user noticing a restart from scratch?
- How do you apply per-user rate limits when a single reply is a long-lived
  stream rather than a single request-response?
- Product wants to let users stop generation mid-stream ("stop" button), how
  does that propagate from client to the model call and back?

## Rubric

- Chooses a persistent connection (WebSocket or SSE) and explains why plain
  polling fails for sub-2s first-token latency.
- Separates the stateless API/gateway layer from a stateful session layer
  that buffers tokens so a reconnect can replay from the last ack'd token.
- Names the core trade-off: buffering generated tokens server-side for
  resumability costs memory per active session, versus dropping the stream on
  disconnect and accepting wasted generation cost.
- Describes how context window is built from recent messages plus a rolling
  summary, with a concrete token or message budget.
- Addresses idempotency: a reconnect or retry must not trigger a second
  generation call for the same user message.
- Covers backpressure when the client reads slower than the model streams.
- Mentions rate limiting and abuse controls scoped to the user, not just the
  connection.

## Pitfalls

- Treating this as a stateless REST design and ignoring connection lifecycle.
- No plan for what happens to in-flight generation when the client disconnects.
- Forgetting that model calls cost money, so retry-without-dedup is a real bug.
- Ignoring context window growth as conversations get long.
