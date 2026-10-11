import Link from "next/link"
import { getDay } from "@/lib/core/days"
import { aiLabAvailable, getAiLesson, nextAiLesson, readAiProgress, readAiRoadmap } from "@/lib/core/ai-lab"
import { currentMission, getLesson, getMission, labAvailable, readProgress } from "@/lib/core/lab"
import { readNotebook } from "@/lib/core/notebook"
import { setupPrompt } from "@/lib/core/prompts"
import { PromptCard } from "@/components/prompt-card"

const longDate = () => new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })

function Step({
  n,
  href,
  kind,
  title,
  detail,
  state,
  highlight,
}: {
  n: number
  href: string
  kind: string
  title: string
  detail: string
  state: string
  highlight?: boolean
}) {
  return (
    <li>
      <Link href={href} className="group flex items-baseline gap-5 py-5">
        <span className="w-4 shrink-0 font-mono text-sm tabular-nums text-muted-foreground">{n}</span>
        <span className="flex-1">
          <span className="block text-sm text-muted-foreground">{kind}</span>
          <span className="mt-1 block text-lg font-medium tracking-tight text-balance group-hover:underline underline-offset-4">
            {title}
          </span>
          <span className="mt-1 block text-sm text-muted-foreground">{detail}</span>
        </span>
        <span className={`shrink-0 text-sm ${highlight ? "font-medium text-foreground" : "text-muted-foreground"}`}>{state}</span>
      </Link>
    </li>
  )
}

export default function TodayPage() {
  const { day, question } = getDay()
  const lab = labAvailable()
  const progress = lab ? readProgress() : null
  const m = progress ? currentMission(progress.missions) : undefined
  const lesson = m ? getLesson(m.nn) : undefined
  const mission = m ? getMission(m.nn) : undefined
  const nb = m ? readNotebook(m.nn) : undefined
  const missionDone = m?.status === "done"
  const lessonRead = Boolean(nb?.lessonReadAt)
  const done = progress?.missions.filter((x) => x.status === "done").length ?? 0
  const aiRows = aiLabAvailable() ? readAiRoadmap() : []
  const aiProgress = aiRows.length ? readAiProgress() : null
  const ai = aiProgress ? nextAiLesson(aiRows, aiProgress) : undefined
  const aiLesson = ai ? getAiLesson(ai.nn) : undefined
  const aiRead = aiRows.filter((r) => aiProgress?.lessons[r.nn]).length

  return (
    <>
      <PromptCard
        title="Set up the lab with your AI"
        description="Paste into Claude Code, Codex, Cursor or any coding assistant. It clones both repos, installs, connects MCP, and mentors you without giving away answers."
        prompt={setupPrompt()}
      />
      <p className="mt-12 text-sm text-muted-foreground">{longDate()}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Today</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Read the concept, break it on a real system, then defend a design out loud.
      </p>
      <ol className="mt-8 divide-y">
        {[
          m && lesson && {
            href: `/lesson/${m.nn}`,
            kind: `Lesson ${m.nn} · ${lesson.meta["reading time"] ?? "10-15 min"}`,
            title: lesson.title,
            detail: lesson.meta.concept ?? m.concept,
            state: lessonRead ? "read" : "start here",
            highlight: !lessonRead,
          },
          m && {
            href: `/lab/${m.nn}`,
            kind: `Mission ${m.nn} of ${progress!.missions.length}${mission?.meta.time ? ` · ${mission.meta.time}` : ""}`,
            title: mission?.title ?? m.title,
            detail: mission ? m.concept : "Not written yet. Pull java-scale-lab for new missions.",
            state: missionDone ? "done" : nb?.takeaway || nb?.notes ? "in progress" : `${done} of ${progress!.missions.length} done`,
            highlight: lessonRead && !missionDone,
          },
          ai && aiLesson && {
            href: `/ai/${ai.nn}`,
            kind: `AI lesson ${ai.nn} · ${aiLesson.meta["reading time"] ?? "15-20 min"}`,
            title: aiLesson.title,
            detail: ai.concepts,
            state: aiProgress?.lessons[ai.nn] ? "read" : `${aiRead} of ${aiRows.length} read`,
            highlight: missionDone && !aiProgress?.lessons[ai.nn],
          },
          {
            href: "/interview",
            kind: `Interview · ${question.track === "ai" ? "AI · " : ""}${question.level} · ${question.minutes} min`,
            title: question.title,
            detail: question.topics.filter((t) => t !== "ai").join(", "),
            state: day.review ? day.review.verdict : day.answer ? "answered" : "open",
            highlight: missionDone && !day.answer,
          },
        ]
          .filter((x) => !!x)
          .map((x, i) => (
            <Step key={x.href} n={i + 1} {...x} />
          ))}
      </ol>
      {!lab && (
        <p className="mt-10 text-sm text-muted-foreground">
          The lab is not connected. <Link href="/lab" className="underline underline-offset-4">Set it up</Link>.
        </p>
      )}
    </>
  )
}
