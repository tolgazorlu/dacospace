import Link from "next/link"
import { dayView } from "@/lib/core/days"
import { localize } from "@/lib/core/questions"
import { getLang } from "@/lib/i18n/server"
import { messages } from "@/lib/i18n/messages"
import { isHosted } from "@/lib/core/hosted"
import { aiLabAvailable, getAiLesson, nextAiLesson, readAiProgress, readAiRoadmap } from "@/lib/core/ai-lab"
import { currentMission, getLesson, getMission, labAvailable, readProgress } from "@/lib/core/lab"
import { readNotebook } from "@/lib/core/notebook"
import { setupPrompt } from "@/lib/core/prompts"
import { PromptCard } from "@/components/prompt-card"

const longDate = (locale: string) => new Date().toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })

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

export default async function TodayPage() {
  const lang = await getLang()
  const t = messages(lang)
  const view = dayView()
  const day = view.day
  const question = localize(view.question, lang)
  const hosted = isHosted()
  const lab = labAvailable()
  const progress = lab ? readProgress() : null
  const m = progress ? currentMission(progress.missions) : undefined
  const lesson = m ? getLesson(m.nn, lang) : undefined
  const mission = m ? getMission(m.nn, lang) : undefined
  const nb = m ? readNotebook(m.nn) : undefined
  const missionDone = m?.status === "done"
  const lessonRead = Boolean(nb?.lessonReadAt)
  const done = progress?.missions.filter((x) => x.status === "done").length ?? 0
  const aiRows = aiLabAvailable() ? readAiRoadmap() : []
  const aiProgress = aiRows.length ? readAiProgress() : null
  const ai = aiProgress ? nextAiLesson(aiRows, aiProgress) : undefined
  const aiLesson = ai ? getAiLesson(ai.nn, lang) : undefined
  const aiRead = aiRows.filter((r) => aiProgress?.lessons[r.nn]).length

  return (
    <>
      {!hosted && (
        <PromptCard
          title={t.today.setupTitle}
          description={t.today.setupDescription}
          prompt={setupPrompt(lang)}
        />
      )}
      <p className={`${hosted ? "" : "mt-12 "}text-sm text-muted-foreground`}>{longDate(t.dateLocale)}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t.today.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t.today.subtitle}</p>
      <ol className="mt-8 divide-y">
        {[
          m && lesson && {
            href: `/lesson/${m.nn}`,
            kind: t.today.lesson(m.nn, t.common.duration(lesson.meta["reading time"] ?? "10-15 min")),
            title: lesson.title,
            detail: lesson.meta.concept ?? m.concept,
            state: lessonRead ? t.today.read : t.today.startHere,
            highlight: !lessonRead,
          },
          m && {
            href: `/lab/${m.nn}`,
            kind: t.today.mission(m.nn, progress!.missions.length, mission?.meta.time && t.common.duration(mission.meta.time)),
            title: mission?.title ?? m.title,
            detail: mission ? m.concept : t.today.notWritten,
            state: hosted ? "" : missionDone ? t.today.done : nb?.takeaway || nb?.notes ? t.today.inProgress : t.today.doneOf(done, progress!.missions.length),
            highlight: lessonRead && !missionDone,
          },
          ai && aiLesson && {
            href: `/ai/${ai.nn}`,
            kind: t.today.aiLesson(ai.nn, t.common.duration(aiLesson.meta["reading time"] ?? "15-20 min")),
            title: aiLesson.title,
            detail: ai.concepts,
            state: hosted ? "" : aiProgress?.lessons[ai.nn] ? t.today.read : t.today.readOf(aiRead, aiRows.length),
            highlight: missionDone && !aiProgress?.lessons[ai.nn],
          },
          {
            href: "/interview",
            kind: t.today.interview(question.track === "ai", question.level, question.minutes),
            title: question.title,
            detail: question.topics.filter((x) => x !== "ai").join(", "),
            state: hosted ? t.today.today : day.review ? day.review.verdict : day.answer ? t.today.answered : t.today.open,
            highlight: missionDone && !day.answer,
          },
        ]
          .filter((x) => !!x)
          .map((x, i) => (
            <Step key={x.href} n={i + 1} {...x} />
          ))}
      </ol>
      {hosted && (
        <p className="mt-10 text-sm text-muted-foreground">
          {t.today.hostedNote}{" "}
          <Link href="/lab/01" className="underline underline-offset-4">{t.today.seeMission}</Link>.
        </p>
      )}
      {!lab && !hosted && (
        <p className="mt-10 text-sm text-muted-foreground">
          {t.today.labMissing} <Link href="/lab" className="underline underline-offset-4">{t.today.setItUp}</Link>.
        </p>
      )}
    </>
  )
}
