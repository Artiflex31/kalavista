import { useRef, useState } from 'react'
import '../pages/AdminPages.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

const initialForm = {
  title: '',
  medium: '',
  year: new Date().getFullYear().toString(),
  dimensions: '',
  collection: '',
  priceInRupees: '',
  availability: 'AVAILABLE',
  moods: '',
  categories: '',
  alt: '',
  story: '',
  isFeatured: false,
}

function splitList(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function AdminArtworkForm({ token, onArtworkCreated }) {
  const fileInputRef = useRef(null)

  const [form, setForm] = useState(initialForm)
  const [imageFile, setImageFile] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  function updateField(event) {
    const { name, value, type, checked } = event.target

    setForm((currentForm) => ({
      ...currentForm,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function chooseImage(event) {
    const selectedFile = event.target.files?.[0] ?? null
    setImageFile(selectedFile)
    setMessage('')
  }

  async function uploadArtworkImage() {
    const uploadData = new FormData()
    uploadData.append('image', imageFile)

    const response = await fetch(`${API_URL}/api/artworks/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: uploadData,
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message ?? 'Image upload failed.')
    }

    return result.data.imageUrl
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')

    if (!imageFile) {
      setMessage('Please choose an artwork image from your device.')
      return
    }

    if (!form.title.trim() || !form.medium.trim() || !form.story.trim()) {
      setMessage('Title, medium, and artwork story are required.')
      return
    }

    setIsSubmitting(true)

    try {
      // Step 1: device file → Cloudinary
      const imageUrl = await uploadArtworkImage()

      // Step 2: artwork information + Cloudinary URL → Neon database
      const artworkPayload = {
        title: form.title.trim(),
        medium: form.medium.trim(),
        year: Number(form.year),
        dimensions: form.dimensions.trim() || null,
        collection: form.collection.trim() || null,
        moods: splitList(form.moods),
        categories: splitList(form.categories),
        availability: form.availability,
        priceInPaise: form.priceInRupees
          ? Math.round(Number(form.priceInRupees) * 100)
          : null,
        currency: 'INR',
        imageUrl,
        alt: form.alt.trim() || null,
        story: form.story.trim(),
        isFeatured: form.isFeatured,
      }

      const response = await fetch(`${API_URL}/api/artworks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(artworkPayload),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message ?? 'Could not publish artwork.')
      }

      setMessage(`Published: ${result.data.title}`)
      setForm(initialForm)
      setImageFile(null)

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      onArtworkCreated?.(result.data)
    } catch (error) {
      setMessage(error.message ?? 'Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="admin-artwork-form" aria-labelledby="add-artwork-title">
      <div className="admin-artwork-form__heading">
        <div>
          <p className="admin-eyebrow">STUDIO MANAGEMENT</p>
          <h2 id="add-artwork-title">Publish a new artwork</h2>
        </div>

        <p>
          Choose an image from your device. KalaVista uploads it securely and
          saves it with this artwork.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="admin-form-grid">
          <label className="admin-form-field">
            <span>Artwork title *</span>
            <input
              name="title"
              value={form.title}
              onChange={updateField}
              placeholder="For example: Monsoon Silence"
              required
            />
          </label>

          <label className="admin-form-field">
            <span>Medium *</span>
            <input
              name="medium"
              value={form.medium}
              onChange={updateField}
              placeholder="For example: Acrylic on canvas"
              required
            />
          </label>

          <label className="admin-form-field">
            <span>Year *</span>
            <input
              name="year"
              type="number"
              min="1900"
              max="2100"
              value={form.year}
              onChange={updateField}
              required
            />
          </label>

          <label className="admin-form-field">
            <span>Dimensions</span>
            <input
              name="dimensions"
              value={form.dimensions}
              onChange={updateField}
              placeholder="For example: 24 × 30 in"
            />
          </label>

          <label className="admin-form-field">
            <span>Collection</span>
            <input
              name="collection"
              value={form.collection}
              onChange={updateField}
              placeholder="For example: Monsoon Studies"
            />
          </label>

          <label className="admin-form-field">
            <span>Price in INR</span>
            <input
              name="priceInRupees"
              type="number"
              min="0"
              step="0.01"
              value={form.priceInRupees}
              onChange={updateField}
              placeholder="For example: 6500"
            />
          </label>

          <label className="admin-form-field">
            <span>Availability</span>
            <select
              name="availability"
              value={form.availability}
              onChange={updateField}
            >
              <option value="AVAILABLE">Available</option>
              <option value="RESERVED">Reserved</option>
              <option value="SOLD">Sold</option>
              <option value="NOT_FOR_SALE">Not for sale</option>
            </select>
          </label>

          <label className="admin-form-field">
            <span>Artwork image *</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={chooseImage}
              required
            />
            <small>
              {imageFile
                ? `Selected: ${imageFile.name}`
                : 'JPG, PNG, or WEBP — maximum 8 MB.'}
            </small>
          </label>

          <label className="admin-form-field">
            <span>Moods</span>
            <input
              name="moods"
              value={form.moods}
              onChange={updateField}
              placeholder="Warm, Quiet, Reflective"
            />
          </label>

          <label className="admin-form-field">
            <span>Categories</span>
            <input
              name="categories"
              value={form.categories}
              onChange={updateField}
              placeholder="watercolour, soil-story"
            />
          </label>

          <label className="admin-form-field admin-form-field--wide">
            <span>Image description (alt text)</span>
            <input
              name="alt"
              value={form.alt}
              onChange={updateField}
              placeholder="Describe the artwork for screen-reader users"
            />
          </label>

          <label className="admin-form-field admin-form-field--wide">
            <span>Artwork story *</span>
            <textarea
              name="story"
              value={form.story}
              onChange={updateField}
              placeholder="What inspired this work?"
              required
            />
          </label>

          <label className="admin-form-checkbox admin-form-field--wide">
            <input
              name="isFeatured"
              type="checkbox"
              checked={form.isFeatured}
              onChange={updateField}
            />
            <span>Show this artwork in Featured Works</span>
          </label>
        </div>

        <button
          className="admin-primary-button"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Uploading and publishing…' : 'Publish artwork ↗'}
        </button>

        {message && (
          <p className="admin-form-message" role="status">
            {message}
          </p>
        )}
      </form>
    </section>
  )
}

export default AdminArtworkForm
