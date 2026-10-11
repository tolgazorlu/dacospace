import Link from "next/link"
import { notFound } from "next/navigation"
import { ConsoleProvider } from "@/components/lab/console-context"
import { Console } from "@/components/lab/console"
import { EnvBar } from "@/components/lab/env-bar"
import { LabMarkdown } from "@/components/lab/lab-markdown"
import { LabMissing } from "@/components/lab/lab-missing"
import { LivePanels } from "@/components/lab/live-panels"
import { Notebook } from "@/components/lab/notebook"
import { ResultsTable } from "@/components/lab/results-table"
import { getLesson, getMission, labAvailable, listResults, listScenarios, readProgress, section, withoutSections } from "@/lib/core/lab"
import { readNotebook } from "@/lib/core/notebook"
import { labEnv } from "@/lib/server/lab-env"
import Markdown from "react-markdown"

/** The evidence table to prefill the notebook with, minus the sentence that introduces it. */
const evidenceTemplate = (text: string | null) => {
  if (!text) return null
  const lines = text.split("\n")
  const first = lines.findIndex((l) => l.startsWith("|"))
  return (first >= 0 ? lines.slice(first) : lines).join("\n").trim()
}

const NOTEBOOK_SECTIONS = /^(\d+\.\s*)?(Evidence|In your own words|Check question)/i

export default async function MissionPage({ params }: PageProps<"/lab/[nn]">) {
  const { nn } = await params
  if (!labAvailable()) return <LabMissing />
  const { missions, log } = readProgress()
  const row = missions.find((m) => m.nn === nn)
  if (!row) notFound()
  const mission = getMission(nn)
  const lesson = getLesson(nn)
  const notebook = readNotebook(nn)
  const done = row.status === "done"
  const prev = missions[missions.indexOf(row) - 1]
  const next = missions[missions.indexOf(row) + 1]

  if (!mission) {
    return (
      <article>
        <p className="text-sm text-muted-foreground">Mission {nn} · {row.concept}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance">{row.title}</h1>
        <p className="mt-8 text-muted-foreground">
          This mission is on the roadmap but not written yet. Missions are written one at a time, from numbers measured on
          your machine. Ask Hermes: <code>scale lab: write mission {nn}</code>
        </p>
      </article>
    )
  }

  const env = await labEnv()
  const grafanaUp = env.services.some((s) => s.name === "lgtm" && s.state === "running")
  const takeaway = log.filter((l) => l.nn === nn).at(-1)

  return (
    <ConsoleProvider>
      <div className="relative left-1/2 w-[min(76rem,calc(100vw-2.5rem))] -translate-x-1/2 lg:grid lg:grid-cols-[minmax(0,1fr)_27rem] lg:gap-14">
        <article className="min-w-0">
          <p className="text-sm text-muted-foreground">
            Mission {nn}
            {mission.meta.time && ` · ${mission.meta.time}`}
            {done && row.date && ` · done ${row.date}`}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance">{mission.title}</h1>
          {mission.meta.concept && <p className="mt-3 text-muted-foreground">{mission.meta.concept}</p>}
          {lesson && (
            <p className="mt-4 text-sm">
              {notebook.lessonReadAt ? (
                <Link href={`/lesson/${nn}`} className="text-muted-foreground hover:text-foreground">
                  Reread lesson {nn}: {lesson.title}
                </Link>
              ) : (
                <Link href={`/lesson/${nn}`} className="text-primary hover:underline">
                  Read lesson {nn} first: {lesson.title} ({lesson.meta["reading time"] ?? "10-15 min"})
                </Link>
              )}
            </p>
          )}

          <div className="mt-10">
            <LabMarkdown source={withoutSections(mission.body, NOTEBOOK_SECTIONS)} scenarios={listScenarios()} />
          </div>

          <section className="mt-14 border-t pt-10">
            <h2 className="mb-6 text-xl font-semibold tracking-tight">Notebook</h2>
            <Notebook
              nn={nn}
              initial={notebook}
              evidenceTemplate={evidenceTemplate(section(mission.body, /Evidence/i))}
              checkQuestion={section(mission.body, /^Check question/i)}
              done={done}
            />
            {takeaway && (
              <p className="mt-6 text-sm text-muted-foreground">
                Logged in PROGRESS.md on {takeaway.date}: “{takeaway.text}”
              </p>
            )}
          </section>

          {notebook.review && (
            <section className="mt-12">
              <h2 className="mb-4 text-sm font-semibold">
                Mentor review: {notebook.review.verdict === "pass" ? "pass" : "revisit"}
              </h2>
              <div className="prose-daco">
                <Markdown>{notebook.review.notes}</Markdown>
              </div>
            </section>
          )}
          {!notebook.review && (
            <p className="mt-12 text-sm text-muted-foreground">
              Want feedback? In your AI client, run the <code>lab_mentor</code> prompt from the dacospace MCP server. Its
              review shows up here.
            </p>
          )}

          <nav className="mt-16 flex justify-between text-sm text-muted-foreground">
            {prev ? <Link href={`/lab/${prev.nn}`} className="hover:text-foreground">← {prev.nn} {prev.title}</Link> : <span />}
            {next ? <Link href={`/lab/${next.nn}`} className="hover:text-foreground">{next.nn} {next.title} →</Link> : <span />}
          </nav>
        </article>

        <aside className="mt-14 space-y-10 lg:sticky lg:top-6 lg:mt-0 lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto lg:pb-6">
          <EnvBar />
          <Console />
          <LivePanels grafanaUp={grafanaUp} />
          <section aria-label="Load test results">
            <h2 className="text-sm font-semibold">Results</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Latest k6 runs. The % under p95 compares with the previous run of the same scenario.</p>
            <ResultsTable results={listResults(10)} />
          </section>
        </aside>
      </div>
    </ConsoleProvider>
  )
}
