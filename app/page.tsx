import { Navbar } from "@/components/landing/navbar"
import { Hero } from "@/components/landing/hero"
import { HowItWorks } from "@/components/landing/how-it-works"
import { About } from "@/components/landing/about"
import { TechStack } from "@/components/landing/tech-stack"
import { Footer } from "@/components/landing/footer"
import { NeuralGlobeBackground } from "@/components/landing/neural-globe-background"

export default function Home() {
  return (
    <div className="relative min-h-screen bg-[#060810]" style={{ backgroundColor: '#060810' }}>
      {/* Fixed animated globe — stays visible behind every section while scrolling */}
      <div className="fixed inset-0 z-0 opacity-60 pointer-events-none">
        <NeuralGlobeBackground />
      </div>

      <main className="relative z-10">
        <Navbar />
        <Hero />
        <HowItWorks />
        <About />
        <TechStack />
        <Footer />
      </main>
    </div>
  )
}
