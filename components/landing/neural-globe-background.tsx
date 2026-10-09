"use client"

import { useEffect, useRef } from "react"

type Node = { x: number; y: number; vx: number; vy: number; r: number; phase: number; major: boolean; depth: number }
type ClusterDot = { ox: number; oy: number; r: number; phase: number }
type Cluster = { cx: number; dots: ClusterDot[] }
type Star = { x: number; y: number; r: number; phase: number }
type Edge = { a: number; b: number }

function makeRng(seed: number) {
  let s = seed
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Close-horizon "plexus earth" background: a huge sphere positioned mostly
 * below the frame so only its glowing horizon arc is visible near the top,
 * a dense triangulated plexus/network mesh scattered across the whole frame
 * (both in "space" and over the "surface") with depth-based layering, warm
 * amber city-light clusters shaped like coastlines along the visible land
 * band, and a bright atmospheric rim glow.
 *
 * Pure canvas + requestAnimationFrame, no external deps. Respects
 * prefers-reduced-motion by rendering a single static frame.
 */
export function NeuralGlobeBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    let width = 0
    let height = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    // ── Scene state (rebuilt on resize) ──────────────────────────────
    let horizonRadius = 0
    let horizonCenterXBase = 0
    let horizonCenterY = 0
    let nodes: Node[] = []
    let clusters: Cluster[] = []
    let stars: Star[] = []
    let edges: Edge[] = []
    let edgeTick = 0

    function horizonYAt(x: number, centerX: number) {
      const dx = x - centerX
      const inside = horizonRadius * horizonRadius - dx * dx
      if (inside < 0) return height * 2
      return horizonCenterY - Math.sqrt(inside)
    }

    function buildScene() {
      const rng = makeRng(42)

      horizonRadius = height * 2.1
      horizonCenterXBase = width * 0.5
      horizonCenterY = height * 0.22 + horizonRadius

      // Capped so large/4K screens don't pay an unbounded perf cost —
      // visual density doesn't need to keep scaling with area forever.
      const NODE_COUNT = Math.min(700, Math.round((width * height) / 750))
      nodes = []
      for (let i = 0; i < NODE_COUNT; i++) {
        nodes.push({
          x: rng() * width,
          y: rng() * height,
          vx: (rng() - 0.5) * 0.22,
          vy: (rng() - 0.5) * 0.14,
          r: 0.5 + rng() * 1.1,
          phase: rng() * Math.PI * 2,
          major: rng() > 0.94,
          depth: rng(), // 0 = far/dim, 1 = near/bright — gives layered depth
        })
      }

      // Warm city-light clusters shaped like short coastline traces (a
      // random-walk path with dots scattered along its width) rather than
      // plain round blobs.
      const CLUSTER_COUNT = 6
      clusters = []
      for (let i = 0; i < CLUSTER_COUNT; i++) {
        const startX = ((i + 0.5) / CLUSTER_COUNT) * width + (rng() - 0.5) * width * 0.06
        const pathLen = 5 + Math.floor(rng() * 4)
        const pathPoints: { x: number; y: number }[] = []
        let px = startX
        let py = 0
        for (let p = 0; p < pathLen; p++) {
          pathPoints.push({ x: px, y: py })
          px += (rng() - 0.5) * width * 0.05
          py += rng() * height * 0.015 + 2
        }
        const dots: ClusterDot[] = []
        pathPoints.forEach((pt) => {
          const dotCount = 8 + Math.floor(rng() * 10)
          for (let d = 0; d < dotCount; d++) {
            dots.push({
              ox: pt.x - startX + (rng() - 0.5) * width * 0.035,
              oy: pt.y + (rng() - 0.5) * height * 0.012,
              r: 0.5 + rng() * 1.1,
              phase: rng() * Math.PI * 2,
            })
          }
        })
        clusters.push({ cx: startX, dots })
      }

      const STAR_COUNT = 160
      stars = []
      for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({ x: rng() * width, y: rng() * height, r: rng() * 1.1 + 0.3, phase: rng() * Math.PI * 2 })
      }

      edges = []
      edgeTick = 0
    }

    function nearestNeighborEdges(k: number): Edge[] {
      const result: Edge[] = []
      const seen = new Set<string>()
      for (let i = 0; i < nodes.length; i++) {
        const dists: { j: number; d: number }[] = []
        for (let j = 0; j < nodes.length; j++) {
          if (i === j) continue
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const d = dx * dx + dy * dy
          if (d < 9000) dists.push({ j, d }) // short reach = fine triangulated web
        }
        dists.sort((a, b) => a.d - b.d)
        for (let n = 0; n < k && n < dists.length; n++) {
          const j = dists[n].j
          const key = i < j ? `${i}-${j}` : `${j}-${i}`
          if (!seen.has(key)) {
            seen.add(key)
            result.push({ a: i, b: j })
          }
        }
      }
      return result
    }

    function resize() {
      const rect = canvas!.getBoundingClientRect()
      width = rect.width
      height = rect.height
      canvas!.width = width * dpr
      canvas!.height = height * dpr
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      buildScene()
    }

    resize()
    window.addEventListener("resize", resize)

    let raf = 0
    let rotationOffset = 0

    function draw(time: number) {
      if (!ctx) return

      const centerX = horizonCenterXBase + Math.sin(time / 26000) * width * 0.03

      // Persistent rotation offset — advances every frame, driving both the
      // city-light clusters and the surface-linked mesh nodes so the whole
      // "surface" visibly rotates together, like the planet turning beneath us.
      const ROTATION_PER_FRAME = 0.35
      rotationOffset += ROTATION_PER_FRAME

      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = "#020308"
      ctx.fillRect(0, 0, width, height)

      // Drift nodes, wrapping at edges. Nodes currently over the "surface"
      // (below the horizon line) also rotate with the planet; nodes in
      // "space" only get their own independent drift.
      nodes.forEach((n) => {
        const onSurface = n.y > horizonYAt(n.x, centerX)
        n.x += n.vx + (onSurface ? ROTATION_PER_FRAME : 0)
        n.y += n.vy
        if (n.x < -20) n.x = width + 20
        if (n.x > width + 20) n.x = -20
        if (n.y < -20) n.y = height + 20
        if (n.y > height + 20) n.y = -20
      })

      // Starfield (space above the horizon only).
      stars.forEach((s) => {
        const hy = horizonYAt(s.x, centerX)
        if (s.y > hy) return
        const tw = 0.5 + 0.5 * Math.sin(time / 900 + s.phase)
        ctx.fillStyle = `rgba(200, 215, 255, ${0.15 + tw * 0.35})`
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fill()
      })

      // Landmass fill below the horizon line.
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(0, height)
      for (let x = 0; x <= width; x += 8) ctx.lineTo(x, horizonYAt(x, centerX))
      ctx.lineTo(width, height)
      ctx.closePath()
      const landGrad = ctx.createLinearGradient(0, horizonCenterY - horizonRadius, 0, height)
      landGrad.addColorStop(0, "rgba(20, 35, 60, 0.95)")
      landGrad.addColorStop(0.15, "rgba(8, 16, 32, 0.97)")
      landGrad.addColorStop(1, "rgba(2, 4, 10, 1)")
      ctx.fillStyle = landGrad
      ctx.fill()
      ctx.restore()

      // Atmospheric rim glow.
      const glow = ctx.createRadialGradient(
        centerX, horizonCenterY, horizonRadius * 0.985,
        centerX, horizonCenterY, horizonRadius * 1.05
      )
      glow.addColorStop(0, "rgba(120, 190, 255, 0)")
      glow.addColorStop(0.5, "rgba(140, 200, 255, 0.55)")
      glow.addColorStop(1, "rgba(140, 200, 255, 0)")
      ctx.save()
      ctx.globalCompositeOperation = "lighter"
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(centerX, horizonCenterY, horizonRadius * 1.05, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // Crisp horizon line.
      ctx.beginPath()
      ctx.moveTo(0, horizonYAt(0, centerX))
      for (let x = 0; x <= width; x += 4) ctx.lineTo(x, horizonYAt(x, centerX))
      ctx.strokeStyle = "rgba(200, 225, 255, 0.9)"
      ctx.lineWidth = 1.4
      ctx.stroke()

      // Warm city-light clusters — these scroll continuously to simulate
      // the planet's rotation, wrapping seamlessly at the edges.
      ctx.save()
      ctx.globalCompositeOperation = "lighter"
      clusters.forEach((c) => {
        const baseCx = ((c.cx - rotationOffset) % width + width) % width
        ;[baseCx - width, baseCx, baseCx + width].forEach((cx) => {
          if (cx < -width * 0.15 || cx > width * 1.15) return
          const baseY = horizonYAt(cx, centerX)
          c.dots.forEach((d) => {
            const px = cx + d.ox
            const py = baseY + d.oy
            const pulse = 0.6 + 0.4 * Math.sin(time / 1500 + d.phase)
            const alpha = 0.35 + pulse * 0.35
            ctx.fillStyle = `rgba(255, 175, 90, ${alpha})`
            ctx.beginPath()
            ctx.arc(px, py, d.r, 0, Math.PI * 2)
            ctx.fill()
          })
        })
      })
      ctx.restore()

      // Plexus mesh (recompute neighbor edges periodically, not every frame).
      if (edgeTick <= 0) {
        edges = nearestNeighborEdges(3)
        edgeTick = 30
      }
      edgeTick -= 1

      edges.forEach((e) => {
        const a = nodes[e.a]
        const b = nodes[e.b]
        const dx = a.x - b.x
        const dy = a.y - b.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const avgDepth = (a.depth + b.depth) / 2
        const alpha = Math.max(0, 0.55 - dist / 140) * (0.5 + avgDepth * 0.5)
        if (alpha <= 0) return
        ctx.strokeStyle = `rgba(150, 200, 255, ${alpha})`
        ctx.lineWidth = 0.5
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
      })

      // Plexus nodes — depth controls both brightness and size for a
      // layered, "some closer, some further away" feel.
      ctx.save()
      ctx.globalCompositeOperation = "lighter"
      nodes.forEach((n) => {
        const pulse = 0.5 + 0.5 * Math.sin(time / 1200 + n.phase)
        const size = (n.major ? n.r * 2 : n.r) * (0.6 + n.depth * 0.7) * (0.85 + pulse * 0.3)
        const alpha = (0.35 + n.depth * 0.5) * (0.8 + pulse * 0.3)
        ctx.fillStyle = `rgba(210, 230, 255, ${alpha})`
        ctx.beginPath()
        ctx.arc(n.x, n.y, size, 0, Math.PI * 2)
        ctx.fill()
      })
      ctx.restore()
    }

    if (prefersReducedMotion) {
      draw(0)
    } else {
      const loop = (time: number) => {
        draw(time)
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
    }

    return () => {
      window.removeEventListener("resize", resize)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
}