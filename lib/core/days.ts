import fs from "node:fs"
import path from "node:path"
import { z } from "zod"
import { streakOf, today } from "./calendar"
import { isHosted } from "./hosted"
import { dataDir } from "./paths"
import { LEVELS, getQuestion, loadQuestions, type Question } from "./questions"

export { today }

export const VERDICTS = ["strong no hire", "no hire", "lean hire", "hire", "strong hire"] as const

const Review = z.object({
  verdict: z.enum(VERDICTS),
  notes: z.string(),
  at: z.string(),
})

const Day = z.object({
  date: z.string(),
  questionId: z.string(),
  answer: z.string().optional(),
  answeredAt: z.string().optional(),
  review: Review.optional(),
})

export type Day = z.infer<typeof Day>
export type Review = z.infer<typeof Review>

const DATE = /^\d{4}-\d{2}-\d{2}$/

const daysDir = () => path.join(dataDir(), "days")
const dayFile = (date: string) => {
  if (!DATE.test(date)) throw new Error(`bad date ${date}, expected YYYY-MM-DD`)
  return path.join(daysDir(), `${date}.json`)
}

function write(day: Day) {
  fs.mkdirSync(daysDir(), { recursive: true })
  fs.writeFileSync(dayFile(day.date), JSON.stringify(day, null, 2) + "\n")
}

export function listDays(): Day[] {
  if (!fs.existsSync(daysDir())) return []
  return fs
    .readdirSync(daysDir())
    .filter((f) => f.endsWith(".json"))
    .map((f) => Day.parse(JSON.parse(fs.readFileSync(path.join(daysDir(), f), "utf8"))))
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function readDay(date: string): Day | undefined {
  const file = dayFile(date)
  return fs.existsSync(file) ? Day.parse(JSON.parse(fs.readFileSync(file, "utf8"))) : undefined
}

/**
 * Picks the next question: unseen questions first, easiest level first, and
 * never the same topic as yesterday when another option exists. Once the bank
 * is exhausted, the least recently asked question comes back.
 */
export function pickNext(bank: Question[], history: Day[]): Question {
  if (!bank.length) throw new Error("question bank is empty")
  const lastSeen = new Map<string, string>()
  for (const d of history) if (!lastSeen.has(d.questionId)) lastSeen.set(d.questionId, d.date)
  const prev = history[0] ? bank.find((q) => q.id === history[0].questionId) : undefined
  const rank = (q: Question) => [
    lastSeen.get(q.id) ?? "", // unseen ("") sorts first, then oldest
    prev && q.track === prev.track ? 1 : 0, // alternate system design and AI questions
    LEVELS.indexOf(q.level),
    prev && q.topics.some((t) => prev.topics.includes(t)) ? 1 : 0,
    q.id,
  ]
  return [...bank].sort((a, b) => {
    const ra = rank(a), rb = rank(b)
    for (let i = 0; i < ra.length; i++) {
      if (ra[i] < rb[i]) return -1
      if (ra[i] > rb[i]) return 1
    }
    return 0
  })[0]
}

/** Returns the day's record, assigning a question the first time a date is opened. */
export function getDay(date = today()): { day: Day; question: Question } {
  let day = readDay(date)
  if (!day) {
    if (date > today()) throw new Error("that day has not arrived yet")
    const history = listDays().filter((d) => d.date < date)
    day = { date, questionId: pickNext(loadQuestions(), history).id }
    write(day)
  }
  const question = getQuestion(day.questionId)
  if (!question) throw new Error(`question ${day.questionId} is missing from questions/`)
  return { day, question }
}

/**
 * The order hosted mode walks through the bank: pickNext applied day after day from an empty
 * history, so the demo keeps the same rules (easy first, no topic twice in a row) without storage.
 */
export function rotation(bank: Question[]): Question[] {
  const history: Day[] = []
  for (let i = 0; i < bank.length; i++) {
    // Synthetic dates: only their order matters to pickNext.
    history.unshift({ date: String(i).padStart(6, "0"), questionId: pickNext(bank, history).id })
  }
  const byId = new Map(bank.map((q) => [q.id, q]))
  return history.reverse().map((d) => byId.get(d.questionId)!)
}

/** Hosted mode: the same question for every visitor on a date, nothing read from or written to disk. */
export function hostedDay(date = today()): { day: Day; question: Question } {
  if (!DATE.test(date)) throw new Error(`bad date ${date}, expected YYYY-MM-DD`)
  const order = rotation(loadQuestions("systems"))
  const n = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000)
  return { day: { date, questionId: order[n % order.length].id }, question: order[n % order.length] }
}

/** The day pages render: stored on disk locally, derived from the date when hosted. */
export function dayView(date = today()): { day: Day; question: Question } {
  return isHosted() ? hostedDay(date) : getDay(date)
}

export function saveAnswer(date: string, answer: string): Day {
  const { day } = getDay(date)
  const next = { ...day, answer, answeredAt: new Date().toISOString() }
  write(next)
  return next
}

export function saveReview(date: string, review: Omit<Review, "at">): Day {
  const { day } = getDay(date)
  if (!day.answer) throw new Error("no answer saved for this day yet")
  const next = { ...day, review: Review.parse({ ...review, at: new Date().toISOString() }) }
  write(next)
  return next
}

/** Consecutive answered days ending today (or yesterday, if today is still open). */
export function streak(days = listDays(), now = today()): number {
  return streakOf(new Set(days.filter((d) => d.answer).map((d) => d.date)), now)
}
