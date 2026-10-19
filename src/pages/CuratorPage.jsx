import { useState } from 'react'
import ArtworkCard from '../components/ArtworkCard'
import Markdown from 'react-markdown'
import './CuratorPage.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

export default function CuratorPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [message, setMessage] = useState('')
  const [answer, setAnswer] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return

    // Reset states
    setIsLoading(true)
    setMessage('')
    setResults([])
    setAnswer('')

    try {
      const res = await fetch(`${API_URL}/api/curator/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })

      const json = await res.json()

      if (!res.ok) throw new Error(json.message)

      // Ye lines data aane ke baad chalti hain
      setAnswer(json.answer || '')
      setResults(json.data || [])
    } catch (err) {
      setMessage(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="curator-page">
      <div className="curator-page__inner">
        <p className="curator-page__eyebrow">STUDIO ASSISTANT</p>
        <h1>Ask Kala anything.</h1>
        <p className="curator-page__intro">
          Describe a mood, a colour, or a feeling to find art. Or ask general
          questions like "How do I track my order?"
        </p>

        <form className="curator-form" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="e.g. I want a dark intense charcoal portrait OR how to track my order..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || !query.trim()}>
            {isLoading ? 'Thinking...' : 'Ask Kala'}
          </button>
        </form>

        {message && <p className="curator-message">{message}</p>}

        {/* 1. LLM ka conversational answer box */}
        {/* LLM ka conversational answer box */}
        {answer && (
          <div className="curator-answer-box">
            <p className="curator-answer-label">KALA SAYS:</p>
            <div className="curator-answer-text">
              <Markdown>{answer}</Markdown>
            </div>
          </div>
        )}

        {/* 2. Matching Artworks ke Cards */}
        {results.length > 0 && (
          <div className="curator-results-wrapper">
            <p className="curator-results-label">
              MATCHING WORKS FROM THE STUDIO
            </p>
            <div className="art-grid curator-results">
              {results.map((artwork) => (
                <ArtworkCard
                  key={artwork.id}
                  artwork={artwork}
                  returnTo="/curator"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
