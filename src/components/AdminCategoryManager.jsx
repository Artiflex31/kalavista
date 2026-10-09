import { useEffect, useMemo, useRef, useState } from 'react'
import '../pages/AdminPages.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function AdminCategoryManager({ token }) {
  const editFileRef = useRef(null)
  const createFileRef = useRef(null)

  const [categories, setCategories] = useState([])
  const [artworks, setArtworks] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState('')

  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [editImageFile, setEditImageFile] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ label: '', accent: '#9c4135' })
  const [createImageFile, setCreateImageFile] = useState(null)
  const [isCreating, setIsCreating] = useState(false)

  async function loadAll() {
    setIsLoading(true)
    try {
      const [catRes, artRes] = await Promise.all([
        fetch(`${API_URL}/api/categories`),
        fetch(`${API_URL}/api/artworks`),
      ])
      const catJson = await catRes.json()
      const artJson = await artRes.json()
      if (catRes.ok) setCategories(catJson.data ?? [])
      if (artRes.ok) setArtworks(artJson.data ?? [])
    } catch (error) {
      setMessage(error.message ?? 'Could not load categories.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const counts = useMemo(() => {
    const map = {}
    for (const artwork of artworks) {
      for (const slug of artwork.categories ?? []) {
        map[slug] = (map[slug] ?? 0) + 1
      }
    }
    return map
  }, [artworks])

  async function uploadCategoryImage(file) {
    const data = new FormData()
    data.append('image', file)

    const response = await fetch(`${API_URL}/api/categories/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: data,
    })

    const result = await response.json()
    if (!response.ok) {
      throw new Error(result.message ?? 'Category image upload failed.')
    }
    return result.data.imageUrl
  }

  function openCreate() {
    setIsCreateOpen(true)
    setEditingId(null)
    setEditForm(null)
    setEditImageFile(null)
    setMessage('')
  }

  function cancelCreate() {
    setIsCreateOpen(false)
    setCreateForm({ label: '', accent: '#9c4135' })
    setCreateImageFile(null)
    if (createFileRef.current) createFileRef.current.value = ''
  }

  async function submitCreate(event) {
    event.preventDefault()
    setMessage('')

    const label = createForm.label.trim()
    if (label.length < 2) {
      setMessage('Category name must be at least 2 characters.')
      return
    }

    const slug = slugify(label)
    if (!slug) {
      setMessage('Category name must contain at least one letter or number.')
      return
    }

    setIsCreating(true)

    try {
      let imageUrl
      if (createImageFile) {
        imageUrl = await uploadCategoryImage(createImageFile)
      }

      const response = await fetch(`${API_URL}/api/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          slug,
          label,
          accent: createForm.accent,
          imageUrl: imageUrl || undefined,
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.message ?? 'Could not create category.')
      }

      setCategories((current) => [...current, result.data])
      setMessage(`Category "${result.data.label}" created.`)
      cancelCreate()
    } catch (error) {
      setMessage(error.message ?? 'Could not create category.')
    } finally {
      setIsCreating(false)
    }
  }

  function beginEdit(category) {
    setIsCreateOpen(false)
    setEditingId(category.id)
    setEditForm({
      label: category.label,
      accent: category.accent,
      imageUrl: category.imageUrl ?? '',
      alt: category.alt ?? '',
    })
    setEditImageFile(null)
    setMessage('')

    window.setTimeout(() => {
      document
        .getElementById('category-edit-form')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm(null)
    setEditImageFile(null)
    if (editFileRef.current) editFileRef.current.value = ''
  }

  async function submitEdit(event) {
    event.preventDefault()
    if (!editForm || !editingId) return

    setMessage('')
    setIsSaving(true)

    try {
      let imageUrl = editForm.imageUrl
      if (editImageFile) {
        imageUrl = await uploadCategoryImage(editImageFile)
      }

      const response = await fetch(`${API_URL}/api/categories/${editingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          label: editForm.label.trim(),
          accent: editForm.accent,
          imageUrl: imageUrl || '',
          alt: editForm.alt.trim(),
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.message ?? 'Could not update category.')
      }

      setCategories((current) =>
        current.map((item) =>
          item.id === result.data.id ? result.data : item,
        ),
      )
      setMessage(result.message ?? 'Category updated.')
      cancelEdit()
    } catch (error) {
      setMessage(error.message ?? 'Could not update category.')
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteCategory(category) {
    const count = counts[category.slug] ?? 0
    const warning =
      count > 0
        ? `\n\n${count} artwork(s) still use this category. The deletion will be refused unless you reassign them first.`
        : ''

    if (!window.confirm(`Delete "${category.label}"?${warning}`)) return

    setDeletingId(category.id)
    setMessage('')

    try {
      const response = await fetch(`${API_URL}/api/categories/${category.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.message ?? 'Could not delete category.')
      }

      setCategories((current) =>
        current.filter((item) => item.id !== category.id),
      )
      setMessage(result.message ?? 'Category deleted.')
    } catch (error) {
      setMessage(error.message ?? 'Could not delete category.')
    } finally {
      setDeletingId(null)
    }
  }

  const createSlugPreview = slugify(createForm.label)

  return (
    <section
      className="admin-categories"
      aria-labelledby="admin-categories-title"
    >
      <div className="admin-categories__heading">
        <div>
          <p className="admin-eyebrow">CATEGORY ARCHIVE</p>
          <h2 id="admin-categories-title">Categories</h2>
          <p className="admin-categories__intro">
            Each category becomes a card in the gallery conveyor. Upload a cover
            image, or leave it empty and the first artwork in that category will
            be used instead.
          </p>
        </div>

        <button
          className="admin-refresh-button"
          type="button"
          onClick={loadAll}
        >
          Refresh ↻
        </button>
      </div>

      {message && (
        <p className="admin-form-message" role="status">
          {message}
        </p>
      )}

      <button
        className="admin-primary-button admin-categories__new-button"
        type="button"
        onClick={isCreateOpen ? cancelCreate : openCreate}
      >
        {isCreateOpen ? 'Cancel new category' : '+ New category'}
      </button>

      {isCreateOpen && (
        <form className="admin-category-form" onSubmit={submitCreate}>
          <div className="admin-category-form__heading">
            <p className="admin-eyebrow">NEW CATEGORY</p>
            <h3>Create a category</h3>
          </div>

          <div className="admin-category-form__grid">
            <label className="admin-form-field">
              <span>Name *</span>
              <input
                value={createForm.label}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    label: event.target.value,
                  }))
                }
                placeholder="For example: Pencil Sketches"
                required
              />
              <small>URL slug: {createSlugPreview || '…'}</small>
            </label>

            <label className="admin-form-field">
              <span>Accent colour</span>
              <input
                type="color"
                value={createForm.accent}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    accent: event.target.value,
                  }))
                }
              />
            </label>

            <label className="admin-form-field">
              <span>Cover image (optional)</span>
              <input
                ref={createFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) =>
                  setCreateImageFile(event.target.files?.[0] ?? null)
                }
              />
              <small>
                {createImageFile
                  ? `Selected: ${createImageFile.name}`
                  : 'Leave empty to use the first artwork in this category.'}
              </small>
            </label>
          </div>

          <button
            className="admin-primary-button"
            type="submit"
            disabled={isCreating}
          >
            {isCreating ? 'Creating…' : 'Create category'}
          </button>
        </form>
      )}

      {editingId && editForm && (
        <form
          className="admin-category-form admin-category-form--edit"
          id="category-edit-form"
          onSubmit={submitEdit}
        >
          <div className="admin-category-form__heading">
            <div>
              <p className="admin-eyebrow">EDITING CATEGORY</p>
              <h3>{editForm.label}</h3>
            </div>

            <button
              className="admin-cancel-button"
              type="button"
              onClick={cancelEdit}
            >
              Cancel
            </button>
          </div>

          <div className="admin-category-form__grid">
            <label className="admin-form-field">
              <span>Name *</span>
              <input
                value={editForm.label}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    label: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label className="admin-form-field">
              <span>Accent colour</span>
              <input
                type="color"
                value={editForm.accent}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    accent: event.target.value,
                  }))
                }
              />
            </label>

            <label className="admin-form-field">
              <span>Replace cover image</span>
              <input
                ref={editFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) =>
                  setEditImageFile(event.target.files?.[0] ?? null)
                }
              />
              <small>
                {editImageFile
                  ? `New: ${editImageFile.name}`
                  : editForm.imageUrl
                    ? 'Leave empty to keep the current image.'
                    : 'No image yet — one will appear in the preview below.'}
              </small>
            </label>

            <label className="admin-form-field">
              <span>Image description</span>
              <input
                value={editForm.alt}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    alt: event.target.value,
                  }))
                }
                placeholder="Describe this category’s cover image"
              />
            </label>

            {editForm.imageUrl && (
              <div className="admin-category-form__preview admin-form-field--wide">
                <span>Current cover image</span>
                <img src={editForm.imageUrl} alt="" />
              </div>
            )}
          </div>

          <button
            className="admin-primary-button"
            type="submit"
            disabled={isSaving}
          >
            {isSaving ? 'Saving changes…' : 'Save changes'}
          </button>
        </form>
      )}

      {isLoading ? (
        <p className="admin-empty-copy">Loading categories…</p>
      ) : categories.length === 0 ? (
        <p className="admin-empty-copy">
          No categories yet. Create your first one above.
        </p>
      ) : (
        <div className="admin-category-list">
          {categories.map((category) => {
            const count = counts[category.slug] ?? 0
            const isEditing = editingId === category.id

            return (
              <article
                className={`admin-category-card ${
                  isEditing ? 'admin-category-card--editing' : ''
                }`}
                key={category.id}
              >
                <div
                  className="admin-category-card__image"
                  style={
                    category.imageUrl
                      ? undefined
                      : { background: category.accent }
                  }
                >
                  {category.imageUrl ? (
                    <img src={category.imageUrl} alt={category.alt ?? ''} />
                  ) : (
                    <span aria-hidden="true">
                      {category.label.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="admin-category-card__body">
                  <p className="admin-category-card__slug">/{category.slug}</p>
                  <h3>{category.label}</h3>
                  <p className="admin-category-card__count">
                    {count === 0
                      ? 'No artworks yet'
                      : count === 1
                        ? '1 artwork'
                        : `${count} artworks`}
                  </p>
                </div>

                <div
                  className="admin-category-card__swatch"
                  style={{ background: category.accent }}
                  aria-hidden="true"
                />

                <div className="admin-category-card__actions">
                  <button
                    className="admin-edit-button"
                    type="button"
                    onClick={() => beginEdit(category)}
                  >
                    Edit
                  </button>
                  <button
                    className="admin-delete-button"
                    type="button"
                    disabled={deletingId === category.id}
                    onClick={() => deleteCategory(category)}
                  >
                    {deletingId === category.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default AdminCategoryManager
