"use client"

import { SiteNavbar } from "@/components/shared/site-navbar"

export function Navbar() {
  const navLinks = [
    { href: "#how-it-works", label: "How It Works" },
    { href: "#about", label: "About" },
    { href: "#powered-by", label: "Tech Stack" },
    { href: "/training", label: "Live Demo" },
    { href: "/dashboard", label: "Results" },
    { href: "https://github.com/Saba-Aftab-Ahmad/SYNORA", label: "GitHub", external: true },
  ]

  return <SiteNavbar links={navLinks} />
}
