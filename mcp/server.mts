#!/usr/bin/env -S npx tsx
// dacospace MCP server (stdio). Lets an AI client run today's mock interview,
// read and save answers, and write its review back to the shared data folder.
import path from "node:path"
import { fileURLToPath } from "node:url"

process.env.DACOSPACE_ROOT ??= path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"
import { getDay, listDays, saveAnswer, saveReview, streak, today, VERDICTS } from "../lib/core/days"
import { addQuestion, LEVELS, loadQuestions, type Question } from "../lib/core/questions"
import { labDir, questionsDir } from "../lib/core/paths"
import { currentMission, getLesson, getMission, labAvailable, listResults, readProgress } from "../lib/core/lab"
import { LAB_VERDICTS, readNotebook, saveLabReview } from "../lib/core/notebook"

const text = (value: unknown) => ({
  content: [{ type: "text" as const, text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }],
})

const candidateView = (q: Question) => ({
  id: q.id,
  title: q.title,
  level: q.level,
  topics: q.topics,
  minutes: q.minutes,
  prompt: q.prompt,
})

const dateArg = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .describe("YYYY-MM-DD. Defaults to today.")

const server = new McpServer({ name: "dacospace", version: "0.1.0" })

server.registerTool(
  "get_today",
  {
    title: "Today's question",
    description:
      "Today's system design interview question as the candidate sees it (no interviewer notes), plus the saved answer and review if any.",
    inputSchema: { date: dateArg },
  },
  async ({ date }) => {
    const { day, question } = getDay(date ?? today())
    return text({
      date: day.date,
      question: candidateView(question),
      answer: day.answer ?? null,
      review: day.review ?? null,
      streak: streak(),
    })
  },
)

server.registerTool(
  "get_interviewer_notes",
  {
    title: "Interviewer notes",
    description:
      "Interviewer-only material for a day's question: clarification answers, follow-ups, rubric, pitfalls. Use it to play the interviewer. Never dump it to the candidate: reveal a clarification only when they ask about that point, ask follow-ups one at a time, show the rubric only after they finished.",
    inputSchema: { date: dateArg },
  },
  async ({ date }) => {
    const { question } = getDay(date ?? today())
    return text({
      clarifications: question.clarifications,
      followUps: question.followUps,
      rubric: question.rubric,
      pitfalls: question.pitfalls,
    })
  },
)

server.registerTool(
  "save_answer",
  {
    title: "Save answer",
    description:
      "Save the candidate's final answer for a day. Pass the candidate's own words (a faithful summary of the conversation is fine), never a model-written solution.",
    inputSchema: { answer: z.string().min(1), date: dateArg },
  },
  async ({ answer, date }) => text(saveAnswer(date ?? today(), answer)),
)

server.registerTool(
  "save_review",
  {
    title: "Save review",
    description:
      "Record the interviewer verdict for a day's answer, judged against the rubric. Notes: max 3 strengths, max 4 gaps, then the single most important thing to learn next. Shown in the web app.",
    inputSchema: {
      verdict: z.enum(VERDICTS),
      notes: z.string().min(1).describe("Markdown"),
      date: dateArg,
    },
  },
  async ({ verdict, notes, date }) => text(saveReview(date ?? today(), { verdict, notes })),
)

server.registerTool(
  "get_history",
  {
    title: "History",
    description: "Past days, newest first: question, whether it was answered, and the verdict.",
    inputSchema: { limit: z.number().int().positive().max(365).default(30) },
  },
  async ({ limit }) => {
    const titles = new Map(loadQuestions().map((q) => [q.id, q.title]))
    return text({
      streak: streak(),
      days: listDays()
        .slice(0, limit)
        .map((d) => ({
          date: d.date,
          question: titles.get(d.questionId) ?? d.questionId,
          answered: Boolean(d.answer),
          verdict: d.review?.verdict ?? null,
        })),
    })
  },
)

server.registerTool(
  "list_questions",
  {
    title: "Question bank",
    description: "All questions in the bank, optionally filtered by level or topic.",
    inputSchema: { level: z.enum(LEVELS).optional(), topic: z.string().optional() },
  },
  async ({ level, topic }) =>
    text(
      loadQuestions()
        .filter((q) => (!level || q.level === level) && (!topic || q.topics.includes(topic)))
        .map(({ id, title, level, topics }) => ({ id, title, level, topics })),
    ),
)

server.registerTool(
  "add_question",
  {
    title: "Add question",
    description: `Add a new question to the bank. The markdown must follow ${path.join(
      "questions",
      "README.md",
    )}: frontmatter id/title/level/topics/minutes and the sections Prompt, Clarifications, Follow-ups, Rubric, Pitfalls. Check list_questions first to avoid duplicates.`,
    inputSchema: { markdown: z.string().min(50) },
  },
  async ({ markdown }) => {
    const q = addQuestion(markdown)
    return text({ added: q.id, file: path.join(questionsDir(), `${q.id}.md`) })
  },
)

server.registerPrompt(
  "mock_interview",
  {
    title: "Mock interview",
    description: "Run today's question as a realistic system design interview.",
    argsSchema: { date: dateArg },
  },
  ({ date }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Run a system design mock interview with me on the dacospace question for ${date ?? "today"}.

1. Call get_today and get_interviewer_notes. Read me only the prompt.
2. Act like a real interviewer: answer clarifying questions from the notes, keep my time box, do not hint unless I am stuck for a while.
3. Once I have a high-level design, ask the follow-ups one at a time.
4. When I am done, call save_answer with my design in my own words, judge it against the rubric, and call save_review.
5. Then teach me the single most important gap in under 40 lines and ask one check question.`,
        },
      },
    ],
  }),
)

// ---------- Scale Lab (java-scale-lab) ----------

const nnArg = z.string().regex(/^\d{2}$/).optional().describe("Mission number like 03. Defaults to the current mission.")

const requireLab = () => {
  if (!labAvailable()) throw new Error(`no java-scale-lab checkout at ${labDir()} (set DACOSPACE_LAB_DIR)`)
}

const missionState = (nn?: string) => {
  requireLab()
  const { missions, log } = readProgress()
  const row = nn ? missions.find((m) => m.nn === nn) : currentMission(missions)
  if (!row) throw new Error(`mission ${nn} is not in PROGRESS.md`)
  return { row, log: log.filter((l) => l.nn === row.nn), missions }
}

server.registerTool(
  "get_lab_state",
  {
    title: "Scale Lab state",
    description:
      "The learner's Java scale lab: current (or given) mission row, lesson read or not, their notebook (evidence notes, check-question answer, one-sentence takeaway), the mentor review if any, and the latest load test results. Use it before reviewing a mission or planning the next one.",
    inputSchema: { nn: nnArg },
  },
  async ({ nn }) => {
    const { row, log, missions } = missionState(nn)
    return text({
      mission: row,
      done: missions.filter((m) => m.status === "done").length,
      total: missions.length,
      notebook: readNotebook(row.nn),
      progressLog: log,
      recentResults: listResults(8),
    })
  },
)

server.registerTool(
  "get_lab_mission",
  {
    title: "Scale Lab mission text",
    description:
      "Full markdown of a mission's lesson (the concept) and mission (the hands-on steps), as the learner sees them. The mission contains a check question; judge the learner's answer against the lesson.",
    inputSchema: { nn: nnArg },
  },
  async ({ nn }) => {
    const { row } = missionState(nn)
    return text({ nn: row.nn, lesson: getLesson(row.nn) ?? null, mission: getMission(row.nn) ?? null })
  },
)

server.registerTool(
  "save_lab_review",
  {
    title: "Save Scale Lab review",
    description:
      "Store mentor feedback for a mission, shown under the learner's notebook. verdict 'pass' only when they can explain the concept in their own words, not just when the numbers are right; otherwise 'revisit'. Notes in markdown: what the evidence shows, the one gap that matters most, one follow-up question.",
    inputSchema: { verdict: z.enum(LAB_VERDICTS), notes: z.string().min(1).describe("Markdown"), nn: nnArg },
  },
  async ({ verdict, notes, nn }) => {
    const { row } = missionState(nn)
    return text(saveLabReview(row.nn, { verdict, notes }))
  },
)

server.registerPrompt(
  "lab_mentor",
  {
    title: "Scale Lab mentor",
    description: "Review today's (or a given) Scale Lab mission like a senior engineer pairing with you.",
    argsSchema: { nn: nnArg },
  },
  ({ nn }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Be my mentor for Scale Lab mission ${nn ?? "(the current one)"}.

1. Call get_lab_state and get_lab_mission. Do not repeat the lesson to me.
2. Look at my notebook and the latest results. Say what the numbers actually show, in two or three lines. If a claim in my notes has no result behind it, say so.
3. Pick ONE term from the lesson and ask me to explain it in one sentence of my own. Wait for my answer. A correct but borrowed-sounding answer is not enough: ask me to apply it to a different number.
4. Judge my check-question answer. If it is wrong, explain the idea again with smaller numbers, do not give the final answer away.
5. Call save_lab_review: 'pass' only if I could explain it, otherwise 'revisit'. Notes: what the evidence shows, the one gap that matters, one follow-up question.
6. Never fix code marked LAB: in java-scale-lab for me.`,
        },
      },
    ],
  }),
)

server.connect(new StdioServerTransport()).catch((err) => {
  console.error(err)
  process.exit(1)
})
