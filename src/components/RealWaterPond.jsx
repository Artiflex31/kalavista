import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import pondImageDesktop from '../assets/kalavista-commission-pond.webp'
import pondImageMobile from '../assets/kalavista-pond-mobile.jpg'

const RealWaterPond = forwardRef(function RealWaterPond(
  { children, className = '', style, ...sectionProps },
  ref,
) {
  const hostRef = useRef(null)
  const jqueryRef = useRef(null)
  const isReadyRef = useRef(false)
  const queuedDropsRef = useRef([])

  // 👇 FIX: Pehli baar me hi sahi image utha lo, flash na ho
  const [activeImage, setActiveImage] = useState(() => {
    if (typeof window === 'undefined') return pondImageDesktop
    const isMobile = window.matchMedia(
      '(max-width: 899px), (pointer: coarse)',
    ).matches
    return isMobile ? pondImageMobile : pondImageDesktop
  })

  const sendDrop = useCallback(
    ({ clientX, clientY, radius = 25, strength = 0.09 } = {}) => {
      // ... (same as before)
      const host = hostRef.current
      const $ = jqueryRef.current
      if (!host || !$ || !isReadyRef.current) return false
      const bounds = host.getBoundingClientRect()
      const x = Number.isFinite(clientX)
        ? clientX - bounds.left
        : bounds.width / 2
      const y = Number.isFinite(clientY)
        ? clientY - bounds.top
        : bounds.height / 2
      try {
        $(host).ripples('drop', x, y, radius, strength)
        return true
      } catch {
        return false
      }
    },
    [],
  )

  useEffect(() => {
    // ... (same as before)
    let cancelled = false
    let $pond = null
    let resizeObserver = null

    async function startSimulation() {
      const host = hostRef.current
      if (!host) return

      try {
        const jqueryModule = await import('jquery')
        const $ = jqueryModule.default ?? jqueryModule
        window.$ = $
        window.jQuery = $
        await import('jquery.ripples')

        if (cancelled || !hostRef.current || typeof $.fn.ripples !== 'function')
          return

        $pond = $(hostRef.current)
        const isSmallScreen = window.matchMedia(
          '(max-width: 899px), (pointer: coarse)',
        ).matches

        $pond.ripples({
          imageUrl: activeImage,
          resolution: isSmallScreen ? 192 : 256,
          dropRadius: isSmallScreen ? 22 : 26,
          perturbance: isSmallScreen ? 0.026 : 0.03,
          interactive: false,
        })

        // ... rest of the simulation code is the same
        if (cancelled) {
          $pond.ripples('destroy')
          return
        }
        jqueryRef.current = $
        isReadyRef.current = true
        queuedDropsRef.current.splice(0).forEach((drop) => sendDrop(drop))
        if ('ResizeObserver' in window) {
          resizeObserver = new ResizeObserver(() => {
            try {
              $pond?.ripples('updateSize')
            } catch {}
          })
          resizeObserver.observe(hostRef.current)
        }
      } catch (error) {
        console.warn('KalaVista water simulation could not start.', error)
      }
    }

    startSimulation()
    return () => {
      cancelled = true
      resizeObserver?.disconnect()
      if ($pond && isReadyRef.current) {
        try {
          $pond.ripples('destroy')
        } catch {}
      }
      isReadyRef.current = false
      jqueryRef.current = null
    }
  }, [activeImage, sendDrop])

  useImperativeHandle(
    ref,
    () => ({
      addDrop(options = {}) {
        if (sendDrop(options)) return
        queuedDropsRef.current.push(options)
        if (queuedDropsRef.current.length > 12) queuedDropsRef.current.shift()
      },
    }),
    [sendDrop],
  )

  return (
    <section
      ref={hostRef}
      className={`real-water-pond ${className}`.trim()}
      style={{
        backgroundImage: `url("${activeImage}")`,
        ...style,
      }}
      {...sectionProps}
    >
      {children}
    </section>
  )
})

RealWaterPond.displayName = 'RealWaterPond'
export default RealWaterPond
