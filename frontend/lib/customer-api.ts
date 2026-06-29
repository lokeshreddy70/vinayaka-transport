export const API_URL = process.env.NEXT_PUBLIC_CUSTOMER_API_URL || 'https://vinayaka-transport-api.vercel.app/api'
export const ACCESS_TOKEN_KEY = 'vinayaka_customer_access_token'
export const REFRESH_TOKEN_KEY = 'vinayaka_customer_refresh_token'
const DEMO_PROFILE_KEY = 'vinayaka_demo_profile'
const DEMO_ORDERS_KEY = 'vinayaka_demo_orders'
const DEMO_WALLET_KEY = 'vinayaka_demo_wallet'

export function clearCustomerSession() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(ACCESS_TOKEN_KEY)
  window.localStorage.removeItem(REFRESH_TOKEN_KEY)
}

function getLocalJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback
  }
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function setLocalJson<T>(key: string, value: T) {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore local storage write failures.
  }
}

export function saveDemoProfile(profile: CustomerProfile) {
  setLocalJson(DEMO_PROFILE_KEY, profile)
}

export function saveDemoOrder(order: Order) {
  const existing = getLocalJson<Order[]>(DEMO_ORDERS_KEY, [])
  setLocalJson(DEMO_ORDERS_KEY, [order, ...existing])
}

export function getDemoOrders(): Order[] {
  return getLocalJson<Order[]>(DEMO_ORDERS_KEY, [])
}

export function updateDemoOrderStatus(orderId: string, status: string): Order[] {
  const existing = getDemoOrders()
  const updated = existing.map((item) =>
    item.id === orderId
      ? {
          ...item,
          status,
          trackingLogs: [
            {
              id: `demo-track-${Date.now()}`,
              status,
              timestamp: new Date().toISOString(),
            },
            ...(item.trackingLogs || []),
          ],
        }
      : item
  )
  setLocalJson(DEMO_ORDERS_KEY, updated)
  return updated
}

export function saveDemoWallet(wallet: { balance: number; transactions: WalletTransaction[] }) {
  setLocalJson(DEMO_WALLET_KEY, wallet)
}

export function getDemoWallet(): { balance: number; transactions: WalletTransaction[] } {
  return getLocalJson(DEMO_WALLET_KEY, {
    balance: 1250,
    transactions: [
      {
        id: 'demo-txn-1',
        amount: 500,
        type: 'CREDIT',
        description: 'Added Money',
        createdAt: new Date().toISOString(),
      },
    ],
  })
}

export function addDemoWalletTransaction(
  amount: number,
  description: string,
  type: 'CREDIT' | 'DEBIT'
): { balance: number; transactions: WalletTransaction[] } {
  const wallet = getDemoWallet()
  const normalizedAmount = Math.abs(Number(amount || 0))
  const signedAmount = type === 'DEBIT' ? -normalizedAmount : normalizedAmount

  const next = {
    balance: Math.max(0, wallet.balance + signedAmount),
    transactions: [
      {
        id: `demo-txn-${Date.now()}`,
        amount: signedAmount,
        type,
        description,
        createdAt: new Date().toISOString(),
      },
      ...wallet.transactions,
    ],
  }

  saveDemoWallet(next)
  return next
}

export function isAuthError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  return message.includes('unauthorized') || message.includes('jwt') || message.includes('session') || message.includes('token')
}

export type CustomerProfile = {
  user?: {
    id?: string
    fullName?: string
    full_name?: string
    role?: string
    email?: string
    phoneNumber?: string
    phone?: string
  }
  loyaltyPoints?: number
  totalSpent?: number
  wallet?: {
    balance?: number
    transactions?: WalletTransaction[]
  } | null
  addresses?: Array<{ id: string; fullAddress: string }>
}

export type WalletTransaction = {
  id: string
  amount: number
  type?: string
  createdAt?: string
  created_at?: string
  description?: string
}

export type Order = {
  id: string
  orderNumber: string
  status: string
  finalPrice: number
  createdAt: string
  pickupAddress?: { fullAddress?: string } | null
  dropAddress?: { fullAddress?: string } | null
  trackingLogs?: Array<{ id: string; status: string; timestamp?: string; createdAt?: string }>
  rider?: {
    id?: string
    user?: { fullName?: string; phoneNumber?: string }
    vehicle?: { vehicleNumber?: string; vehicleModel?: string }
  } | null
}

export type TrackingResponse = {
  orderNumber?: string
  status?: string
  estimatedDeliveryTime?: string | null
  rider?: {
    name?: string
    phoneNumber?: string
    latitude?: number
    longitude?: number
  } | null
  timeline?: Array<{
    id?: string
    status?: string
    timestamp?: string
    message?: string
  }>
}

function normalizeOrder(input: any): Order {
  return {
    id: input?.id,
    orderNumber: input?.orderNumber ?? input?.tracking_id ?? 'NA',
    status: input?.status ?? 'PENDING',
    finalPrice: Number(input?.finalPrice ?? input?.fare_amount ?? input?.totalPrice ?? 0),
    createdAt: input?.createdAt ?? input?.created_at ?? new Date().toISOString(),
    pickupAddress: input?.pickupAddress ?? { fullAddress: input?.pickup_address },
    dropAddress: input?.dropAddress ?? { fullAddress: input?.drop_address },
    trackingLogs: input?.trackingLogs ?? [],
    rider: input?.rider ?? null,
  }
}

async function request(path: string, token: string, init?: RequestInit): Promise<any> {
  const baseCandidates = [
    API_URL,
    API_URL.replace(/\/api\/v1\/?$/, '/api'),
    API_URL.replace(/\/api\/?$/, ''),
  ].filter(Boolean)

  for (const base of [...new Set(baseCandidates)]) {
    const response = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init?.headers || {}),
      },
    })

    const contentType = response.headers.get('content-type') || ''
    const payload = contentType.includes('application/json')
      ? await response.json().catch(() => ({}))
      : {}

    if (response.ok) {
      return payload
    }

    if (response.status !== 404 || base === baseCandidates[baseCandidates.length - 1]) {
      throw new Error(payload?.message || payload?.error || `Request failed (${response.status})`)
    }
  }

  throw new Error('Request failed')
}

export async function fetchCustomerProfile(token: string): Promise<CustomerProfile | null> {
  try {
    const payload = await request('/customers/profile', token)
    return payload?.data || null
  } catch {
    try {
      const payload = await request('/auth/me', token)
      return { user: payload?.user || null }
    } catch {
      return getLocalJson<CustomerProfile | null>(DEMO_PROFILE_KEY, null)
    }
  }
}

export async function fetchCustomerOrders(token: string): Promise<Order[]> {
  try {
    const payload = await request('/customers/orders', token)
    const rows = Array.isArray(payload?.data) ? payload.data : payload?.data?.items || []
    return rows.map(normalizeOrder)
  } catch {
    try {
      const payload = await request('/bookings?page=1&limit=100', token)
      const rows = Array.isArray(payload?.items) ? payload.items : []
      return rows.map(normalizeOrder)
    } catch {
      return getLocalJson<Order[]>(DEMO_ORDERS_KEY, [])
    }
  }
}

export async function fetchCustomerWallet(token: string): Promise<{ balance: number; transactions: WalletTransaction[] }> {
  try {
    const payload = await request('/customers/wallet', token)
    const wallet = payload?.data || {}
    return {
      balance: Number(wallet?.balance || 0),
      transactions: Array.isArray(wallet?.transactions) ? wallet.transactions : [],
    }
  } catch {
    return getDemoWallet()
  }
}

export async function fetchOrderDetails(token: string, orderId: string): Promise<Order | null> {
  try {
    const payload = await request(`/orders/${orderId}`, token)
    return normalizeOrder(payload?.data)
  } catch {
    const orders = await fetchCustomerOrders(token)
    return orders.find((item) => item.id === orderId) || null
  }
}

export async function trackByOrderNumber(orderNumber: string): Promise<TrackingResponse | null> {
  const trimmed = orderNumber.trim()
  if (!trimmed) {
    return null
  }

  const publicV1 = trimmed.replace(/\s+/g, '')
  const baseCandidates = [
    API_URL,
    API_URL.replace(/\/api\/v1\/?$/, '/api'),
    API_URL.replace(/\/api\/?$/, ''),
  ].filter(Boolean)
  const candidates = [...new Set(baseCandidates)].flatMap((base) => [
    `${base}/orders/public/${encodeURIComponent(trimmed)}/track`,
    `${base}/tracking/${encodeURIComponent(publicV1)}`,
  ])

  for (const url of candidates) {
    const response = await fetch(url)
    if (!response.ok) {
      continue
    }
    const payload = await response.json().catch(() => ({}))
    const data = payload?.data || payload
    return {
      orderNumber: data?.orderNumber || data?.booking?.tracking_id || trimmed,
      status: data?.status || data?.booking?.status,
      estimatedDeliveryTime: data?.estimatedDeliveryTime || data?.booking?.estimated_arrival_at || null,
      rider: data?.rider
        ? {
            name: data.rider.name,
            phoneNumber: data.rider.phoneNumber,
            latitude: data.rider.latitude,
            longitude: data.rider.longitude,
          }
        : data?.booking?.trips?.[0]?.drivers?.users
        ? {
            name: data.booking.trips[0].drivers.users.full_name,
            phoneNumber: data.booking.trips[0].drivers.users.phone,
          }
        : null,
      timeline:
        data?.timeline?.map((event: any) => ({
          id: event?.id,
          status: event?.status,
          timestamp: event?.timestamp || event?.event_time,
          message: event?.message,
        })) || [],
    }
  }

  const localOrders = getLocalJson<Order[]>(DEMO_ORDERS_KEY, [])
  const local = localOrders.find((item) => item.orderNumber === trimmed)
  if (local) {
    return {
      orderNumber: local.orderNumber,
      status: local.status,
      estimatedDeliveryTime: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
      timeline: (local.trackingLogs || []).map((event) => ({
        id: event.id,
        status: event.status,
        timestamp: event.timestamp || event.createdAt || new Date().toISOString(),
        message: event.status,
      })),
    }
  }

  throw new Error('Unable to track this order right now')
}

export function getCustomerName(profile: CustomerProfile | null): string {
  return (
    profile?.user?.fullName ||
    profile?.user?.full_name ||
    'Lokesh'
  )
}
