import Link from "next/link"
import { LabMissing } from "@/components/lab/lab-missing"
import { currentMission, labAvailable, readProgress } from "@/lib/core/lab"
import { isHosted } from "@/lib/core/hosted"
import { getLang } from "@/lib/i18n/server"
import { messages } from "@/lib/i18n/messages"
import { getLesson, getMission } from "@/lib/core/lab"

export default async function LabPage() {
  const lang = await getLang()
  const t = messages(lang)
  // Turkish titles come from the translated mission (or lesson) file; the roadmap table is English.
  const title = (m: { nn: string; title: string }) =>
    lang === "tr" ? (getMission(m.nn, lang)?.title ?? getLesson(m.nn, lang)?.title ?? m.title) : m.title
  if (!labAvailable()) return <LabMissing />
  const { missions, log } = readProgress()
  const current = currentMission(missions)
  const done = missions.filter((m) => m.status === "done").length
  const hosted = isHosted()
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">{t.lab.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t.lab.summary(hosted ? null : done, missions.length, missions.filter((m) => m.missionFile).length, missions.filter((m) => m.lessonFile).length)}
      </p>
      <ol className="mt-10 divide-y">
        {missions.map((m) => {
          const isCurrent = !hosted && m.nn === current?.nn && m.status !== "done"
          return (
            <li key={m.nn}>
              <Link href={`/lab/${m.nn}`} className="group flex items-baseline gap-4 py-3.5">
                <span className="w-6 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{m.nn}</span>
                <span className="flex-1">
                  <span className={`group-hover:underline underline-offset-4 ${m.missionFile || m.lessonFile ? "" : "text-muted-foreground"}`}>
                    {title(m)}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{m.concept}</span>
                </span>
                <span className={`shrink-0 text-sm ${isCurrent ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                  {m.status === "done" ? (m.date ?? t.lab.done) : isCurrent ? t.lab.today : m.missionFile ? t.lab.ready : m.lessonFile ? t.lab.lessonOnly : t.lab.notWritten}
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
      {log.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-4 text-sm font-semibold">{t.lab.learned}</h2>
          <ol className="space-y-3">
            {[...log].reverse().map((l, i) => (
              <li key={i} className="flex gap-4 text-sm">
                <span className="w-6 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{l.nn}</span>
                <span className="flex-1">{l.text}</span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{l.date}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  )
}
