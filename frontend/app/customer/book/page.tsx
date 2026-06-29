'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, Loader2, MapPin, Package, Search, Truck } from 'lucide-react'
import {
  ACCESS_TOKEN_KEY,
  API_URL,
  addDemoWalletTransaction,
  saveDemoOrder,
  type Order,
} from '@/lib/customer-api'

type Address = {
  id: string
  fullAddress: string
  latitude: number
  longitude: number
}

const DEMO_ADDRESSES_KEY = 'vinayaka_demo_addresses'

function getLocalAddresses(): Address[] {
  if (typeof window === 'undefined') {
    return []
  }
  try {
    const raw = window.localStorage.getItem(DEMO_ADDRESSES_KEY)
    return raw ? (JSON.parse(raw) as Address[]) : []
  } catch {
    return []
  }
}

function setLocalAddresses(addresses: Address[]) {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.localStorage.setItem(DEMO_ADDRESSES_KEY, JSON.stringify(addresses))
  } catch {
    // Ignore storage failures.
  }
}

type PlaceSuggestion = {
  id: string
  label: string
  lat: number
  lng: number
  city: string
  state: string
  pinCode: string
}

function normalizePlace(raw: any): PlaceSuggestion {
  const city = raw?.address?.city || raw?.address?.town || raw?.address?.village || raw?.address?.county || ''
  const state = raw?.address?.state || ''
  const pinCode = raw?.address?.postcode || ''

  return {
    id: String(raw.place_id),
    label: String(raw.display_name || '').trim(),
    lat: Number(raw.lat),
    lng: Number(raw.lon),
    city,
    state,
    pinCode,
  }
}

async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  if (!query.trim()) {
    return []
  }

  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=in&limit=6&q=${encodeURIComponent(query.trim())}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error('Unable to fetch location suggestions')
  }

  const data = await response.json()
  if (!Array.isArray(data)) {
    return []
  }

  return data
    .map(normalizePlace)
    .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng) && item.label)
}

export default function BookParcelPage() {
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [savingAddress, setSavingAddress] = useState(false)
  const [message, setMessage] = useState('')

  const [addresses, setAddresses] = useState<Address[]>([])
  const [pickupAddressId, setPickupAddressId] = useState('')
  const [dropAddressId, setDropAddressId] = useState('')

  const [pickupSearch, setPickupSearch] = useState('')
  const [dropSearch, setDropSearch] = useState('')
  const [pickupSuggestions, setPickupSuggestions] = useState<PlaceSuggestion[]>([])
  const [dropSuggestions, setDropSuggestions] = useState<PlaceSuggestion[]>([])
  const [pickupPlace, setPickupPlace] = useState<PlaceSuggestion | null>(null)
  const [dropPlace, setDropPlace] = useState<PlaceSuggestion | null>(null)

  const [formData, setFormData] = useState({
    pickupLocation: '',
    dropLocation: '',
    parcelCategory: 'DOCUMENTS',
    parcelWeight: '',
    vehicleType: 'BIKE',
    deliveryType: 'STANDARD',
    paymentMethod: 'COD',
    scheduleAt: '',
    couponCode: '',
  })
  const [couponMessage, setCouponMessage] = useState('')
  const [discountAmount, setDiscountAmount] = useState(0)

  useEffect(() => {
    const token = window.localStorage.getItem(ACCESS_TOKEN_KEY)

    if (!token) {
      router.replace('/customer/login')
      return
    }

    fetch(`${API_URL}/customers/addresses`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        const list = data?.data || []
        setAddresses(list.length ? list : getLocalAddresses())
      })
      .catch(() => {
        setMessage('Unable to load saved addresses right now. You can still search and add new ones.')
        setAddresses(getLocalAddresses())
      })
  }, [router])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!pickupSearch.trim() || pickupSearch === pickupPlace?.label) {
        setPickupSuggestions([])
        return
      }

      searchPlaces(pickupSearch)
        .then(setPickupSuggestions)
        .catch(() => setPickupSuggestions([]))
    }, 250)

    return () => clearTimeout(timer)
  }, [pickupSearch, pickupPlace?.label])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!dropSearch.trim() || dropSearch === dropPlace?.label) {
        setDropSuggestions([])
        return
      }

      searchPlaces(dropSearch)
        .then(setDropSuggestions)
        .catch(() => setDropSuggestions([]))
    }, 250)

    return () => clearTimeout(timer)
  }, [dropSearch, dropPlace?.label])

  const canProceedToConfirm = useMemo(() => {
    return !!pickupSearch.trim() && !!dropSearch.trim() && Number(formData.parcelWeight) > 0
  }, [pickupSearch, dropSearch, formData.parcelWeight])

  const estimatedFare = useMemo(() => {
    const weight = Number(formData.parcelWeight || 0)
    const baseByVehicle: Record<string, number> = {
      BIKE: 70,
      AUTO: 110,
      MINI_VAN: 180,
      CAR_PREMIUM: 220,
      TRUCK: 320,
    }
    const speedMultiplier: Record<string, number> = {
      STANDARD: 1,
      EXPRESS: 1.2,
      PRIORITY: 1.35,
      EMERGENCY: 1.6,
      SCHEDULED: 1,
    }

    const base = baseByVehicle[formData.vehicleType] || 90
    const speed = speedMultiplier[formData.deliveryType] || 1
    return Math.max(60, Math.round((base + weight * 25) * speed))
  }, [formData.parcelWeight, formData.vehicleType, formData.deliveryType])

  const finalFare = Math.max(0, estimatedFare - discountAmount)

  function applyCoupon() {
    const normalized = formData.couponCode.trim().toUpperCase()
    if (!normalized) {
      setCouponMessage('Enter a coupon code')
      return
    }

    const discounts: Record<string, number> = {
      VINAYAKA20: Math.round(estimatedFare * 0.2),
      PARCEL30: 30,
      CASH10: 10,
    }

    const amount = discounts[normalized]
    if (!amount) {
      setDiscountAmount(0)
      setCouponMessage('Invalid coupon code')
      return
    }

    setDiscountAmount(amount)
    setCouponMessage(`Coupon applied. Saved ${amount.toFixed(2)}`)
  }

  function selectPickupSuggestion(place: PlaceSuggestion) {
    setPickupPlace(place)
    setPickupSearch(place.label)
    setPickupSuggestions([])
    setPickupAddressId('')
    setFormData((prev) => ({ ...prev, pickupLocation: place.label }))
  }

  function selectDropSuggestion(place: PlaceSuggestion) {
    setDropPlace(place)
    setDropSearch(place.label)
    setDropSuggestions([])
    setDropAddressId('')
    setFormData((prev) => ({ ...prev, dropLocation: place.label }))
  }

  async function persistAddress(place: PlaceSuggestion): Promise<string> {
    const token = window.localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!token) {
      throw new Error('Session expired. Please login again.')
    }

    const existing = addresses.find(
      (address) =>
        address.fullAddress.toLowerCase() === place.label.toLowerCase() ||
        (Math.abs(address.latitude - place.lat) < 0.0001 && Math.abs(address.longitude - place.lng) < 0.0001)
    )

    if (existing) {
      return existing.id
    }

    try {
      const response = await fetch(`${API_URL}/customers/addresses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'OTHER',
          fullAddress: place.label,
          latitude: place.lat,
          longitude: place.lng,
          city: place.city,
          state: place.state,
          pinCode: place.pinCode,
          isDefault: false,
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to save selected address')
      }

      const created = payload?.data as Address
      if (!created?.id) {
        throw new Error('Address save failed')
      }

      setAddresses((prev) => {
        const next = [...prev, created]
        setLocalAddresses(next)
        return next
      })
      return created.id
    } catch {
      const created: Address = {
        id: `demo-addr-${Date.now()}`,
        fullAddress: place.label,
        latitude: place.lat,
        longitude: place.lng,
      }
      setAddresses((prev) => {
        const next = [...prev, created]
        setLocalAddresses(next)
        return next
      })
      return created.id
    }
  }

  async function ensureSelectedAddresses() {
    const pickupCandidate = pickupPlace || (pickupSearch.trim()
      ? {
          id: `manual-pickup-${Date.now()}`,
          label: pickupSearch.trim(),
          lat: 13.0827,
          lng: 80.2707,
          city: 'Chennai',
          state: 'Tamil Nadu',
          pinCode: '',
        }
      : null)

    const dropCandidate = dropPlace || (dropSearch.trim()
      ? {
          id: `manual-drop-${Date.now()}`,
          label: dropSearch.trim(),
          lat: 13.0418,
          lng: 80.2341,
          city: 'Chennai',
          state: 'Tamil Nadu',
          pinCode: '',
        }
      : null)

    if (!pickupCandidate || !dropCandidate) {
      throw new Error('Select or enter both pickup and drop locations')
    }

    setSavingAddress(true)
    try {
      const [pickupId, dropId] = await Promise.all([persistAddress(pickupCandidate), persistAddress(dropCandidate)])
      setPickupAddressId(pickupId)
      setDropAddressId(dropId)
      return { pickupId, dropId }
    } finally {
      setSavingAddress(false)
    }
  }

  async function submitOrder() {
    const token = window.localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!token) {
      router.replace('/customer/login')
      return
    }

    setMessage('')

    let resolvedPickupId = pickupAddressId
    let resolvedDropId = dropAddressId

    if (!resolvedPickupId || !resolvedDropId) {
      try {
        const resolved = await ensureSelectedAddresses()
        resolvedPickupId = resolved.pickupId
        resolvedDropId = resolved.dropId
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Please select valid locations')
        return
      }
    }

    const pickup = addresses.find((address) => address.id === resolvedPickupId)
    const drop = addresses.find((address) => address.id === resolvedDropId)

    if (!pickup || !drop) {
      setMessage('Could not resolve selected addresses. Please retry.')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pickupAddressId: resolvedPickupId,
          dropAddressId: resolvedDropId,
          pickupAddress: pickup.fullAddress,
          dropAddress: drop.fullAddress,
          pickupLat: pickup.latitude,
          pickupLng: pickup.longitude,
          dropLat: drop.latitude,
          dropLng: drop.longitude,
          parcelCategory: formData.parcelCategory,
          parcelWeight: Number(formData.parcelWeight),
          parcelValue: 0,
          vehicleType: formData.vehicleType,
          deliveryType: formData.deliveryType,
          paymentMethod: formData.paymentMethod,
          scheduledPickupAt: formData.deliveryType === 'SCHEDULED' ? formData.scheduleAt || undefined : undefined,
          couponCode: formData.couponCode || undefined,
          discountAmount,
          finalPrice: finalFare,
          isFragile: formData.parcelCategory === 'FRAGILE_ITEMS',
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to create order')
      }

      const created = payload?.data
      if (created) {
        saveDemoOrder({
          id: created.id,
          orderNumber: created.orderNumber,
          status: created.status,
          finalPrice: Number(created.finalPrice || created.fareAmount || finalFare || 0),
          createdAt: created.createdAt || new Date().toISOString(),
          trackingLogs: created.trackingLogs || [],
        } as Order)
      }

      if (formData.paymentMethod === 'WALLET' && finalFare > 0) {
        addDemoWalletTransaction(finalFare, 'Ride Payment', 'DEBIT')
      }

      setMessage(`Order created: ${created?.orderNumber || created?.id}`)
      setStep(1)
      setFormData((prev) => ({
        ...prev,
        parcelWeight: '',
        parcelCategory: 'DOCUMENTS',
        deliveryType: 'STANDARD',
        vehicleType: 'BIKE',
        paymentMethod: 'COD',
        scheduleAt: '',
        couponCode: '',
      }))
      setDiscountAmount(0)
      setCouponMessage('')
    } catch {
      const demoOrderNumber = `VT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`
      const localOrder: Order = {
        id: `demo-order-${Date.now()}`,
        orderNumber: demoOrderNumber,
        status: 'PENDING',
        finalPrice: finalFare,
        createdAt: new Date().toISOString(),
        trackingLogs: [
          {
            id: `demo-track-${Date.now()}`,
            status: 'PENDING',
            timestamp: new Date().toISOString(),
          },
        ],
      }
      saveDemoOrder(localOrder)
      if (formData.paymentMethod === 'WALLET' && finalFare > 0) {
        addDemoWalletTransaction(finalFare, 'Ride Payment', 'DEBIT')
      }
      setMessage(`Order created: ${demoOrderNumber}`)
      setStep(1)
      setFormData((prev) => ({
        ...prev,
        parcelWeight: '',
        parcelCategory: 'DOCUMENTS',
        deliveryType: 'STANDARD',
        vehicleType: 'BIKE',
        paymentMethod: 'COD',
        scheduleAt: '',
        couponCode: '',
      }))
      setDiscountAmount(0)
      setCouponMessage('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-[28px] border border-[#E5E7EB] bg-white p-6 shadow-[0_24px_64px_-36px_rgba(15,23,42,0.35)] md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#64748B]">Book delivery</p>
          <h1 className="mt-2 text-3xl font-bold text-[#0F172A] md:text-4xl">Book in 3 simple steps</h1>
          <p className="mt-2 text-sm text-[#64748B]">Search places like ride apps and confirm instantly.</p>
        </section>

        <section className="mt-5 flex flex-wrap items-center gap-3">
          {[
            { num: 1, label: 'Locations', icon: MapPin },
            { num: 2, label: 'Parcel', icon: Package },
            { num: 3, label: 'Vehicle', icon: Truck },
            { num: 4, label: 'Review', icon: Clock },
          ].map((s) => (
            <div key={s.num} className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold ${step >= s.num ? 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]' : 'border-[#E5E7EB] bg-white text-[#64748B]'}`}>
              <s.icon className="h-4 w-4" />
              {s.num}. {s.label}
            </div>
          ))}
        </section>

        <section className="mt-5 rounded-[28px] border border-[#E5E7EB] bg-white p-6 shadow-[0_24px_64px_-36px_rgba(15,23,42,0.35)] md:p-8">
          {step === 1 && (
            <div className="grid gap-5">
              <h2 className="text-xl font-bold text-[#0F172A]">Pickup and drop locations</h2>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#334155]">Pickup location</label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[#94A3B8]" />
                    <input
                      value={pickupSearch}
                      onChange={(event) => setPickupSearch(event.target.value)}
                      placeholder="Search e.g. Vowel 14 School Nellore"
                      className="w-full rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] py-3 pl-9 pr-3 text-sm text-[#0F172A] outline-none"
                    />
                  </div>
                  {pickupSuggestions.length > 0 && (
                    <ul className="mt-2 max-h-52 overflow-y-auto rounded-2xl border border-[#E5E7EB] bg-white p-2">
                      {pickupSuggestions.map((place) => (
                        <li key={place.id}>
                          <button type="button" onClick={() => selectPickupSuggestion(place)} className="w-full rounded-xl px-3 py-2 text-left text-sm text-[#334155] hover:bg-[#EFF6FF]">
                            {place.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#334155]">Drop location</label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[#94A3B8]" />
                    <input
                      value={dropSearch}
                      onChange={(event) => setDropSearch(event.target.value)}
                      placeholder="Search e.g. Zudio Tirupati"
                      className="w-full rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] py-3 pl-9 pr-3 text-sm text-[#0F172A] outline-none"
                    />
                  </div>
                  {dropSuggestions.length > 0 && (
                    <ul className="mt-2 max-h-52 overflow-y-auto rounded-2xl border border-[#E5E7EB] bg-white p-2">
                      {dropSuggestions.map((place) => (
                        <li key={place.id}>
                          <button type="button" onClick={() => selectDropSuggestion(place)} className="w-full rounded-xl px-3 py-2 text-left text-sm text-[#334155] hover:bg-[#EFF6FF]">
                            {place.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-5">
              <h2 className="text-xl font-bold text-[#0F172A]">Parcel details</h2>
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#334155]">Category</label>
                <select aria-label="Parcel category" className="w-full rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3 text-sm" value={formData.parcelCategory} onChange={(e) => setFormData({ ...formData, parcelCategory: e.target.value })}>
                  <option>DOCUMENTS</option>
                  <option>FOOD</option>
                  <option>MEDICINE</option>
                  <option>ELECTRONICS</option>
                  <option>CLOTHING</option>
                  <option>FRAGILE_ITEMS</option>
                  <option>GROCERY</option>
                  <option>OTHER</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#334155]">Weight (kg)</label>
                <input type="number" placeholder="Enter parcel weight" className="w-full rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3 text-sm" value={formData.parcelWeight} onChange={(e) => setFormData({ ...formData, parcelWeight: e.target.value })} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-5">
              <h2 className="text-xl font-bold text-[#0F172A]">Choose a Vehicle</h2>

              <div className="overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white">
                {[
                  { id: 'BIKE', label: 'Bike', seats: '1 Rider', rate: '25/km' },
                  { id: 'AUTO', label: 'Auto', seats: '3 Seats', rate: '45/km' },
                  { id: 'CAR_PREMIUM', label: 'Cab', seats: '4 Seats', rate: '120/km' },
                  { id: 'TRUCK', label: 'Mini Truck', seats: 'For Goods', rate: '350/km' },
                ].map((vehicle) => {
                  const selected = formData.vehicleType === vehicle.id
                  return (
                    <button
                      key={vehicle.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, vehicleType: vehicle.id })}
                      className={`flex w-full items-center justify-between border-b border-[#e5e7eb] px-4 py-3 text-left last:border-b-0 ${selected ? 'bg-[#eff6ff]' : 'bg-white'}`}
                    >
                      <div>
                        <p className="text-sm font-semibold text-[#0f172a]">{vehicle.label}</p>
                        <p className="text-xs text-[#64748b]">{vehicle.seats}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[#0f172a]">{vehicle.rate}</p>
                        {selected ? <p className="text-xs font-semibold text-[#2563eb]">Selected</p> : null}
                      </div>
                    </button>
                  )
                })}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#334155]">Delivery type</label>
                <select aria-label="Delivery type" className="w-full rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3 text-sm" value={formData.deliveryType} onChange={(e) => setFormData({ ...formData, deliveryType: e.target.value })}>
                  <option value="STANDARD">STANDARD - 2-3 hours</option>
                  <option value="EXPRESS">EXPRESS - 45-60 minutes</option>
                  <option value="PRIORITY">PRIORITY - 30 minutes</option>
                  <option value="EMERGENCY">EMERGENCY - 15 minutes</option>
                  <option value="SCHEDULED">SCHEDULED - Schedule later</option>
                </select>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="grid gap-4">
              <h2 className="text-xl font-bold text-[#0F172A]">Review and confirm</h2>
              <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3 text-sm text-[#334155]">
                <p className="text-xs uppercase tracking-[0.14em] text-[#64748B]">Pickup</p>
                <p className="mt-1 font-medium">{pickupSearch || 'Not selected'}</p>
              </div>
              <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3 text-sm text-[#334155]">
                <p className="text-xs uppercase tracking-[0.14em] text-[#64748B]">Drop</p>
                <p className="mt-1 font-medium">{dropSearch || 'Not selected'}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-[#64748B]">Category</p>
                  <p className="mt-1 font-medium text-[#0F172A]">{formData.parcelCategory}</p>
                </div>
                <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-[#64748B]">Weight</p>
                  <p className="mt-1 font-medium text-[#0F172A]">{formData.parcelWeight || '0'} kg</p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[#64748B]">Payment Method</label>
                  <select
                    aria-label="Payment method"
                    className="w-full rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3 text-sm"
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  >
                    <option value="COD">Cash on Delivery</option>
                    <option value="WALLET">Wallet</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>

                {formData.deliveryType === 'SCHEDULED' ? (
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[#64748B]">Schedule Time</label>
                    <input
                      type="datetime-local"
                      aria-label="Schedule pickup time"
                      className="w-full rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3 text-sm"
                      value={formData.scheduleAt}
                      onChange={(e) => setFormData({ ...formData, scheduleAt: e.target.value })}
                    />
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[#64748B]">Coupon</label>
                <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                  <input
                    value={formData.couponCode}
                    onChange={(e) => setFormData({ ...formData, couponCode: e.target.value })}
                    placeholder="VINAYAKA20"
                    className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={applyCoupon}
                    className="rounded-2xl bg-[#0F172A] px-4 py-2 text-sm font-semibold text-white"
                  >
                    Apply Coupon
                  </button>
                </div>
                {couponMessage ? <p className="mt-2 text-xs text-[#2563EB]">{couponMessage}</p> : null}
              </div>

              <div className="rounded-2xl border border-[#DBEAFE] bg-[#EFF6FF] px-4 py-3 text-sm text-[#334155]">
                <p>Estimated Fare: {estimatedFare.toFixed(2)}</p>
                <p>Discount: {discountAmount.toFixed(2)}</p>
                <p className="mt-1 text-base font-semibold text-[#0F172A]">Final Fare: {finalFare.toFixed(2)}</p>
              </div>
            </div>
          )}
        </section>

        <section className="mt-5 flex items-center justify-between">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            className="rounded-2xl border border-[#E5E7EB] bg-white px-5 py-3 text-sm font-semibold text-[#334155] disabled:opacity-50"
            disabled={step === 1 || submitting || savingAddress}
          >
            Back
          </button>

          {step === 4 ? (
            <button
              onClick={() => void submitOrder()}
              disabled={!canProceedToConfirm || submitting || savingAddress}
              className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#1D4ED8,#2563EB)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {(submitting || savingAddress) ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitting ? 'Creating order...' : savingAddress ? 'Saving addresses...' : 'Confirm Ride'}
            </button>
          ) : (
            <button
              onClick={() => setStep(step + 1)}
              className="rounded-2xl bg-[linear-gradient(135deg,#1D4ED8,#2563EB)] px-5 py-3 text-sm font-semibold text-white"
            >
              Next
            </button>
          )}
        </section>

        {message ? <p className="mt-4 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#334155]">{message}</p> : null}
      </div>
    </main>
  )
}
