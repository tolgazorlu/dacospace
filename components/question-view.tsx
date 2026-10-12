import { Badge } from "@/components/ui/badge"
import fs from "node:fs"
import path from "node:path"
import { FigureHint } from "@/components/figure-hint"
import { Session } from "@/components/session"
import type { Day } from "@/lib/core/days"
import { today } from "@/lib/core/days"
import { isHosted } from "@/lib/core/hosted"
import { getT } from "@/lib/i18n/server"
import type { Question } from "@/lib/core/questions"

const longDate = (date: string, locale: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })

/** Questions with a hint figure have public/figures/<id>/ (built by figures/<id>/build.mjs). */
const hasFigure = (id: string) => /^[a-z0-9-]+$/.test(id) && fs.existsSync(path.join(process.cwd(), "public", "figures", id))

export async function QuestionView({ day, question }: { day: Day; question: Question }) {
  const t = await getT()
  const isToday = day.date === today()
  return (
    <article>
      <p className="text-sm text-muted-foreground">
        {isToday ? t.session.todayLabel : longDate(day.date, t.dateLocale)} · {question.level} · {t.common.min(question.minutes)}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance">{question.title}</h1>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {question.topics.map((t) => (
          <Badge key={t} variant="secondary">
            {t}
          </Badge>
        ))}
      </div>
      <blockquote className="mt-10 font-serif text-xl leading-relaxed text-pretty">{question.prompt}</blockquote>
      {hasFigure(question.id) && <FigureHint id={question.id} />}
      <Session day={day} question={question} hosted={isHosted()} />
    </article>
  )
}
