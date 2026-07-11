// Small fetch wrapper with a hard timeout. Blockscout and other public APIs
// can hang for 30s+ — without an abort, every caller's loading state hangs
// with them.

export async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs = 8000,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}
