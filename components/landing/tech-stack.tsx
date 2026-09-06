// // const technologies = [
// //   {
// //     name: "TensorFlow.js",
// //     description: "ML in the browser",
// //     color: "from-orange-500 to-yellow-500",
// //   },
// //   {
// //     name: "WebGPU",
// //     description: "Native GPU access",
// //     color: "from-blue-500 to-indigo-500",
// //   },
// //   {
// //     name: "WebNN",
// //     description: "Neural network API",
// //     color: "from-green-500 to-emerald-500",
// //   },
// //   {
// //     name: "React",
// //     description: "UI framework",
// //     color: "from-cyan-400 to-blue-500",
// //   },
// //   {
// //     name: "Python",
// //     description: "Server backend",
// //     color: "from-yellow-400 to-blue-500",
// //   },
// //   {
// //     name: "Flower",
// //     description: "Federated learning",
// //     color: "from-pink-500 to-rose-500",
// //   },
// // ]
// const technologies = [
//   {
//     name: "TensorFlow.js",
//     description: "ML in the browser",
//     color: "from-orange-500 to-yellow-500",
//   },
//   {
//     name: "WebGPU",
//     description: "Native GPU access",
//     color: "from-blue-500 to-indigo-500",
//   },
//   {
//     name: "WebNN",
//     description: "Neural network API",
//     color: "from-green-500 to-emerald-500",
//   },
//   {
//     name: "React",
//     description: "UI framework",
//     color: "from-cyan-400 to-blue-500",
//   },
//   {
//     name: "Python",
//     description: "Flask coordination server",
//     color: "from-yellow-400 to-blue-500",
//   },
//   {
//     name: "FedAvg",
//     description: "Federated aggregation",
//     color: "from-pink-500 to-rose-500",
//   },
// ]

// export function TechStack() {
//   return (
//     <section
//       id="powered-by"
//       className="relative py-24 md:py-32 border-t border-border bg-[#060810]/40"
//     /* style={{ backgroundColor: '#060810' }} */
//     >
//       <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
//         {/* Section Header */}
//         <div className="text-center mb-16">
//           <h2 className="text-3xl sm:text-4xl font-bold text-[#f0f4ff]">
//             Powered by <span className="gradient-text">Modern Tech</span>
//           </h2>
//           <p className="mt-4 text-[#8892b0] max-w-xl mx-auto">
//             Built on battle-tested frameworks and cutting-edge web APIs for optimal performance.
//           </p>
//         </div>

//         {/* Tech Grid */}
//         <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
//           {technologies.map((tech) => (
//             <div
//               key={tech.name}
//               className="group rounded-xl p-4 text-center transition-all duration-300"
//               style={{
//                 background: 'rgba(255, 255, 255, 0.04)',
//                 backdropFilter: 'blur(20px)',
//                 border: '1px solid rgba(255, 255, 255, 0.08)'
//               }}
//             >
//               {/* Icon/Badge */}
//               <div className={`mx-auto mb-3 h-12 w-12 rounded-lg bg-gradient-to-br ${tech.color} flex items-center justify-center text-white font-bold text-lg`}>
//                 {tech.name.charAt(0)}
//               </div>

//               {/* Name */}
//               <h3 className="text-sm font-medium text-[#f0f4ff]">
//                 {tech.name}
//               </h3>

//               {/* Description */}
//               <p className="mt-1 text-xs text-[#8892b0]">
//                 {tech.description}
//               </p>
//             </div>
//           ))}
//         </div>

//         {/* Additional Info */}
//         <div className="mt-12 text-center">
//           <p className="text-sm text-[#8892b0]">
//             Open source and extensible — integrate with your existing ML pipeline
//           </p>
//         </div>
//       </div>
//     </section>
//   )
// }

"use client";

import { useEffect, useRef, useState } from "react";

const techStack = [
  { name: "TensorFlow.js", role: "ML in the browser", color: "#ff6f00", letter: "T" },
  { name: "WebGPU", role: "Native GPU access", color: "#7c3aed", letter: "W" },
  { name: "WebNN", role: "Neural network API", color: "#06b6d4", letter: "W" },
  { name: "React", role: "UI framework", color: "#61dafb", letter: "R" },
  { name: "Python", role: "Server backend", color: "#3776ab", letter: "P" },
  { name: "Flower", role: "Federated learning", color: "#10b981", letter: "F" },
];

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, inView };
}

export function TechStack() {
  const { ref, inView } = useInView(0.1);

  return (
    <section
      ref={ref}
      style={{
        padding: "clamp(60px, 8vw, 120px) clamp(16px, 4vw, 32px)",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div style={{
        textAlign: "center", marginBottom: "64px",
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(30px)",
        transition: "opacity 0.7s ease, transform 0.7s ease",
      }}>
        <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 700, color: "#f0f4ff", marginBottom: "16px" }}>
          Powered by{" "}
          <span style={{
            background: "linear-gradient(135deg, #a78bfa, #06b6d4)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}>
            Modern Tech
          </span>
        </h2>
        <p style={{ color: "#8892b0", fontSize: "16px", maxWidth: "500px", margin: "0 auto" }}>
          Built on battle-tested frameworks and cutting-edge web APIs for optimal performance.
        </p>
      </div>

      {/* Tech cards */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "16px",
        marginBottom: "40px",
      }}>
        {techStack.map((tech, i) => (
          <div
            key={tech.name}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "10px",
              padding: "24px 20px",
              minWidth: "120px",
              backgroundColor: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "16px",
              opacity: inView ? 1 : 0,
              transform: inView ? "translateY(0) scale(1)" : "translateY(24px) scale(0.95)",
              transition: `opacity 0.5s ease ${i * 0.07}s, transform 0.5s ease ${i * 0.07}s, border-color 0.2s, box-shadow 0.2s`,
              cursor: "default",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = `${tech.color}44`;
              el.style.boxShadow = `0 8px 24px ${tech.color}20`;
              el.style.transform = "translateY(-6px) scale(1.04)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = "rgba(255,255,255,0.08)";
              el.style.boxShadow = "none";
              el.style.transform = "translateY(0) scale(1)";
            }}
          >
            {/* Letter icon */}
            <div style={{
              width: "48px", height: "48px", borderRadius: "12px",
              backgroundColor: `${tech.color}22`,
              border: `1px solid ${tech.color}40`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "20px", fontWeight: 700, color: tech.color,
              fontFamily: "JetBrains Mono, monospace",
            }}>
              {tech.letter}
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#f0f4ff", fontSize: "13px", fontWeight: 600 }}>{tech.name}</div>
              <div style={{ color: "#6b7280", fontSize: "11px", marginTop: "2px" }}>{tech.role}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom note */}
      <div style={{
        textAlign: "center",
        opacity: inView ? 1 : 0,
        transition: "opacity 0.7s ease 0.6s",
      }}>
        <p style={{ color: "#4a5568", fontSize: "13px" }}>
          Open source and extensible — integrate with your existing ML pipeline
        </p>
      </div>
    </section>
  );
}