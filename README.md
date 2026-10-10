# dacospace

One system design interview question a day, and an AI interviewer to
work through it with.

The 2024 dacospace tried to teach everything at once. This version does one
thing: every morning it hands you a realistic 45-minute interview question,
holds back the details until you ask for them, and only shows the
follow-ups and the rubric after you commit to an answer.

## How a day works

1. Open the app. Today's question is picked for you: unseen questions
   first, junior before mid before senior, never the same topic two days in
   a row.
2. Ask the interviewer. Each click reveals one clarification, the way a real
   interviewer answers only what you ask.
3. Start the clock and write your design.
4. Submit. The follow-ups and the rubric unlock.
5. Optional: run the `mock_interview` prompt from the MCP server in your AI
   client. It plays the interviewer, saves your answer and writes a review
   that shows up in the app.

## Run it

```sh
pnpm install
pnpm dev            # http://localhost:3000
pnpm test           # core logic + MCP server end to end
```

Answers and reviews live in `data/days/<date>.json` (gitignored). Set
`DACOSPACE_DATA` to keep them elsewhere.

## MCP server

`mcp/server.mts` is a stdio MCP server that shares the same files as the
web app.

| Tool | What it does |
|---|---|
| `get_today` | Today's question as the candidate sees it, plus answer and review |
| `get_interviewer_notes` | Clarifications, follow-ups, rubric, pitfalls (for the AI only) |
| `save_answer` | Store the answer |
| `save_review` | Store a verdict (`strong no hire` to `strong hire`) and notes |
| `get_history` | Past days and verdicts |
| `list_questions` | The bank, filterable by level or topic |
| `add_question` | Add a validated question to `questions/` |

Prompt: `mock_interview` runs the whole interview.

Hermes:

```sh
hermes mcp add dacospace --command /path/to/dacospace/node_modules/.bin/tsx --args /path/to/dacospace/mcp/server.mts
```

Claude Code:

```sh
claude mcp add dacospace -- /path/to/dacospace/node_modules/.bin/tsx /path/to/dacospace/mcp/server.mts
```

Any other client: command `/path/to/dacospace/node_modules/.bin/tsx`, args
`/path/to/dacospace/mcp/server.mts`.

## Questions

30 questions ship in `questions/`, one markdown file each. The format is in
[questions/README.md](questions/README.md). Add your own by hand or let an
AI call `add_question`; `pnpm test` validates every file.
