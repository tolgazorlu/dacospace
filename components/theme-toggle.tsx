"use client"

import { Moon, Sun } from "lucide-react"
import { useSyncExternalStore } from "react"

/** Dark is the default; the choice is remembered in localStorage("theme"). */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");document.documentElement.classList.toggle("dark",t!=="light")}catch(e){document.documentElement.classList.add("dark")}})()`

function subscribe(onChange: () => void) {
  const obs = new MutationObserver(onChange)
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
  return () => obs.disconnect()
}

/** Current theme, kept in sync with the class on <html>. */
export function useTheme(): "dark" | "light" {
  return useSyncExternalStore(
    subscribe,
    () => (document.documentElement.classList.contains("dark") ? "dark" : "light"),
    () => "dark",
  )
}

export function ThemeToggle() {
  const theme = useTheme()
  const next = theme === "dark" ? "light" : "dark"
  return (
    <button
      type="button"
      onClick={() => {
        document.documentElement.classList.toggle("dark", next === "dark")
        try {
          localStorage.setItem("theme", next)
        } catch {}
      }}
      className="-mr-1.5 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
    >
      {theme === "dark" ? <Sun className="size-[18px]" aria-hidden /> : <Moon className="size-[18px]" aria-hidden />}
    </button>
  )
}
