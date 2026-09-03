"use client"

import Link from "next/link"
import { useState, type ReactNode } from "react"
import { Menu, X } from "lucide-react"
import { SynoraLogo } from "@/components/landing/synora-logo"

export type SiteNavLink = {
  href: string
  label: string
  external?: boolean
}

/**
 * Shared site navbar used across the landing page, dashboard, and training
 * pages so navigation always looks and behaves the same way, while letting
 * each page supply its own contextual links (and optional extra content,
 * like the training page's live session pills).
 */
export function SiteNavbar({
  links,
  activeHref,
  breadcrumb,
  rightSlot,
  className = "",
  position = "fixed",
}: {
  links: SiteNavLink[]
  activeHref?: string
  breadcrumb?: string
  rightSlot?: ReactNode
  className?: string
  /** "fixed" (default) floats over the page like the landing navbar.
   *  "static" sits in-flow, useful when a page already manages its own
   *  fixed layout (e.g. the training dashboard). */
  position?: "fixed" | "static"
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav
      className={`${position === "fixed" ? "fixed top-0 left-0 right-0" : ""} z-50 ${className}`}
      style={{
        background: "rgba(255, 255, 255, 0.04)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo + optional page breadcrumb */}
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/" className="flex items-center gap-2">
              <SynoraLogo className="h-8 w-8" />
              <span
                className="text-lg font-semibold"
                style={{
                  background: "linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Synora
              </span>
            </Link>
            {breadcrumb && (
              <span className="hidden sm:flex items-center gap-2 text-sm">
                <span className="text-slate-600">/</span>
                <span className="font-medium bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  {breadcrumb}
                </span>
              </span>
            )}
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8 flex-1 justify-end">
            <div className="flex items-center gap-8">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noopener noreferrer" : undefined}
                  className={`text-sm transition-colors ${
                    activeHref === link.href
                      ? "text-[#f0f4ff] font-medium"
                      : "text-[#8892b0] hover:text-[#f0f4ff]"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            {rightSlot && <div className="flex items-center gap-3">{rightSlot}</div>}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-[#8892b0] hover:text-[#f0f4ff]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/10">
            <div className="flex flex-col gap-4">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noopener noreferrer" : undefined}
                  className="text-sm text-[#8892b0] hover:text-[#f0f4ff] transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              {rightSlot && <div className="pt-2 flex flex-wrap items-center gap-3">{rightSlot}</div>}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
