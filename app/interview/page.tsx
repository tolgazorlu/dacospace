import { QuestionView } from "@/components/question-view"
import { dayView } from "@/lib/core/days"

export default function InterviewPage() {
  const { day, question } = dayView()
  return <QuestionView day={day} question={question} />
}
