import Link from "next/link"
import { notFound } from "next/navigation"
import Markdown from "react-markdown"
import { RubricReveal } from "@/components/ai/rubric-reveal"
import { PromptCard } from "@/components/prompt-card"
import { aiInterviewPrompt } from "@/lib/core/prompts"
import { getQuestion, localize } from "@/lib/core/questions"
import { getLang } from "@/lib/i18n/server"
import { messages } from "@/lib/i18n/messages"
import { isHosted } from "@/lib/core/hosted"

function List({ items }: { items: string[] }) {
  return (
    <ul className="prose-daco mt-3">
      {items.map((t, i) => (
        <li key={i}>
          <Markdown>{t}</Markdown>
        </li>
      ))}
    </ul>
  )
}

export default async function AiQuestionPage({ params }: PageProps<"/ai/questions/[id]">) {
  const { id } = await params
  const lang = await getLang()
  const t = messages(lang)
  const found = getQuestion(id)
  if (!found || found.track !== "ai") notFound()
  const q = localize(found, lang)
  return (
    <article>
      <p className="text-sm text-muted-foreground">
        <Link href="/ai#questions" className="hover:text-foreground">{t.ai.designQuestion}</Link> · {q.level} · {t.common.min(q.minutes)}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance">{q.title}</h1>
      <p className="mt-3 text-muted-foreground">{q.topics.filter((x) => x !== "ai").join(", ")}</p>

      {!isHosted() && (
        <div className="mt-8">
          <PromptCard
            title={t.ai.interviewTitle}
            description={t.ai.interviewDescription}
            prompt={aiInterviewPrompt(q.id, q.title, lang)}
          />
        </div>
      )}

      <section className="mt-10">
        <h2 className="text-sm font-semibold">{t.ai.prompt}</h2>
        <div className="prose-daco mt-3">
          <Markdown>{q.prompt}</Markdown>
        </div>
      </section>

      <details className="group mt-10 border-t pt-6">
        <summary className="cursor-pointer text-sm font-semibold marker:text-muted-foreground">
          {t.ai.clarifications}
          <span className="ml-2 font-normal text-muted-foreground">{t.ai.clarificationsHint}</span>
        </summary>
        <List items={q.clarifications} />
      </details>

      <details className="mt-6 border-t pt-6">
        <summary className="cursor-pointer text-sm font-semibold marker:text-muted-foreground">
          {t.ai.followUps}
          <span className="ml-2 font-normal text-muted-foreground">{t.ai.followUpsHint}</span>
        </summary>
        <List items={q.followUps} />
      </details>

      <RubricReveal>
        <section className="mt-10 border-t pt-8">
          <h2 className="text-sm font-semibold">{t.ai.rubric}</h2>
          <List items={q.rubric} />
          <h2 className="mt-8 text-sm font-semibold">{t.ai.pitfalls}</h2>
          <List items={q.pitfalls} />
        </section>
      </RubricReveal>
    </article>
  )
}
