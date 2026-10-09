import useFavourites from '../hooks/useFavourites'
import './FavouriteButton.css'

function HeartIcon({ filled }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

// variant "icon": round heart that sits on top of an artwork card image.
// variant "text": labelled button for the artwork detail page.
//
// The accessible name stays constant and aria-pressed carries the state, which
// is how screen readers expect toggle buttons to behave.
function FavouriteButton({ slug, title, variant = 'icon' }) {
  const { isFavourite, toggleFavourite } = useFavourites()
  const isSaved = isFavourite(slug)

  return (
    <button
      aria-label={
        variant === 'icon' ? `Save ${title} to favourites` : undefined
      }
      aria-pressed={isSaved}
      className={`favourite-button favourite-button--${variant}`}
      onClick={() => toggleFavourite(slug)}
      type="button"
    >
      <HeartIcon filled={isSaved} />
      {variant === 'text' && <span>Save to favourites</span>}
    </button>
  )
}

export default FavouriteButton
