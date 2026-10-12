"use client"

import { usePathname } from "next/navigation"

/** Reading pages use a narrow column; the lab workspace needs room for its side panel. */
export function Shell({ children, hosted = false }: { children: React.ReactNode; hosted?: boolean }) {
  const path = usePathname()
  const wide = !hosted && /^\/lab\/\d{2}$/.test(path)
  return <div className={`mx-auto px-5 pb-24 ${wide ? "max-w-[76rem]" : "max-w-2xl"}`}>{children}</div>
}
