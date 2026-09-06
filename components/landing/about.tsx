// import { ShieldCheck, Globe, Zap, Languages, RefreshCw, FlaskConical } from "lucide-react"

// // const features = [
// //   {
// //     icon: ShieldCheck,
// //     title: "Privacy Preserving",
// //     description: "Differential privacy and gradient encryption protect all participants"
// //   },
// //   {
// //     icon: Globe,
// //     title: "Browser Native",
// //     description: "No installation required. Runs entirely in modern web browsers"
// //   },
// //   {
// //     icon: Zap,
// //     title: "WebGPU Accelerated",
// //     description: "Hardware-accelerated training using WebGPU and WebNN APIs"
// //   },
// //   {
// //     icon: Languages,
// //     title: "Low-Resource NLP",
// //     description: "Specialized for Swahili, Yoruba, Hausa, Amharic and more"
// //   },
// //   {
// //     icon: RefreshCw,
// //     title: "Federated Aggregation",
// //     description: "FedAvg and FedProx aggregation strategies built-in"
// //   },
// //   {
// //     icon: FlaskConical,
// //     title: "Research Platform",
// //     description: "Export results, compare rounds, analyze convergence metrics"
// //   }
// // ]
// const features = [
//   {
//     icon: ShieldCheck,
//     title: "Privacy Preserving",
//     description: "Raw text never leaves the browser, only validated model weight tensors are transmitted"
//   },
//   {
//     icon: Globe,
//     title: "Browser Native",
//     description: "No installation required. Runs entirely in modern web browsers"
//   },
//   {
//     icon: Zap,
//     title: "Hardware Accelerated",
//     description: "Automatic detection and use of WebGPU or WebNN, with CPU fallback"
//   },
//   {
//     icon: Languages,
//     title: "Low-Resource NLP",
//     description: "Specialized for Kenyan languages: Dholuo, Kalenjin, and Kidaw'ida"
//   },
//   {
//     icon: RefreshCw,
//     title: "Federated Aggregation",
//     description: "FedAvg aggregation strategy on a custom coordination server"
//   },
//   {
//     icon: FlaskConical,
//     title: "Research Platform",
//     description: "Export results, compare rounds, analyze convergence metrics"
//   }
// ]

// export function About() {
//   return (
//     <section
//       id="about"
//       className="relative py-24 md:py-32 bg-[#060810]/40"
//     /* style={{ backgroundColor: '#060810' }} */
//     >
//       {/* Background Effect */}
//       <div className="absolute inset-0 overflow-hidden">
//         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple/10 rounded-full blur-[150px]" />
//       </div>

//       <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
//         {/* Section Header */}
//         <div className="text-center mb-16">
//           <h2 className="text-3xl sm:text-4xl font-bold text-[#f0f4ff]">
//             Built for <span
//               style={{
//                 background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
//                 WebkitBackgroundClip: 'text',
//                 WebkitTextFillColor: 'transparent',
//                 backgroundClip: 'text'
//               }}
//             >Privacy & Performance</span>
//           </h2>
//           <p className="mt-4 text-[#8892b0] max-w-xl mx-auto">
//             A comprehensive toolkit designed to make federated learning accessible to researchers and developers.
//           </p>
//         </div>

//         {/* 6 Cards Grid - 3x2 layout */}
//         <div
//           className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-16"
//           style={{ display: 'grid', gap: '24px' }}
//         >
//           {features.map((feature) => (
//             <div
//               key={feature.title}
//               className="rounded-2xl p-8 transition-all duration-300"
//               style={{
//                 background: 'rgba(255, 255, 255, 0.04)',
//                 backdropFilter: 'blur(20px)',
//                 border: '1px solid rgba(255, 255, 255, 0.08)',
//                 borderRadius: '16px',
//                 padding: '32px'
//               }}
//             >
//               <div
//                 className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl"
//                 style={{ background: 'rgba(124, 58, 237, 0.15)' }}
//               >
//                 <feature.icon className="h-6 w-6" style={{ color: '#a78bfa' }} />
//               </div>
//               <h3 className="text-xl font-semibold text-[#f0f4ff] mb-3">
//                 {feature.title}
//               </h3>
//               <p className="text-[#8892b0] text-sm leading-relaxed">
//                 {feature.description}
//               </p>
//             </div>
//           ))}
//         </div>

//         {/* Mission Statement Quote */}
//         <div className="text-center max-w-3xl mx-auto">
//           <blockquote
//             className="relative px-8 py-6 rounded-2xl"
//             style={{
//               background: 'rgba(255, 255, 255, 0.02)',
//               border: '1px solid rgba(255, 255, 255, 0.06)'
//             }}
//           >
//             <p className="text-lg md:text-xl italic text-[#f0f4ff]/90 leading-relaxed">
//               &ldquo;Empowering a more inclusive AI future by enabling privacy-preserving machine learning for underrepresented languages and communities worldwide.&rdquo;
//             </p>
//             <footer className="mt-4 text-sm text-[#8892b0]">
//               — The Synora Mission
//             </footer>
//           </blockquote>
//         </div>
//       </div>
//     </section>
//   )
// }

"use client";

import { useEffect, useRef, useState } from "react";
import { Shield, Globe, Zap, FlaskConical, RefreshCw, BarChart3 } from "lucide-react";

const features = [
  { icon: Shield, title: "Privacy Preserving", description: "Differential privacy and gradient encryption protect all participants.", color: "#7c3aed" },
  { icon: Globe, title: "Browser Native", description: "No installation required. Runs entirely in modern web browsers.", color: "#06b6d4" },
  { icon: Zap, title: "WebGPU Accelerated", description: "Hardware-accelerated training using WebGPU and WebNN APIs.", color: "#f59e0b" },
  { icon: FlaskConical, title: "Low-Resource NLP", description: "Specialized for Swahili, Dholuo, Kalenjin, Kidawida and more.", color: "#10b981" },
  { icon: RefreshCw, title: "Federated Aggregation", description: "FedAvg and FedProx aggregation strategies built-in.", color: "#a78bfa" },
  { icon: BarChart3, title: "Research Platform", description: "Export results, compare rounds, analyze convergence metrics.", color: "#06b6d4" },
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

export function About() {
  const { ref, inView } = useInView(0.1);

  return (
    <section
      ref={ref}
      style={{
        padding: "clamp(60px, 8vw, 120px) clamp(16px, 4vw, 32px)",
        background: "rgba(255,255,255,0.01)",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{
          textAlign: "center", marginBottom: "64px",
          opacity: inView ? 1 : 0,
          transform: inView ? "translateY(0)" : "translateY(30px)",
          transition: "opacity 0.7s ease, transform 0.7s ease",
        }}>
          <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 700, color: "#f0f4ff", marginBottom: "16px" }}>
            Built for{" "}
            <span style={{
              background: "linear-gradient(135deg, #a78bfa, #06b6d4)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>
              Privacy &amp; Performance
            </span>
          </h2>
          <p style={{ color: "#8892b0", fontSize: "16px", maxWidth: "500px", margin: "0 auto" }}>
            A comprehensive toolkit designed to make federated learning accessible to researchers and developers.
          </p>
        </div>

        {/* Feature grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
          gap: "20px",
          marginBottom: "60px",
        }}>
          {features.map((f, i) => (
            <div
              key={f.title}
              style={{
                backgroundColor: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "16px",
                padding: "24px",
                opacity: inView ? 1 : 0,
                transform: inView ? "translateY(0)" : "translateY(30px)",
                transition: `opacity 0.6s ease ${i * 0.08}s, transform 0.6s ease ${i * 0.08}s, border-color 0.2s, box-shadow 0.2s`,
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = `${f.color}33`;
                el.style.boxShadow = `0 8px 32px ${f.color}15`;
                el.style.transform = "translateY(-4px)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = "rgba(255,255,255,0.07)";
                el.style.boxShadow = "none";
                el.style.transform = "translateY(0)";
              }}
            >
              <div style={{
                width: "44px", height: "44px", borderRadius: "10px",
                backgroundColor: `${f.color}1a`, border: `1px solid ${f.color}30`,
                display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px",
              }}>
                <f.icon style={{ width: "20px", height: "20px", color: f.color }} />
              </div>
              <h3 style={{ color: "#f0f4ff", fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>{f.title}</h3>
              <p style={{ color: "#8892b0", fontSize: "14px", lineHeight: 1.6 }}>{f.description}</p>
            </div>
          ))}
        </div>

        {/* Mission quote */}
        <div style={{
          textAlign: "center", padding: "40px",
          backgroundColor: "rgba(124,58,237,0.06)",
          border: "1px solid rgba(124,58,237,0.15)",
          borderRadius: "20px",
          opacity: inView ? 1 : 0,
          transform: inView ? "scale(1)" : "scale(0.97)",
          transition: "opacity 0.7s ease 0.5s, transform 0.7s ease 0.5s",
        }}>
          <p style={{ color: "#c4b5fd", fontSize: "clamp(15px, 2vw, 18px)", fontStyle: "italic", lineHeight: 1.7, maxWidth: "700px", margin: "0 auto 16px" }}>
            &ldquo;Empowering a more inclusive AI future by enabling privacy-preserving machine learning for underrepresented languages and communities worldwide.&rdquo;
          </p>
          <p style={{ color: "#6b7280", fontSize: "13px", letterSpacing: "0.08em", fontWeight: 500 }}>
            — THE SYNORA MISSION
          </p>
        </div>
      </div>
    </section>
  );
}