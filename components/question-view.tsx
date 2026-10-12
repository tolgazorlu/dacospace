import { Badge } from "@/components/ui/badge"
import { Session } from "@/components/session"
import type { Day } from "@/lib/core/days"
import { today } from "@/lib/core/days"
import { isHosted } from "@/lib/core/hosted"
import type { Question } from "@/lib/core/questions"

const longDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })

export function QuestionView({ day, question }: { day: Day; question: Question }) {
  const isToday = day.date === today()
  return (
    <article>
      <p className="text-sm text-muted-foreground">
        {isToday ? "Today" : longDate(day.date)} · {question.level} · {question.minutes} min
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
      <Session day={day} question={question} hosted={isHosted()} />
    </article>
  )
}
