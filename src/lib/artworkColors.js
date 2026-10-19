/*
  Fixed palette for artwork color tags.
  Used by:
    - Admin form (color chips on publish/edit)
    - Gallery filter (color chips in the filter row)
    - Gallery search (color names become searchable)
*/
export const ARTWORK_COLORS = [
  { key: 'blue', label: 'Blue', hex: '#4f6fa8' },
  { key: 'indigo', label: 'Indigo', hex: '#3a3f7a' },
  { key: 'teal', label: 'Teal', hex: '#4f8d91' },
  { key: 'green', label: 'Green', hex: '#5c7a54' },
  { key: 'terracotta', label: 'Terracotta', hex: '#b85a4a' },
  { key: 'red', label: 'Red', hex: '#a8342a' },
  { key: 'gold', label: 'Gold', hex: '#d4a656' },
  { key: 'ochre', label: 'Ochre', hex: '#c28b3c' },
  { key: 'purple', label: 'Purple', hex: '#7757a7' },
  { key: 'pink', label: 'Pink', hex: '#d578a0' },
  { key: 'cream', label: 'Cream', hex: '#e8dcc0' },
  { key: 'dark', label: 'Dark', hex: '#2a2530' },
]

export const COLOR_BY_KEY = Object.fromEntries(
  ARTWORK_COLORS.map((c) => [c.key, c]),
)
