---
id: chat-messaging
title: Design a 1:1 and group chat system like WhatsApp
level: senior
topics: [websockets, message-ordering, consistency, presence]
minutes: 45
---

## Prompt

Design the backend for a chat application supporting both one-on-one conversations and group chats, with messages delivered in real time when possible.

## Clarifications

- **Scale?** 100 million daily active users, 50 billion messages sent per day, average 580,000 messages/sec, peak 2 million messages/sec.
- **Group size?** Groups capped at 256 members; most chats are 1:1 or small groups under 10 people.
- **Delivery requirement?** At-least-once delivery, messages must be delivered in the order the sender sent them within a single conversation; cross-conversation ordering does not matter.
- **Online/offline?** Roughly 30% of users are connected via a persistent connection at any given time; messages to offline users must be queued and delivered on reconnect, plus trigger a push notification.
- **Read receipts/typing indicators?** Required for 1:1 chats, best-effort (can be dropped under load) for groups.
- **History?** Clients can fetch up to 1 year of message history per conversation, paginated.
- **Media?** Images/video are uploaded to object storage separately; the chat message itself carries a reference, out of scope for this design beyond that.

## Follow-ups

- A user is offline for 3 days with 2,000 unread messages across 50 conversations. Walk through what happens the moment they reconnect.
- A group of 256 people is very active, generating 500 messages/minute. How does fan-out to all members' connections work without overloading one server?
- How do you guarantee per-conversation message ordering when the two participants' messages arrive at different servers at nearly the same time?
- Scale to video/voice call signaling using the same connection infrastructure. What has to change?

## Rubric

- Chooses a persistent connection protocol (WebSocket or long-lived TCP) and a connection-routing layer (e.g. a presence/session service mapping user id to the server holding their connection) so any backend can locate where to deliver a message.
- Names the key trade-off: storing and fanning out a full copy of each message per group member (more storage and write amplification, but simple independent per-user queues and read state) versus a single message with shared references and per-user cursors (less storage, but more complex read/delivery-state tracking). States which fits the 256-member cap here and why.
- Describes per-conversation ordering using a conversation-scoped sequence number or sticking all messages for one conversation through one partition/shard (e.g. a message queue partitioned by conversation id).
- Covers offline delivery: a durable per-user inbox/queue that retains undelivered messages and is drained on reconnect, combined with a push notification trigger.
- Addresses at-least-once delivery with client-side deduplication via message id, since the ordering/queueing infra can redeliver.
- Discusses storage for 1 year of history at this scale, proposing a message store sharded by conversation id with time-based partitioning so old history can be cheaply tiered to colder storage.
- Mentions read receipts and typing indicators as a separate, lower-durability, best-effort channel (not written through the same durable path as messages).

## Pitfalls

- Proposing a stateless HTTP polling design as the primary delivery mechanism without discussing the latency and connection-count cost at this scale.
- No mechanism for routing a message to the specific server holding a recipient's live connection in a multi-server deployment.
- Conflating message durability requirements with presence/typing-indicator requirements, applying the same strict guarantees to both.
- Proposing one giant shared table for all messages with no partitioning strategy, ignoring how query patterns are always scoped to a single conversation.
