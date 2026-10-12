import Link from "next/link"
import { notFound } from "next/navigation"
import { aiLessonReadAction } from "@/app/ai-actions"
import { AiMarkdown } from "@/components/ai/ai-markdown"
import { AiMissing } from "@/components/ai/ai-missing"
import { PromptCard } from "@/components/prompt-card"
import { Button } from "@/components/ui/button"
import { aiLabAvailable, getAiLesson, getCase, readAiProgress, readAiRoadmap } from "@/lib/core/ai-lab"
import { aiLessonPrompt } from "@/lib/core/prompts"
import { isHosted } from "@/lib/core/hosted"
import { getLang } from "@/lib/i18n/server"
import { messages } from "@/lib/i18n/messages"

export default async function AiLessonPage({ params }: PageProps<"/ai/[nn]">) {
  const { nn } = await params
  const lang = await getLang()
  const t = messages(lang)
  if (!aiLabAvailable()) return <AiMissing />
  const rows = readAiRoadmap()
  const row = rows.find((r) => r.nn === nn)
  if (!row) notFound()
  const lesson = getAiLesson(nn)
  const progress = readAiProgress()
  const read = Boolean(progress.lessons[nn])
  const hosted = isHosted()
  const i = rows.indexOf(row)
  const prev = rows[i - 1]
  const next = rows[i + 1]
  const cases = (lesson?.meta.cases ?? "")
    .split(/[,\s]+/)
    .filter(Boolean)
    .map((slug) => getCase(slug))
    .filter((c) => c !== undefined)

  return (
    <article>
      <p className="text-sm text-muted-foreground">
        {t.ai.lessonKicker(nn, row.module, lesson?.meta["reading time"] && t.common.duration(lesson.meta["reading time"]))}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance">{lesson?.title ?? row.title}</h1>
      <p className="mt-3 text-muted-foreground">{lesson?.meta.concepts ?? row.concepts}</p>

      {!lesson ? (
        <p className="mt-8 text-muted-foreground">{t.ai.lessonNotWritten}</p>
      ) : (
        <>
          {!hosted && (
            <div className="mt-8">
              <PromptCard
                title={t.ai.studyTitle}
                description={t.ai.studyDescription}
                prompt={aiLessonPrompt(nn, lesson.title, lang)}
              />
            </div>
          )}
          <div className="mt-10">
            <AiMarkdown source={lesson.body} />
          </div>

          {cases.length > 0 && (
            <section className="mt-14 border-t pt-8">
              <h2 className="text-sm font-semibold">{t.ai.lessonCases}</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {cases.map((c) => (
                  <li key={c.slug}>
                    <Link href={`/ai/cases/${c.slug}`} className="font-medium underline underline-offset-4">
                      {c.title}
                    </Link>
                    <span className="text-muted-foreground"> · {c.severity}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!hosted && (
            <div className="mt-12 flex flex-wrap items-center gap-4 border-t pt-8">
              {read ? (
                <span className="text-sm text-muted-foreground">{t.ai.markedRead}</span>
              ) : (
                <form action={aiLessonReadAction.bind(null, nn)}>
                  <Button type="submit">{t.ai.markRead}</Button>
                </form>
              )}
            </div>
          )}
        </>
      )}

      <nav className="mt-16 flex justify-between gap-6 text-sm text-muted-foreground">
        {prev ? <Link href={`/ai/${prev.nn}`} className="hover:text-foreground">← {prev.nn} {prev.title}</Link> : <span />}
        {next ? <Link href={`/ai/${next.nn}`} className="text-right hover:text-foreground">{next.nn} {next.title} →</Link> : <span />}
      </nav>
    </article>
  )
}
