import { labDir } from "@/lib/core/paths"

export function LabMissing() {
  return (
    <div className="prose-daco">
      <h1 className="text-3xl font-semibold tracking-tight">Lab</h1>
      <p className="mt-4 text-muted-foreground">
        No java-scale-lab checkout at <code>{labDir()}</code>. Clone it there, or point{" "}
        <code>DACOSPACE_LAB_DIR</code> at your checkout.
      </p>
      <pre className="mt-4 rounded-md bg-muted p-3 font-mono text-xs">gh repo clone tolgazorlu/java-scale-lab ~/projects/java-scale-lab</pre>
    </div>
  )
}
