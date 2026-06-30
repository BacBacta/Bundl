// Theme: 'light' | 'dark' | 'system'. Persisted in localStorage and applied
// by toggling the `.dark` class on <html>. The no-flash script in layout.tsx
// reads the same key before first paint.

export type Theme = 'light' | 'dark' | 'system'

const KEY = 'bundl_theme'

export function getTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  return (localStorage.getItem(KEY) as Theme) || 'system'
}

export function resolveDark(theme: Theme): boolean {
  if (theme === 'dark') return true
  if (theme === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', resolveDark(theme))
}

export function setTheme(theme: Theme) {
  localStorage.setItem(KEY, theme)
  applyTheme(theme)
}
