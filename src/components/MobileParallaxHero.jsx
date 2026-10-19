import { useRef } from 'react'
import { Link } from 'react-router'
import { motion, useScroll, useTransform } from 'motion/react'
import hero3dImage from '../assets/hero-3d.jpg' // <-- Image import ki
import './MobileParallaxHero.css'

export default function MobileParallaxHero() {
  const containerRef = useRef(null)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  const bgScale = useTransform(scrollYProgress, [0, 1], [1, 1.5])
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '20%'])
  const orbY = useTransform(scrollYProgress, [0, 1], ['0%', '-50%'])

  return (
    <section className="mobile-parallax" ref={containerRef}>
      <div className="mobile-parallax__sticky-bg">
        {/* Yahan direct style me image laga di */}
        <motion.div
          className="mobile-parallax__bg"
          style={{
            backgroundImage: `url(${hero3dImage})`,
            scale: bgScale,
            y: bgY,
          }}
        />

        <div className="mobile-parallax__overlay" />
        <motion.div className="mobile-parallax__orb" style={{ y: orbY }} />
      </div>

      <div className="mobile-parallax__content">
        {/* Block 1 */}
        <div className="mobile-parallax__stop mobile-parallax__stop--left">
          <div className="mobile-parallax__card">
            <p className="mobile-parallax__eyebrow">KALA SHIKHAR · 01</p>
            <h1>Walk into the canvas.</h1>
            <p>
              A slow route through colour, terrain, memory, and the works that
              stay with you.
            </p>
            <span className="mobile-parallax__scroll-cue">
              Scroll to travel ↓
            </span>
          </div>
        </div>

        {/* Block 2 */}
        <div className="mobile-parallax__stop mobile-parallax__stop--right">
          <div className="mobile-parallax__card">
            <p className="mobile-parallax__eyebrow">THE FIRST STOP</p>
            <h2>A gallery shaped by weather.</h2>
            <p>
              Browse original works, stories, moods, and evolving collections.
            </p>
            <Link className="mobile-parallax__link" to="/gallery">
              Explore gallery <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>

        {/* Block 3 */}
        <div className="mobile-parallax__stop mobile-parallax__stop--left">
          <div className="mobile-parallax__card">
            <p className="mobile-parallax__eyebrow">THE FINAL STOP</p>
            <h2>Make something new together.</h2>
            <p>
              Share your idea for a personal artwork or a thoughtful commission.
            </p>
            <Link className="mobile-parallax__link" to="/commissions">
              Start a commission <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
