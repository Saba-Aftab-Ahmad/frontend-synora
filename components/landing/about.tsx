import { ShieldCheck, Globe, Zap, Languages, RefreshCw, FlaskConical } from "lucide-react"

// const features = [
//   {
//     icon: ShieldCheck,
//     title: "Privacy Preserving",
//     description: "Differential privacy and gradient encryption protect all participants"
//   },
//   {
//     icon: Globe,
//     title: "Browser Native",
//     description: "No installation required. Runs entirely in modern web browsers"
//   },
//   {
//     icon: Zap,
//     title: "WebGPU Accelerated",
//     description: "Hardware-accelerated training using WebGPU and WebNN APIs"
//   },
//   {
//     icon: Languages,
//     title: "Low-Resource NLP",
//     description: "Specialized for Swahili, Yoruba, Hausa, Amharic and more"
//   },
//   {
//     icon: RefreshCw,
//     title: "Federated Aggregation",
//     description: "FedAvg and FedProx aggregation strategies built-in"
//   },
//   {
//     icon: FlaskConical,
//     title: "Research Platform",
//     description: "Export results, compare rounds, analyze convergence metrics"
//   }
// ]
const features = [
  {
    icon: ShieldCheck,
    title: "Privacy Preserving",
    description: "Raw text never leaves the browser, only validated model weight tensors are transmitted"
  },
  {
    icon: Globe,
    title: "Browser Native",
    description: "No installation required. Runs entirely in modern web browsers"
  },
  {
    icon: Zap,
    title: "Hardware Accelerated",
    description: "Automatic detection and use of WebGPU or WebNN, with CPU fallback"
  },
  {
    icon: Languages,
    title: "Low-Resource NLP",
    description: "Specialized for Kenyan languages: Dholuo, Kalenjin, and Kidaw'ida"
  },
  {
    icon: RefreshCw,
    title: "Federated Aggregation",
    description: "FedAvg aggregation strategy on a custom coordination server"
  },
  {
    icon: FlaskConical,
    title: "Research Platform",
    description: "Export results, compare rounds, analyze convergence metrics"
  }
]

export function About() {
  return (
    <section
      id="about"
      /*className="relative py-24 md:py-32 bg-[#060810]/40"*/
      className="relative py-14 md:py-20 bg-[#060810]/40"
    /* style={{ backgroundColor: '#060810' }} */
    >
      {/* Background Effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#f0f4ff]">
            Built for <span
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >Privacy & Performance</span>
          </h2>
          <p className="mt-4 text-[#8892b0] max-w-xl mx-auto">
            A comprehensive toolkit designed to make federated learning accessible to researchers and developers.
          </p>
        </div>

        {/* 6 Cards Grid - 3x2 layout */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-8"
          style={{ display: 'grid', gap: '24px' }}
        >
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl p-8 transition-all duration-300"
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '20px'
              }}
            >
              <div
                className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ background: 'rgba(124, 58, 237, 0.15)' }}
              >
                <feature.icon className="h-6 w-6" style={{ color: '#a78bfa' }} />
              </div>
              <h3 className="text-xl font-semibold text-[#f0f4ff] mb-3">
                {feature.title}
              </h3>
              <p className="text-[#8892b0] text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Mission Statement Quote */}
        <div className="text-center max-w-3xl mx-auto">
          <blockquote
            className="relative px-8 py-6 rounded-2xl"
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}
          >
            <p className="text-lg md:text-xl italic text-[#f0f4ff]/90 leading-relaxed">
              &ldquo;Empowering a more inclusive AI future by enabling privacy-preserving machine learning for underrepresented languages and communities worldwide.&rdquo;
            </p>
            <footer className="mt-4 text-sm text-[#8892b0]">
              — The Synora Mission
            </footer>
          </blockquote>
        </div>
      </div>
    </section>
  )
}
