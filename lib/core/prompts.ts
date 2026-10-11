/**
 * Copy-paste prompts for AI coding assistants (Claude Code, Codex, Cursor, Hermes...).
 * They are plain text on purpose: they must work in any client, with or without MCP.
 */

export const DACOSPACE_REPO = process.env.DACOSPACE_REPO ?? "https://github.com/tolgazorlu/dacospace.git"
export const AI_LAB_REPO = process.env.DACOSPACE_AI_LAB_REPO ?? "https://github.com/tolgazorlu/ai-systems-lab.git"
export const LAB_REPO = process.env.DACOSPACE_LAB_REPO ?? "https://github.com/tolgazorlu/java-scale-lab.git"

const MENTOR_RULES = `How to help me (important):
- Follow java-scale-lab/AGENTS.md and the skill in java-scale-lab/.agents/skills/scale-lab-mentor/SKILL.md.
- Do NOT give me the answer or write the fix for a mission, even if I ask. Ask me questions, make me predict numbers before we measure, run the ./lab commands with me and help me read the output. Give hints one step at a time.
- If I insist on a solution after really trying, point me to the reference branch and ask me to explain it back to you.
- Never invent numbers. Use only output from commands we ran.`

/** Full setup: both repos, dependencies, infrastructure, MCP, then the first mission. */
export function setupPrompt(): string {
  return `Set up my learning labs: Scale Lab (a hands-on lab where I learn how a Java backend behaves under load), AI Systems Lab (lessons, real incident case files and design questions about enterprise AI systems and agents), and dacospace, their local web UI.

1. In a folder of my choice (ask me, suggest ~/projects), clone both repos side by side:
   git clone ${DACOSPACE_REPO}
   git clone ${LAB_REPO}
   git clone ${AI_LAB_REPO}
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

const AI_TUTOR_RULES = `How to teach me (important):
- If ai-systems-lab is on this machine, follow ai-systems-lab/AGENTS.md and .agents/skills/ai-lab-mentor/SKILL.md.
- Do NOT hand me answers. Ask one question at a time, wait for my answer, then push back or go one level deeper.
- Ground every fact in the lesson or case file and its sources. If something is not in them, say you are not sure.
- Prefer concrete systems and numbers over definitions. Make me decide trade-offs and defend them.`

const aiFile = (rel: string) => `ai-systems-lab/${rel} (clone ${AI_LAB_REPO} if it is not here)`

/** Study one AI lesson with an assistant acting as a tutor. */
export function aiLessonPrompt(nn: string, title: string): string {
  return `Tutor me on AI Systems Lab lesson ${nn}: "${title}".

1. Read ${aiFile(`lessons/${nn}-*.md`)} and the case files it lists under **Cases:** (in cases/).
2. Do not summarise the lesson for me. First ask me to explain its core idea in two sentences of my own.
3. Then take me through its "Decide" exercise as a design review: I choose, you challenge my choice with the constraints and the incidents from the cases.
4. Then ask the check question. Grade my answer honestly (strong, partial, missing) and tell me what a staff engineer would add.
5. End with one question I should be able to answer tomorrow.

${AI_TUTOR_RULES}`
}

/** Work through an incident case file as an on-call engineer. */
export function aiCasePrompt(slug: string, title: string): string {
  return `Run an incident review with me on the AI Systems Lab case "${title}".

1. Read ${aiFile(`cases/${slug}.md`)}. Show me only the parts before "## What actually happened".
2. Ask me the "Stop and think" questions one by one. Wait for my answers. Do not reveal the root cause.
3. When I have a hypothesis, compare it with what actually happened, point by point. Credit what I got right.
4. Ask me to design the defenses for a similar system at my company, and rank them by leverage and cost.
5. Finish with the case's "lesson for your system" as a checklist, and ask which item I would do first and why.

${AI_TUTOR_RULES}`
}

/** A realistic mock interview for one AI design question. */
export function aiInterviewPrompt(id: string, title: string): string {
  return `Interview me for a senior AI engineer role with the system design question "${title}".

1. Read ${aiFile(`questions/${id}.md`)}. It has the prompt, clarifications (your answers to my questions), follow-ups, a rubric and pitfalls. Never show me the rubric or pitfalls before the end.
2. Say only the Prompt section out loud. Answer my clarifying questions with the Clarifications; if I ask something not covered, invent a consistent answer.
3. Let me drive the design for about 35 minutes. Interrupt like a real interviewer: ask for numbers, push on the weakest part.
4. Then ask 2 of the follow-ups.
5. At the end, grade me against each rubric item (met, partly, missed) with a one-line reason, list any pitfalls I fell into, and give an overall verdict: strong no hire, no hire, lean hire, hire, strong hire.

${AI_TUTOR_RULES}`
}
