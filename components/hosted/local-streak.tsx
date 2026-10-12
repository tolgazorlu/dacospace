"use client"

import { useT } from "@/components/i18n"
import { useLocalAnswers } from "@/lib/client/answers"
import { streakOf } from "@/lib/core/calendar"

export function LocalStreak() {
  const answers = useLocalAnswers()
  const t = useT()
  const days = answers ? streakOf(new Set(Object.keys(answers))) : 0
  return days > 0 ? <span className="hidden tabular-nums sm:inline">{t.nav.streak(days)}</span> : null
}
