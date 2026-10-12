import { DACOSPACE_REPO } from "@/lib/core/prompts"

/** What the hosted demo shows in place of the lab and the AI lab, which need the visitor's own machine. */
export function RunsLocally({ title, what }: { title: string; what: string }) {
  const repo = DACOSPACE_REPO.replace(/\.git$/, "")
  return (
    <article className="prose-daco">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-4 text-muted-foreground">
        {what} That needs your own machine, so it is not part of this hosted demo. The interview question of the day works
        here; everything else runs when you start dacospace locally.
      </p>
      <pre className="mt-6 rounded-md bg-muted p-3 font-mono text-xs">{`git clone ${DACOSPACE_REPO}\ncd dacospace\npnpm install && pnpm dev`}</pre>
      <p className="mt-6 text-sm">
        <a href={repo} className="font-medium underline underline-offset-4">
          Read the setup on GitHub
        </a>
      </p>
    </article>
  )
}
