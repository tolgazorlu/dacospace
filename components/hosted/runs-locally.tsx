import { DACOSPACE_REPO } from "@/lib/core/prompts"
import { getT } from "@/lib/i18n/server"

/** What the hosted demo shows in place of the lab and the AI lab, which need the visitor's own machine. */
export async function RunsLocally({ title, what }: { title: string; what: string }) {
  const t = await getT()
  const repo = DACOSPACE_REPO.replace(/\.git$/, "")
  return (
    <article className="prose-daco">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-4 text-muted-foreground">
        {what} {t.missing.runsLocally}
      </p>
      <pre className="mt-6 rounded-md bg-muted p-3 font-mono text-xs">{`git clone ${DACOSPACE_REPO}\ncd dacospace\npnpm install && pnpm dev`}</pre>
      <p className="mt-6 text-sm">
        <a href={repo} className="font-medium underline underline-offset-4">
          {t.missing.readSetup}
        </a>
      </p>
    </article>
  )
}
