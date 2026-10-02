import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'
import pondImage from '../assets/kalavista-commission-pond.webp'

const RealWaterPond = forwardRef(function RealWaterPond(
  { children, className = '', style, ...sectionProps },
  ref,
) {
  const hostRef = useRef(null)
  const jqueryRef = useRef(null)
  const isReadyRef = useRef(false)
  const queuedDropsRef = useRef([])

  const sendDrop = useCallback(
    ({ clientX, clientY, radius = 25, strength = 0.09 } = {}) => {
      const host = hostRef.current
      const $ = jqueryRef.current

      if (!host || !$ || !isReadyRef.current) {
        return false
      }

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
    let cancelled = false
    let $pond = null
    let resizeObserver = null

    async function startSimulation() {
      const host = hostRef.current

      if (!host) {
        return
      }

      try {
        /*
          jquery.ripples is a WebGL plugin, not a React component.
          Importing it here keeps React 19 in charge of the page while the
          plugin owns only this background element.
        */
        const jqueryModule = await import('jquery')
        const $ = jqueryModule.default ?? jqueryModule

        window.$ = $
        window.jQuery = $

        await import('jquery.ripples')

        if (
          cancelled ||
          !hostRef.current ||
          typeof $.fn.ripples !== 'function'
        ) {
          return
        }

        $pond = $(hostRef.current)

        $pond.ripples({
          imageUrl: pondImage,
          resolution: 200,
          dropRadius: 24,
          perturbance: 0.026,
          interactive: false,
        })

        if (cancelled) {
          $pond.ripples('destroy')
          return
        }

        jqueryRef.current = $
        isReadyRef.current = true

        queuedDropsRef.current.splice(0).forEach((drop) => {
          sendDrop(drop)
        })

        if ('ResizeObserver' in window) {
          resizeObserver = new ResizeObserver(() => {
            try {
              $pond?.ripples('updateSize')
            } catch {
              // The simulation may be shutting down during a route change.
            }
          })

          resizeObserver.observe(hostRef.current)
        }
      } catch (error) {
        /*
          The CSS background image remains visible as a static fallback for
          devices without the required WebGL float-texture support.
        */
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
        } catch {
          // The WebGL context may already have been disposed.
        }
      }

      isReadyRef.current = false
      jqueryRef.current = null
    }
  }, [sendDrop])

  useImperativeHandle(
    ref,
    () => ({
      addDrop(options = {}) {
        if (sendDrop(options)) {
          return
        }

        queuedDropsRef.current.push(options)

        if (queuedDropsRef.current.length > 12) {
          queuedDropsRef.current.shift()
        }
      },
    }),
    [sendDrop],
  )

  return (
    <section
      ref={hostRef}
      className={`real-water-pond ${className}`.trim()}
      style={{
        backgroundImage: `url("${pondImage}")`,
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
