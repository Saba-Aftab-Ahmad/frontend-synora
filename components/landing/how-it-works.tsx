// import { Download, Cpu, Upload } from "lucide-react"

// const steps = [
//   {
//     step: 1,
//     icon: Download,
//     title: "Download Model",
//     description: "Server sends the latest model weights to your browser. No setup required — just open the page and start.",
//   },
//   {
//     step: 2,
//     icon: Cpu,
//     title: "Train Locally",
//     description: "TensorFlow.js trains on your local data using WebGPU acceleration. Your data never leaves your device.",
//   },
//   {
//     step: 3,
//     icon: Upload,
//     title: "Share Updates",
//     description: "Only model gradients are sent back to the server. Raw data remains private and secure on your machine.",
//   },
// ]

// export function HowItWorks() {
//   return (
//     <section
//       id="how-it-works"
//       className="relative py-24 md:py-32 bg-[#060810]/40"
//     /*style={{ backgroundColor: '#060810' }} */
//     >
//       <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
//         {/* Section Header */}
//         <div className="text-center mb-16">
//           <h2 className="text-3xl sm:text-4xl font-bold text-[#f0f4ff]">
//             How It <span className="gradient-text">Works</span>
//           </h2>
//           <p className="mt-4 text-[#8892b0] max-w-xl mx-auto">
//             A simple three-step process that keeps your data private while contributing to global AI research.
//           </p>
//         </div>

//         {/* Steps Grid */}
//         <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
//           {steps.map((item) => (
//             <div
//               key={item.step}
//               className="group rounded-2xl p-6 lg:p-8 transition-all duration-300"
//               style={{
//                 background: 'rgba(255, 255, 255, 0.04)',
//                 backdropFilter: 'blur(20px)',
//                 border: '1px solid rgba(255, 255, 255, 0.08)'
//               }}
//             >
//               {/* Step Number & Icon */}
//               <div className="flex items-center gap-4 mb-6">
//                 <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple/20 to-cyan/20 border border-purple/30">
//                   <item.icon className="h-6 w-6 text-cyan" />
//                 </div>
//                 <span className="text-xs font-medium text-purple uppercase tracking-wider">
//                   Step {item.step}
//                 </span>
//               </div>

//               {/* Content */}
//               <h3 className="text-xl font-semibold text-[#f0f4ff] mb-3">
//                 {item.title}
//               </h3>
//               <p className="text-[#8892b0] text-sm leading-relaxed">
//                 {item.description}
//               </p>

//               {/* Decorative Line */}
//               <div className="mt-6 h-[2px] w-12 bg-gradient-to-r from-purple to-cyan opacity-50 group-hover:w-full group-hover:opacity-100 transition-all duration-300" />
//             </div>
//           ))}
//         </div>

//         {/* Connection Lines (Desktop) */}
//         <div className="hidden md:flex justify-center mt-8 gap-8">
//           <div className="flex items-center gap-2 text-[#8892b0] text-xs">
//             <div className="h-px w-24 bg-gradient-to-r from-transparent via-purple/50 to-transparent" />
//             <span>Secure Transfer</span>
//             <div className="h-px w-24 bg-gradient-to-r from-transparent via-cyan/50 to-transparent" />
//           </div>
//         </div>
//       </div>
//     </section>
//   )
// }

"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Brain, Upload } from "lucide-react";

const steps = [
  {
    icon: Download,
    step: "STEP 1",
    title: "Download Model",
    description:
      "Server sends the latest model weights to your browser. No setup required — just open the page and start.",
    color: "#7c3aed",
  },
  {
    icon: Brain,
    step: "STEP 2",
    title: "Train Locally",
    description:
      "TensorFlow.js trains on your local data using WebGPU acceleration. Your data never leaves your device.",
    color: "#06b6d4",
  },
  {
    icon: Upload,
    step: "STEP 3",
    title: "Share Updates",
    description:
      "Only model gradients are sent back to the server. Raw data remains private and secure on your machine.",
    color: "#10b981",
  },
];

function useInView(threshold = 0.2) {
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

export function HowItWorks() {
  const { ref: sectionRef, inView } = useInView(0.1);

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      style={{
        padding: "clamp(60px, 8vw, 120px) clamp(16px, 4vw, 32px)",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          textAlign: "center",
          marginBottom: "64px",
          opacity: inView ? 1 : 0,
          transform: inView ? "translateY(0)" : "translateY(30px)",
          transition: "opacity 0.7s ease, transform 0.7s ease",
        }}
      >
        <h2
          style={{
            fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
            fontWeight: 700,
            color: "#f0f4ff",
            marginBottom: "16px",
          }}
        >
          How It{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #a78bfa, #06b6d4)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Works
          </span>
        </h2>
        <p style={{ color: "#8892b0", fontSize: "16px", maxWidth: "500px", margin: "0 auto" }}>
          A simple three-step process that keeps your data private while contributing to global AI research.
        </p>
      </div>

      {/* Steps */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
          gap: "24px",
        }}
      >
        {steps.map((step, i) => (
          <div
            key={step.title}
            style={{
              backgroundColor: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "20px",
              padding: "32px 28px",
              position: "relative",
              overflow: "hidden",
              opacity: inView ? 1 : 0,
              transform: inView ? "translateY(0) scale(1)" : "translateY(40px) scale(0.97)",
              transition: `opacity 0.6s ease ${i * 0.15}s, transform 0.6s ease ${i * 0.15}s`,
              cursor: "default",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = `${step.color}44`;
              el.style.transform = "translateY(-6px) scale(1.01)";
              el.style.boxShadow = `0 20px 40px ${step.color}20`;
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = "rgba(255,255,255,0.08)";
              el.style.transform = "translateY(0) scale(1)";
              el.style.boxShadow = "none";
            }}
          >
            {/* Top accent line */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: "2px",
              background: `linear-gradient(90deg, ${step.color}, transparent)`,
            }} />

            {/* Step label */}
            <div style={{
              fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em",
              color: step.color, marginBottom: "16px",
            }}>
              {step.step}
            </div>

            {/* Icon */}
            <div style={{
              width: "48px", height: "48px", borderRadius: "12px",
              backgroundColor: `${step.color}1a`,
              border: `1px solid ${step.color}33`,
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: "20px",
            }}>
              <step.icon style={{ width: "22px", height: "22px", color: step.color }} />
            </div>

            {/* Title */}
            <h3 style={{ color: "#f0f4ff", fontSize: "18px", fontWeight: 600, marginBottom: "12px" }}>
              {step.title}
            </h3>

            {/* Description */}
            <p style={{ color: "#8892b0", fontSize: "14px", lineHeight: 1.7 }}>
              {step.description}
            </p>

            {/* Bottom connector dot */}
            <div style={{
              position: "absolute", bottom: "20px", right: "20px",
              width: "6px", height: "6px", borderRadius: "50%",
              backgroundColor: step.color, opacity: 0.5,
            }} />
          </div>
        ))}
      </div>

      {/* Secure transfer label */}
      <div style={{
        textAlign: "center",
        marginTop: "40px",
        opacity: inView ? 1 : 0,
        transition: "opacity 0.7s ease 0.6s",
      }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: "8px",
          fontSize: "13px", color: "#4a5568",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          paddingTop: "20px",
        }}>
          <span style={{ width: "24px", height: "1px", backgroundColor: "#4a5568" }} />
          Secure Transfer — Only Gradients Leave Your Device
          <span style={{ width: "24px", height: "1px", backgroundColor: "#4a5568" }} />
        </span>
      </div>
    </section>
  );
}