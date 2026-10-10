import { notFound } from "next/navigation"
import { QuestionView } from "@/components/question-view"
import { readDay } from "@/lib/core/days"
import { getQuestion } from "@/lib/core/questions"

export default async function DayPage({ params }: PageProps<"/day/[date]">) {
  const { date } = await params
  const day = /^\d{4}-\d{2}-\d{2}$/.test(date) ? readDay(date) : undefined
  const question = day && getQuestion(day.questionId)
  if (!day || !question) notFound()
  return <QuestionView day={day} question={question} />
}
