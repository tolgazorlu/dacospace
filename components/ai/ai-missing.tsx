import { RunsLocally } from "@/components/hosted/runs-locally"
import { isHosted } from "@/lib/core/hosted"
import { aiLabDir } from "@/lib/core/paths"
import { getT } from "@/lib/i18n/server"

export async function AiMissing() {
  const t = await getT()
  if (isHosted()) return <RunsLocally title={t.missing.aiTitle} what={t.missing.aiWhat} />
  return (
    <article>
      <h1 className="text-3xl font-semibold tracking-tight">{t.missing.aiTitle}</h1>
      <p className="mt-4 text-muted-foreground">{t.missing.aiText(aiLabDir())}</p>
      <pre className="mt-4 rounded-md bg-muted p-3 font-mono text-xs">git clone https://github.com/tolgazorlu/ai-systems-lab.git ../ai-systems-lab</pre>
    </article>
  )
}
