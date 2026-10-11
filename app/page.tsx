import Link from "next/link"
import { getDay } from "@/lib/core/days"
import { currentMission, getLesson, getMission, labAvailable, readProgress } from "@/lib/core/lab"
import { readNotebook } from "@/lib/core/notebook"

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
        <span className={`shrink-0 text-sm ${highlight ? "text-primary" : "text-muted-foreground"}`}>{state}</span>
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

  return (
    <>
      <p className="text-sm text-muted-foreground">{longDate()}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Today</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Read the concept, break it on a real system, then defend a design out loud.
      </p>
      <ol className="mt-8 divide-y">
        {m && lesson && (
          <Step
            n={1}
            href={`/lesson/${m.nn}`}
            kind={`Lesson ${m.nn} · ${lesson.meta["reading time"] ?? "10-15 min"}`}
            title={lesson.title}
            detail={lesson.meta.concept ?? m.concept}
            state={lessonRead ? "read" : "start here"}
            highlight={!lessonRead}
          />
        )}
        {m && (
          <Step
            n={lesson ? 2 : 1}
            href={`/lab/${m.nn}`}
            kind={`Mission ${m.nn} of ${progress!.missions.length}${mission?.meta.time ? ` · ${mission.meta.time}` : ""}`}
            title={mission?.title ?? m.title}
            detail={mission ? m.concept : "Not written yet. Ask Hermes: scale lab: write the next mission"}
            state={missionDone ? "done" : nb?.takeaway || nb?.notes ? "in progress" : `${done} of ${progress!.missions.length} done`}
            highlight={lessonRead && !missionDone}
          />
        )}
        <Step
          n={m ? (lesson ? 3 : 2) : 1}
          href="/interview"
          kind={`Interview · ${question.level} · ${question.minutes} min`}
          title={question.title}
          detail={question.topics.join(", ")}
          state={day.review ? day.review.verdict : day.answer ? "answered" : "open"}
          highlight={missionDone && !day.answer}
        />
      </ol>
      {!lab && (
        <p className="mt-10 text-sm text-muted-foreground">
          The lab is not connected. <Link href="/lab" className="underline underline-offset-4">Set it up</Link>.
        </p>
      )}
    </>
  )
}
