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

## Quick start

You need: Docker Desktop (running), Java 25 ([SDKMAN](https://sdkman.io): `sdk install java 25-amzn`),
Node 20+ with pnpm, git, python3. Both repos are private: ask for an invite first.

```sh
git clone https://github.com/tolgazorlu/dacospace.git
cd dacospace
pnpm run setup        # checks tools, clones java-scale-lab next to this folder, starts the lab infrastructure
pnpm build && pnpm start
```

Open http://localhost:4120. The Today page shows the lesson, the lab mission and the interview
question for the day. In the lab, press **Start** next to the app, then run `./lab seed` once from
mission 01.

Theme: dark by default, the sun/moon button switches. Everything is black and white on purpose.

## The lab

`/lab` lists the 23 missions; `/lab/NN` is the workspace:

- the mission text, where every `./lab ...` line in a code block gets a **Run** button,
- the environment (Docker services, the Spring app on :4180 with Start/Stop and its log),
- a console that streams the command output (one command at a time; Stop kills the whole process group),
- live Grafana panels and the latest k6 results with the change against the previous run,
- the notebook: evidence table, check question, your one-sentence takeaway. **Complete mission**
  runs `./lab done NN "..."`, so `PROGRESS.md` in java-scale-lab stays the source of truth.

Content (lessons, missions, roadmap) lives in java-scale-lab, not here. dacospace looks for it in a
sibling folder (`../java-scale-lab`); set `DACOSPACE_LAB_DIR` to use another checkout. New missions
arrive with `git pull` in java-scale-lab.

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

## AI Systems Lab

The **AI** tab reads [ai-systems-lab](https://github.com/tolgazorlu/ai-systems-lab) from a sibling
folder (`DACOSPACE_AI_LAB_DIR` to override): 23 lessons on enterprise AI systems, incident case
files with a hypothesis box and Reveal, and senior AI design questions with a hidden rubric. AI
questions also rotate into the daily Interview, alternating with system design. Progress is stored
in `data/ai-lab.json`.

## Working with an AI mentor

The fastest way in: the Today page has a **Set up the lab with your AI** prompt, and every mission
page has a **Do mission NN with your AI** prompt. Copy, paste into Claude Code, Codex, Cursor or any
coding assistant. The prompts clone what is missing, offer `./lab jump NN` for a fresh start at that
mission, and tell the assistant to mentor, not solve. The MCP tool `get_mission_prompt` returns the
same text.

Once the MCP server is connected, your AI client can read your lab notebook and results and
leave a review under the notebook. Ask it in plain words, for example:

> Be my Scale Lab mentor for mission 02. Use the dacospace tools: read my state and the mission,
> tell me what my numbers show, quiz me on one term, then save a review.

Clients that support MCP prompts can run `lab_mentor` instead, which carries the same instructions.
The mentor never fixes the lab code for you: the fix is the exercise.

## Questions

30 questions ship in `questions/`, one markdown file each. The format is in
[questions/README.md](questions/README.md). Add your own by hand or let an
AI call `add_question`; `pnpm test` validates every file.
