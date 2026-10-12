"use client"

import { useEffect, useState, useTransition } from "react"
import Markdown from "react-markdown"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { saveAnswerAction } from "@/app/actions"
import { saveLocalAnswer, useLocalAnswers } from "@/lib/client/answers"
import { DACOSPACE_REPO } from "@/lib/core/prompts"
import type { Day } from "@/lib/core/days"
import type { Question } from "@/lib/core/questions"

const SCAFFOLD = `Requirements:
Estimates:
API:
Data model:
High-level design:
Deep dive:`

function Timer({ minutes }: { minutes: number }) {
  const [left, setLeft] = useState(minutes * 60)
  const [running, setRunning] = useState(false)
  useEffect(() => {
    if (!running || left <= 0) return
    const t = setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [running, left])
  const mm = String(Math.floor(Math.abs(left) / 60)).padStart(2, "0")
  const ss = String(Math.abs(left) % 60).padStart(2, "0")
  return (
    <div className="flex items-center gap-3">
      <span
        aria-live="off"
        className={`font-mono text-sm tabular-nums ${left <= 0 ? "font-semibold text-foreground" : left < 300 ? "font-medium text-foreground" : "text-muted-foreground"}`}
      >
        {left <= 0 ? "Time is up" : `${mm}:${ss}`}
      </span>
      <Button size="sm" variant="outline" onClick={() => setRunning((r) => !r)} disabled={left <= 0}>
        {running ? "Pause" : left === minutes * 60 ? "Start the clock" : "Resume"}
      </Button>
    </div>
  )
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item} className="prose-daco pl-4 -indent-4 before:content-['–'] before:mr-2 before:text-muted-foreground">
          <Markdown components={{ p: "span" }}>{item}</Markdown>
        </li>
      ))}
    </ul>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="mb-4 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  )
}

/** hosted: the answer lives in this browser (localStorage) instead of data/days on the server. */
export function Session({ day, question, hosted = false }: { day: Day; question: Question; hosted?: boolean }) {
  const [asked, setAsked] = useState(0)
  const [draft, setDraft] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showRubric, setShowRubric] = useState(false)
  const [pending, start] = useTransition()
  const local = useLocalAnswers()?.[day.date]
  const saved = hosted ? (local?.questionId === question.id ? local.answer : undefined) : day.answer
  const answer = draft ?? saved ?? ""
  const answered = Boolean(saved)
  const dirty = answer.trim() !== (saved ?? "")

  const submit = () => {
    if (!hosted) {
      start(async () => {
        const res = await saveAnswerAction(day.date, answer)
        setError(res.error ?? null)
      })
      return
    }
    const text = answer.trim()
    if (!text) return setError("Write something before saving.")
    saveLocalAnswer(day.date, question.id, text)
    setDraft(null)
    setError(null)
  }
  const clarifications = answered ? question.clarifications : question.clarifications.slice(0, asked)
  const left = question.clarifications.length - clarifications.length

  return (
    <>
      <Section title="Ask the interviewer">
        {clarifications.length > 0 && <Bullets items={clarifications} />}
        {left > 0 && (
          <Button variant="ghost" size="sm" className="-ml-2.5 mt-2" onClick={() => setAsked((n) => n + 1)}>
            Ask a clarifying question <span className="text-muted-foreground tabular-nums">({left} left)</span>
          </Button>
        )}
        {!answered && asked === 0 && (
          <p className="mt-1 text-sm text-muted-foreground">
            A real interviewer expects you to ask first. Each click reveals one answer.
          </p>
        )}
      </Section>

      <Section title="Your design">
        {!answered && <Timer minutes={question.minutes} />}
        <Textarea
          value={answer}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={SCAFFOLD}
          className="mt-4 min-h-72 resize-y font-mono text-sm leading-relaxed"
          aria-label="Your design"
        />
        <div className="mt-3 flex items-center gap-3">
          <Button disabled={pending || !dirty} onClick={submit}>
            {pending ? "Saving" : answered ? "Update answer" : "Submit answer"}
          </Button>
          {error && <span role="alert" className="text-sm font-medium">{error}</span>}
          {!error && answered && !dirty && <span className="text-sm text-muted-foreground">Saved</span>}
        </div>
      </Section>

      {answered && (
        <Section title="The interviewer follows up">
          <Bullets items={question.followUps} />
        </Section>
      )}

      {answered && (
        <Section title="How it is scored">
          {showRubric ? (
            <>
              <Bullets items={question.rubric} />
              <h3 className="mb-3 mt-8 text-sm font-semibold">Common mistakes</h3>
              <Bullets items={question.pitfalls} />
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setShowRubric(true)}>
              Show the rubric
            </Button>
          )}
        </Section>
      )}

      {day.review && (
        <Section title={`Review: ${day.review.verdict}`}>
          <div className="prose-daco">
            <Markdown>{day.review.notes}</Markdown>
          </div>
        </Section>
      )}

      {hosted && (
        <p className="mt-16 text-sm text-muted-foreground">
          Your answers stay in this browser. For an AI interviewer that reviews your design, run dacospace on your machine
          with its MCP server:{" "}
          <a href={DACOSPACE_REPO.replace(/\.git$/, "")} className="underline underline-offset-4">
            setup on GitHub
          </a>
          .
        </p>
      )}

      {!hosted && !day.review && (
        <p className="mt-16 text-sm text-muted-foreground">
          Want a real interviewer? In your AI client, run the <code>mock_interview</code> prompt from the
          dacospace MCP server. Its review shows up here.
        </p>
      )}
    </>
  )
}
