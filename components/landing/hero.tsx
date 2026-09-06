// import { ArrowRight, Shield, Cpu, Globe, FlaskConical } from "lucide-react"
// import Link from "next/link"

// const badges = [
//   { icon: Shield, label: "No Raw Data Transmitted" },
//   { icon: Cpu, label: "WebGPU Accelerated" },
//   { icon: Globe, label: "Low-Resource Languages" },
//   { icon: FlaskConical, label: "Research Grade Privacy" },
// ]

// export function Hero() {
//   return (
//     <section 
//       className="relative pt-16 overflow-hidden"
//       style={{
//         background: 'transparent',
//         backgroundImage: `
//           radial-gradient(ellipse 80% 50% at 50% -10%, 
//             rgba(124, 58, 237, 0.25) 0%, 
//             transparent 60%),
//           radial-gradient(ellipse 60% 40% at 80% 50%, 
//             rgba(6, 182, 212, 0.08) 0%, 
//             transparent 50%)
//         `,
//         minHeight: '100vh',
//         display: 'flex',
//         flexDirection: 'column' as const,
//         alignItems: 'center',
//         justifyContent: 'center'
//       }}
//     >
//       <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 md:py-32">
//         <div className="text-center">
//           {/* Main Headline */}
//           <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-balance">
//             <span 
//               style={{
//                 background: 'linear-gradient(135deg, #f0f4ff, #a78bfa, #67e8f9)',
//                 WebkitBackgroundClip: 'text',
//                 WebkitTextFillColor: 'transparent',
//                 backgroundClip: 'text'
//               }}
//             >Federated AI Training In Your Browser</span>
//           </h1>

//           {/* Subtitle */}
//           <p className="mt-6 text-lg sm:text-xl text-[#8892b0] max-w-2xl mx-auto text-pretty">
//             Privacy-preserving natural language processing for low-resource languages. 
//             Train AI models locally with WebGPU acceleration while keeping your data secure.
//           </p>

//           {/* CTA Buttons */}
//           <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
//             <Link
//               href="/training"
//               className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-white cursor-pointer transition-all duration-300"
//               style={{
//                 background: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)',
//                 border: 'none',
//                 boxShadow: '0 4px 24px rgba(124, 58, 237, 0.4)'
//               }}
//             >
//               Start Training
//               <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
//             </Link>
//             <Link
//               href="#how-it-works"
//               className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold cursor-pointer transition-all duration-300"
//               style={{
//                 background: 'transparent',
//                 border: '1px solid #7c3aed',
//                 color: '#a78bfa'
//               }}
//             >
//               View Architecture
//             </Link>
//           </div>

//           {/* Badge Stats */}
//           <div className="mt-16 flex flex-wrap items-center justify-center gap-4 md:gap-6">
//             {badges.map((badge) => (
//               <div
//                 key={badge.label}
//                 className="rounded-full px-4 py-2 flex items-center gap-2"
//                 style={{
//                   background: 'rgba(255, 255, 255, 0.04)',
//                   backdropFilter: 'blur(20px)',
//                   border: '1px solid rgba(255, 255, 255, 0.08)'
//                 }}
//               >
//                 <badge.icon className="h-4 w-4 text-cyan" />
//                 <span className="text-xs sm:text-sm text-[#8892b0]">{badge.label}</span>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>
//     </section>
//   )
// }

"use client";

import { ArrowRight, Shield, Cpu, Globe, FlaskConical } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const badges = [
  { icon: Shield, label: "No Raw Data Transmitted" },
  { icon: Cpu, label: "WebGPU Accelerated" },
  { icon: Globe, label: "Low-Resource Languages" },
  { icon: FlaskConical, label: "Research Grade Privacy" },
];

export function Hero() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger animations after mount
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <section
      style={{
        background: "transparent",
        backgroundImage: `
          radial-gradient(ellipse 80% 50% at 50% -10%,
            rgba(124, 58, 237, 0.25) 0%,
            transparent 60%),
          radial-gradient(ellipse 60% 40% at 80% 50%,
            rgba(6, 182, 212, 0.08) 0%,
            transparent 50%)
        `,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        paddingTop: "64px",
      }}
    >
      <div
        style={{
          position: "relative",
          zIndex: 10,
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "clamp(24px, 5vw, 96px) clamp(16px, 4vw, 32px)",
          textAlign: "center",
        }}
      >
        {/* Badge pill — fade in first */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "rgba(124,58,237,0.15)",
            border: "1px solid rgba(124,58,237,0.3)",
            borderRadius: "999px",
            padding: "6px 16px",
            marginBottom: "32px",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(-12px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: "#10b981",
              animation: "pulse 2s infinite",
            }}
          />
          <span style={{ color: "#a78bfa", fontSize: "13px", fontWeight: 500 }}>
            Browser-Native Federated Learning
          </span>
        </div>

        {/* Main headline — slide up */}
        <h1
          style={{
            fontSize: "clamp(2.2rem, 6vw, 4.5rem)",
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            marginBottom: "24px",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(30px)",
            transition: "opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s",
          }}
        >
          <span
            style={{
              background: "linear-gradient(135deg, #f0f4ff 0%, #a78bfa 50%, #67e8f9 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Federated AI Training
          </span>
          <br />
          <span
            style={{
              background: "linear-gradient(135deg, #a78bfa 0%, #67e8f9 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            In Your Browser
          </span>
        </h1>

        {/* Subtitle — slide up delayed */}
        <p
          style={{
            fontSize: "clamp(1rem, 2vw, 1.25rem)",
            color: "#8892b0",
            maxWidth: "600px",
            margin: "0 auto 40px",
            lineHeight: 1.7,
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.7s ease 0.2s, transform 0.7s ease 0.2s",
          }}
        >
          Privacy-preserving natural language processing for low-resource languages.
          Train AI models locally with WebGPU acceleration while keeping your data secure.
        </p>

        {/* CTA Buttons */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            marginBottom: "64px",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.7s ease 0.3s, transform 0.7s ease 0.3s",
          }}
        >
          <Link
            href="/training"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "14px 28px",
              borderRadius: "12px",
              fontWeight: 600,
              fontSize: "15px",
              color: "#fff",
              background: "linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)",
              border: "none",
              boxShadow: "0 4px 24px rgba(124, 58, 237, 0.4)",
              textDecoration: "none",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "scale(1.05)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px rgba(124,58,237,0.6)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "scale(1)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 24px rgba(124,58,237,0.4)";
            }}
          >
            Start Training
            <ArrowRight style={{ width: "16px", height: "16px" }} />
          </Link>

          <Link
            href="#how-it-works"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "14px 28px",
              borderRadius: "12px",
              fontWeight: 600,
              fontSize: "15px",
              color: "#a78bfa",
              background: "transparent",
              border: "1px solid rgba(124,58,237,0.5)",
              textDecoration: "none",
              transition: "transform 0.2s ease, background 0.2s ease, border-color 0.2s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "scale(1.05)";
              (e.currentTarget as HTMLElement).style.background = "rgba(124,58,237,0.1)";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(124,58,237,0.8)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "scale(1)";
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(124,58,237,0.5)";
            }}
          >
            View Architecture
          </Link>
        </div>

        {/* Badges — staggered fade in */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
          }}
        >
          {badges.map((badge, i) => (
            <div
              key={badge.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                borderRadius: "999px",
                padding: "8px 16px",
                background: "rgba(255,255,255,0.04)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.08)",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0) scale(1)" : "translateY(16px) scale(0.95)",
                transition: `opacity 0.5s ease ${0.4 + i * 0.1}s, transform 0.5s ease ${0.4 + i * 0.1}s`,
                cursor: "default",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(124,58,237,0.4)";
                (e.currentTarget as HTMLElement).style.background = "rgba(124,58,237,0.08)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
              }}
            >
              <badge.icon style={{ width: "14px", height: "14px", color: "#06b6d4" }} />
              <span style={{ fontSize: "13px", color: "#8892b0" }}>{badge.label}</span>
            </div>
          ))}
        </div>

        {/* Floating stat cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "16px",
            maxWidth: "700px",
            margin: "64px auto 0",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.7s ease 0.8s, transform 0.7s ease 0.8s",
          }}
        >
          {[
            { value: "100%", label: "Privacy Preserved", color: "#10b981" },
            { value: "3", label: "Kenyan Languages", color: "#a78bfa" },
            { value: "WebGPU", label: "Accelerated", color: "#06b6d4" },
            { value: "0 KB", label: "Raw Data Sent", color: "#f59e0b" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                backgroundColor: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "16px",
                padding: "20px 16px",
                textAlign: "center",
                transition: "transform 0.2s ease, border-color 0.2s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
                (e.currentTarget as HTMLElement).style.borderColor = `${stat.color}44`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
              }}
            >
              <div style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 700, color: stat.color, marginBottom: "6px" }}>
                {stat.value}
              </div>
              <div style={{ fontSize: "12px", color: "#8892b0" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Animated gradient orbs in background */}
      <div style={{
        position: "absolute", top: "20%", left: "10%",
        width: "300px", height: "300px",
        background: "radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)",
        borderRadius: "50%", pointerEvents: "none",
        animation: "floatOrb1 8s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute", bottom: "20%", right: "10%",
        width: "250px", height: "250px",
        background: "radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)",
        borderRadius: "50%", pointerEvents: "none",
        animation: "floatOrb2 10s ease-in-out infinite",
      }} />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
        @keyframes floatOrb1 {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(30px, -20px); }
          66% { transform: translate(-20px, 15px); }
        }
        @keyframes floatOrb2 {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(-25px, 20px); }
          66% { transform: translate(20px, -15px); }
        }
      `}</style>
    </section>
  );
}