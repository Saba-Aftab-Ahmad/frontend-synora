"use client"

import { useEffect, useRef } from "react"

type Vec3 = { x: number; y: number; z: number }

function toXYZ(latDeg: number, lonDeg: number): Vec3 {
  const lat = (latDeg * Math.PI) / 180
  const lon = (lonDeg * Math.PI) / 180
  return {
    x: Math.cos(lat) * Math.cos(lon),
    y: Math.sin(lat),
    z: Math.cos(lat) * Math.sin(lon),
  }
}

function rotateY(p: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c }
}

function rotateX(p: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c }
}

function slerp(a: Vec3, b: Vec3, t: number): Vec3 {
  const dot = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z))
  const theta = Math.acos(dot) * t
  let rx = b.x - a.x * dot
  let ry = b.y - a.y * dot
  let rz = b.z - a.z * dot
  const len = Math.sqrt(rx * rx + ry * ry + rz * rz) || 1
  rx /= len
  ry /= len
  rz /= len
  const s = Math.sin(theta)
  const c = Math.cos(theta)
  return { x: a.x * c + rx * s, y: a.y * c + ry * s, z: a.z * c + rz * s }
}

// Rough continent silhouettes approximated as overlapping ellipses in lat/lon
// space. Not geographically precise — a stylised, recognisable dot-matrix
// world map for a background animation.
type Blob = { lat: number; lon: number; rLat: number; rLon: number }
const CONTINENTS: Blob[] = [
  { lat: 45, lon: -100, rLat: 22, rLon: 32 },
  { lat: 62, lon: -110, rLat: 14, rLon: 26 },
  { lat: 68, lon: -45, rLat: 10, rLon: 16 },
  { lat: 18, lon: -90, rLat: 8, rLon: 7 },
  { lat: -8, lon: -60, rLat: 22, rLon: 14 },
  { lat: -35, lon: -66, rLat: 14, rLon: 9 },
  { lat: 15, lon: 20, rLat: 20, rLon: 22 },
  { lat: -15, lon: 22, rLat: 20, rLon: 16 },
  { lat: 52, lon: 15, rLat: 12, rLon: 20 },
  { lat: 55, lon: 90, rLat: 22, rLon: 50 },
  { lat: 25, lon: 78, rLat: 12, rLon: 14 },
  { lat: 8, lon: 105, rLat: 10, rLon: 14 },
  { lat: -25, lon: 134, rLat: 10, rLon: 15 },
]

function lonDelta(a: number, b: number) {
  let d = a - b
  while (d > 180) d -= 360
  while (d < -180) d += 360
  return d
}

function isLand(latDeg: number, lonDeg: number): boolean {
  for (const c of CONTINENTS) {
    const dLat = (latDeg - c.lat) / c.rLat
    const dLon = lonDelta(lonDeg, c.lon) / c.rLon
    if (dLat * dLat + dLon * dLon <= 1) return true
  }
  return false
}

type LandDot = { base: Vec3; size: number; phase: number; major: boolean }
type MeshEdge = { a: number; b: number }
type Arc = { a: Vec3; b: Vec3; height: number; period: number; offset: number }
type Star = { fx: number; fy: number; r: number; phase: number; warm: boolean }
type Ring = { tilt: number; radiusFactor: number; period: number; offset: number; color: "cyan" | "amber" }

/**
 * Animated hero background: a slowly rotating, Earth-like dotted globe with
 * warm "city light" nodes on its continents, a faint triangulated mesh
 * connecting nearby nodes, glowing data-transfer arcs sweeping between
 * distant points, and orbiting rings — evoking federated-learning clients
 * around the world exchanging model updates. Styled after night-earth /
 * global-network stock imagery (warm amber lights + cool blue network).
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

    // ---- Build land dots (dot-matrix continents / city lights) ----
    const landDots: LandDot[] = []
    const LAT_STEP = 3.4
    const LON_STEP = 4.6
    for (let lat = -88; lat <= 88; lat += LAT_STEP) {
      for (let lon = -180; lon <= 180; lon += LON_STEP) {
        if (isLand(lat, lon)) {
          const jLat = lat + (Math.random() - 0.5) * LAT_STEP * 0.6
          const jLon = lon + (Math.random() - 0.5) * LON_STEP * 0.6
          landDots.push({
            base: toXYZ(jLat, jLon),
            size: 0.5 + Math.random() * 0.7,
            phase: Math.random() * Math.PI * 2,
            major: Math.random() > 0.92,
          })
        }
      }
    }

    // ---- Triangulated mesh: connect each dot to its 2 nearest neighbours ----
    const meshEdges: MeshEdge[] = []
    {
      const K = 2
      const seen = new Set<string>()
      for (let i = 0; i < landDots.length; i++) {
        const dists: { j: number; d: number }[] = []
        for (let j = 0; j < landDots.length; j++) {
          if (i === j) continue
          const dx = landDots[i].base.x - landDots[j].base.x
          const dy = landDots[i].base.y - landDots[j].base.y
          const dz = landDots[i].base.z - landDots[j].base.z
          dists.push({ j, d: dx * dx + dy * dy + dz * dz })
        }
        dists.sort((a, b) => a.d - b.d)
        for (let k = 0; k < K && k < dists.length; k++) {
          const j = dists[k].j
          const key = i < j ? `${i}-${j}` : `${j}-${i}`
          if (!seen.has(key)) {
            seen.add(key)
            meshEdges.push({ a: i, b: j })
          }
        }
      }
    }

    // ---- Data-transfer arcs between distant random land points ----
    const ARC_COUNT = 9
    const arcs: Arc[] = []
    for (let i = 0; i < ARC_COUNT; i++) {
      const a = landDots[Math.floor(Math.random() * landDots.length)]
      const b = landDots[Math.floor(Math.random() * landDots.length)]
      arcs.push({
        a: a.base,
        b: b.base,
        height: 0.2 + Math.random() * 0.25,
        period: 2400 + Math.random() * 2600,
        offset: Math.random() * 1000,
      })
    }

    // ---- Static starfield ----
    const STAR_COUNT = 150
    const stars: Star[] = []
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        fx: Math.random(),
        fy: Math.random(),
        r: Math.random() * 1.1 + 0.3,
        phase: Math.random() * Math.PI * 2,
        warm: Math.random() > 0.85,
      })
    }

    // ---- Orbit rings ----
    const rings: Ring[] = [
      { tilt: 0.5, radiusFactor: 1.35, period: 8000, offset: 0, color: "cyan" },
      { tilt: -0.35, radiusFactor: 1.55, period: 11000, offset: 400, color: "amber" },
    ]

    function resize() {
      const rect = canvas!.getBoundingClientRect()
      width = rect.width
      height = rect.height
      canvas!.width = width * dpr
      canvas!.height = height * dpr
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    window.addEventListener("resize", resize)

    let angle = 0
    let raf = 0
    const AXIAL_TILT = (23.5 * Math.PI) / 180

    function project(p: Vec3, cx: number, cy: number, radius: number, focal: number) {
      let r = rotateY(p, angle)
      r = rotateX(r, AXIAL_TILT)
      const scale = focal / (focal + r.z * radius)
      return {
        sx: cx + r.x * radius * scale,
        sy: cy + r.y * radius * scale,
        z: r.z,
        depth: (r.z + 1) / 2,
      }
    }

    function draw(time: number) {
      if (!ctx) return
      ctx.clearRect(0, 0, width, height)

      const cx = width / 2
      const cy = height / 2
      const radius = Math.min(width, height) * 0.34
      const focal = radius * 3

      // Starfield (mostly cool white, a few warm embers)
      stars.forEach((s) => {
        const tw = 0.5 + 0.5 * Math.sin(time / 900 + s.phase)
        const color = s.warm ? "255, 190, 120" : "200, 210, 255"
        ctx.fillStyle = `rgba(${color}, ${0.15 + tw * 0.35})`
        ctx.beginPath()
        ctx.arc(s.fx * width, s.fy * height, s.r, 0, Math.PI * 2)
        ctx.fill()
      })

      // Soft atmospheric rim glow (cool blue) behind the globe
      const halo = ctx.createRadialGradient(cx, cy, radius * 0.6, cx, cy, radius * 1.7)
      halo.addColorStop(0, "rgba(56, 189, 248, 0.2)")
      halo.addColorStop(1, "rgba(56, 189, 248, 0)")
      ctx.fillStyle = halo
      ctx.beginPath()
      ctx.arc(cx, cy, radius * 1.7, 0, Math.PI * 2)
      ctx.fill()

      // Globe body with a warm directional "sunlit" highlight (top-left)
      const body = ctx.createRadialGradient(
        cx - radius * 0.4,
        cy - radius * 0.45,
        radius * 0.05,
        cx,
        cy,
        radius
      )
      body.addColorStop(0, "rgba(60, 55, 45, 0.55)")
      body.addColorStop(0.35, "rgba(18, 30, 48, 0.85)")
      body.addColorStop(0.7, "rgba(8, 16, 30, 0.92)")
      body.addColorStop(1, "rgba(3, 6, 14, 0.96)")
      ctx.fillStyle = body
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.fill()

      // Rim light (bright edge, like an eclipse-lit horizon)
      ctx.strokeStyle = "rgba(140, 200, 255, 0.4)"
      ctx.lineWidth = 1.3
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.stroke()

      // Orbit rings (independent of globe spin)
      const SEG = 72
      rings.forEach((ring) => {
        const rgb = ring.color === "cyan" ? [103, 232, 249] : [251, 191, 36]
        const rr = radius * ring.radiusFactor
        let prev: { sx: number; sy: number; occluded: boolean } | null = null
        for (let s = 0; s <= SEG; s++) {
          const a = (s / SEG) * Math.PI * 2
          let p: Vec3 = { x: Math.cos(a), y: 0, z: Math.sin(a) }
          p = rotateX(p, ring.tilt)
          const scale = focal / (focal + p.z * rr)
          const sx = cx + p.x * rr * scale
          const sy = cy + p.y * rr * scale
          const screenDist = Math.sqrt((sx - cx) ** 2 + (sy - cy) ** 2)
          const occluded = p.z < 0 && screenDist < radius * 0.98
          if (prev && !prev.occluded && !occluded) {
            ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.22)`
            ctx.lineWidth = 0.8
            ctx.beginPath()
            ctx.moveTo(prev.sx, prev.sy)
            ctx.lineTo(sx, sy)
            ctx.stroke()
          }
          prev = { sx, sy, occluded }
        }

        const t = ((time / ring.period + ring.offset / ring.period) % 1) * Math.PI * 2
        let sp: Vec3 = { x: Math.cos(t), y: 0, z: Math.sin(t) }
        sp = rotateX(sp, ring.tilt)
        const scale = focal / (focal + sp.z * rr)
        const sx = cx + sp.x * rr * scale
        const sy = cy + sp.y * rr * scale
        const screenDist = Math.sqrt((sx - cx) ** 2 + (sy - cy) ** 2)
        const occluded = sp.z < 0 && screenDist < radius * 0.98
        if (!occluded) {
          ctx.globalCompositeOperation = "lighter"
          const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 6)
          glow.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.9)`)
          glow.addColorStop(1, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`)
          ctx.fillStyle = glow
          ctx.beginPath()
          ctx.arc(sx, sy, 6, 0, Math.PI * 2)
          ctx.fill()
          ctx.globalCompositeOperation = "source-over"
        }
      })

      // Project all land dots once per frame (reused by mesh + dots)
      const projected = landDots.map((d) => project(d.base, cx, cy, radius, focal))

      // Visible triangulated mesh (like a network overlay across the continents)
      meshEdges.forEach((e) => {
        const pa = projected[e.a]
        const pb = projected[e.b]
        if (pa.depth < 0.48 || pb.depth < 0.48) return
        const avg = (pa.depth + pb.depth) / 2
        ctx.strokeStyle = `rgba(200, 225, 255, ${0.08 + avg * 0.22})`
        ctx.lineWidth = 0.7
        ctx.beginPath()
        ctx.moveTo(pa.sx, pa.sy)
        ctx.lineTo(pb.sx, pb.sy)
        ctx.stroke()
      })

      // Land dots — warm amber "city lights", front hemisphere only
      ctx.globalCompositeOperation = "lighter"
      landDots.forEach((d, i) => {
        const p = projected[i]
        if (p.depth < 0.5) return
        const fade = Math.min(1, (p.depth - 0.5) / 0.15)
        const pulse = 0.6 + 0.4 * Math.sin(time / 1400 + d.phase)
        const alpha = fade * (0.4 + pulse * 0.35)
        const size = (d.major ? d.size * 1.9 : d.size) * (0.7 + p.depth * 0.5)
        const rgb = d.major ? "255, 200, 120" : "255, 170, 90"
        ctx.fillStyle = `rgba(${rgb}, ${alpha})`
        ctx.beginPath()
        ctx.arc(p.sx, p.sy, size, 0, Math.PI * 2)
        ctx.fill()
      })

      // Data-transfer arcs — cool blue sweeping curves with a traveling pulse
      arcs.forEach((arc) => {
        const rgb = [103, 200, 255]
        const STEPS = 24
        let prev: { sx: number; sy: number; depth: number } | null = null
        let visibleCount = 0
        for (let s = 0; s <= STEPS; s++) {
          const t = s / STEPS
          const mid = slerp(arc.a, arc.b, t)
          const elev = 1 + arc.height * Math.sin(Math.PI * t)
          const p = project(
            { x: mid.x * elev, y: mid.y * elev, z: mid.z * elev },
            cx,
            cy,
            radius,
            focal
          )
          if (prev && p.depth > 0.42 && prev.depth > 0.42) {
            const avg = (p.depth + prev.depth) / 2
            visibleCount++
            ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${0.2 + avg * 0.45})`
            ctx.lineWidth = 1.4
            ctx.beginPath()
            ctx.moveTo(prev.sx, prev.sy)
            ctx.lineTo(p.sx, p.sy)
            ctx.stroke()
          }
          prev = { sx: p.sx, sy: p.sy, depth: p.depth }
        }

        if (visibleCount > 0) {
          const t = ((time + arc.offset) % arc.period) / arc.period
          const mid = slerp(arc.a, arc.b, t)
          const elev = 1 + arc.height * Math.sin(Math.PI * t)
          const pp = project(
            { x: mid.x * elev, y: mid.y * elev, z: mid.z * elev },
            cx,
            cy,
            radius,
            focal
          )
          if (pp.depth > 0.42) {
            const pulseAlpha = Math.sin(t * Math.PI) * (0.6 + pp.depth * 0.4)
            const glow = ctx.createRadialGradient(pp.sx, pp.sy, 0, pp.sx, pp.sy, 6)
            glow.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${pulseAlpha})`)
            glow.addColorStop(1, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`)
            ctx.fillStyle = glow
            ctx.beginPath()
            ctx.arc(pp.sx, pp.sy, 6, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      })
      ctx.globalCompositeOperation = "source-over"

      angle += 0.0026
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
