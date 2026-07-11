// Client-side persistence via localStorage.
// Monetary amounts are in stablecoin display units (12.50 = $12.50).
// "potBalance" is a commitment tracker only — funds stay in the user's wallet.
// The on-chain balance is always read fresh before enabling Settle.

export type Frequency = 'weekly' | 'biweekly' | 'monthly'

export type Category = 'housing' | 'family' | 'business' | 'subscriptions' | 'other'

export const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'housing', label: 'Housing' },
  { key: 'family', label: 'Family' },
  { key: 'business', label: 'Business' },
  { key: 'subscriptions', label: 'Subscriptions' },
  { key: 'other', label: 'Other' },
]

export interface Recurring {
  id: string
  name: string
  address: `0x${string}`
  amount: number
  frequency?: Frequency // defaults to 'monthly' for entries saved before this field
  category?: Category // defaults to 'other' for entries saved before this field
}

// How many times per month each frequency occurs — used to normalise the
// monthly savings target while each settlement still pays the face amount.
export const MONTHLY_FACTOR: Record<Frequency, number> = {
  weekly: 4.345,
  biweekly: 2.172,
  monthly: 1,
}

export function monthlyEquivalent(r: Recurring): number {
  return r.amount * MONTHLY_FACTOR[r.frequency ?? 'monthly']
}

export interface DailyDeposit {
  date: string // YYYY-MM-DD
  amount: number
}

export interface BundleLine {
  name: string
  address: string
  amount: number
}

export interface Bundle {
  id: string
  date: string
  total: number
  txHash: string
  lines: BundleLine[]
}

// A single peer-to-peer payment (via /pay — Request or Split), distinct from
// a Bundle settlement. Tracked so it shows up in History like any other
// outgoing payment instead of disappearing once sent.
export interface Payment {
  id: string
  date: string
  txHash: string
  to: string
  toName: string
  amount: number
}

// A group collection (bill split / cotisation) being tracked: who was asked
// to pay `perPerson`, since when. Contributions are matched from incoming
// on-chain transfers — the chain is the ledger, this is just the ask.
export interface Collect {
  id: string
  createdAt: number
  note: string
  perPerson: number
  people: number // expected number of contributors
}

interface Store {
  recurring: Recurring[]
  deposits: DailyDeposit[]
  bundles: Bundle[]
  payments: Payment[]
  collects?: Collect[]
  potBalance: number
  streak: number
  lastDepositDate: string
  activeToken: 'MOCK_USD' | 'USDC'
  // Personal, self-set spending limit — a soft warning shown before settling
  // a bundle above this amount. null = no limit configured.
  spendLimit: number | null
}

// Keyed per chain so a testnet→mainnet env switch can't mix addresses
// from two networks in one store.
import { ACTIVE_CHAIN } from './chains'

const LEGACY_KEY = 'bundl_v1'
const KEY = `bundl_v1_${ACTIVE_CHAIN.id}`
const BACKUP_KEY = `${KEY}_backup`
const BACKUP_AT_KEY = `${KEY}_backup_at`

function parseStore(raw: string): Store | null {
  try {
    const parsed = JSON.parse(raw) as Partial<Store>
    if (typeof parsed !== 'object' || parsed === null) return null
    // Backfill fields added after initial release so older saved stores don't
    // crash, and drop structurally broken entries instead of the whole store.
    const store = { ...empty(), ...parsed } as Store
    store.recurring = (Array.isArray(store.recurring) ? store.recurring : []).filter(
      (r) => r && typeof r.name === 'string' && typeof r.address === 'string' && typeof r.amount === 'number',
    )
    if (typeof store.potBalance !== 'number' || !isFinite(store.potBalance)) store.potBalance = 0
    return store
  } catch {
    return null
  }
}

function load(): Store {
  if (typeof window === 'undefined') return empty()
  try {
    // One-time migration: pre-chain-keyed stores were written by the same
    // network the app is pointed at now, so adopt them under the new key.
    if (!localStorage.getItem(KEY) && localStorage.getItem(LEGACY_KEY)) {
      localStorage.setItem(KEY, localStorage.getItem(LEGACY_KEY)!)
      localStorage.removeItem(LEGACY_KEY)
    }
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty()
    // Corrupted main store → fall back to the daily backup instead of wiping.
    const store = parseStore(raw) ?? parseStore(localStorage.getItem(BACKUP_KEY) ?? '')
    return store ?? empty()
  } catch {
    return empty()
  }
}

function empty(): Store {
  return {
    recurring: [],
    deposits: [],
    bundles: [],
    payments: [],
    potBalance: 0,
    streak: 0,
    lastDepositDate: '',
    activeToken: 'MOCK_USD',
    spendLimit: null,
  }
}

function save(store: Store) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(KEY, JSON.stringify(store))
  } catch {
    // Quota exceeded — shed the oldest half of history (never the recurring
    // list or pot state) and retry once rather than silently losing the write.
    try {
      store.bundles = store.bundles.slice(-Math.ceil(store.bundles.length / 2))
      store.payments = store.payments.slice(-Math.ceil(store.payments.length / 2))
      localStorage.setItem(KEY, JSON.stringify(store))
    } catch (e) {
      console.warn('bundl: localStorage write failed — changes may not persist', e)
      return
    }
  }
  // Refresh the corruption-recovery backup at most once a day.
  try {
    const at = Number(localStorage.getItem(BACKUP_AT_KEY) ?? 0)
    if (Date.now() - at > 24 * 60 * 60 * 1000) {
      localStorage.setItem(BACKUP_KEY, JSON.stringify(store))
      localStorage.setItem(BACKUP_AT_KEY, String(Date.now()))
    }
  } catch {}
}

// --- Recurring ---

export function getRecurring(): Recurring[] {
  return load().recurring
}

export function saveRecurring(items: Recurring[]) {
  const store = load()
  store.recurring = items
  save(store)
}

export function addRecurring(item: Omit<Recurring, 'id'>): Recurring {
  const store = load()
  const newItem = { ...item, id: Date.now().toString() }
  store.recurring = [...store.recurring, newItem]
  save(store)
  return newItem
}

export function updateRecurring(item: Recurring) {
  const store = load()
  store.recurring = store.recurring.map((r) => (r.id === item.id ? item : r))
  save(store)
}

export function deleteRecurring(id: string) {
  const store = load()
  store.recurring = store.recurring.filter((r) => r.id !== id)
  save(store)
}

// --- Pot ---

export function getPotBalance(): number {
  return load().potBalance
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

export function depositedToday(): boolean {
  return load().deposits.some((d) => d.date === todayKey())
}

export function getStreak(): number {
  return load().streak
}

function yesterdayKey(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

export function addDeposit(amount: number): { balance: number; streak: number } {
  const store = load()
  const today = todayKey()
  if (store.deposits.some((d) => d.date === today)) {
    return { balance: store.potBalance, streak: store.streak }
  }
  store.deposits.push({ date: today, amount })
  store.potBalance = +(store.potBalance + amount).toFixed(2)
  // Streak: +1 if last deposit was yesterday, else reset to 1
  store.streak = store.lastDepositDate === yesterdayKey() ? store.streak + 1 : 1
  store.lastDepositDate = today
  save(store)
  return { balance: store.potBalance, streak: store.streak }
}

// --- Token preference (persisted by wallet address) ---

export function getSettlementTokenKey(): string {
  return load().activeToken
}

export function setSettlementTokenKey(token: string) {
  const store = load()
  store.activeToken = token as Store['activeToken']
  save(store)
}

// --- Personal spending limit (soft warning, not enforced on-chain) ---

export function getSpendLimit(): number | null {
  return load().spendLimit
}

export function setSpendLimit(limit: number | null) {
  const store = load()
  store.spendLimit = limit
  save(store)
}

export function resetPot() {
  const store = load()
  store.potBalance = 0
  save(store)
}

// --- Bundles ---

export function getBundles(): Bundle[] {
  return [...load().bundles].reverse()
}

export function addBundle(bundle: Bundle) {
  const store = load()
  store.bundles = [...store.bundles, bundle]
  store.potBalance = 0
  save(store)
}

// --- Payments (single P2P sends via /pay — Request or Split) ---

export function getPayments(): Payment[] {
  return [...load().payments].reverse()
}

export function addPayment(payment: Payment) {
  const store = load()
  store.payments = [...store.payments, payment]
  save(store)
}

// --- Group collections (bill splits / cotisations being tracked) ---

export function getCollects(): Collect[] {
  return [...(load().collects ?? [])].reverse()
}

export function addCollect(c: Omit<Collect, 'id' | 'createdAt'>): Collect {
  const store = load()
  const entry: Collect = { ...c, id: Date.now().toString(), createdAt: Date.now() }
  store.collects = [...(store.collects ?? []), entry]
  save(store)
  return entry
}

export function deleteCollect(id: string) {
  const store = load()
  store.collects = (store.collects ?? []).filter((c) => c.id !== id)
  save(store)
}

// --- Backup / Restore (guard against cache purge) ---

export function exportBackup(): string {
  return localStorage.getItem(KEY) ?? JSON.stringify(empty())
}

export function importBackup(json: string): boolean {
  try {
    const parsed = JSON.parse(json) as Store
    // Sanity check: must have recurring array
    if (!Array.isArray(parsed.recurring)) return false
    save(parsed)
    return true
  } catch {
    return false
  }
}
