import Link from "next/link"
import { notFound } from "next/navigation"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import { LabMissing } from "@/components/lab/lab-missing"
import { lessonReadAction } from "@/app/lab-actions"
import { getLesson, getMission, labAvailable } from "@/lib/core/lab"
import { readNotebook } from "@/lib/core/notebook"
import { isHosted } from "@/lib/core/hosted"
import { getLang } from "@/lib/i18n/server"
import { messages } from "@/lib/i18n/messages"

export default async function LessonPage({ params }: PageProps<"/lesson/[nn]">) {
  const { nn } = await params
  const lang = await getLang()
  const t = messages(lang)
  if (!labAvailable()) return <LabMissing />
  const lesson = getLesson(nn, lang)
  if (!lesson) notFound()
  const mission = getMission(nn, lang)
  const read = Boolean(readNotebook(nn).lessonReadAt)
  return (
    <article>
      <p className="text-sm text-muted-foreground">
        {t.lesson.title(nn)}
        {lesson.meta["reading time"] && ` · ${t.common.duration(lesson.meta["reading time"])}`}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance">{lesson.title}</h1>
      {lesson.meta.concept && <p className="mt-3 text-muted-foreground">{lesson.meta.concept}</p>}
      <div className="prose-daco prose-lesson mt-10">
        <Markdown remarkPlugins={[remarkGfm]}>{lesson.body}</Markdown>
      </div>
      <div className="mt-14 flex flex-wrap items-center gap-4 border-t pt-8">
        {read || isHosted() ? (
          <Link href={`/lab/${nn}`} className="text-sm font-medium underline underline-offset-4">
            {t.lesson.goToMission(nn, mission?.title ?? "")}
          </Link>
        ) : (
          <form action={lessonReadAction.bind(null, nn)}>
            <Button type="submit">{t.lesson.markRead}</Button>
          </form>
        )}
        <span className="text-sm text-muted-foreground">{t.lesson.checkHint}</span>
      </div>
    </article>
  )
}
