import fs from "node:fs"
import path from "node:path"
import matter from "gray-matter"
import { z } from "zod"
import { aiLabDir, questionsDir } from "./paths"

export const LEVELS = ["junior", "mid", "senior"] as const
export type Level = (typeof LEVELS)[number]

const Meta = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(5),
  level: z.enum(LEVELS),
  topics: z.array(z.string()).min(1),
  minutes: z.number().int().positive().default(45),
})

/** Where a question comes from: the core system design bank, or the AI Systems Lab. */
export type Track = "systems" | "ai"

export type Question = z.infer<typeof Meta> & {
  track: Track
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

export function parseQuestion(source: string, track: Track = "systems"): Question {
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
    track,
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

/** Question folders: the core bank, plus ai-systems-lab/questions when that lab is checked out. */
export function questionSources(): { dir: string; track: Track }[] {
  const out: { dir: string; track: Track }[] = [{ dir: questionsDir(), track: "systems" }]
  const ai = path.join(aiLabDir(), "questions")
  if (fs.existsSync(ai)) out.push({ dir: ai, track: "ai" })
  return out
}

export function loadQuestions(track?: Track): Question[] {
  const seen = new Set<string>()
  const out: Question[] = []
  for (const src of questionSources()) {
    if (track && src.track !== track) continue
    for (const f of fs.readdirSync(src.dir).filter((f) => f.endsWith(".md") && f !== "README.md")) {
      const q = parseQuestion(fs.readFileSync(path.join(src.dir, f), "utf8"), src.track)
      if (`${q.id}.md` !== f) throw new Error(`${f}: id must match file name`)
      if (seen.has(q.id)) throw new Error(`question id ${q.id} exists in two banks`)
      seen.add(q.id)
      out.push(q)
    }
  }
  return out
}

export function getQuestion(id: string): Question | undefined {
  if (!/^[a-z0-9-]+$/.test(id)) return undefined
  for (const src of questionSources()) {
    const file = path.join(src.dir, `${id}.md`)
    if (fs.existsSync(file)) return parseQuestion(fs.readFileSync(file, "utf8"), src.track)
  }
  return undefined
}

/**
 * The Turkish text of a question when questions/tr/<id>.md exists. Level, minutes, topics and
 * track always come from the English original, which stays the source of truth.
 */
export function localize(q: Question, lang: "en" | "tr"): Question {
  if (lang !== "tr") return q
  const file = path.join(questionsDir(), "tr", `${q.id}.md`)
  if (!fs.existsSync(file)) return q
  const tr = parseQuestion(fs.readFileSync(file, "utf8"), q.track)
  const { title, prompt, clarifications, followUps, rubric, pitfalls } = tr
  return { ...q, title, prompt, clarifications, followUps, rubric, pitfalls }
}

/** Validates and writes a new question file. Refuses to overwrite. */
export function addQuestion(source: string): Question {
  const q = parseQuestion(source)
  const file = path.join(questionsDir(), `${q.id}.md`)
  if (fs.existsSync(file)) throw new Error(`question ${q.id} already exists`)
  fs.writeFileSync(file, source.endsWith("\n") ? source : source + "\n")
  return q
}
