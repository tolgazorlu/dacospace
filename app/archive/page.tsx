import Link from "next/link"
import { LocalArchive } from "@/components/hosted/local-archive"
import { listDays } from "@/lib/core/days"
import { isHosted } from "@/lib/core/hosted"
import { getLang } from "@/lib/i18n/server"
import { messages } from "@/lib/i18n/messages"
import { loadQuestions, localize } from "@/lib/core/questions"

export default async function ArchivePage() {
  const lang = await getLang()
  const t = messages(lang)
  if (isHosted()) {
    const titles = Object.fromEntries(loadQuestions().map((q) => [q.id, localize(q, lang).title]))
    return (
      <>
        <h1 className="text-3xl font-semibold tracking-tight">{t.archive.title}</h1>
        <LocalArchive titles={titles} />
      </>
    )
  }
  const days = listDays()
  const bank = new Map(loadQuestions().map((q) => [q.id, localize(q, lang)]))
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">{t.archive.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t.archive.summary(days.filter((d) => d.answer).length, days.length, bank.size)}
      </p>
      {days.length === 0 ? (
        <p className="mt-10 text-muted-foreground">{t.archive.empty}</p>
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
                  {d.review?.verdict ?? (d.answer ? t.archive.answered : t.archive.open)}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </>
  )
}
