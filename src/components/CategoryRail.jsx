import { useEffect, useRef } from 'react'
import './CategoryRail.css'

const cardTilts = [-5, 3, -2, 5, -4]
const loopCopies = [0, 1, 2]

function getCardStyle(category, index) {
  return {
    '--card-accent': category.accent,
    '--card-lift': `${(index % 3) * 18}px`,
    '--card-tilt': `${cardTilts[index % cardTilts.length]}deg`,
  }
}

function getCardStatus(category) {
  if (category.count === 0) {
    return 'Coming soon'
  }

  return `${category.count} ${
    category.count === 1 ? 'work' : 'works'
  }`
}

function CategoryRail({
  categories,
  selectedCategory,
  onSelectCategory,
}) {
  const sectionRef = useRef(null)
  const stageRef = useRef(null)
  const foregroundTrackRef = useRef(null)
  const backgroundTrackRef = useRef(null)
  const isPausedRef = useRef(false)
  const scheduleUpdateRef = useRef(() => {})

  useEffect(() => {
    const reducedMotionOrMobile = window.matchMedia(
      '(prefers-reduced-motion: reduce), (max-width: 700px)',
    )

    let animationFrame = null

    function updateTracks() {
      animationFrame = null

      const section = sectionRef.current
      const stage = stageRef.current
      const foregroundTrack = foregroundTrackRef.current
      const backgroundTrack = backgroundTrackRef.current

      if (!section || !stage || !foregroundTrack || !backgroundTrack) {
        return
      }

      if (reducedMotionOrMobile.matches) {
        foregroundTrack.style.transform = ''
        backgroundTrack.style.transform = ''
        return
      }

      if (isPausedRef.current) {
        return
      }

      const foregroundSet = foregroundTrack.firstElementChild
      const backgroundSet = backgroundTrack.firstElementChild

      const foregroundLoopWidth =
        foregroundSet?.getBoundingClientRect().width ?? 0

      const backgroundLoopWidth =
        backgroundSet?.getBoundingClientRect().width ?? 0

      if (foregroundLoopWidth === 0 || backgroundLoopWidth === 0) {
        return
      }

      const scrollRange = Math.max(
        section.offsetHeight - window.innerHeight,
        1,
      )

      const travelledDistance = Math.min(
        Math.max(-section.getBoundingClientRect().top, 0),
        scrollRange,
      )

      /*
        Scrolling down makes the offset more negative: cards move left.
        Scrolling up reduces the offset: cards move back right.
        % makes the duplicated queue loop forever.
      */
      const foregroundOffset =
        (travelledDistance * 2.8) % foregroundLoopWidth

      const backgroundOffset =
        (travelledDistance * 1.25) % backgroundLoopWidth

      foregroundTrack.style.transform = `translate3d(${
        -foregroundOffset
      }px, 0, 0)`

      backgroundTrack.style.transform = `translate3d(${
        -130 - backgroundOffset
      }px, 0, 0)`
    }

    function scheduleUpdate() {
      if (animationFrame !== null) {
        return
      }

      animationFrame = window.requestAnimationFrame(updateTracks)
    }

    scheduleUpdateRef.current = scheduleUpdate

    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)
    reducedMotionOrMobile.addEventListener('change', scheduleUpdate)

    scheduleUpdate()

    return () => {
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame)
      }

      scheduleUpdateRef.current = () => {}

      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      reducedMotionOrMobile.removeEventListener('change', scheduleUpdate)
    }
  }, [categories.length])

  function pauseQueue() {
    isPausedRef.current = true
  }

  function resumeQueue() {
    isPausedRef.current = false
    scheduleUpdateRef.current()
  }

  return (
    <section
      className="category-rail"
      ref={sectionRef}
      aria-labelledby="category-rail-title"
    >
      <div className="category-rail__stage" ref={stageRef}>
        <div className="category-rail__glow" aria-hidden="true" />

        <div className="category-rail__heading">
          <p className="category-rail__eyebrow">THE STUDIO INDEX</p>

          <h2 id="category-rail-title">
            Follow a trail
            <span>through the work.</span>
          </h2>

          <p>
            Scroll to travel through the studio. Hover a card to pause the
            queue and look closer.
          </p>
        </div>

        <div className="category-rail__lane category-rail__lane--back">
          <div
            className="category-rail__track category-rail__track--back"
            ref={backgroundTrackRef}
            aria-hidden="true"
          >
            {loopCopies.map((copyIndex) => (
              <div className="category-rail__set" key={`back-${copyIndex}`}>
                {[...categories].reverse().map((category, index) => (
                  <div
                    className={`category-rail__back-card category-rail__card--pattern-${
                      index % 5
                    }`}
                    key={`${copyIndex}-${category.value}`}
                    style={getCardStyle(category, index)}
                  >
                    <span className="category-rail__pattern" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="category-rail__lane category-rail__lane--front">
          <div
            className="category-rail__track category-rail__track--front"
            ref={foregroundTrackRef}
          >
            {loopCopies.map((copyIndex) => (
              <div
                aria-hidden={copyIndex !== 0}
                className="category-rail__set"
                key={`front-${copyIndex}`}
              >
                {categories.map((category, index) => {
                  const isActive = selectedCategory === category.value

                  return (
                    <button
                      aria-label={`${category.label}, ${getCardStatus(
                        category,
                      )}`}
                      aria-pressed={isActive}
                      className={`category-rail__card category-rail__card--pattern-${
                        index % 5
                      } ${
                        isActive ? 'category-rail__card--active' : ''
                      }`}
                      key={`${copyIndex}-${category.value}`}
                      onBlur={resumeQueue}
                      onClick={() => onSelectCategory(category.value)}
                      onFocus={pauseQueue}
                      onPointerEnter={pauseQueue}
                      onPointerLeave={resumeQueue}
                      style={getCardStyle(category, index)}
                      tabIndex={copyIndex === 0 ? 0 : -1}
                      type="button"
                    >
                      <span
                        aria-hidden="true"
                        className="category-rail__pattern"
                      />

                      <span
                        aria-hidden="true"
                        className="category-rail__card-shade"
                      />

                      <span className="category-rail__card-content">
                        <span className="category-rail__card-index">
                          {String(index + 1).padStart(2, '0')}
                        </span>

                        <strong>{category.label}</strong>

                        <span className="category-rail__card-status">
                          {getCardStatus(category)}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        <p className="category-rail__scroll-note">
          Scroll down to move forward · Scroll up to return
        </p>
      </div>
    </section>
  )
}

export default CategoryRail