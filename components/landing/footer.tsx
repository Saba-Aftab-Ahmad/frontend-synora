import Link from "next/link"
import { SynoraLogo } from "./synora-logo"

export function Footer() {
  return (
    <footer 
      className="border-t border-border py-12 bg-[#060810]"
      style={{ backgroundColor: '#060810' }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & Copyright */}
          <div className="flex items-center gap-3">
            <SynoraLogo className="h-8 w-8" />
            <span 
              className="text-lg font-semibold"
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >Synora</span>
            <span className="text-sm text-[#8892b0]">
              © {new Date().getFullYear()} All rights reserved.
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <span
              className="text-sm text-[#8892b0]/50 cursor-not-allowed select-none"
              title="Coming soon"
              aria-disabled="true"
            >
              Privacy
            </span>
            <span
              className="text-sm text-[#8892b0]/50 cursor-not-allowed select-none"
              title="Coming soon"
              aria-disabled="true"
            >
              Terms
            </span>
            <Link
              href="https://github.com/Saba-Aftab-Ahmad/SYNORA"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#8892b0] hover:text-[#f0f4ff] transition-colors"
            >
              GitHub
            </Link>
          </div>
        </div>

        {/* Tagline */}
        <div className="mt-8 text-center">
          <p className="text-xs text-[#8892b0]/60">
            Privacy-preserving federated learning for a more inclusive AI future.
          </p>
        </div>
      </div>
    </footer>
  )
}
