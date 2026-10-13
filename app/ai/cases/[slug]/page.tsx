import Link from "next/link"
import { notFound } from "next/navigation"
import { AiMarkdown } from "@/components/ai/ai-markdown"
import { AiMissing } from "@/components/ai/ai-missing"
import { CaseReveal } from "@/components/ai/case-reveal"
import { PromptCard } from "@/components/prompt-card"
import { aiLabAvailable, getAiLesson, getCase, readAiProgress, readAiRoadmap } from "@/lib/core/ai-lab"
import { aiCasePrompt } from "@/lib/core/prompts"
import { isHosted } from "@/lib/core/hosted"
import { getLang } from "@/lib/i18n/server"
import { messages } from "@/lib/i18n/messages"

export default async function CasePage({ params }: PageProps<"/ai/cases/[slug]">) {
  const { slug } = await params
  const lang = await getLang()
  const t = messages(lang)
  if (!aiLabAvailable()) return <AiMissing />
  const c = getCase(slug, lang)
  if (!c) notFound()
  const state = readAiProgress().cases[slug]
  const lessons = readAiRoadmap().filter((r) => c.lessons.includes(r.nn))
  const hosted = isHosted()

  return (
    <article>
      <p className="text-sm text-muted-foreground">
        <Link href="/ai#cases" className="hover:text-foreground">{t.ai.incidentFile}</Link> · {c.category}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance">{c.title}</h1>
      {c.severity && <p className="mt-3 text-muted-foreground">{c.severity}</p>}

      {!hosted && (
        <div className="mt-8">
          <PromptCard
            title={t.ai.reviewTitle}
            description={t.ai.reviewDescription}
            prompt={aiCasePrompt(slug, c.title, lang)}
          />
        </div>
      )}

      <div className="mt-10">
        <AiMarkdown source={c.before} />
      </div>

      {c.after ? (
        <CaseReveal slug={slug} initial={state?.hypothesis ?? ""} revealed={Boolean(state?.revealedAt)} hosted={hosted}>
          <AiMarkdown source={c.after} />
        </CaseReveal>
      ) : null}

      {lessons.length > 0 && (
        <section className="mt-14 border-t pt-8">
          <h2 className="text-sm font-semibold">{t.ai.lessonsBehind}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {lessons.map((l) => (
              <li key={l.nn}>
                <Link href={`/ai/${l.nn}`} className="font-medium underline underline-offset-4">
                  {l.nn} · {lang === "tr" && l.file ? (getAiLesson(l.nn, lang)?.title ?? l.title) : l.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  )
}
