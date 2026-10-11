import Link from "next/link"
import { notFound } from "next/navigation"
import Markdown from "react-markdown"
import { RubricReveal } from "@/components/ai/rubric-reveal"
import { PromptCard } from "@/components/prompt-card"
import { aiInterviewPrompt } from "@/lib/core/prompts"
import { getQuestion } from "@/lib/core/questions"

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
  const q = getQuestion(id)
  if (!q || q.track !== "ai") notFound()
  return (
    <article>
      <p className="text-sm text-muted-foreground">
        <Link href="/ai#questions" className="hover:text-foreground">AI design question</Link> · {q.level} · {q.minutes} min
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance">{q.title}</h1>
      <p className="mt-3 text-muted-foreground">{q.topics.filter((t) => t !== "ai").join(", ")}</p>

      <div className="mt-8">
        <PromptCard
          title="Get interviewed by your AI"
          description="A full mock interview: your assistant reads only the prompt aloud, answers your clarifying questions, pushes on weak spots, then grades you against the rubric."
          prompt={aiInterviewPrompt(q.id, q.title)}
        />
      </div>

      <section className="mt-10">
        <h2 className="text-sm font-semibold">Prompt</h2>
        <div className="prose-daco mt-3">
          <Markdown>{q.prompt}</Markdown>
        </div>
      </section>

      <details className="group mt-10 border-t pt-6">
        <summary className="cursor-pointer text-sm font-semibold marker:text-muted-foreground">
          Interviewer&apos;s answers to clarifying questions
          <span className="ml-2 font-normal text-muted-foreground">open after you have asked your own</span>
        </summary>
        <List items={q.clarifications} />
      </details>

      <details className="mt-6 border-t pt-6">
        <summary className="cursor-pointer text-sm font-semibold marker:text-muted-foreground">
          Follow-ups
          <span className="ml-2 font-normal text-muted-foreground">after your high-level design</span>
        </summary>
        <List items={q.followUps} />
      </details>

      <RubricReveal>
        <section className="mt-10 border-t pt-8">
          <h2 className="text-sm font-semibold">Rubric</h2>
          <List items={q.rubric} />
          <h2 className="mt-8 text-sm font-semibold">Pitfalls</h2>
          <List items={q.pitfalls} />
        </section>
      </RubricReveal>
    </article>
  )
}
