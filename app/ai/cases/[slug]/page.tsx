import Link from "next/link"
import { notFound } from "next/navigation"
import { AiMarkdown } from "@/components/ai/ai-markdown"
import { AiMissing } from "@/components/ai/ai-missing"
import { CaseReveal } from "@/components/ai/case-reveal"
import { PromptCard } from "@/components/prompt-card"
import { aiLabAvailable, getCase, readAiProgress, readAiRoadmap } from "@/lib/core/ai-lab"
import { aiCasePrompt } from "@/lib/core/prompts"
import { isHosted } from "@/lib/core/hosted"

export default async function CasePage({ params }: PageProps<"/ai/cases/[slug]">) {
  const { slug } = await params
  if (!aiLabAvailable()) return <AiMissing />
  const c = getCase(slug)
  if (!c) notFound()
  const state = readAiProgress().cases[slug]
  const lessons = readAiRoadmap().filter((r) => c.lessons.includes(r.nn))
  const hosted = isHosted()

  return (
    <article>
      <p className="text-sm text-muted-foreground">
        <Link href="/ai#cases" className="hover:text-foreground">Incident file</Link> · {c.category}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance">{c.title}</h1>
      {c.severity && <p className="mt-3 text-muted-foreground">{c.severity}</p>}

      {!hosted && (
        <div className="mt-8">
          <PromptCard
            title="Review it with your AI"
            description="Your assistant plays incident commander: it asks the stop-and-think questions, waits for your hypothesis, then compares it with what happened."
            prompt={aiCasePrompt(slug, c.title)}
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
          <h2 className="text-sm font-semibold">Lessons behind this case</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {lessons.map((l) => (
              <li key={l.nn}>
                <Link href={`/ai/${l.nn}`} className="font-medium underline underline-offset-4">
                  {l.nn} · {l.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  )
}
