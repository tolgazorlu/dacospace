import { aiLabDir } from "@/lib/core/paths"

export function AiMissing() {
  return (
    <article>
      <h1 className="text-3xl font-semibold tracking-tight">AI Systems Lab</h1>
      <p className="mt-4 text-muted-foreground">
        No ai-systems-lab checkout at <code>{aiLabDir()}</code>. Clone it next to dacospace (the setup prompt on the Today
        page does it for you), or set <code>DACOSPACE_AI_LAB_DIR</code>.
      </p>
      <pre className="mt-4 rounded-md bg-muted p-3 font-mono text-xs">git clone https://github.com/tolgazorlu/ai-systems-lab.git ../ai-systems-lab</pre>
    </article>
  )
}
