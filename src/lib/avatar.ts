// Deterministic avatar color + initials from a name or address.
// Keeps recipient rows visually distinct without storing any extra data.

const PALETTE = [
  '#0F6E56', '#1D9E75', '#2563EB', '#7C3AED',
  '#DB2777', '#EA580C', '#0891B2', '#CA8A04',
]

export function avatarColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return PALETTE[hash % PALETTE.length]
}

export function initials(label: string): string {
  const clean = label.trim()
  if (clean.startsWith('0x')) return clean.slice(2, 4).toUpperCase()
  const parts = clean.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}
