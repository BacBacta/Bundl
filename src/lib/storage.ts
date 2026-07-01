// Client-side persistence via localStorage.
// Monetary amounts are in stablecoin display units (12.50 = $12.50).
// "potBalance" is a commitment tracker only — funds stay in the user's wallet.
// The on-chain balance is always read fresh before enabling Settle.

export type Frequency = 'weekly' | 'biweekly' | 'monthly'

export interface Recurring {
  id: string
  name: string
  address: `0x${string}`
  amount: number
  frequency?: Frequency // defaults to 'monthly' for entries saved before this field
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

interface Store {
  recurring: Recurring[]
  deposits: DailyDeposit[]
  bundles: Bundle[]
  payments: Payment[]
  potBalance: number
  streak: number
  lastDepositDate: string
  activeToken: 'MOCK_USD' | 'USDC'
}

const KEY = 'bundl_v1'

function load(): Store {
  if (typeof window === 'undefined') return empty()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty()
    // Backfill fields added after initial release so older saved stores don't crash.
    return { ...empty(), ...(JSON.parse(raw) as Partial<Store>) } as Store
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
  }
}

function save(store: Store) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(store))
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
