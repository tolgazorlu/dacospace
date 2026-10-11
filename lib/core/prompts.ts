/**
 * Copy-paste prompts for AI coding assistants (Claude Code, Codex, Cursor, Hermes...).
 * They are plain text on purpose: they must work in any client, with or without MCP.
 */

export const DACOSPACE_REPO = process.env.DACOSPACE_REPO ?? "https://github.com/tolgazorlu/dacospace.git"
export const LAB_REPO = process.env.DACOSPACE_LAB_REPO ?? "https://github.com/tolgazorlu/java-scale-lab.git"

const MENTOR_RULES = `How to help me (important):
- Follow java-scale-lab/AGENTS.md and the skill in java-scale-lab/.agents/skills/scale-lab-mentor/SKILL.md.
- Do NOT give me the answer or write the fix for a mission, even if I ask. Ask me questions, make me predict numbers before we measure, run the ./lab commands with me and help me read the output. Give hints one step at a time.
- If I insist on a solution after really trying, point me to the reference branch and ask me to explain it back to you.
- Never invent numbers. Use only output from commands we ran.`

/** Full setup: both repos, dependencies, infrastructure, MCP, then the first mission. */
export function setupPrompt(): string {
  return `Set up Scale Lab for me: a hands-on lab where I learn how a Java backend behaves under load, plus dacospace, its local web UI.

1. In a folder of my choice (ask me, suggest ~/projects), clone both repos side by side:
   git clone ${DACOSPACE_REPO}
   git clone ${LAB_REPO}
   They are private. If cloning fails, tell me to ask the owner for an invite and stop.
2. In dacospace run: pnpm run setup
   It checks Docker, Java 25, Node, pnpm and python3. If something is missing, tell me exactly how to install it on my OS and wait for me. Do not install system software without asking.
3. Then: pnpm build && pnpm start   (keep it running; it serves http://localhost:4120)
4. If you support MCP servers, add dacospace as a stdio MCP server:
   command: <dacospace>/node_modules/.bin/tsx   args: <dacospace>/mcp/server.mts
   Its tools (get_lab_state, get_lab_mission, save_lab_review) let you see my notebook and results.
5. Tell me to open http://localhost:4120, then walk me into mission 01: read lessons/01 first, then labs/01.

${MENTOR_RULES}`
}

/** Start (or continue) one mission, optionally from its start/NN branch. */
export function missionPrompt(nn: string, title: string): string {
  return `Be my mentor for Scale Lab mission ${nn}: "${title}".

1. If java-scale-lab is not on this machine yet, clone it (and dacospace next to it) and run "pnpm run setup" in dacospace:
   git clone ${LAB_REPO}
   git clone ${DACOSPACE_REPO}
2. Ask me: do I continue on my own code, or start fresh at mission ${nn}?
   Fresh start: in java-scale-lab run  ./lab jump ${nn}
   It creates a branch mission-${nn} where every earlier mission is already solved, keeps my current branch, and rebuilds the lab database (about 2 minutes). Ask before running it.
3. Read lessons/${nn}-*.md and labs/${nn}-*.md yourself. Check I read the lesson: ask me its check question.
4. Then go through the mission with me step by step: predict, measure, the 4 steps, my fix, the evidence.

${MENTOR_RULES}`
}
