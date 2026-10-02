import earthRemembers from '../assets/earth-remembers.webp'
import lettersToTheSky from '../assets/letters-to-the-sky.webp'
import monsoonSilence from '../assets/monsoon-silence.webp'

const artworks = [
  {
    id: 1,
    slug: 'monsoon-silence',
    title: 'Monsoon Silence',
    medium: 'Acrylic on canvas',
    year: '2026',
    dimensions: '24 × 30 in',
    collection: 'Monsoon Studies',
    moods: ['Quiet', 'Reflective'],
    availability: 'Available for enquiry',
    image: monsoonSilence,
    alt: 'Abstract artwork with deep indigo rain-like brushstrokes and warm coral marks.',
    story:
      'A quiet study of rain, memory, and the pause that arrives when a familiar city becomes still.',
  },
  {
    id: 2,
    slug: 'letters-to-the-sky',
    title: 'Letters to the Sky',
    medium: 'Mixed media on paper',
    year: '2025',
    dimensions: '18 × 24 in',
    collection: 'Small Messages',
    moods: ['Airy', 'Hopeful'],
    availability: 'Available for enquiry',
    image: lettersToTheSky,
    alt: 'Abstract artwork with a pale blue field, handwritten forms, and soft ochre details.',
    story:
      'A collection of unfinished thoughts, translated into layers of colour, line, and open space.',
  },
  {
    id: 3,
    slug: 'earth-remembers',
    title: 'Earth Remembers',
    medium: 'Watercolour and ink',
    year: '2025',
    dimensions: '20 × 25 in',
    collection: 'Soil & Story',
    moods: ['Grounded', 'Warm'],
    availability: 'Available for enquiry',
    image: earthRemembers,
    alt: 'Abstract earthy artwork with warm rust tones, organic textures, and dark ink marks.',
    story:
      'This work follows the textures of soil and the small marks that remain after time has moved on.',
  },
]

export default artworks