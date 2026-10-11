# dacospace

A daily learning loop for backend and system design:

1. **Lesson**: a 10-15 minute reading on one concept.
2. **Lab**: break that concept on a real system and measure it. The lab is
   [java-scale-lab](https://github.com/tolgazorlu/java-scale-lab), a deliberately naive Java ordering
   service with load tests, chaos and Grafana. dacospace runs its `./lab` commands with live output,
   embeds the Grafana panels, and keeps your notebook.
3. **Interview**: one realistic system design interview question, with an AI interviewer.

The 2024 dacospace tried to teach everything at once. This version shows one step at a time: the
lesson before the lab, the clarifications only when you ask, the rubric only after you answer.

## The lab

`/lab` lists the 23 missions; `/lab/NN` is the workspace:

- the mission text, where every `./lab ...` line in a code block gets a **Run** button,
- the environment (Docker services, the Spring app on :4180 with Start/Stop and its log),
- a console that streams the command output (one command at a time; Stop kills the whole process group),
- live Grafana panels and the latest k6 results with the change against the previous run,
- the notebook: evidence table, check question, your one-sentence takeaway. **Complete mission**
  runs `./lab done NN "..."`, so `PROGRESS.md` in java-scale-lab stays the source of truth.

Content (lessons, missions, roadmap) lives in java-scale-lab, not here. dacospace looks for it in
`~/projects/java-scale-lab`; set `DACOSPACE_LAB_DIR` to use another checkout.

Because the app runs commands on your machine, it listens on 127.0.0.1 only, and its API refuses
requests whose Host or Origin is not localhost or that lack the `x-dacospace` header. Only an
allowlist of `./lab` subcommands can run (`up`, `down`, `seed`, `test`, `status`, `load`, `race`,
`compare`, `topsql`, `sql`, `explain`, `chaos payment`), always as an argv array, never through a shell.

## How an interview day works

1. Open `/interview`. Today's question is picked for you: unseen questions
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
pnpm dev            # http://localhost:4120
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
| `get_lab_state` | Current lab mission, notebook, latest load test results |
| `get_lab_mission` | Lesson and mission markdown for a mission |
| `save_lab_review` | Store mentor feedback (`pass` / `revisit`) shown under the notebook |

Prompts: `mock_interview` runs the whole interview; `lab_mentor` reviews a lab mission.

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
