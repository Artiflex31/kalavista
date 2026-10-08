import { useEffect, useRef, useState } from 'react'
import '../pages/AdminPages.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

function formatPrice(priceInPaise, currency = 'INR') {
  if (!priceInPaise) {
    return 'Price on request'
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(priceInPaise / 100)
}

function splitList(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function getEditForm(artwork) {
  return {
    title: artwork.title ?? '',
    medium: artwork.medium ?? '',
    year: String(artwork.year ?? new Date().getFullYear()),
    dimensions: artwork.dimensions ?? '',
    collection: artwork.collection ?? '',
    moods: (artwork.moods ?? []).join(', '),
    categories: (artwork.categories ?? []).join(', '),
    availability: artwork.availability ?? 'AVAILABLE',
    priceInRupees: artwork.priceInPaise
      ? String(artwork.priceInPaise / 100)
      : '',
    alt: artwork.alt ?? '',
    story: artwork.story ?? '',
    isFeatured: artwork.isFeatured ?? false,
  }
}

function AdminArtworkManager({ token, refreshKey }) {
  const fileInputRef = useRef(null)

  const [artworks, setArtworks] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [editingArtwork, setEditingArtwork] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [replacementImage, setReplacementImage] = useState(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  async function loadArtworks() {
    setIsLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/artworks`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message ?? 'Could not load artworks.')
      }

      setArtworks(result.data ?? [])
    } catch (error) {
      setMessage(error.message ?? 'Could not load artworks.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadArtworks()
  }, [refreshKey, token])

  function beginEdit(artwork) {
    setEditingArtwork(artwork)
    setEditForm(getEditForm(artwork))
    setReplacementImage(null)
    setMessage('')

    window.setTimeout(() => {
      document
        .getElementById('edit-artwork-form')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
  }

  function cancelEdit() {
    setEditingArtwork(null)
    setEditForm(null)
    setReplacementImage(null)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function updateEditField(event) {
    const { name, value, type, checked } = event.target

    setEditForm((currentForm) => ({
      ...currentForm,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  async function uploadReplacementImage() {
    const uploadData = new FormData()
    uploadData.append('image', replacementImage)

    const response = await fetch(`${API_URL}/api/artworks/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: uploadData,
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message ?? 'Could not upload replacement image.')
    }

    return result.data.imageUrl
  }

  async function saveEdit(event) {
    event.preventDefault()

    if (!editingArtwork || !editForm) {
      return
    }

    if (
      !editForm.title.trim() ||
      !editForm.medium.trim() ||
      !editForm.story.trim()
    ) {
      setMessage('Title, medium, and artwork story are required.')
      return
    }

    setIsSavingEdit(true)
    setMessage('')

    try {
      let imageUrl = editingArtwork.imageUrl

      if (replacementImage) {
        imageUrl = await uploadReplacementImage()
      }

      const payload = {
        title: editForm.title.trim(),
        medium: editForm.medium.trim(),
        year: Number(editForm.year),
        dimensions: editForm.dimensions.trim(),
        collection: editForm.collection.trim(),
        moods: splitList(editForm.moods),
        categories: splitList(editForm.categories),
        availability: editForm.availability,
        priceInPaise: editForm.priceInRupees
          ? Math.round(Number(editForm.priceInRupees) * 100)
          : null,
        currency: 'INR',
        imageUrl: imageUrl ?? '',
        alt: editForm.alt.trim(),
        story: editForm.story.trim(),
        isFeatured: editForm.isFeatured,
      }

      const response = await fetch(
        `${API_URL}/api/artworks/${editingArtwork.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message ?? 'Could not update artwork.')
      }

      setArtworks((currentArtworks) =>
        currentArtworks.map((artwork) =>
          artwork.id === result.data.id ? result.data : artwork,
        ),
      )

      setMessage(result.message)
      cancelEdit()
    } catch (error) {
      setMessage(error.message ?? 'Could not update artwork.')
    } finally {
      setIsSavingEdit(false)
    }
  }

  async function deleteArtwork(artwork) {
    const shouldDelete = window.confirm(
      `Delete "${artwork.title}"?\n\nThis removes it from your KalaVista gallery.`,
    )

    if (!shouldDelete) {
      return
    }

    setDeletingId(artwork.id)
    setMessage('')

    try {
      const response = await fetch(`${API_URL}/api/artworks/${artwork.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message ?? 'Could not delete artwork.')
      }

      setArtworks((currentArtworks) =>
        currentArtworks.filter((item) => item.id !== artwork.id),
      )

      if (editingArtwork?.id === artwork.id) {
        cancelEdit()
      }

      setMessage(result.message)
    } catch (error) {
      setMessage(error.message ?? 'Could not delete artwork.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section
      className="admin-artwork-manager"
      aria-labelledby="manage-artworks-title"
    >
      <div className="admin-artwork-manager__heading">
        <div>
          <p className="admin-eyebrow">YOUR ARCHIVE</p>
          <h2 id="manage-artworks-title">Manage artworks</h2>
        </div>

        <button
          className="admin-refresh-button"
          type="button"
          onClick={loadArtworks}
        >
          Refresh ↻
        </button>
      </div>

      {message && (
        <p className="admin-form-message" role="status">
          {message}
        </p>
      )}

      {editingArtwork && editForm && (
        <form
          className="admin-edit-form"
          id="edit-artwork-form"
          onSubmit={saveEdit}
        >
          <div className="admin-edit-form__heading">
            <div>
              <p className="admin-eyebrow">EDITING ARTWORK</p>
              <h3>{editingArtwork.title}</h3>
            </div>

            <button
              className="admin-cancel-button"
              type="button"
              onClick={cancelEdit}
            >
              Cancel
            </button>
          </div>

          <div className="admin-form-grid">
            <label className="admin-form-field">
              <span>Artwork title *</span>
              <input
                name="title"
                value={editForm.title}
                onChange={updateEditField}
                required
              />
            </label>

            <label className="admin-form-field">
              <span>Medium *</span>
              <input
                name="medium"
                value={editForm.medium}
                onChange={updateEditField}
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
                value={editForm.year}
                onChange={updateEditField}
                required
              />
            </label>

            <label className="admin-form-field">
              <span>Dimensions</span>
              <input
                name="dimensions"
                value={editForm.dimensions}
                onChange={updateEditField}
              />
            </label>

            <label className="admin-form-field">
              <span>Collection</span>
              <input
                name="collection"
                value={editForm.collection}
                onChange={updateEditField}
              />
            </label>

            <label className="admin-form-field">
              <span>Price in INR</span>
              <input
                name="priceInRupees"
                type="number"
                min="0"
                step="0.01"
                value={editForm.priceInRupees}
                onChange={updateEditField}
              />
            </label>

            <label className="admin-form-field">
              <span>Availability</span>
              <select
                name="availability"
                value={editForm.availability}
                onChange={updateEditField}
              >
                <option value="AVAILABLE">Available</option>
                <option value="RESERVED">Reserved</option>
                <option value="SOLD">Sold</option>
                <option value="NOT_FOR_SALE">Not for sale</option>
              </select>
            </label>

            <label className="admin-form-field">
              <span>Replace image</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) =>
                  setReplacementImage(event.target.files?.[0] ?? null)
                }
              />
              <small>
                {replacementImage
                  ? `New image: ${replacementImage.name}`
                  : 'Leave empty to keep the current image.'}
              </small>
            </label>

            <label className="admin-form-field">
              <span>Moods</span>
              <input
                name="moods"
                value={editForm.moods}
                onChange={updateEditField}
              />
            </label>

            <label className="admin-form-field">
              <span>Categories</span>
              <input
                name="categories"
                value={editForm.categories}
                onChange={updateEditField}
              />
            </label>

            <label className="admin-form-field admin-form-field--wide">
              <span>Image description</span>
              <input
                name="alt"
                value={editForm.alt}
                onChange={updateEditField}
              />
            </label>

            <label className="admin-form-field admin-form-field--wide">
              <span>Artwork story *</span>
              <textarea
                name="story"
                value={editForm.story}
                onChange={updateEditField}
                required
              />
            </label>

            <label className="admin-form-checkbox admin-form-field--wide">
              <input
                name="isFeatured"
                type="checkbox"
                checked={editForm.isFeatured}
                onChange={updateEditField}
              />
              <span>Show this artwork in Featured Works</span>
            </label>
          </div>

          <button
            className="admin-primary-button"
            type="submit"
            disabled={isSavingEdit}
          >
            {isSavingEdit ? 'Saving changes…' : 'Save artwork changes'}
          </button>
        </form>
      )}

      {isLoading ? (
        <p className="admin-empty-copy">Loading your artworks…</p>
      ) : artworks.length === 0 ? (
        <p className="admin-empty-copy">
          No artworks published yet. Use the form above to add your first one.
        </p>
      ) : (
        <div className="admin-artwork-list">
          {artworks.map((artwork) => (
            <article className="admin-artwork-item" key={artwork.id}>
              <div className="admin-artwork-item__image">
                {artwork.imageUrl ? (
                  <img src={artwork.imageUrl} alt="" />
                ) : (
                  <span aria-hidden="true">कला</span>
                )}
              </div>

              <div className="admin-artwork-item__content">
                <p>{artwork.collection ?? 'KalaVista artwork'}</p>
                <h3>{artwork.title}</h3>
                <span>
                  {artwork.medium} · {artwork.year}
                </span>
              </div>

              <div className="admin-artwork-item__meta">
                <strong>
                  {formatPrice(artwork.priceInPaise, artwork.currency)}
                </strong>

                <span className="admin-artwork-item__availability">
                  {artwork.availability.replaceAll('_', ' ')}
                </span>
              </div>

              <div className="admin-artwork-item__actions">
                <button
                  className="admin-edit-button"
                  type="button"
                  onClick={() => beginEdit(artwork)}
                >
                  Edit
                </button>

                <button
                  className="admin-delete-button"
                  type="button"
                  disabled={deletingId === artwork.id}
                  onClick={() => deleteArtwork(artwork)}
                >
                  {deletingId === artwork.id ? 'Removing…' : 'Delete'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default AdminArtworkManager
