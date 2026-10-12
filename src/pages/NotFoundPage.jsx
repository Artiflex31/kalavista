import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import './NotFoundPage.css'

const PALETTE = ['#f2ca73', '#e8553d', '#4f8d91', '#fffaf0', '#a84d3f']

// ┌─────────────────────────────────────────────────────────────┐
// │  TUNABLE PARAMETERS — change these to adjust the look       │
// └─────────────────────────────────────────────────────────────┘
const CONFIG = {
  // ---------- Infinity shape ----------
  infinityWidth: 0.38, // how wide the infinity is (0.3 thin → 0.45 wide)
  infinityFlatness: 0.38, // vertical height as a fraction of width (0.3 flat → 0.6 tall)

  // ---------- Chain thickness & links ----------
  tubeBase: 10, // chain thickness in px (bigger = chunkier chain)
  numLinks: 5, // how many chain links around the loop (higher = smaller links)

  // ---------- Particle density & size ----------
  uSteps: 500, // samples along the curve (higher = smoother, more particles)
  vSteps: 12, // samples around the tube (higher = thicker looking)
  particleSizeMin: 0.9, // smallest particle radius
  particleSizeMax: 1.4, // largest particle radius

  // ---------- Rotation & 3D depth ----------
  rotationSpeed: 0.3, // radians per second (0 = static, 1.2 = fast spin)
  focal: 500, // perspective focal length (lower = more 3D depth)

  // ---------- Ambient sparkles ----------
  sparkleCount: 40, // number of ambient particles in the background

  // ---------- Interactions ----------
  fishEyeRadius: 100, // px radius of hover distortion
  fishEyeForce: 30, // px max push from cursor
  trailSpacingMs: 25, // ms between trail dots (lower = denser trail)
  trailLifetime: 900, // ms a trail dot survives
  burstCount: 30, // particles per click burst
  burstLifetime: 1200, // ms a burst particle survives
}
// ┌─────────────────────────────────────────────────────────────┐
// │  END TUNABLE PARAMETERS                                     │
// └─────────────────────────────────────────────────────────────┘

function NotFoundPage() {
  const canvasRef = useRef(null)
  const rafRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const cssW = canvas.clientWidth
    const cssH = canvas.clientHeight
    canvas.width = cssW * dpr
    canvas.height = cssH * dpr
    ctx.scale(dpr, dpr)

    const W = cssW
    const H = cssH
    const CX = W / 2
    const CY = H / 2

    const particles = []

    // ---------- Infinity geometry ----------
    // Bigger infinityW → wider. Bigger infinityFlatness → taller.
    const a = Math.min(W * CONFIG.infinityWidth, H * 1.1)
    const b = a * CONFIG.infinityFlatness
    const tubeBase = CONFIG.tubeBase
    const numLinks = CONFIG.numLinks
    const uSteps = CONFIG.uSteps
    const vSteps = CONFIG.vSteps

    for (let i = 0; i < uSteps; i++) {
      const u01 = i / uSteps
      const t = u01 * Math.PI * 2

      const cx = a * Math.cos(t)
      const cy = b * Math.sin(2 * t)

      const dt = 0.005
      const cx2 = a * Math.cos(t + dt)
      const cy2 = b * Math.sin(2 * (t + dt))
      let tx = cx2 - cx
      let ty = cy2 - cy
      const tlen = Math.hypot(tx, ty) || 1
      tx /= tlen
      ty /= tlen

      const nx = -ty
      const ny = tx

      // Chain-link modulation
      const linkPhase = u01 * numLinks * Math.PI * 2
      const linkPulse = Math.abs(Math.sin(linkPhase))
      const tubeR = tubeBase * (0.55 + 0.65 * linkPulse)

      const linkIndex = Math.floor(u01 * numLinks)
      const evenLink = linkIndex % 2 === 0
      const rXY = evenLink ? tubeR : tubeR * 0.55
      const rZ = evenLink ? tubeR * 0.55 : tubeR

      for (let j = 0; j < vSteps; j++) {
        const v = (j / vSteps) * Math.PI * 2
        const cv = Math.cos(v)
        const sv = Math.sin(v)

        const px = cx + cv * rXY * nx
        const py = cy + cv * rXY * ny
        const pz = sv * rZ

        particles.push({
          x: CX + px,
          y: CY + py,
          z: pz,
          baseSize:
            CONFIG.particleSizeMin +
            Math.random() * (CONFIG.particleSizeMax - CONFIG.particleSizeMin),
          color: '#e8e2d8',
          isDebris: false,
        })
      }
    }

    // ---------- Ambient sparkles ----------
    for (let i = 0; i < CONFIG.sparkleCount; i++) {
      const angle = Math.random() * Math.PI * 2
      const rad = a * 0.6 + Math.random() * a * 0.8
      particles.push({
        x: CX + Math.cos(angle) * rad,
        y: CY + Math.sin(angle) * rad * 0.6,
        z: (Math.random() - 0.5) * 60,
        baseSize: 0.6 + Math.random() * 1.1,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        isDebris: true,
        seed: Math.random() * 100,
      })
    }

    // ---------- Interactions ----------
    const trails = []
    const bursts = []
    let colorIdx = 0
    let lastTrailAt = 0

    const mouse = { x: -9999, y: -9999, active: false }

    function handleMove(e) {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      mouse.x = x
      mouse.y = y
      mouse.active = true

      const now = performance.now()
      if (now - lastTrailAt > CONFIG.trailSpacingMs) {
        lastTrailAt = now
        trails.push({
          x,
          y,
          bornAt: now,
          color: PALETTE[colorIdx % PALETTE.length],
          size: 2 + Math.random() * 1.4,
        })
        colorIdx++
      }
    }
    function handleLeave() {
      mouse.active = false
      mouse.x = -9999
      mouse.y = -9999
    }
    function handleDown(e) {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      for (let i = 0; i < CONFIG.burstCount; i++) {
        const ang = (i / CONFIG.burstCount) * Math.PI * 2 + Math.random() * 0.5
        const speed = 1.5 + Math.random() * 3.2
        bursts.push({
          x,
          y,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          bornAt: performance.now(),
          color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
          size: 1.3 + Math.random() * 2,
        })
      }
    }

    canvas.addEventListener('mousemove', handleMove)
    canvas.addEventListener('mouseleave', handleLeave)
    canvas.addEventListener('mousedown', handleDown)

    // ---------- Animation ----------
    const start = performance.now()
    const focal = CONFIG.focal
    const rotationSpeed = CONFIG.rotationSpeed

    function animate(now) {
      const t = (now - start) * 0.001
      ctx.clearRect(0, 0, W, H)

      const angle = t * rotationSpeed
      const ca = Math.cos(angle)
      const sa = Math.sin(angle)

      const projected = []
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]

        let dx = p.x - CX
        let dy = p.y - CY
        const dz = p.z

        if (p.isDebris) {
          dx += Math.sin(t * 2 + p.seed) * 1.4
          dy += Math.cos(t * 2.3 + p.seed) * 1.4
        }

        const rx = dx * ca - dz * sa
        const rz = dx * sa + dz * ca

        const scale = focal / (focal + rz)
        let sx = CX + rx * scale
        let sy = CY + dy * scale

        if (mouse.active && !p.isDebris) {
          const mdx = sx - mouse.x
          const mdy = sy - mouse.y
          const d2 = mdx * mdx + mdy * mdy
          const R = CONFIG.fishEyeRadius
          if (d2 < R * R && d2 > 0.01) {
            const d = Math.sqrt(d2)
            const force = (1 - d / R) ** 2
            sx += (mdx / d) * force * CONFIG.fishEyeForce
            sy += (mdy / d) * force * CONFIG.fishEyeForce
          }
        }

        projected.push({
          sx,
          sy,
          z: rz,
          scale,
          baseSize: p.baseSize,
          color: p.color,
        })
      }

      projected.sort((A, B) => B.z - A.z)

      for (let i = 0; i < projected.length; i++) {
        const q = projected[i]
        const size = Math.max(0.5, q.baseSize * q.scale)
        ctx.globalAlpha = 0.9
        ctx.fillStyle = q.color
        ctx.beginPath()
        ctx.arc(q.sx, q.sy, size, 0, Math.PI * 2)
        ctx.fill()
      }

      // Trails
      for (let i = trails.length - 1; i >= 0; i--) {
        const tr = trails[i]
        const age = now - tr.bornAt
        if (age > CONFIG.trailLifetime) {
          trails.splice(i, 1)
          continue
        }
        const life = 1 - age / CONFIG.trailLifetime
        ctx.globalAlpha = life * 0.9
        ctx.fillStyle = tr.color
        ctx.beginPath()
        ctx.arc(tr.x, tr.y, tr.size * life, 0, Math.PI * 2)
        ctx.fill()
      }

      // Bursts
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b2 = bursts[i]
        const age = now - b2.bornAt
        if (age > CONFIG.burstLifetime) {
          bursts.splice(i, 1)
          continue
        }
        const life = 1 - age / CONFIG.burstLifetime
        b2.x += b2.vx
        b2.y += b2.vy
        b2.vx *= 0.96
        b2.vy *= 0.96
        b2.vy += 0.05

        ctx.globalAlpha = life
        ctx.fillStyle = b2.color
        ctx.beginPath()
        ctx.arc(b2.x, b2.y, b2.size * life, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalAlpha = 1
      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafRef.current)
      canvas.removeEventListener('mousemove', handleMove)
      canvas.removeEventListener('mouseleave', handleLeave)
      canvas.removeEventListener('mousedown', handleDown)
    }
  }, [])

  return (
    <section className="not-found" aria-labelledby="not-found-title">
      <div className="not-found__glow" aria-hidden="true" />

      <div className="not-found__container">
        <canvas
          ref={canvasRef}
          className="not-found__canvas"
          aria-hidden="true"
        />

        <p className="not-found__code">404</p>
        <h1 id="not-found-title" className="not-found__title">
          Nothing here.
        </h1>
        <p className="not-found__intro">
          The link is broken, or the page has moved on.
        </p>

        <Link to="/" className="not-found__back">
          Back home <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </section>
  )
}

export default NotFoundPage
