import fs from "node:fs"
import path from "node:path"
import { z } from "zod"
import { parseDoc, type Doc } from "./lab"
import { isHosted } from "./hosted"
import { aiLabDir, dataDir, localizedFile, type Lang } from "./paths"

export type AiLessonRow = { nn: string; title: string; concepts: string; module: string; file: string | null }

export type CaseMeta = {
  slug: string
  title: string
  category: string
  severity: string
  lessons: string[]
}

export type CaseFile = CaseMeta & {
  /** Everything up to and including "Stop and think": safe to show before the reveal. */
  before: string
  /** The autopsy: shown after the reader has written a hypothesis or pressed Reveal. */
  after: string
}

const NN = /^\d{2}$/
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const dir = (...p: string[]) => path.join(/*turbopackIgnore: true*/ aiLabDir(), ...p)

export const aiLabAvailable = () => fs.existsSync(dir("PROGRESS.md"))

function lessonFile(nn: string): string | null {
  if (!fs.existsSync(dir("lessons"))) return null
  return fs.readdirSync(dir("lessons")).find((f) => f.startsWith(`${nn}-`) && f.endsWith(".md")) ?? null
}

/** The roadmap table in PROGRESS.md: | NN | Lesson | Concepts | Module | ... | */
export function readAiRoadmap(): AiLessonRow[] {
  const rows: AiLessonRow[] = []
  for (const line of fs.readFileSync(dir("PROGRESS.md"), "utf8").split("\n")) {
    const m = line.match(/^\|\s*(\d{2})\s*\|(.*)\|\s*$/)
    if (!m) continue
    const [title, concepts, module] = m[2].split("|").map((c) => c.trim())
    rows.push({ nn: m[1], title, concepts: concepts ?? "", module: module ?? "", file: lessonFile(m[1]) })
  }
  return rows
}

const localized = (rel: string, lang: Lang) => localizedFile("ai-systems-lab", aiLabDir(), rel, lang)

export function getAiLesson(nn: string, lang: Lang = "en"): Doc | undefined {
  if (!NN.test(nn)) return undefined
  const f = lessonFile(nn)
  return f ? parseDoc(fs.readFileSync(localized(path.join("lessons", f), lang), "utf8"), "lesson") : undefined
}

/** "**Category:** Security · **Lessons:** 08, 09 · **Severity:** ..." plus the title line. */
export function parseCase(slug: string, source: string): CaseFile {
  const lines = source.replace(/\r\n/g, "\n").split("\n")
  const head = lines.findIndex((l) => l.startsWith("# "))
  if (head < 0) throw new Error(`${slug}: case file needs a "# Case · Title" heading`)
  const title = lines[head].replace(/^#\s+(?:Case\s*·\s*)?/, "").trim()
  const meta: Record<string, string> = {}
  let i = head + 1
  while (i < lines.length && !lines[i].trim()) i++
  for (; i < lines.length && lines[i].trim(); i++) {
    const pairs = [...lines[i].matchAll(/\*\*([^*]+):\*\*\s*([^·]+)/g)]
    if (!pairs.length) break
    for (const p of pairs) meta[p[1].trim().toLowerCase()] = p[2].trim()
  }
  const body = lines.slice(i).join("\n").trim()
  // Split right before the first "##" section that follows "## Stop and think".
  const stop = body.search(/^## (Stop and think|Dur ve düşün)/m)
  let before = body
  let after = ""
  if (stop >= 0) {
    const next = body.slice(stop + 3).search(/^## /m)
    if (next >= 0) {
      before = body.slice(0, stop + 3 + next).trim()
      after = body.slice(stop + 3 + next).trim()
    }
  }
  return {
    slug,
    title,
    category: meta.category ?? "",
    severity: meta.severity ?? "",
    lessons: (meta.lessons ?? "").split(/[,\s]+/).filter((x) => NN.test(x)),
    before,
    after,
  }
}

export function listCases(lang: Lang = "en"): CaseMeta[] {
  if (!fs.existsSync(dir("cases"))) return []
  return fs
    .readdirSync(dir("cases"))
    .filter((f) => f.endsWith(".md") && SLUG.test(f.slice(0, -3)))
    .map((f) => {
      const c = parseCase(f.slice(0, -3), fs.readFileSync(localized(path.join("cases", f), lang), "utf8"))
      return { slug: c.slug, title: c.title, category: c.category, severity: c.severity, lessons: c.lessons }
    })
    .sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title))
}

export function getCase(slug: string, lang: Lang = "en"): CaseFile | undefined {
  if (!SLUG.test(slug)) return undefined
  if (!fs.existsSync(dir("cases", `${slug}.md`))) return undefined
  return parseCase(slug, fs.readFileSync(localized(path.join("cases", `${slug}.md`), lang), "utf8"))
}

/* Progress, kept in dacospace's data folder (the lab repo stays read-only). */

const Progress = z.object({
  lessons: z.record(z.string(), z.object({ readAt: z.string() })).default({}),
  cases: z.record(z.string(), z.object({ hypothesis: z.string().default(""), revealedAt: z.string().optional() })).default({}),
})
export type AiProgress = z.infer<typeof Progress>

const progressFile = () => path.join(dataDir(), "ai-lab.json")

export function readAiProgress(): AiProgress {
  if (isHosted()) return Progress.parse({})
  const f = progressFile()
  return Progress.parse(fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : {})
}

function writeAiProgress(p: AiProgress) {
  fs.mkdirSync(dataDir(), { recursive: true })
  fs.writeFileSync(progressFile(), JSON.stringify(p, null, 2) + "\n")
}

export function markAiLessonRead(nn: string) {
  if (!NN.test(nn)) throw new Error(`bad lesson number ${nn}`)
  const p = readAiProgress()
  p.lessons[nn] ??= { readAt: new Date().toISOString() }
  writeAiProgress(p)
}

export function saveCaseHypothesis(slug: string, hypothesis: string, reveal: boolean) {
  if (!SLUG.test(slug)) throw new Error(`bad case ${slug}`)
  const p = readAiProgress()
  const prev = p.cases[slug] ?? { hypothesis: "" }
  p.cases[slug] = { hypothesis, revealedAt: prev.revealedAt ?? (reveal ? new Date().toISOString() : undefined) }
  writeAiProgress(p)
}

/** The lesson to read next: the first one with a file that is not marked read. */
export function nextAiLesson(rows = readAiRoadmap(), progress = readAiProgress()): AiLessonRow | undefined {
  return rows.find((r) => r.file && !progress.lessons[r.nn]) ?? rows.find((r) => r.file)
}
