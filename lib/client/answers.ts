import { useMemo, useSyncExternalStore } from "react"

/** Hosted mode keeps a visitor's answers in their own browser, keyed by date. */
export type LocalAnswer = { questionId: string; answer: string; answeredAt: string }
export type LocalAnswers = Record<string, LocalAnswer>

const KEY = "dacospace:answers"
const CHANGED = "dacospace:answers-changed"

function readRaw(): string {
  try {
    return localStorage.getItem(KEY) ?? "{}"
  } catch {
    return "{}"
  }
}

/** Drops anything that is not a well-formed entry, so a hand-edited value cannot break the page. */
export function parseAnswers(raw: string): LocalAnswers {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return {}
  }
  if (!value || typeof value !== "object") return {}
  const out: LocalAnswers = {}
  for (const [date, v] of Object.entries(value as Record<string, Partial<LocalAnswer>>)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && typeof v?.answer === "string" && typeof v.questionId === "string") {
      out[date] = { questionId: v.questionId, answer: v.answer, answeredAt: String(v.answeredAt ?? "") }
    }
  }
  return out
}

export function saveLocalAnswer(date: string, questionId: string, answer: string): void {
  const all = parseAnswers(readRaw())
  all[date] = { questionId, answer, answeredAt: new Date().toISOString() }
  localStorage.setItem(KEY, JSON.stringify(all))
  window.dispatchEvent(new Event(CHANGED))
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange)
  window.addEventListener(CHANGED, onChange)
  return () => {
    window.removeEventListener("storage", onChange)
    window.removeEventListener(CHANGED, onChange)
  }
}

/** The visitor's answers; null during server rendering and hydration. */
export function useLocalAnswers(): LocalAnswers | null {
  const raw = useSyncExternalStore<string | null>(subscribe, readRaw, () => null)
  return useMemo(() => (raw === null ? null : parseAnswers(raw)), [raw])
}
