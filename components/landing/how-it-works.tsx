import { Download, Cpu, Upload } from "lucide-react"

const steps = [
  {
    step: 1,
    icon: Download,
    title: "Download Model",
    description: "Server sends the latest model weights to your browser. No setup required — just open the page and start.",
  },
  {
    step: 2,
    icon: Cpu,
    title: "Train Locally",
    description: "TensorFlow.js trains on your local data using WebGPU acceleration. Your data never leaves your device.",
  },
  {
    step: 3,
    icon: Upload,
    title: "Share Updates",
    description: "Only model gradients are sent back to the server. Raw data remains private and secure on your machine.",
  },
]

export function HowItWorks() {
  return (
    <section 
      id="how-it-works" 
      className="relative py-24 md:py-32 bg-[#060810]/85 backdrop-blur-[2px]"
      style={{ backgroundColor: '#060810' }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#f0f4ff]">
            How It <span className="gradient-text">Works</span>
          </h2>
          <p className="mt-4 text-[#8892b0] max-w-xl mx-auto">
            A simple three-step process that keeps your data private while contributing to global AI research.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {steps.map((item) => (
            <div
              key={item.step}
              className="group rounded-2xl p-6 lg:p-8 transition-all duration-300"
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              {/* Step Number & Icon */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple/20 to-cyan/20 border border-purple/30">
                  <item.icon className="h-6 w-6 text-cyan" />
                </div>
                <span className="text-xs font-medium text-purple uppercase tracking-wider">
                  Step {item.step}
                </span>
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold text-[#f0f4ff] mb-3">
                {item.title}
              </h3>
              <p className="text-[#8892b0] text-sm leading-relaxed">
                {item.description}
              </p>

              {/* Decorative Line */}
              <div className="mt-6 h-[2px] w-12 bg-gradient-to-r from-purple to-cyan opacity-50 group-hover:w-full group-hover:opacity-100 transition-all duration-300" />
            </div>
          ))}
        </div>

        {/* Connection Lines (Desktop) */}
        <div className="hidden md:flex justify-center mt-8 gap-8">
          <div className="flex items-center gap-2 text-[#8892b0] text-xs">
            <div className="h-px w-24 bg-gradient-to-r from-transparent via-purple/50 to-transparent" />
            <span>Secure Transfer</span>
            <div className="h-px w-24 bg-gradient-to-r from-transparent via-cyan/50 to-transparent" />
          </div>
        </div>
      </div>
    </section>
  )
}
