"use client"

import { Check, ChevronDown, Copy } from "lucide-react"
import { useState } from "react"
import { useT } from "@/components/i18n"

/**
 * A prompt the learner pastes into their AI assistant. Collapsed by default so it does not push the
 * page down; the copy button works either way.
 */
export function PromptCard({ title, description, prompt }: { title: string; description: string; prompt: string }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const t = useT()

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
    } catch {
      const t = document.createElement("textarea")
      t.value = prompt
      document.body.appendChild(t)
      t.select()
      document.execCommand("copy")
      t.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <section className="rounded-lg border bg-card">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-medium">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <button
          type="button"
          onClick={copy}
          className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 self-start rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/85 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
          aria-live="polite"
        >
          {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
          {copied ? t.common.copied : t.common.copyPrompt}
        </button>
      </div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 border-t px-4 py-2 text-left text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
        {open ? t.common.hidePrompt : t.common.showPrompt}
      </button>
      {open && (
        <pre className="max-h-96 overflow-auto border-t px-4 py-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
          {prompt}
        </pre>
      )}
    </section>
  )
}
