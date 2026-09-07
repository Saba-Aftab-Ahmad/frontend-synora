// "use client"

// import { useEffect, useRef } from "react"

// type Vec3 = { x: number; y: number; z: number }

// function toXYZ(latDeg: number, lonDeg: number): Vec3 {
//   const lat = (latDeg * Math.PI) / 180
//   const lon = (lonDeg * Math.PI) / 180
//   return {
//     x: Math.cos(lat) * Math.cos(lon),
//     y: Math.sin(lat),
//     z: Math.cos(lat) * Math.sin(lon),
//   }
// }

// function rotateY(p: Vec3, angle: number): Vec3 {
//   const c = Math.cos(angle)
//   const s = Math.sin(angle)
//   return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c }
// }

// function rotateX(p: Vec3, angle: number): Vec3 {
//   const c = Math.cos(angle)
//   const s = Math.sin(angle)
//   return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c }
// }

// // Rough continent silhouettes approximated as overlapping ellipses in lat/lon
// // space. Not geographically precise — a stylised, recognisable dot-matrix
// // world map for a background animation.
// type Blob = { lat: number; lon: number; rLat: number; rLon: number }
// const CONTINENTS: Blob[] = [
//   { lat: 45, lon: -100, rLat: 22, rLon: 32 },
//   { lat: 62, lon: -110, rLat: 14, rLon: 26 },
//   { lat: 68, lon: -45, rLat: 10, rLon: 16 },
//   { lat: 18, lon: -90, rLat: 8, rLon: 7 },
//   { lat: -8, lon: -60, rLat: 22, rLon: 14 },
//   { lat: -35, lon: -66, rLat: 14, rLon: 9 },
//   { lat: 15, lon: 20, rLat: 20, rLon: 22 },
//   { lat: -15, lon: 22, rLat: 20, rLon: 16 },
//   { lat: 52, lon: 15, rLat: 12, rLon: 20 },
//   { lat: 55, lon: 90, rLat: 22, rLon: 50 },
//   { lat: 25, lon: 78, rLat: 12, rLon: 14 },
//   { lat: 8, lon: 105, rLat: 10, rLon: 14 },
//   { lat: -25, lon: 134, rLat: 10, rLon: 15 },
// ]

// function lonDelta(a: number, b: number) {
//   let d = a - b
//   while (d > 180) d -= 360
//   while (d < -180) d += 360
//   return d
// }

// function isLand(latDeg: number, lonDeg: number): boolean {
//   for (const c of CONTINENTS) {
//     const dLat = (latDeg - c.lat) / c.rLat
//     const dLon = lonDelta(lonDeg, c.lon) / c.rLon
//     if (dLat * dLat + dLon * dLon <= 1) return true
//   }
//   return false
// }

// type LandDot = { base: Vec3; size: number; phase: number; major: boolean }
// type MeshEdge = { a: number; b: number }
// type SurfaceOrbit = { tilt: number; spin: number; radiusFactor: number; period: number; offset: number; color: "cyan" | "purple" }
// type Star = { fx: number; fy: number; r: number; phase: number; warm: boolean }
// type Ring = { tilt: number; radiusFactor: number; period: number; offset: number; color: "cyan" | "amber" }

// /**
//  * Animated hero background: a slowly rotating, Earth-like dotted globe with
//  * warm "city light" nodes on its continents, a faint triangulated mesh
//  * connecting nearby nodes, glowing "neuron" pulses traveling around perfectly
//  * circular surface orbits, and orbiting rings — evoking federated-learning
//  * clients around the world exchanging model updates. Styled after night-earth
//  * / global-network stock imagery (warm amber lights + cool blue network).
//  *
//  * Pure canvas + requestAnimationFrame, no external deps. Respects
//  * prefers-reduced-motion by rendering a single static frame.
//  */
// export function NeuralGlobeBackground() {
//   const canvasRef = useRef<HTMLCanvasElement | null>(null)

//   useEffect(() => {
//     const canvas = canvasRef.current
//     if (!canvas) return
//     const ctx = canvas.getContext("2d")
//     if (!ctx) return

//     const prefersReducedMotion =
//       typeof window !== "undefined" &&
//       window.matchMedia("(prefers-reduced-motion: reduce)").matches

//     let width = 0
//     let height = 0
//     const dpr = Math.min(window.devicePixelRatio || 1, 2)

//     // ---- Build land dots (dot-matrix continents / city lights) ----
//     const landDots: LandDot[] = []
//     const LAT_STEP = 3.4
//     const LON_STEP = 4.6
//     for (let lat = -88; lat <= 88; lat += LAT_STEP) {
//       for (let lon = -180; lon <= 180; lon += LON_STEP) {
//         if (isLand(lat, lon)) {
//           const jLat = lat + (Math.random() - 0.5) * LAT_STEP * 0.6
//           const jLon = lon + (Math.random() - 0.5) * LON_STEP * 0.6
//           landDots.push({
//             base: toXYZ(jLat, jLon),
//             size: 0.5 + Math.random() * 0.7,
//             phase: Math.random() * Math.PI * 2,
//             major: Math.random() > 0.92,
//           })
//         }
//       }
//     }

//     // ---- Triangulated mesh: connect each dot to its 2 nearest neighbours ----
//     const meshEdges: MeshEdge[] = []
//     {
//       const K = 2
//       const seen = new Set<string>()
//       for (let i = 0; i < landDots.length; i++) {
//         const dists: { j: number; d: number }[] = []
//         for (let j = 0; j < landDots.length; j++) {
//           if (i === j) continue
//           const dx = landDots[i].base.x - landDots[j].base.x
//           const dy = landDots[i].base.y - landDots[j].base.y
//           const dz = landDots[i].base.z - landDots[j].base.z
//           dists.push({ j, d: dx * dx + dy * dy + dz * dz })
//         }
//         dists.sort((a, b) => a.d - b.d)
//         for (let k = 0; k < K && k < dists.length; k++) {
//           const j = dists[k].j
//           const key = i < j ? `${i}-${j}` : `${j}-${i}`
//           if (!seen.has(key)) {
//             seen.add(key)
//             meshEdges.push({ a: i, b: j })
//           }
//         }
//       }
//     }

//     // ---- Surface orbit loops — perfectly circular, symmetric "neuron" paths
//     // that hug the globe surface (replaces the old random point-to-point
//     // arcs). No static guide-line is drawn — the circle is shown purely by
//     // the synchronized motion of evenly-spaced traveling pulses, never random.
//     const surfaceOrbits: SurfaceOrbit[] = [
//       { tilt: 0.9, spin: 0, radiusFactor: 1.02, period: 5200, offset: 0, color: "cyan" },
//       { tilt: 0.9, spin: (2 * Math.PI) / 3, radiusFactor: 1.02, period: 5200, offset: 1733, color: "purple" },
//       { tilt: 0.9, spin: (4 * Math.PI) / 3, radiusFactor: 1.02, period: 5200, offset: 3467, color: "cyan" },
//     ]

//     // ---- Static starfield ----
//     const STAR_COUNT = 150
//     const stars: Star[] = []
//     for (let i = 0; i < STAR_COUNT; i++) {
//       stars.push({
//         fx: Math.random(),
//         fy: Math.random(),
//         r: Math.random() * 1.1 + 0.3,
//         phase: Math.random() * Math.PI * 2,
//         warm: Math.random() > 0.85,
//       })
//     }

//     // ---- Orbit rings ----
//     const rings: Ring[] = [
//       { tilt: 0.5, radiusFactor: 1.35, period: 8000, offset: 0, color: "cyan" },
//       { tilt: -0.35, radiusFactor: 1.55, period: 11000, offset: 400, color: "amber" },
//     ]

//     function resize() {
//       const rect = canvas!.getBoundingClientRect()
//       width = rect.width
//       height = rect.height
//       canvas!.width = width * dpr
//       canvas!.height = height * dpr
//       ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
//     }

//     resize()
//     window.addEventListener("resize", resize)

//     let angle = 0
//     let raf = 0
//     const AXIAL_TILT = (23.5 * Math.PI) / 180

//     function project(p: Vec3, cx: number, cy: number, radius: number, focal: number) {
//       let r = rotateY(p, angle)
//       r = rotateX(r, AXIAL_TILT)
//       const scale = focal / (focal + r.z * radius)
//       return {
//         sx: cx + r.x * radius * scale,
//         sy: cy + r.y * radius * scale,
//         z: r.z,
//         depth: (r.z + 1) / 2,
//       }
//     }

//     function draw(time: number) {
//       if (!ctx) return
//       ctx.clearRect(0, 0, width, height)

//       const cx = width / 2
//       const cy = height / 2
//       const radius = Math.min(width, height) * 0.34
//       const focal = radius * 3

//       // Starfield (mostly cool white, a few warm embers)
//       stars.forEach((s) => {
//         const tw = 0.5 + 0.5 * Math.sin(time / 900 + s.phase)
//         const color = s.warm ? "255, 190, 120" : "200, 210, 255"
//         ctx.fillStyle = `rgba(${color}, ${0.15 + tw * 0.35})`
//         ctx.beginPath()
//         ctx.arc(s.fx * width, s.fy * height, s.r, 0, Math.PI * 2)
//         ctx.fill()
//       })

//       // Soft atmospheric rim glow (cool blue) behind the globe
//       const halo = ctx.createRadialGradient(cx, cy, radius * 0.6, cx, cy, radius * 1.7)
//       halo.addColorStop(0, "rgba(56, 189, 248, 0.2)")
//       halo.addColorStop(1, "rgba(56, 189, 248, 0)")
//       ctx.fillStyle = halo
//       ctx.beginPath()
//       ctx.arc(cx, cy, radius * 1.7, 0, Math.PI * 2)
//       ctx.fill()

//       // Globe body with a warm directional "sunlit" highlight (top-left)
//       const body = ctx.createRadialGradient(
//         cx - radius * 0.4,
//         cy - radius * 0.45,
//         radius * 0.05,
//         cx,
//         cy,
//         radius
//       )
//       body.addColorStop(0, "rgba(60, 55, 45, 0.55)")
//       body.addColorStop(0.35, "rgba(18, 30, 48, 0.85)")
//       body.addColorStop(0.7, "rgba(8, 16, 30, 0.92)")
//       body.addColorStop(1, "rgba(3, 6, 14, 0.96)")
//       ctx.fillStyle = body
//       ctx.beginPath()
//       ctx.arc(cx, cy, radius, 0, Math.PI * 2)
//       ctx.fill()

//       // Rim light (bright edge, like an eclipse-lit horizon)
//       ctx.strokeStyle = "rgba(140, 200, 255, 0.4)"
//       ctx.lineWidth = 1.3
//       ctx.beginPath()
//       ctx.arc(cx, cy, radius, 0, Math.PI * 2)
//       ctx.stroke()

//       // Orbit rings (independent of globe spin)
//       const SEG = 72
//       rings.forEach((ring) => {
//         const rgb = ring.color === "cyan" ? [103, 232, 249] : [251, 191, 36]
//         const rr = radius * ring.radiusFactor
//         let prev: { sx: number; sy: number; occluded: boolean } | null = null
//         for (let s = 0; s <= SEG; s++) {
//           const a = (s / SEG) * Math.PI * 2
//           let p: Vec3 = { x: Math.cos(a), y: 0, z: Math.sin(a) }
//           p = rotateX(p, ring.tilt)
//           const scale = focal / (focal + p.z * rr)
//           const sx = cx + p.x * rr * scale
//           const sy = cy + p.y * rr * scale
//           const screenDist = Math.sqrt((sx - cx) ** 2 + (sy - cy) ** 2)
//           const occluded = p.z < 0 && screenDist < radius * 0.98
//           if (prev && !prev.occluded && !occluded) {
//             ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.22)`
//             ctx.lineWidth = 0.8
//             ctx.beginPath()
//             ctx.moveTo(prev.sx, prev.sy)
//             ctx.lineTo(sx, sy)
//             ctx.stroke()
//           }
//           prev = { sx, sy, occluded }
//         }

//         const t = ((time / ring.period + ring.offset / ring.period) % 1) * Math.PI * 2
//         let sp: Vec3 = { x: Math.cos(t), y: 0, z: Math.sin(t) }
//         sp = rotateX(sp, ring.tilt)
//         const scale = focal / (focal + sp.z * rr)
//         const sx = cx + sp.x * rr * scale
//         const sy = cy + sp.y * rr * scale
//         const screenDist = Math.sqrt((sx - cx) ** 2 + (sy - cy) ** 2)
//         const occluded = sp.z < 0 && screenDist < radius * 0.98
//         if (!occluded) {
//           ctx.globalCompositeOperation = "lighter"
//           const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 6)
//           glow.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.9)`)
//           glow.addColorStop(1, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`)
//           ctx.fillStyle = glow
//           ctx.beginPath()
//           ctx.arc(sx, sy, 6, 0, Math.PI * 2)
//           ctx.fill()
//           ctx.globalCompositeOperation = "source-over"
//         }
//       })

//       // Project all land dots once per frame (reused by mesh + dots)
//       const projected = landDots.map((d) => project(d.base, cx, cy, radius, focal))

//       // Visible triangulated mesh (like a network overlay across the continents)
//       meshEdges.forEach((e) => {
//         const pa = projected[e.a]
//         const pb = projected[e.b]
//         if (pa.depth < 0.48 || pb.depth < 0.48) return
//         const avg = (pa.depth + pb.depth) / 2
//         ctx.strokeStyle = `rgba(200, 225, 255, ${0.08 + avg * 0.22})`
//         ctx.lineWidth = 0.7
//         ctx.beginPath()
//         ctx.moveTo(pa.sx, pa.sy)
//         ctx.lineTo(pb.sx, pb.sy)
//         ctx.stroke()
//       })

//       // Land dots — warm amber "city lights", front hemisphere only
//       ctx.globalCompositeOperation = "lighter"
//       landDots.forEach((d, i) => {
//         const p = projected[i]
//         if (p.depth < 0.5) return
//         const fade = Math.min(1, (p.depth - 0.5) / 0.15)
//         const pulse = 0.6 + 0.4 * Math.sin(time / 1400 + d.phase)
//         const alpha = fade * (0.4 + pulse * 0.35)
//         const size = (d.major ? d.size * 1.9 : d.size) * (0.7 + p.depth * 0.5)
//         const rgb = d.major ? "255, 200, 120" : "255, 170, 90"
//         ctx.fillStyle = `rgba(${rgb}, ${alpha})`
//         ctx.beginPath()
//         ctx.arc(p.sx, p.sy, size, 0, Math.PI * 2)
//         ctx.fill()
//       })

//       // Traveling neuron pulses — perfectly circular, symmetric orbits.
//       // No static guide-line is drawn; the circular path is shown purely
//       // through the synchronized motion of evenly-spaced pulses (never random).
//       surfaceOrbits.forEach((orbit) => {
//         const rgb = orbit.color === "cyan" ? [103, 200, 255] : [167, 139, 250]
//         const rr = radius * orbit.radiusFactor
//         const PULSES_PER_ORBIT = 3

//         for (let k = 0; k < PULSES_PER_ORBIT; k++) {
//           const pulseOffset = k / PULSES_PER_ORBIT
//           const baseFrac = (time / orbit.period + orbit.offset / orbit.period) % 1
//           const t = ((baseFrac + pulseOffset) % 1) * Math.PI * 2
//           let pp: Vec3 = { x: Math.cos(t), y: 0, z: Math.sin(t) }
//           pp = rotateX(pp, orbit.tilt)
//           pp = rotateY(pp, orbit.spin)
//           const pulseProj = project(pp, cx, cy, rr, focal)
//           if (pulseProj.depth > 0.45) {
//             const glow = ctx.createRadialGradient(pulseProj.sx, pulseProj.sy, 0, pulseProj.sx, pulseProj.sy, 6)
//             glow.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.95)`)
//             glow.addColorStop(1, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`)
//             ctx.fillStyle = glow
//             ctx.beginPath()
//             ctx.arc(pulseProj.sx, pulseProj.sy, 6, 0, Math.PI * 2)
//             ctx.fill()
//           }
//         }
//       })
//       ctx.globalCompositeOperation = "source-over"

//       angle += 0.0026
//     }

//     if (prefersReducedMotion) {
//       draw(0)
//     } else {
//       const loop = (time: number) => {
//         draw(time)
//         raf = requestAnimationFrame(loop)
//       }
//       raf = requestAnimationFrame(loop)
//     }

//     return () => {
//       window.removeEventListener("resize", resize)
//       if (raf) cancelAnimationFrame(raf)
//     }
//   }, [])

//   return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
// }
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