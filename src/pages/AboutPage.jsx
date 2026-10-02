import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import city from '../assets/kalavista-zoom-01-city.png'
import childRoom from '../assets/kalavista-zoom-02-child-room.png'
import imagination from '../assets/kalavista-zoom-03-imagination.png'
import pause from '../assets/kalavista-zoom-04-pause.png'
import returnToArt from '../assets/kalavista-zoom-05-return.png'
import './AboutPage.css'

const scenes = [
  {
    id: 'city',
    label: 'City',
    kicker: '01 / A WINDOW IN THE CITY',
    title: 'In a city full of lights, one window held a world.',
    description:
      'Before I had a name for art, I had a room, a window, and an urge to draw what I could not say aloud.',
    line: 'Scroll toward the glowing house.',
    image: city,
    zoomOrigin: '76% 58%',
    zoomScale: 3.7,
  },
  {
    id: 'room',
    label: 'Room',
    kicker: '02 / MY FIRST STUDIO',
    title: 'That small room became my first studio.',
    description:
      'As a child, I drew alone—not because I knew what I was making, but because the page listened without asking me to explain.',
    line: 'Every sketchbook became a quiet friend.',
    image: childRoom,
    zoomOrigin: '66% 65%',
    zoomScale: 2.9,
  },
  {
    id: 'imagination',
    label: 'Imagine',
    kicker: '03 / A PAGE BECOMES A WORLD',
    title: 'A pencil line could turn into a place to belong.',
    description:
      'The smallest drawings carried entire cities, impossible skies, and stories that were easier to make than to speak.',
    line: 'Creativity began as play.',
    image: imagination,
    zoomOrigin: '66% 62%',
    zoomScale: 2.5,
  },
  {
    id: 'pause',
    label: 'Pause',
    kicker: '04 / WHEN LIFE GREW LOUDER',
    title: 'Then, for a while, the sketchbook closed.',
    description:
      'Doubt, routines, and the need to be practical took up space. Art did not disappear—it simply waited patiently.',
    line: 'A pause is not the same as an ending.',
    image: pause,
    zoomOrigin: '64% 63%',
    zoomScale: 2.4,
  },
  {
    id: 'return',
    label: 'Return',
    kicker: '05 / STILL BECOMING',
    title: 'I came back to art—one honest mark at a time.',
    description:
      'KalaVista is where that return continues: a growing collection of colour, memory, experiments, and the courage to keep creating.',
    line: 'The goal is not to arrive. It is to keep making.',
    image: returnToArt,
    zoomOrigin: '72% 58%',
    zoomScale: 1.08,
    isBright: true,
    isFinal: true,
  },
]

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum)
}

function AboutPage() {
  const storyRef = useRef(null)
  const [scrollProgress, setScrollProgress] = useState(0)

  useEffect(() => {
    let animationFrameId = 0

    function updateProgress() {
      animationFrameId = 0

      const story = storyRef.current

      if (!story) {
        return
      }

      const bounds = story.getBoundingClientRect()
      const scrollDistance = Math.max(
        1,
        story.offsetHeight - window.innerHeight,
      )

      const nextProgress = clamp(-bounds.top / scrollDistance, 0, 1)

      setScrollProgress((currentProgress) => {
        if (Math.abs(currentProgress - nextProgress) < 0.001) {
          return currentProgress
        }

        return nextProgress
      })
    }

    function requestProgressUpdate() {
      if (animationFrameId) {
        return
      }

      animationFrameId = window.requestAnimationFrame(updateProgress)
    }

    updateProgress()

    window.addEventListener('scroll', requestProgressUpdate, {
      passive: true,
    })
    window.addEventListener('resize', requestProgressUpdate)

    return () => {
      window.removeEventListener('scroll', requestProgressUpdate)
      window.removeEventListener('resize', requestProgressUpdate)

      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId)
      }
    }
  }, [])

  const segmentCount = scenes.length - 1
  const segmentProgress = scrollProgress * segmentCount

  const currentSceneIndex = Math.min(
    Math.floor(segmentProgress),
    scenes.length - 2,
  )

  const transitionProgress = Math.min(segmentProgress - currentSceneIndex, 1)

  const activeSceneIndex = Math.min(
    Math.round(segmentProgress),
    scenes.length - 1,
  )

  const activeScene = scenes[activeSceneIndex]

  function getLayerStyle(index) {
    const scene = scenes[index]

    if (index === currentSceneIndex) {
      return {
        opacity: 1 - transitionProgress,
        transform: `scale(${1 + transitionProgress * scene.zoomScale})`,
        transformOrigin: scene.zoomOrigin,
        zIndex: 1,
      }
    }

    if (index === currentSceneIndex + 1) {
      return {
        opacity: transitionProgress,
        transform: `scale(${1.12 - transitionProgress * 0.12})`,
        transformOrigin: scene.zoomOrigin,
        zIndex: 2,
      }
    }

    return {
      opacity: 0,
      transform: 'scale(1.12)',
      transformOrigin: scene.zoomOrigin,
      zIndex: 0,
    }
  }

  function scrollToScene(index) {
    const story = storyRef.current

    if (!story) {
      return
    }

    const shouldReduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    const scrollDistance = story.offsetHeight - window.innerHeight
    const storyTop = window.scrollY + story.getBoundingClientRect().top
    const targetPosition = storyTop + (index / segmentCount) * scrollDistance

    window.scrollTo({
      top: targetPosition,
      behavior: shouldReduceMotion ? 'auto' : 'smooth',
    })
  }

  return (
    <section
      className="about-zoom"
      data-nav-tone={activeScene.isFinal ? 'dark' : 'light'}
      ref={storyRef}
      style={{
        height: `${segmentCount * 125 + 100}vh`,
      }}
      aria-label="KalaVista art story"
    >
      <div className="about-zoom__stage">
        <div className="about-zoom__layers" aria-hidden="true">
          {scenes.map((scene, index) => (
            <div
              className="about-zoom__scene-image"
              key={scene.id}
              style={{
                ...getLayerStyle(index),
                backgroundImage: `url(${scene.image})`,
              }}
            />
          ))}

          <div className="about-zoom__overlay" />
          <div className="about-zoom__vignette" />
        </div>

        <nav
          className="about-zoom__navigation"
          aria-label="About story chapters"
        >
          <p>ART STORY</p>

          <ol>
            {scenes.map((scene, index) => (
              <li key={scene.id}>
                <button
                  className={
                    index === activeSceneIndex
                      ? 'about-zoom__nav-button about-zoom__nav-button--active'
                      : 'about-zoom__nav-button'
                  }
                  type="button"
                  aria-current={index === activeSceneIndex ? 'step' : undefined}
                  onClick={() => scrollToScene(index)}
                >
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  {scene.label}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div
          className="about-zoom__copy"
          key={activeScene.id}
          aria-live="polite"
        >
          <p className="about-zoom__kicker">{activeScene.kicker}</p>

          <h1>{activeScene.title}</h1>

          <p className="about-zoom__description">{activeScene.description}</p>

          <p className="about-zoom__line">{activeScene.line}</p>

          {activeScene.isFinal ? (
            <Link className="about-zoom__cta" to="/gallery">
              Explore the gallery <span aria-hidden="true">↗</span>
            </Link>
          ) : (
            <p className="about-zoom__scroll-cue">
              Keep scrolling <span aria-hidden="true">↓</span>
            </p>
          )}
        </div>

        <p className="about-zoom__counter" aria-hidden="true">
          {String(activeSceneIndex + 1).padStart(2, '0')} /{' '}
          {String(scenes.length).padStart(2, '0')}
        </p>
      </div>
    </section>
  )
}

export default AboutPage
