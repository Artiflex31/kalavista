import { lazy, Suspense, useEffect, useState } from 'react'
import FeaturedWorks from '../components/FeaturedWorks'
import HomeStaticHero from '../components/HomeStaticHero'

// Lazy-load the 3D journey so its three.js bundle only downloads
// on capable devices. Mobile and reduced-motion visitors never pay for it.
const ArtAscent = lazy(() => import('../components/ArtAscent'))

function canRenderAscent() {
  if (typeof window === 'undefined') {
    return false
  }

  return (
    window.matchMedia('(min-width: 761px) and (pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function HomePage() {
  const [showAscent, setShowAscent] = useState(false)

  useEffect(() => {
    setShowAscent(canRenderAscent())
  }, [])

  return (
    <>
      {showAscent ? (
        <Suspense fallback={<HomeStaticHero />}>
          <ArtAscent />
        </Suspense>
      ) : (
        <HomeStaticHero />
      )}
      <FeaturedWorks />
    </>
  )
}

export default HomePage
