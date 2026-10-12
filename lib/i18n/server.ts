import "server-only"
import { cookies, headers } from "next/headers"
import { LANG_COOKIE, messages, pickLang, type Lang, type Messages } from "./messages"

export async function getLang(): Promise<Lang> {
  const [c, h] = await Promise.all([cookies(), headers()])
  return pickLang(c.get(LANG_COOKIE)?.value, h.get("accept-language"))
}

export async function getT(): Promise<Messages> {
  return messages(await getLang())
}
