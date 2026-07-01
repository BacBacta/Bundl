// Local, in-app notification center for the Header bell. No backend, no true
// push infrastructure (MiniPay's embedded webview can't reliably register a
// service worker + push subscription) — entries are generated client-side
// from state we already compute (streak, goal, on-chain activity) and shown
// in an in-app panel. We also best-effort fire a browser Notification when
// permission is granted, understanding it only works while the tab is open.

export interface AppNotification {
  id: string
  type: 'streak' | 'goal' | 'received' | 'sent'
  title: string
  body: string
  date: string // ISO timestamp
  read: boolean
}

const KEY = 'bundl_notifications'
const META_KEY = 'bundl_notif_meta'
const MAX_ENTRIES = 30

interface Meta {
  lastStreakNotified: number
  goalReachedNotified: boolean
  // 0 means "never checked" — on first check we seed to now() instead of
  // backfilling the user's entire prior history as if it were new.
  lastIncomingCheckMs: number
}

function loadList(): AppNotification[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

function saveList(list: AppNotification[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_ENTRIES)))
}

function loadMeta(): Meta {
  if (typeof window === 'undefined') return { lastStreakNotified: 0, goalReachedNotified: false, lastIncomingCheckMs: 0 }
  try {
    const raw = localStorage.getItem(META_KEY)
    return raw
      ? JSON.parse(raw)
      : { lastStreakNotified: 0, goalReachedNotified: false, lastIncomingCheckMs: 0 }
  } catch {
    return { lastStreakNotified: 0, goalReachedNotified: false, lastIncomingCheckMs: 0 }
  }
}

function saveMeta(meta: Meta) {
  if (typeof window === 'undefined') return
  localStorage.setItem(META_KEY, JSON.stringify(meta))
}

export function getNotifications(): AppNotification[] {
  return loadList()
}

export function unreadCount(): number {
  return loadList().filter((n) => !n.read).length
}

export function markAllRead() {
  saveList(loadList().map((n) => ({ ...n, read: true })))
}

function addNotification(n: Omit<AppNotification, 'id' | 'date' | 'read'>) {
  const entry: AppNotification = { ...n, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, date: new Date().toISOString(), read: false }
  saveList([entry, ...loadList()])
  pushBrowserNotification(entry.title, entry.body)
}

/** Best-effort OS notification — only fires if the user already granted permission. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  try {
    return (await Notification.requestPermission()) === 'granted'
  } catch {
    return false
  }
}

function pushBrowserNotification(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  try {
    new Notification(title, { body })
  } catch {
    /* some webviews throw on unsupported Notification() — ignore */
  }
}

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100]

/** Call whenever the streak is recomputed on Home. Fires once per milestone. */
export function notifyStreakMilestone(streak: number) {
  const meta = loadMeta()
  const milestone = STREAK_MILESTONES.find((m) => streak >= m && meta.lastStreakNotified < m)
  if (!milestone) return
  addNotification({ type: 'streak', title: `🔥 ${milestone}-day streak`, body: `You've committed to your goal ${milestone} days in a row. Keep it going!` })
  saveMeta({ ...meta, lastStreakNotified: milestone })
}

/** Call whenever potFull is recomputed. Fires once per reach (resets after settle). */
export function notifyGoalReached(potFull: boolean) {
  const meta = loadMeta()
  if (potFull && !meta.goalReachedNotified) {
    addNotification({ type: 'goal', title: '🎉 Goal reached', body: 'Your savings goal is fully committed — settle whenever you\'re ready.' })
    saveMeta({ ...meta, goalReachedNotified: true })
  } else if (!potFull && meta.goalReachedNotified) {
    saveMeta({ ...meta, goalReachedNotified: false })
  }
}

export function notifyPaymentSent(toName: string, amount: number) {
  addNotification({ type: 'sent', title: '✅ Payment sent', body: `You sent $${amount.toFixed(2)} to ${toName}.` })
}

export function notifyBundleSettled(recipientCount: number, total: number) {
  addNotification({ type: 'sent', title: '✅ Bundle settled', body: `You paid ${recipientCount} recipient${recipientCount !== 1 ? 's' : ''} — $${total.toFixed(2)} total.` })
}

export function notifyPaymentsReceived(count: number, totalUsd: number) {
  if (count === 0) return
  addNotification({
    type: 'received',
    title: count === 1 ? '💰 Payment received' : `💰 ${count} payments received`,
    body: `$${totalUsd.toFixed(2)} landed in your wallet.`,
  })
}

/** Read + clear the "since" checkpoint used for incoming-payment detection. */
export function getIncomingCheckpoint(): number {
  return loadMeta().lastIncomingCheckMs
}

export function setIncomingCheckpoint(ms: number) {
  saveMeta({ ...loadMeta(), lastIncomingCheckMs: ms })
}
