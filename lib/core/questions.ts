import fs from "node:fs"
import path from "node:path"
import matter from "gray-matter"
import { z } from "zod"
import { questionsDir } from "./paths"

export const LEVELS = ["junior", "mid", "senior"] as const
export type Level = (typeof LEVELS)[number]

const Meta = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(5),
  level: z.enum(LEVELS),
  topics: z.array(z.string()).min(1),
  minutes: z.number().int().positive().default(45),
})

export type Question = z.infer<typeof Meta> & {
  prompt: string
  clarifications: string[]
  followUps: string[]
  rubric: string[]
  pitfalls: string[]
}

const SECTIONS = {
  Prompt: "prompt",
  Clarifications: "clarifications",
  "Follow-ups": "followUps",
  Rubric: "rubric",
  Pitfalls: "pitfalls",
} as const

function bullets(block: string): string[] {
  const items: string[] = []
  for (const line of block.split("\n")) {
    if (/^\s*[-*]\s+/.test(line)) items.push(line.replace(/^\s*[-*]\s+/, "").trim())
    else if (line.trim() && items.length) items[items.length - 1] += " " + line.trim()
  }
  return items
}

export function parseQuestion(source: string): Question {
  const { data, content } = matter(source)
  const meta = Meta.parse(data)
  const parts: Record<string, string> = {}
  for (const chunk of content.split(/^##\s+/m).slice(1)) {
    const nl = chunk.indexOf("\n")
    const name = chunk.slice(0, nl).trim()
    parts[name] = chunk.slice(nl + 1).trim()
  }
  const missing = Object.keys(SECTIONS).filter((s) => !parts[s])
  if (missing.length) throw new Error(`${meta.id}: missing sections ${missing.join(", ")}`)
  const q: Question = {
    ...meta,
    prompt: parts.Prompt,
    clarifications: bullets(parts.Clarifications),
    followUps: bullets(parts["Follow-ups"]),
    rubric: bullets(parts.Rubric),
    pitfalls: bullets(parts.Pitfalls),
  }
  for (const key of ["clarifications", "followUps", "rubric", "pitfalls"] as const) {
    if (!q[key].length) throw new Error(`${meta.id}: section ${key} has no bullets`)
  }
  return q
}

export function loadQuestions(): Question[] {
  const dir = questionsDir()
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f !== "README.md")
    .map((f) => {
      const q = parseQuestion(fs.readFileSync(path.join(dir, f), "utf8"))
      if (`${q.id}.md` !== f) throw new Error(`${f}: id must match file name`)
      return q
    })
}

export function getQuestion(id: string): Question | undefined {
  const file = path.join(questionsDir(), `${id}.md`)
  return fs.existsSync(file) ? parseQuestion(fs.readFileSync(file, "utf8")) : undefined
}

/** Validates and writes a new question file. Refuses to overwrite. */
export function addQuestion(source: string): Question {
  const q = parseQuestion(source)
  const file = path.join(questionsDir(), `${q.id}.md`)
  if (fs.existsSync(file)) throw new Error(`question ${q.id} already exists`)
  fs.writeFileSync(file, source.endsWith("\n") ? source : source + "\n")
  return q
}
