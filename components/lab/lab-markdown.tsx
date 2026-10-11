"use client"

import Markdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { Play } from "lucide-react"
import { parseLabLine } from "@/lib/core/lab-commands"
import { useConsole } from "./console-context"

type Hast = { type: string; value?: string; tagName?: string; properties?: Record<string, unknown>; children?: Hast[] }

const textOf = (n: Hast): string => (n.type === "text" ? (n.value ?? "") : (n.children ?? []).map(textOf).join(""))

function RunnableLine({ line, scenarios }: { line: string; scenarios: string[] }) {
  const { run, busy } = useConsole()
  const cmd = parseLabLine(line, scenarios)
  if (!cmd) return <div className="min-h-[1lh]">{line}</div>
  return (
    <div className="group -mx-3 flex items-center gap-3 px-3 hover:bg-background/60">
      <span className="flex-1">{line}</span>
      <button
        type="button"
        onClick={() => run(line)}
        disabled={busy}
        className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-sans text-xs text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
        aria-label={`Run ${line}`}
      >
        <Play className="size-3" aria-hidden /> Run
      </button>
    </div>
  )
}

/** Mission markdown where every allowed `./lab ...` line in a code block gets a Run button. */
export function LabMarkdown({ source, scenarios }: { source: string; scenarios: string[] }) {
  const components: Components = {
    pre({ node }) {
      const code = (node as unknown as Hast).children?.find((c) => c.tagName === "code")
      const text = code ? textOf(code).replace(/\n$/, "") : ""
      return (
        <pre className="my-4 overflow-x-auto rounded-md bg-muted px-3 py-2.5 font-mono text-[0.8125rem] leading-relaxed">
          {text.split("\n").map((line, i) => (
            <RunnableLine key={i} line={line} scenarios={scenarios} />
          ))}
        </pre>
      )
    },
    a({ href, children }) {
      const external = href?.startsWith("http")
      return (
        <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>
          {children}
        </a>
      )
    },
  }
  return (
    <div className="prose-daco prose-lab">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {source}
      </Markdown>
    </div>
  )
}
