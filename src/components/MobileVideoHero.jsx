import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import './MobileVideoHero.css'

export default function MobileVideoHero() {
  const videoRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    const container = containerRef.current
    if (!video || !container) return

    let isCancelled = false

    // Video metadata load hone ka wait karo taaki duration pata chale
    function handleLoadedMetadata() {
      if (isCancelled) return

      const handleScroll = () => {
        const { top, height } = container.getBoundingClientRect()
        const scrollDistance = container.offsetHeight - window.innerHeight
        // Calculate scroll progress (0 to 1)
        const progress = Math.max(0, Math.min(1, -top / scrollDistance))

        // Video ko scroll ke hisaab se scrub karo
        if (video.duration && !isNaN(video.duration)) {
          video.currentTime = progress * video.duration
        }
      }

      window.addEventListener('scroll', handleScroll, { passive: true })
      handleScroll() // Initial call

      return () => window.removeEventListener('scroll', handleScroll)
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)

    return () => {
      isCancelled = true
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [])

  return (
    <section className="mobile-video-hero" ref={containerRef}>
      <div className="mobile-video-hero__sticky">
        {/* Agar tumhare paas video nahi hai, toh poster image fallback use karo */}
        <video
          ref={videoRef}
          className="mobile-video-hero__video"
          src="/hero-scrub.mp4"
          playsInline
          muted
          preload="auto"
          poster="/kalavista-hero-backdrop.webp"
        />

        <div className="mobile-video-hero__overlay" />

        <div className="mobile-video-hero__content">
          <p className="mobile-video-hero__eyebrow">KALA SHIKHAR</p>
          <h1>Walk into the canvas.</h1>
          <p>A slow route through colour, terrain, and memory.</p>
          <Link className="mobile-video-hero__link" to="/gallery">
            Explore the gallery ↗
          </Link>
        </div>
      </div>
    </section>
  )
}
