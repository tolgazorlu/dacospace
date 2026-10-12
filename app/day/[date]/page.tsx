import { notFound } from "next/navigation"
import { QuestionView } from "@/components/question-view"
import { hostedDay, readDay, today } from "@/lib/core/days"
import { isHosted } from "@/lib/core/hosted"
import { getQuestion, localize } from "@/lib/core/questions"
import { getLang } from "@/lib/i18n/server"

export default async function DayPage({ params }: PageProps<"/day/[date]">) {
  const { date } = await params
  const lang = await getLang()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound()
  if (isHosted()) {
    if (date > today()) notFound()
    const view = hostedDay(date)
    return <QuestionView day={view.day} question={localize(view.question, lang)} />
  }
  const day = readDay(date)
  const question = day && getQuestion(day.questionId)
  if (!day || !question) notFound()
  return <QuestionView day={day} question={localize(question, lang)} />
}
