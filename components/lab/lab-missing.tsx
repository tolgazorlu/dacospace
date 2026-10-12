import { RunsLocally } from "@/components/hosted/runs-locally"
import { isHosted } from "@/lib/core/hosted"
import { labDir } from "@/lib/core/paths"
import { getT } from "@/lib/i18n/server"

export async function LabMissing() {
  const t = await getT()
  if (isHosted()) return <RunsLocally title={t.missing.labTitle} what={t.missing.labWhat} />
  return (
    <div className="prose-daco">
      <h1 className="text-3xl font-semibold tracking-tight">{t.missing.labTitle}</h1>
      <p className="mt-4 text-muted-foreground">{t.missing.labText(labDir())}</p>
      <pre className="mt-4 rounded-md bg-muted p-3 font-mono text-xs">pnpm run setup</pre>
    </div>
  )
}
