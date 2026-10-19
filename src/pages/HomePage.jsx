import { lazy, Suspense, useState } from 'react'
import FeaturedWorks from '../components/FeaturedWorks'
import MobileParallaxHero from '../components/MobileParallaxHero'

const ArtAscent = lazy(() => import('../components/ArtAscent'))

function canRenderAscent() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(min-width: 761px) and (pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function HomePage() {
  const [showAscent] = useState(() => canRenderAscent())

  return (
    <>
      {showAscent ? (
        <Suspense
          fallback={
            <div
              style={{
                height: '100svh',
                width: '100%',
                backgroundColor: '#15274c', // ✅ Sirf dark background
              }}
            />
          }
        >
          <ArtAscent />
        </Suspense>
      ) : (
        <MobileParallaxHero />
      )}
      <FeaturedWorks />
    </>
  )
}

export default HomePage
