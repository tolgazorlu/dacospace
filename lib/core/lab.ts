import fs from "node:fs"
import path from "node:path"
import { isHosted } from "./hosted"
import { labDir } from "./paths"

export type MissionStatus = "todo" | "done"

export type MissionRow = {
  nn: string
  title: string
  concept: string
  status: MissionStatus
  date: string | null
  missionFile: string | null
  lessonFile: string | null
}

export type LogLine = { date: string; nn: string; text: string }

export type Doc = {
  nn: string
  kind: "mission" | "lesson"
  title: string
  /** Bold "**Key:** value" pairs from the first paragraph under the title. */
  meta: Record<string, string>
  body: string
}

export type RunResult = {
  file: string
  at: string
  scenario: string
  targetRps: number | null
  requests: number
  rps: number
  failedPct: number
  p50: number | null
  p95: number | null
  max: number | null
  dropped: number
  accepted: number | null
  rejected: number | null
}

const NN = /^\d{2}$/

export function labAvailable(): boolean {
  if (isHosted()) return false
  return fs.existsSync(path.join(labDir(), "lab")) && fs.existsSync(path.join(labDir(), "PROGRESS.md"))
}

function findFile(dir: string, nn: string): string | null {
  const abs = path.join(labDir(), dir)
  if (!fs.existsSync(abs)) return null
  const hit = fs.readdirSync(abs).find((f) => f.startsWith(`${nn}-`) && f.endsWith(".md"))
  return hit ? path.join(dir, hit) : null
}

/** Parses the PROGRESS.md mission table and the one-line log under it. */
export function parseProgress(source: string): { missions: Omit<MissionRow, "missionFile" | "lessonFile">[]; log: LogLine[] } {
  const missions: Omit<MissionRow, "missionFile" | "lessonFile">[] = []
  const log: LogLine[] = []
  for (const line of source.split("\n")) {
    const row = line.match(/^\|\s*(\d{2})\s*\|(.*)\|\s*$/)
    if (row) {
      const cells = row[2].split("|").map((c) => c.trim())
      if (cells.length >= 4) {
        missions.push({
          nn: row[1],
          title: cells[0],
          concept: cells[1],
          status: cells[2] === "done" ? "done" : "todo",
          date: cells[3] && cells[3] !== "-" ? cells[3] : null,
        })
      }
      continue
    }
    const entry = line.match(/^- (\d{4}-\d{2}-\d{2}) \[(\d{2})\] (.+)$/)
    if (entry) log.push({ date: entry[1], nn: entry[2], text: entry[3] })
  }
  return { missions, log }
}

export function readProgress(): { missions: MissionRow[]; log: LogLine[] } {
  const { missions, log } = parseProgress(fs.readFileSync(path.join(labDir(), "PROGRESS.md"), "utf8"))
  return {
    missions: missions.map((m) => ({ ...m, missionFile: findFile("labs", m.nn), lessonFile: findFile("lessons", m.nn) })),
    log,
  }
}

/** The mission you work on today: the first one that is not done. */
export function currentMission(missions = readProgress().missions): MissionRow | undefined {
  return missions.find((m) => m.status !== "done") ?? missions.at(-1)
}

/** Parses "# Mission 01 · Title" / "# Lesson 01 · Title" files. */
export function parseDoc(source: string, kind: Doc["kind"]): Doc {
  const lines = source.replace(/\r\n/g, "\n").split("\n")
  const head = lines.findIndex((l) => l.startsWith("# "))
  const m = head >= 0 ? lines[head].match(/^#\s+(?:Mission|Lesson)\s+(\d{2})\s*·\s*(.+)$/) : null
  if (!m) throw new Error(`${kind} file must start with "# ${kind === "mission" ? "Mission" : "Lesson"} NN · Title"`)
  let i = head + 1
  while (i < lines.length && !lines[i].trim()) i++
  const meta: Record<string, string> = {}
  let consumed = i
  for (let j = i; j < lines.length && lines[j].trim(); j++) {
    const pairs = [...lines[j].matchAll(/\*\*([^*]+):\*\*\s*([^·]+)/g)]
    if (!pairs.length) break
    for (const p of pairs) meta[p[1].trim().toLowerCase()] = p[2].trim()
    consumed = j + 1
  }
  return { nn: m[1], kind, title: m[2].trim(), meta, body: lines.slice(consumed).join("\n").trim() }
}

function readDoc(dir: string, kind: Doc["kind"], nn: string): Doc | undefined {
  if (!NN.test(nn)) return undefined
  const rel = findFile(dir, nn)
  return rel ? parseDoc(fs.readFileSync(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ labDir(), rel), "utf8"), kind) : undefined
}

export const getMission = (nn: string) => readDoc("labs", "mission", nn)
export const getLesson = (nn: string) => readDoc("lessons", "lesson", nn)

/** Load scenarios available in load/ (k6 scripts), without the .js extension. */
export function listScenarios(): string[] {
  const dir = path.join(labDir(), "load")
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter((f) => f.endsWith(".js") && f !== "lib.js").map((f) => f.slice(0, -3)).sort()
}

const RESULT_FILE = /^(\d{4}-\d{2}-\d{2})_(\d{2})(\d{2})(\d{2})_([a-z0-9-]+?)(?:_(\d+)rps)?\.json$/

/** k6 summaries written by ./lab load, newest first. */
export function listResults(limit = 20): RunResult[] {
  const dir = path.join(labDir(), "results")
  if (!fs.existsSync(dir)) return []
  const out: RunResult[] = []
  for (const file of fs.readdirSync(dir).sort().reverse()) {
    const m = file.match(RESULT_FILE)
    if (!m) continue
    try {
      const metrics = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")).metrics ?? {}
      const d = metrics.http_req_duration ?? {}
      out.push({
        file,
        at: `${m[1]}T${m[2]}:${m[3]}:${m[4]}`,
        scenario: m[5],
        targetRps: m[6] ? Number(m[6]) : null,
        requests: metrics.http_reqs?.count ?? 0,
        rps: metrics.http_reqs?.rate ?? 0,
        failedPct: (metrics.http_req_failed?.value ?? 0) * 100,
        p50: d.med ?? null,
        p95: d["p(95)"] ?? null,
        max: d.max ?? null,
        dropped: metrics.dropped_iterations?.count ?? 0,
        accepted: metrics.orders_accepted?.count ?? null,
        rejected: metrics.orders_rejected?.count ?? null,
      })
    } catch {
      // a run that was interrupted leaves no or partial JSON: skip it
    }
    if (out.length >= limit) break
  }
  return out
}

/** Pulls one "## <name>" section (e.g. the evidence table) out of a markdown body. */
export function section(body: string, name: RegExp): string | null {
  const parts = body.split(/^##\s+/m)
  const hit = parts.find((p) => name.test(p.split("\n")[0]))
  return hit ? hit.slice(hit.indexOf("\n") + 1).trim() : null
}

/** Removes "## <name>" sections (they are rendered elsewhere, e.g. in the notebook). */
export function withoutSections(body: string, names: RegExp): string {
  const parts = body.split(/^(?=##\s+)/m)
  return parts.filter((p) => !(p.startsWith("## ") && names.test(p.split("\n")[0].slice(3)))).join("").trim()
}
