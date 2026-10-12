"use client"

import { useRouter } from "next/navigation"
import { createContext, useContext } from "react"
import { LANG_COOKIE, messages, type Lang, type Messages } from "@/lib/i18n/messages"

const LangContext = createContext<Lang>("en")

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>
}

export const useLang = () => useContext(LangContext)
export const useT = (): Messages => messages(useContext(LangContext))

/** EN / TR switch; the choice is a cookie so server-rendered pages follow it. */
export function LangToggle() {
  const lang = useLang()
  const t = useT()
  const router = useRouter()
  const next: Lang = lang === "tr" ? "en" : "tr"
  return (
    <button
      type="button"
      onClick={() => {
        document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
        router.refresh()
      }}
      className="inline-flex h-8 items-center justify-center rounded-md px-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      aria-label={t.nav.languageLabel}
      title={t.nav.languageLabel}
      lang={next}
    >
      {next.toUpperCase()}
    </button>
  )
}
