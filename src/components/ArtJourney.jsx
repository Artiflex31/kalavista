import { useRef } from 'react'
import { Link } from 'react-router'
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'motion/react'
import heroBackdrop from '../assets/kalavista-hero-backdrop.webp'
import artworks from '../data/artworks'
import './ArtJourney.css'

const journeyStops = [
  {
    id: 'journey-start',
    eyebrow: '01 / प्रथम रेखा · FIRST MARK',
    title: 'Art that stays with you.',
    description:
      'Scroll through a landscape shaped by pigment, paper, memory, and quiet observation.',
    action: {
      label: 'Begin the ascent',
      href: '#journey-gallery',
    },
    position: 'start',
    isPrimary: true,
  },
  {
    id: 'journey-gallery',
    eyebrow: '02 / रंग-पथ · COLOUR RIDGE',
    title: 'Let the colour lead.',
    description:
      'Step into original works created to linger in a room, a thought, or a memory.',
    action: {
      label: 'Explore the gallery',
      to: '/gallery',
    },
    position: 'gallery',
  },
  {
    id: 'journey-about',
    eyebrow: '03 / कलाकार · THE ARTIST',
    title: 'Meet the hand behind the work.',
    description:
      'Read the stories, small rituals, and visual worlds that shape the KalaVista studio.',
    action: {
      label: 'About the artist',
      to: '/about',
    },
    position: 'artist',
  },
  {
    id: 'journey-commissions',
    eyebrow: '04 / शिखर · THE SUMMIT',
    title: 'Make the next mark together.',
    description:
      'Bring an idea, a feeling, or an empty wall. We can turn it into something personal.',
    action: {
      label: 'Begin a commission',
      to: '/commissions',
    },
    position: 'summit',
  },
]

function JourneyAction({ action }) {
  if (action.href) {
    return (
      <a className="journey-stop__link" href={action.href}>
        {action.label}
        <span aria-hidden="true">↓</span>
      </a>
    )
  }

  return (
    <Link className="journey-stop__link" to={action.to}>
      {action.label}
      <span aria-hidden="true">↗</span>
    </Link>
  )
}

function JourneyStop({ stop, shouldReduceMotion }) {
  const Heading = stop.isPrimary ? 'h1' : 'h2'

  return (
    <section
      className={`art-journey__stop art-journey__stop--${stop.position}`}
      id={stop.id}
    >
      <motion.div
        className="journey-stop__card"
        initial={shouldReduceMotion ? false : { opacity: 0, y: 34 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ amount: 0.5, once: false }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="journey-stop__eyebrow">{stop.eyebrow}</p>

        <Heading
          className="journey-stop__title"
          id={stop.isPrimary ? 'art-journey-title' : undefined}
        >
          {stop.title}
        </Heading>

        <p className="journey-stop__description">{stop.description}</p>

        <JourneyAction action={stop.action} />
      </motion.div>
    </section>
  )
}

function ArtJourney() {
  const journeyRef = useRef(null)
  const shouldReduceMotion = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: journeyRef,
    offset: ['start start', 'end end'],
  })

  const backdropScale = useTransform(
    scrollYProgress,
    [0, 1],
    shouldReduceMotion ? [1, 1] : [1.06, 1.28],
  )

  const backdropY = useTransform(
    scrollYProgress,
    [0, 1],
    shouldReduceMotion ? [0, 0] : [0, -90],
  )

  const farRidgeY = useTransform(
    scrollYProgress,
    [0, 1],
    shouldReduceMotion ? [0, 0] : [95, -150],
  )

  const middleRidgeY = useTransform(
    scrollYProgress,
    [0, 1],
    shouldReduceMotion ? [0, 0] : [135, -95],
  )

  const foregroundRidgeY = useTransform(
    scrollYProgress,
    [0, 1],
    shouldReduceMotion ? [0, 0] : [180, -55],
  )

  const hazeY = useTransform(
    scrollYProgress,
    [0, 1],
    shouldReduceMotion ? [0, 0] : [0, -180],
  )

  const progressFill = useTransform(
    scrollYProgress,
    [0, 1],
    shouldReduceMotion ? [1, 1] : [0, 1],
  )

  const sceneImages = [0, 1, 2].map(
    (index) => artworks[index]?.image ?? heroBackdrop,
  )

  return (
    <section
      className="art-journey"
      ref={journeyRef}
      aria-labelledby="art-journey-title"
    >
      <div className="art-journey__scene" aria-hidden="true">
        <motion.div
          className="art-journey__backdrop"
          style={{
            backgroundImage: `linear-gradient(
              180deg,
              rgba(248, 241, 231, 0.18),
              rgba(31, 24, 31, 0.32)
            ), url("${heroBackdrop}")`,
            scale: backdropScale,
            y: backdropY,
          }}
        />

        <motion.div
          className="art-journey__haze art-journey__haze--one"
          style={{ y: hazeY }}
        />

        <motion.div
          className="art-journey__haze art-journey__haze--two"
          style={{ y: foregroundRidgeY }}
        />

        <motion.div
          className="art-journey__ridge art-journey__ridge--far"
          style={{
            backgroundImage: `linear-gradient(
              180deg,
              rgba(241, 212, 183, 0.28),
              rgba(28, 43, 76, 0.65)
            ), url("${sceneImages[1]}")`,
            y: farRidgeY,
          }}
        />

        <motion.div
          className="art-journey__ridge art-journey__ridge--middle"
          style={{
            backgroundImage: `linear-gradient(
              180deg,
              rgba(160, 63, 48, 0.25),
              rgba(31, 33, 58, 0.7)
            ), url("${sceneImages[0]}")`,
            y: middleRidgeY,
          }}
        />

        <motion.div
          className="art-journey__ridge art-journey__ridge--foreground"
          style={{
            backgroundImage: `linear-gradient(
              180deg,
              rgba(31, 20, 27, 0.08),
              rgba(30, 22, 29, 0.82)
            ), url("${sceneImages[2]}")`,
            y: foregroundRidgeY,
          }}
        />

        <div className="art-journey__guide">
          <span>BASE</span>

          <span className="art-journey__guide-line">
            <motion.span
              className="art-journey__guide-fill"
              style={{ scaleY: progressFill }}
            />
          </span>

          <span>शिखर</span>
        </div>
      </div>

      <div className="art-journey__stops">
        {journeyStops.map((stop) => (
          <JourneyStop
            key={stop.id}
            stop={stop}
            shouldReduceMotion={shouldReduceMotion}
          />
        ))}
      </div>
    </section>
  )
}

export default ArtJourney