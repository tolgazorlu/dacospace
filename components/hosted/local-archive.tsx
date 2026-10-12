"use client"

import Link from "next/link"
import { useT } from "@/components/i18n"
import { useLocalAnswers } from "@/lib/client/answers"

/** Hosted archive: the days this browser answered. */
export function LocalArchive({ titles }: { titles: Record<string, string> }) {
  const answers = useLocalAnswers()
  const t = useT()
  if (!answers) return null
  const dates = Object.keys(answers).sort().reverse()
  return (
    <>
      <p className="mt-2 text-sm text-muted-foreground">
        {t.archive.localSummary(dates.length, Object.keys(titles).length)}
      </p>
      {dates.length === 0 ? (
        <p className="mt-10 text-muted-foreground">{t.archive.emptyHosted}</p>
      ) : (
        <ol className="mt-10 divide-y">
          {dates.map((date) => (
            <li key={date}>
              <Link href={`/day/${date}`} className="group flex items-baseline gap-4 py-3.5">
                <span className="w-24 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{date}</span>
                <span className="flex-1 group-hover:underline underline-offset-4">
                  {titles[answers[date].questionId] ?? answers[date].questionId}
                </span>
                <span className="text-sm text-muted-foreground">{t.archive.answered}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </>
  )
}
