import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

const root = path.resolve(__dirname, "..")
const data = fs.mkdtempSync(path.join(os.tmpdir(), "daco-mcp-"))
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
      env: { ...process.env, DACOSPACE_DATA: data } as Record<string, string>,
    }),
  )
}, 30_000)

afterAll(async () => {
  await client?.close()
  fs.rmSync(data, { recursive: true, force: true })
})

describe("mcp server over stdio", () => {
  it("exposes the tools and the interview prompt", async () => {
    const tools = (await client.listTools()).tools.map((t) => t.name).sort()
    expect(tools).toEqual([
      "add_question",
      "get_history",
      "get_interviewer_notes",
      "get_today",
      "list_questions",
      "save_answer",
      "save_review",
    ])
    const prompts = (await client.listPrompts()).prompts.map((p) => p.name)
    expect(prompts).toContain("mock_interview")
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
})
