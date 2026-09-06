import { ArrowRight, Shield, Cpu, Globe, FlaskConical } from "lucide-react"
import Link from "next/link"

const badges = [
  { icon: Shield, label: "No Raw Data Transmitted" },
  { icon: Cpu, label: "WebGPU Accelerated" },
  { icon: Globe, label: "Low-Resource Languages" },
  { icon: FlaskConical, label: "Research Grade Privacy" },
]

export function Hero() {
  return (
    <section
      className="relative pt-16 overflow-hidden"
      style={{
        background: 'transparent',
        backgroundImage: `
          radial-gradient(ellipse 80% 50% at 50% -10%, 
            rgba(124, 58, 237, 0.25) 0%, 
            transparent 60%),
          radial-gradient(ellipse 60% 40% at 80% 50%, 
            rgba(6, 182, 212, 0.08) 0%, 
            transparent 50%)
        `,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 md:py-32">
        <div className="text-center">
          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-balance">
            <span
              style={{
                background: 'linear-gradient(135deg, #f0f4ff, #a78bfa, #67e8f9)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >Federated AI Training In Your Browser</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg sm:text-xl text-[#8892b0] max-w-2xl mx-auto text-pretty">
            Privacy-preserving natural language processing for low-resource languages.
            Train AI models locally with WebGPU acceleration while keeping your data secure.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/training"
              className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-white cursor-pointer transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)',
                border: 'none',
                boxShadow: '0 4px 24px rgba(124, 58, 237, 0.4)'
              }}
            >
              Start Training
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold cursor-pointer transition-all duration-300"
              style={{
                background: 'transparent',
                border: '1px solid #7c3aed',
                color: '#a78bfa'
              }}
            >
              View Architecture
            </Link>
          </div>

          {/* Badge Stats */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-4 md:gap-6">
            {badges.map((badge) => (
              <div
                key={badge.label}
                className="rounded-full px-4 py-2 flex items-center gap-2"
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
              >
                <badge.icon className="h-4 w-4 text-cyan" />
                <span className="text-xs sm:text-sm text-[#8892b0]">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

