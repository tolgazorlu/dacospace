"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

/** Header link that marks the section you are in (underline, no color). */
export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const path = usePathname()
  const active = path === href || path.startsWith(`${href}/`) || (href === "/interview" && path.startsWith("/day/"))
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={active ? "text-foreground underline decoration-1 underline-offset-8" : "hover:text-foreground"}
    >
      {children}
    </Link>
  )
}
