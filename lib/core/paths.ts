import fs from "node:fs"
import path from "node:path"
import { isHosted } from "./hosted"

/** Repo root. The MCP server sets DACOSPACE_ROOT; Next.js runs from the root. */
export const rootDir = () => process.env.DACOSPACE_ROOT ?? process.cwd()
export const questionsDir = () => path.join(rootDir(), "questions")
/** Personal answers and reviews. Gitignored by default. */
export const dataDir = () => process.env.DACOSPACE_DATA ?? path.join(rootDir(), "data")
/** Hosted mode reads a reading-only snapshot of both labs from content/ (`pnpm sync-content`). */
export const contentDir = () => path.join(rootDir(), "content")
const sibling = (name: string) => (isHosted() ? path.join(contentDir(), name) : path.resolve(rootDir(), "..", name))
/** The ai-systems-lab checkout (lessons, case files, AI design questions). Sibling folder by default. */
export const aiLabDir = () => process.env.DACOSPACE_AI_LAB_DIR ?? sibling("ai-systems-lab")
/**
 * The java-scale-lab checkout whose lessons, missions and ./lab CLI dacospace drives.
 * Default: a sibling folder, so `git clone` both repos into the same parent and it just works.
 */
export const labDir = () => process.env.DACOSPACE_LAB_DIR ?? sibling("java-scale-lab")

export type Lang = "en" | "tr"
/**
 * The file to read for one lab document in a language. Turkish translations live in dacospace, at
 * content/tr/<repo>/<rel>, for both modes; the English file stays the source of truth and the fallback.
 */
export function localizedFile(repo: "java-scale-lab" | "ai-systems-lab", base: string, rel: string, lang: Lang = "en"): string {
  if (lang === "tr") {
    const tr = path.join(contentDir(), "tr", repo, rel)
    if (fs.existsSync(tr)) return tr
  }
  return path.join(base, rel)
}
