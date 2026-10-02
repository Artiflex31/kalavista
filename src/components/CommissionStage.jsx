import { useEffect, useRef } from 'react'

function resetStage(stage) {
  stage.classList.remove('commission-stage--tilting')
  stage.style.setProperty('--tilt-x', '-5deg')
  stage.style.setProperty('--tilt-y', '0deg')
  stage.style.setProperty('--glow-x', '50%')
  stage.style.setProperty('--glow-y', '50%')
}

function CommissionStage({ choice }) {
  const stageRef = useRef(null)
  const animationFrameRef = useRef(0)
  const canTiltRef = useRef(false)

  useEffect(() => {
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    function updateCapability() {
      canTiltRef.current = finePointer.matches && !reducedMotion.matches

      if (!canTiltRef.current && stageRef.current) {
        resetStage(stageRef.current)
      }
    }

    updateCapability()

    finePointer.addEventListener('change', updateCapability)
    reducedMotion.addEventListener('change', updateCapability)

    return () => {
      finePointer.removeEventListener('change', updateCapability)
      reducedMotion.removeEventListener('change', updateCapability)
      window.cancelAnimationFrame(animationFrameRef.current)
    }
  }, [])

  function handlePointerEnter(event) {
    if (canTiltRef.current) {
      event.currentTarget.classList.add('commission-stage--tilting')
    }
  }

  function handlePointerMove(event) {
    if (!canTiltRef.current) {
      return
    }

    const stage = event.currentTarget
    const bounds = stage.getBoundingClientRect()

    const x = Math.min(
      Math.max((event.clientX - bounds.left) / bounds.width, 0),
      1,
    )

    const y = Math.min(
      Math.max((event.clientY - bounds.top) / bounds.height, 0),
      1,
    )

    const tiltX = (0.5 - y) * 8 - 5
    const tiltY = (x - 0.5) * 12

    window.cancelAnimationFrame(animationFrameRef.current)

    animationFrameRef.current = window.requestAnimationFrame(() => {
      stage.style.setProperty('--tilt-x', `${tiltX}deg`)
      stage.style.setProperty('--tilt-y', `${tiltY}deg`)
      stage.style.setProperty('--glow-x', `${x * 100}%`)
      stage.style.setProperty('--glow-y', `${y * 100}%`)
    })
  }

  function handlePointerLeave(event) {
    resetStage(event.currentTarget)
  }

  return (
    <div
      className="commission-stage"
      ref={stageRef}
      style={{ '--commission-choice': choice.colour }}
      aria-hidden="true"
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerLeave}
    >
      <div className="commission-stage__glow" />

      <div className="commission-stage__world">
        <div className="commission-stage__backdrop" />
        <div className="commission-stage__plane" />

        <article className="commission-stage__card commission-stage__card--idea">
          <div className="commission-stage__card-face">
            <span>01 / YOUR IDEA</span>
            <strong>Memory</strong>
            <p>A person, a place, a feeling.</p>
            <i className="commission-stage__sun" />
          </div>
        </article>

        <article className="commission-stage__card commission-stage__card--final">
          <div className="commission-stage__card-face">
            <span>03 / FINAL ARTWORK</span>
            <strong>
              Made
              <br />
              to stay.
            </strong>
            <p>Original art with a story behind it.</p>
            <i className="commission-stage__moon" />
          </div>
        </article>

        <div className="commission-stage__main-float">
          <article className="commission-stage__card commission-stage__card--brief">
            <div className="commission-stage__card-face commission-stage__card-face--brief">
              <span>02 / KALAVISTA</span>
              <p className="commission-stage__type">{choice.short}</p>
              <strong>
                Commission
                <br />
                brief
              </strong>
              <p className="commission-stage__caption">
                Colour, memory, and a world of your own.
              </p>

              <div className="commission-stage__marks">
                <i />
                <i />
                <i />
              </div>
            </div>
          </article>
        </div>

        <div className="commission-stage__palette">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>

        <div className="commission-stage__brush" />

        <div className="commission-stage__note">
          Your idea,
          <br />
          made tangible.
        </div>
      </div>

      <p className="commission-stage__hint">Move around the studio</p>
    </div>
  )
}

export default CommissionStage
