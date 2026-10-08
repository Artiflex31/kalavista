import { useEffect, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

const progressOptions = [
  { value: 'REQUEST_RECEIVED', label: 'Request received' },
  { value: 'QUOTE_READY', label: 'Quote ready' },
  { value: 'ADVANCE_RECEIVED', label: 'Payment received' },
  { value: 'IN_PROGRESS', label: 'Artwork in progress' },
  { value: 'PREVIEW_READY', label: 'Preview ready' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

function AdminCommissionProgress({ enquiry, token, onProgressUpdated }) {
  const [progress, setProgress] = useState(
    enquiry.progress ?? 'REQUEST_RECEIVED',
  )
  const [message, setMessage] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    setProgress(enquiry.progress ?? 'REQUEST_RECEIVED')
  }, [enquiry.id, enquiry.progress])

  const trackingLink = enquiry.trackingReference
    ? `${window.location.origin}/commission-status/${enquiry.trackingReference}`
    : ''

  async function updateProgress(nextProgress) {
    setIsUpdating(true)
    setMessage('')

    try {
      const response = await fetch(
        `${API_URL}/api/commission-enquiries/${enquiry.id}/progress`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            progress: nextProgress,
          }),
        },
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message ?? 'Could not update progress.')
      }

      setProgress(result.data.progress)
      setMessage('Client tracking progress updated.')
      onProgressUpdated?.(result.data)
    } catch (error) {
      setMessage(error.message ?? 'Could not update progress.')
    } finally {
      setIsUpdating(false)
    }
  }

  async function copyTrackingLink() {
    if (!trackingLink) {
      setMessage('Tracking link is not available yet.')
      return
    }

    try {
      await navigator.clipboard.writeText(trackingLink)
      setMessage('Tracking link copied. You can now send it to the client.')
    } catch {
      setMessage('Copy failed. Select the link below and copy it manually.')
    }
  }

  return (
    <section className="admin-commission-progress">
      <div className="admin-commission-progress__heading">
        <div>
          <p>CLIENT TRACKER</p>
          <h4>Artwork progress</h4>
        </div>

        <span>{progress.replaceAll('_', ' ')}</span>
      </div>

      <label className="admin-commission-progress__select">
        <span>Current stage</span>

        <select
          value={progress}
          disabled={isUpdating}
          onChange={(event) => updateProgress(event.target.value)}
        >
          {progressOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {trackingLink && (
        <div className="admin-commission-progress__link">
          <label>
            <span>Private client tracking link</span>
            <input value={trackingLink} readOnly />
          </label>

          <button type="button" onClick={copyTrackingLink}>
            Copy tracking link
          </button>
        </div>
      )}

      {message && (
        <p className="admin-commission-progress__message" role="status">
          {message}
        </p>
      )}
    </section>
  )
}

export default AdminCommissionProgress
