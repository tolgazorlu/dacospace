import { QuestionView } from "@/components/question-view"
import { dayView } from "@/lib/core/days"
import { localize } from "@/lib/core/questions"
import { getLang } from "@/lib/i18n/server"

export default async function InterviewPage() {
  const { day, question } = dayView()
  return <QuestionView day={day} question={localize(question, await getLang())} />
}
