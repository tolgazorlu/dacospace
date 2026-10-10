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
import { questionsDir } from "../lib/core/paths"

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

server.connect(new StdioServerTransport()).catch((err) => {
  console.error(err)
  process.exit(1)
})
