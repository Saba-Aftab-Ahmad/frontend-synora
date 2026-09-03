import type { Metadata } from 'next'
import { TooltipProvider } from '@/components/ui/tooltip'

export const metadata: Metadata = {
  title: 'Synora — Federated Learning Results',
  description: 'Swahili NLP Classification training results dashboard',
}

// The rest of the site uses the landing page's dark-purple theme tokens
// (see app/globals.css). This dashboard's own components (Table, Tooltip,
// Card) were designed against the default shadcn light-theme variable
// values, so we scope those variables back to their originals here rather
// than letting the global theme leak in and change their look.
const dashboardThemeVars = {
  '--background': '#ffffff',
  '--foreground': 'oklch(0.145 0 0)',
  '--card': '#ffffff',
  '--card-foreground': 'oklch(0.145 0 0)',
  '--popover': '#ffffff',
  '--popover-foreground': 'oklch(0.145 0 0)',
  '--primary': 'oklch(0.205 0 0)',
  '--primary-foreground': 'oklch(0.985 0 0)',
  '--secondary': 'oklch(0.97 0 0)',
  '--secondary-foreground': 'oklch(0.205 0 0)',
  '--muted': 'oklch(0.97 0 0)',
  '--muted-foreground': 'oklch(0.556 0 0)',
  '--accent': 'oklch(0.97 0 0)',
  '--accent-foreground': 'oklch(0.205 0 0)',
  '--destructive': 'oklch(0.577 0.245 27.325)',
  '--border': 'oklch(0.922 0 0)',
  '--input': 'oklch(0.922 0 0)',
  '--ring': 'oklch(0.708 0 0)',
} as React.CSSProperties

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div style={dashboardThemeVars}>
      <TooltipProvider>{children}</TooltipProvider>
    </div>
  )
}
