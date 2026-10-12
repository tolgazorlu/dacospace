"use client"

import { useLocalAnswers } from "@/lib/client/answers"
import { streakOf } from "@/lib/core/calendar"

export function LocalStreak() {
  const answers = useLocalAnswers()
  const days = answers ? streakOf(new Set(Object.keys(answers))) : 0
  return days > 0 ? <span className="hidden tabular-nums sm:inline">{days}-day streak</span> : null
}
