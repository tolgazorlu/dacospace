import { labDir } from "@/lib/core/paths"

export function LabMissing() {
  return (
    <div className="prose-daco">
      <h1 className="text-3xl font-semibold tracking-tight">Lab</h1>
      <p className="mt-4 text-muted-foreground">
        No java-scale-lab checkout at <code>{labDir()}</code>. The setup script clones it next to dacospace
        and checks Docker and Java for you. To use a checkout somewhere else, set <code>DACOSPACE_LAB_DIR</code>.
      </p>
      <pre className="mt-4 rounded-md bg-muted p-3 font-mono text-xs">pnpm run setup</pre>
    </div>
  )
}
