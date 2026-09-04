const technologies = [
  {
    name: "TensorFlow.js",
    description: "ML in the browser",
    color: "from-orange-500 to-yellow-500",
  },
  {
    name: "WebGPU",
    description: "Native GPU access",
    color: "from-blue-500 to-indigo-500",
  },
  {
    name: "WebNN",
    description: "Neural network API",
    color: "from-green-500 to-emerald-500",
  },
  {
    name: "React",
    description: "UI framework",
    color: "from-cyan-400 to-blue-500",
  },
  {
    name: "Python",
    description: "Server backend",
    color: "from-yellow-400 to-blue-500",
  },
  {
    name: "Flower",
    description: "Federated learning",
    color: "from-pink-500 to-rose-500",
  },
]

export function TechStack() {
  return (
    <section 
      id="powered-by" 
      className="relative py-24 md:py-32 border-t border-border bg-[#060810]/85 backdrop-blur-[2px]"
      /* style={{ backgroundColor: '#060810' }} */
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#f0f4ff]">
            Powered by <span className="gradient-text">Modern Tech</span>
          </h2>
          <p className="mt-4 text-[#8892b0] max-w-xl mx-auto">
            Built on battle-tested frameworks and cutting-edge web APIs for optimal performance.
          </p>
        </div>

        {/* Tech Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {technologies.map((tech) => (
            <div
              key={tech.name}
              className="group rounded-xl p-4 text-center transition-all duration-300"
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              {/* Icon/Badge */}
              <div className={`mx-auto mb-3 h-12 w-12 rounded-lg bg-gradient-to-br ${tech.color} flex items-center justify-center text-white font-bold text-lg`}>
                {tech.name.charAt(0)}
              </div>
              
              {/* Name */}
              <h3 className="text-sm font-medium text-[#f0f4ff]">
                {tech.name}
              </h3>
              
              {/* Description */}
              <p className="mt-1 text-xs text-[#8892b0]">
                {tech.description}
              </p>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-12 text-center">
          <p className="text-sm text-[#8892b0]">
            Open source and extensible — integrate with your existing ML pipeline
          </p>
        </div>
      </div>
    </section>
  )
}
