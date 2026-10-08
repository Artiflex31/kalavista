import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import RealWaterPond from '../components/RealWaterPond'
import './CommissionsPage.css'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

const commissionOptions = [
  {
    value: 'Portrait & character art',
    short: 'Portrait',
    number: '01',
    description: 'People, characters, and expressive faces.',
    colour: '#e77762',
  },
  {
    value: 'Custom illustration',
    short: 'Illustration',
    number: '02',
    description: 'A visual story built around your idea.',
    colour: '#d89a4b',
  },
  {
    value: 'Traditional / watercolour',
    short: 'Watercolour',
    number: '03',
    description: 'Soft, textured work with an organic feel.',
    colour: '#809f91',
  },
  {
    value: 'Digital artwork',
    short: 'Digital art',
    number: '04',
    description: 'Colourful artwork for screens, prints, or gifts.',
    colour: '#718dc6',
  },
]

function formatArtworkSlug(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function CommissionsPage() {
  const [searchParams] = useSearchParams()

  const artworkSlug =
    searchParams.get('artwork') ?? searchParams.get('inspired-by') ?? ''

  const [selectedType, setSelectedType] = useState(commissionOptions[0].value)
  const [referenceFileName, setReferenceFileName] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [submitStatus, setSubmitStatus] = useState('idle')

  const waterRef = useRef(null)
  const lastDropAtRef = useRef(0)

  function chooseType(value) {
    setSelectedType(value)
    setFormMessage('')
  }

  function createWaterDrop({
    element,
    clientX,
    clientY,
    radius = 32,
    strength = 0.14,
    isTyping = false,
    force = false,
  }) {
    if (
      !waterRef.current ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }

    const now = window.performance.now()
    const minimumGap = isTyping ? 500 : 110

    if (!force && now - lastDropAtRef.current < minimumGap) {
      return
    }

    lastDropAtRef.current = now

    const elementBounds = element?.getBoundingClientRect?.()
    const x = Number.isFinite(clientX)
      ? clientX
      : elementBounds
        ? elementBounds.left + elementBounds.width / 2
        : undefined

    const y = Number.isFinite(clientY)
      ? clientY
      : elementBounds
        ? elementBounds.top + elementBounds.height / 2
        : undefined

    waterRef.current.addDrop({
      clientX: x,
      clientY: y,
      radius: isTyping ? 17 : radius,
      strength: isTyping ? 0.052 : strength,
    })
  }

  function handleRequestPointerDown(event) {
    const element =
      event.target.closest?.('button, input, select, textarea, label') ??
      event.target

    createWaterDrop({
      element,
      clientX: event.clientX,
      clientY: event.clientY,
    })
  }

  function handleOptionClick(event, value) {
    chooseType(value)

    if (event.detail === 0) {
      createWaterDrop({
        element: event.currentTarget,
        force: true,
      })
    }
  }

  function handleArtworkTypeChange(event) {
    chooseType(event.target.value)
    createWaterDrop({
      element: event.currentTarget,
      strength: 0.1,
    })
  }

  function handleReferenceChange(event) {
    setReferenceFileName(event.target.files?.[0]?.name ?? '')
    createWaterDrop({
      element: event.currentTarget,
      strength: 0.16,
    })
  }

  function handleFormInput(event) {
    if (!event.target.matches('input, textarea, select')) {
      return
    }

    createWaterDrop({
      element: event.target,
      isTyping: true,
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const form = event.currentTarget
    const formData = new FormData(form)

    createWaterDrop({
      element: form.querySelector('button[type="submit"]'),
      radius: 40,
      strength: 0.2,
      force: true,
    })

    setSubmitStatus('submitting')
    setFormMessage('')

    const payload = {
      name: String(formData.get('name') ?? '').trim(),
      email: String(formData.get('email') ?? '').trim(),
      artworkType: selectedType,
      budget: String(formData.get('budget') ?? '').trim(),
      message: String(formData.get('brief') ?? '').trim(),
      timeline: String(formData.get('timeline') ?? '').trim(),
      artworkSlug: artworkSlug || undefined,
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/commission-enquiries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        const firstFieldError = Object.values(result?.errors ?? {})
          .flat()
          .find(Boolean)

        throw new Error(
          firstFieldError ??
            result?.message ??
            'Your enquiry could not be sent. Please try again.',
        )
      }

      form.reset()
      setSelectedType(commissionOptions[0].value)
      setReferenceFileName('')
      setSubmitStatus('success')

      setFormMessage(
        artworkSlug
          ? `Your enquiry about ${formatArtworkSlug(
              artworkSlug,
            )} has been received. I will get back to you soon.`
          : 'Your commission brief has been received. I will get back to you soon.',
      )
    } catch (error) {
      setSubmitStatus('error')
      setFormMessage(
        error.message ?? 'Your enquiry could not be sent. Please try again.',
      )
    }
  }

  return (
    <section
      className="commissions-page"
      aria-labelledby="commissions-page-title"
    >
      <RealWaterPond
        className="commissions-page__request"
        id="commission-form"
        ref={waterRef}
        onPointerDownCapture={handleRequestPointerDown}
        aria-labelledby="commission-form-title"
      >
        <div className="commission-water__content">
          <div className="commissions-page__request-intro">
            <p className="commissions-page__eyebrow">
              YOUR COMMISSION / START HERE
            </p>

            <h2 id="commission-form-title">
              Choose a starting point,
              <span> then tell me the story.</span>
            </h2>

            <p>
              Choose the feeling you want to begin with. Each style sets a
              gentle first direction for your commission.
            </p>

            <div
              className="commission-options"
              aria-label="Choose a commission type"
            >
              {commissionOptions.map((option) => {
                const isSelected = selectedType === option.value

                return (
                  <button
                    className={
                      isSelected
                        ? 'commission-option commission-option--selected'
                        : 'commission-option'
                    }
                    key={option.value}
                    type="button"
                    aria-pressed={isSelected}
                    style={{ '--option-colour': option.colour }}
                    onClick={(event) => handleOptionClick(event, option.value)}
                  >
                    <span>{option.number}</span>

                    <div>
                      <strong>{option.value}</strong>
                      <p>{option.description}</p>
                    </div>

                    <i aria-hidden="true">↗</i>
                  </button>
                )
              })}
            </div>
          </div>

          <form
            className="commission-form"
            onSubmit={handleSubmit}
            onInput={handleFormInput}
          >
            <div className="commission-form__grid">
              <div className="commission-form__field">
                <label htmlFor="commission-name">
                  Your name <span aria-hidden="true">*</span>
                </label>

                <input
                  id="commission-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Your name"
                  required
                />
              </div>

              <div className="commission-form__field">
                <label htmlFor="commission-email">
                  Email address <span aria-hidden="true">*</span>
                </label>

                <input
                  id="commission-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="commission-form__field">
                <label htmlFor="commission-type">
                  Artwork type <span aria-hidden="true">*</span>
                </label>

                <select
                  id="commission-type"
                  name="type"
                  value={selectedType}
                  onChange={handleArtworkTypeChange}
                >
                  {commissionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.value}
                    </option>
                  ))}
                </select>
              </div>

              <div className="commission-form__field">
                <label htmlFor="commission-budget">Approximate budget</label>

                <select id="commission-budget" name="budget">
                  <option value="">Choose a range</option>
                  <option>Under ₹3,000</option>
                  <option>₹3,000 – ₹7,000</option>
                  <option>₹7,000 – ₹15,000</option>
                  <option>Let’s discuss</option>
                </select>
              </div>

              <div className="commission-form__field commission-form__field--wide">
                <label htmlFor="commission-brief">
                  What should this artwork hold?{' '}
                  <span aria-hidden="true">*</span>
                </label>

                <textarea
                  id="commission-brief"
                  name="brief"
                  rows="6"
                  minLength="10"
                  placeholder="For example: a watercolour portrait of my grandparents in their old home, with a warm monsoon feeling..."
                  required
                />
              </div>

              <div className="commission-form__field">
                <label htmlFor="commission-timeline">Ideal timeline</label>

                <select id="commission-timeline" name="timeline">
                  <option value="">No fixed deadline</option>
                  <option>Within 2 weeks</option>
                  <option>Within 1 month</option>
                  <option>For a specific gift date</option>
                </select>
              </div>

              <div className="commission-form__field">
                <label htmlFor="commission-reference">Reference image</label>

                <input
                  id="commission-reference"
                  name="reference"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  onChange={handleReferenceChange}
                />

                <p className="commission-form__file-name">
                  {referenceFileName || 'Optional: image or PDF reference'}
                </p>
              </div>
            </div>

            <button
              className="commission-form__submit"
              type="submit"
              disabled={submitStatus === 'submitting'}
            >
              {submitStatus === 'submitting'
                ? 'Sending your brief...'
                : 'Send commission brief'}
              <span aria-hidden="true">↗</span>
            </button>

            {formMessage && (
              <p className="commission-form__status" role="status">
                {formMessage}
              </p>
            )}

            <p className="commission-form__note">
              {artworkSlug
                ? `This enquiry is linked to ${formatArtworkSlug(artworkSlug)}.`
                : 'Your commission request is saved securely in the KalaVista artist inbox.'}{' '}
              Reference files will be uploaded securely in the dashboard
              milestone.
            </p>
          </form>
        </div>
      </RealWaterPond>
    </section>
  )
}

export default CommissionsPage
