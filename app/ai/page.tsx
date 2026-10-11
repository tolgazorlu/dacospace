import Link from "next/link"
import { AiMissing } from "@/components/ai/ai-missing"
import { aiLabAvailable, listCases, nextAiLesson, readAiProgress, readAiRoadmap } from "@/lib/core/ai-lab"
import { loadQuestions } from "@/lib/core/questions"

function Row({ href, lead, title, detail, state, strong }: { href: string; lead: string; title: string; detail: string; state: string; strong?: boolean }) {
  return (
    <li>
      <Link href={href} className="group flex items-baseline gap-4 py-3.5">
        <span className="w-6 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{lead}</span>
        <span className="min-w-0 flex-1">
          <span className="group-hover:underline underline-offset-4">{title}</span>
          <span className="mt-0.5 block text-sm text-muted-foreground">{detail}</span>
        </span>
        <span className={`shrink-0 text-sm ${strong ? "font-medium text-foreground" : "text-muted-foreground"}`}>{state}</span>
      </Link>
    </li>
  )
}

export default function AiLabPage() {
  if (!aiLabAvailable()) return <AiMissing />
  const rows = readAiRoadmap()
  const progress = readAiProgress()
  const next = nextAiLesson(rows, progress)
  const cases = listCases()
  const questions = loadQuestions("ai")
  const read = rows.filter((r) => progress.lessons[r.nn]).length
  const reviewed = cases.filter((c) => progress.cases[c.slug]?.revealedAt).length
  const modules = [...new Set(rows.map((r) => r.module))]
  const categories = [...new Set(cases.map((c) => c.category))]

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">AI Systems Lab</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Design, break and defend enterprise AI systems: agents, RAG, evals, security, operations. {read} of {rows.length}{" "}
        lessons read · {reviewed} of {cases.length} incidents reviewed · {questions.length} design questions.
      </p>

      <nav className="mt-6 flex gap-6 text-sm" aria-label="Sections">
        <a href="#lessons" className="underline-offset-4 hover:underline">Lessons</a>
        <a href="#cases" className="underline-offset-4 hover:underline">Incident files</a>
        <a href="#questions" className="underline-offset-4 hover:underline">Design questions</a>
      </nav>

      <section id="lessons" className="mt-12 scroll-mt-8">
        {modules.map((mod) => (
          <div key={mod} className="mt-10 first:mt-0">
            <h2 className="text-sm font-semibold">{mod}</h2>
            <ol className="mt-2 divide-y">
              {rows
                .filter((r) => r.module === mod)
                .map((r) => {
                  const isNext = r.nn === next?.nn && !progress.lessons[r.nn]
                  return (
                    <Row
                      key={r.nn}
                      href={`/ai/${r.nn}`}
                      lead={r.nn}
                      title={r.title}
                      detail={r.concepts}
                      state={progress.lessons[r.nn] ? "read" : isNext ? "next" : r.file ? "" : "not written"}
                      strong={isNext}
                    />
                  )
                })}
            </ol>
          </div>
        ))}
      </section>

      <section id="cases" className="mt-20 scroll-mt-8">
        <h2 className="text-xl font-semibold tracking-tight">Incident files</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Real incidents from primary sources. You get the facts, form a hypothesis, then reveal what actually happened.
        </p>
        {categories.map((cat) => (
          <div key={cat} className="mt-8">
            <h3 className="text-sm font-semibold">{cat}</h3>
            <ol className="mt-2 divide-y">
              {cases
                .filter((c) => c.category === cat)
                .map((c) => (
                  <Row
                    key={c.slug}
                    href={`/ai/cases/${c.slug}`}
                    lead=""
                    title={c.title}
                    detail={c.severity}
                    state={progress.cases[c.slug]?.revealedAt ? "reviewed" : ""}
                  />
                ))}
            </ol>
          </div>
        ))}
      </section>

      <section id="questions" className="mt-20 scroll-mt-8">
        <h2 className="text-xl font-semibold tracking-tight">Design questions</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Staff-level AI system design interviews. They also rotate into your daily Interview, every other day.
        </p>
        <ol className="mt-4 divide-y">
          {questions
            .sort((a, b) => a.title.localeCompare(b.title))
            .map((q) => (
              <Row
                key={q.id}
                href={`/ai/questions/${q.id}`}
                lead=""
                title={q.title}
                detail={q.topics.filter((t) => t !== "ai").join(", ")}
                state={`${q.level} · ${q.minutes} min`}
              />
            ))}
        </ol>
      </section>
    </>
  )
}
