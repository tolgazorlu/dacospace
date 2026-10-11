import { QuestionView } from "@/components/question-view"
import { getDay } from "@/lib/core/days"

export default function InterviewPage() {
  const { day, question } = getDay()
  return <QuestionView day={day} question={question} />
}
