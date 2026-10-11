import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { makeLab } from "./fixtures/make-lab"

const root = path.resolve(__dirname, "..")
const data = fs.mkdtempSync(path.join(os.tmpdir(), "daco-mcp-"))
const lab = makeLab()
let client: Client

const call = async (name: string, args: Record<string, unknown> = {}) => {
  const res = (await client.callTool({ name, arguments: args })) as {
    content: { text: string }[]
    isError?: boolean
  }
  if (res.isError) throw new Error(res.content[0].text)
  return JSON.parse(res.content[0].text)
}

beforeAll(async () => {
  client = new Client({ name: "test", version: "1" })
  await client.connect(
    new StdioClientTransport({
      command: path.join(root, "node_modules/.bin/tsx"),
      args: [path.join(root, "mcp/server.mts")],
      cwd: os.tmpdir(), // prove the server finds the repo from its own location
      env: { ...process.env, DACOSPACE_DATA: data, DACOSPACE_LAB_DIR: lab } as Record<string, string>,
    }),
  )
}, 30_000)

afterAll(async () => {
  await client?.close()
  fs.rmSync(data, { recursive: true, force: true })
  fs.rmSync(lab, { recursive: true, force: true })
})

describe("mcp server over stdio", () => {
  it("exposes the tools and the interview prompt", async () => {
    const tools = (await client.listTools()).tools.map((t) => t.name).sort()
    expect(tools).toEqual([
      "add_question",
      "get_history",
      "get_interviewer_notes",
      "get_lab_mission",
      "get_lab_state",
      "get_today",
      "list_questions",
      "save_answer",
      "save_lab_review",
      "save_review",
    ])
    const prompts = (await client.listPrompts()).prompts.map((p) => p.name)
    expect(prompts).toContain("mock_interview")
    expect(prompts).toContain("lab_mentor")
  })

  it("runs a full day: question, notes, answer, review, history", async () => {
    const day = await call("get_today")
    expect(day.question.prompt.length).toBeGreaterThan(20)
    expect(day.question).not.toHaveProperty("rubric")
    expect(day.answer).toBeNull()

    const notes = await call("get_interviewer_notes")
    expect(notes.rubric.length).toBeGreaterThan(0)

    await expect(call("save_review", { verdict: "hire", notes: "x" })).rejects.toThrow(/no answer/)
    await call("save_answer", { answer: "Clients -> LB -> API -> Postgres" })
    await call("save_review", { verdict: "lean hire", notes: "Good path, no estimates." })

    const again = await call("get_today")
    expect(again.question.id).toBe(day.question.id) // stable for the day
    expect(again.review.verdict).toBe("lean hire")
    expect(again.streak).toBe(1)

    const history = await call("get_history")
    expect(history.days[0]).toMatchObject({ answered: true, verdict: "lean hire" })
  })

  it("rejects malformed questions", async () => {
    await expect(call("add_question", { markdown: "---\nid: x\n---\n## Prompt\n".padEnd(60, " ") })).rejects.toThrow()
  })

  it("reads the scale lab and stores a mentor review", async () => {
    const state = await call("get_lab_state")
    expect(state.mission).toMatchObject({ nn: "02", title: "The breaking point" })
    expect(state).toMatchObject({ done: 1, total: 3 })
    expect(state.recentResults[0].p95).toBe(7093)

    const docs = await call("get_lab_mission", { nn: "02" })
    expect(docs.lesson.title).toBe("Ten checkouts and a queue")
    expect(docs.mission.body).toContain("./lab load orders 80")

    await expect(call("save_lab_review", { verdict: "pass", notes: "x" })).rejects.toThrow(/empty notebook/)
    fs.mkdirSync(path.join(data, "lab"), { recursive: true })
    fs.writeFileSync(path.join(data, "lab", "02.json"), JSON.stringify({ nn: "02", takeaway: "capacity is pool / W" }))
    const saved = await call("save_lab_review", { verdict: "revisit", notes: "Explain W with other numbers." })
    expect(saved.review.verdict).toBe("revisit")
    await expect(call("get_lab_state", { nn: "09" })).rejects.toThrow(/not in PROGRESS/)
  })
})
