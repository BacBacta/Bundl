// Client-side persistence via localStorage.
// All monetary amounts are in stablecoin display units (e.g. 12.50 = $12.50).

export interface Recurring {
  id: string
  name: string
  address: `0x${string}`
  amount: number
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

interface Store {
  recurring: Recurring[]
  deposits: DailyDeposit[]
  bundles: Bundle[]
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
    return raw ? (JSON.parse(raw) as Store) : empty()
  } catch {
    return empty()
  }
}

function empty(): Store {
  return {
    recurring: [],
    deposits: [],
    bundles: [],
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

// --- Token preference ---

export function getActiveToken(): 'MOCK_USD' | 'USDC' {
  return load().activeToken
}

export function setActiveToken(token: 'MOCK_USD' | 'USDC') {
  const store = load()
  store.activeToken = token
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
