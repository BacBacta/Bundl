import Link from 'next/link'

// Persistent footer — support link + legal (required for MiniPay listing)
export function AppFooter() {
  return (
    <footer className="flex items-center justify-center gap-4 py-3 text-xs text-gray-400 border-t border-gray-100 mt-auto">
      <a
        href="https://t.me/bundlsupport"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-gray-600 transition-colors"
      >
        Support
      </a>
      <span>·</span>
      <Link href="/terms" className="hover:text-gray-600 transition-colors">
        Terms
      </Link>
      <span>·</span>
      <Link href="/privacy" className="hover:text-gray-600 transition-colors">
        Privacy
      </Link>
      <span>·</span>
      <Link href="/stats" className="hover:text-gray-600 transition-colors">
        Stats
      </Link>
    </footer>
  )
}
