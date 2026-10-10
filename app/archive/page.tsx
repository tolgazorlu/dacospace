import Link from "next/link"
import { listDays } from "@/lib/core/days"
import { loadQuestions } from "@/lib/core/questions"

export default function ArchivePage() {
  const days = listDays()
  const bank = new Map(loadQuestions().map((q) => [q.id, q]))
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Archive</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {days.filter((d) => d.answer).length} answered of {days.length} {days.length === 1 ? "day" : "days"} · {bank.size} questions in the bank
      </p>
      {days.length === 0 ? (
        <p className="mt-10 text-muted-foreground">Nothing yet. Today&apos;s question is waiting on the front page.</p>
      ) : (
        <ol className="mt-10 divide-y">
          {days.map((d) => (
            <li key={d.date}>
              <Link href={`/day/${d.date}`} className="group flex items-baseline gap-4 py-3.5">
                <span className="w-24 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{d.date}</span>
                <span className="flex-1 group-hover:underline underline-offset-4">
                  {bank.get(d.questionId)?.title ?? d.questionId}
                </span>
                <span className="text-sm text-muted-foreground">
                  {d.review?.verdict ?? (d.answer ? "answered" : "open")}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </>
  )
}
