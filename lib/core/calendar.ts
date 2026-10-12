// Pure date helpers, safe to import from client components (no node: modules).

/** Local calendar date, YYYY-MM-DD. */
export function today(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/** Consecutive answered dates ending today (or yesterday, if today is still open). */
export function streakOf(answered: Set<string>, now = today()): number {
  const cursor = new Date(`${now}T12:00:00`)
  if (!answered.has(now)) cursor.setDate(cursor.getDate() - 1)
  let n = 0
  while (answered.has(today(cursor))) {
    n++
    cursor.setDate(cursor.getDate() - 1)
  }
  return n
}
