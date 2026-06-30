// Lightweight onboarding flag helpers — no heavy deps, so importing these
// (e.g. for the first-run check) doesn't pull the animated component bundle.

const KEY = 'bundl_onboarded'

export function hasOnboarded(): boolean {
  if (typeof window === 'undefined') return true
  // ?intro=1 forces the intro to show again (no console needed on MiniPay).
  if (new URLSearchParams(window.location.search).get('intro') === '1') return false
  return localStorage.getItem(KEY) === '1'
}

export function markOnboarded() {
  localStorage.setItem(KEY, '1')
}

export function resetOnboarding() {
  localStorage.removeItem(KEY)
}
