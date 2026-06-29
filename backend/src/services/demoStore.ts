import bcrypt from 'bcryptjs'

type DemoUser = {
  id: string
  phoneNumber: string
  fullName: string
  role: string
  passwordHash: string
  refreshToken?: string
}

type DemoAddress = {
  id: string
  customerId: string
  type: string
  fullAddress: string
  landmark?: string
  latitude: number
  longitude: number
  city: string
  state: string
  pinCode: string
  isDefault: boolean
  createdAt: string
}

type DemoOrder = {
  id: string
  orderNumber: string
  customerId: string
  pickupAddressId: string
  dropAddressId: string
  pickupLat: number
  pickupLng: number
  dropLat: number
  dropLng: number
  parcelCategory: string
  parcelWeight: number
  vehicleType: string
  deliveryType: string
  status: string
  finalPrice: number
  createdAt: string
  trackingLogs: Array<{ id: string; status: string; message: string; timestamp: string }>
}

const users = new Map<string, DemoUser>()
const usersByPhone = new Map<string, string>()
const customerByUserId = new Map<string, string>()
const addressesByCustomer = new Map<string, DemoAddress[]>()
const ordersByCustomer = new Map<string, DemoOrder[]>()

let counter = 1
function nextId(prefix: string) {
  counter += 1
  return `${prefix}_${Date.now()}_${counter}`
}

function nextOrderNumber() {
  const n = `${Date.now()}`.slice(-6)
  return `VT-${new Date().getFullYear()}-${n}`
}

export const demoStore = {
  async registerCustomer(fullName: string, phoneNumber: string, password: string) {
    if (usersByPhone.has(phoneNumber)) {
      throw new Error('Account already exists. Please login.')
    }

    const userId = nextId('usr')
    const customerId = nextId('cust')
    const passwordHash = await bcrypt.hash(password, 10)

    const user: DemoUser = {
      id: userId,
      phoneNumber,
      fullName,
      role: 'CUSTOMER',
      passwordHash,
    }

    users.set(userId, user)
    usersByPhone.set(phoneNumber, userId)
    customerByUserId.set(userId, customerId)
    addressesByCustomer.set(customerId, [])
    ordersByCustomer.set(customerId, [])

    return { user, customerId }
  },

  async loginWithPassword(phoneNumber: string, password: string) {
    const userId = usersByPhone.get(phoneNumber)
    if (!userId) {
      throw new Error('Invalid credentials')
    }

    const user = users.get(userId)
    if (!user) {
      throw new Error('Invalid credentials')
    }

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) {
      throw new Error('Invalid credentials')
    }

    return user
  },

  getUserById(userId: string) {
    return users.get(userId) || null
  },

  setUserRefreshToken(userId: string, refreshToken: string) {
    const user = users.get(userId)
    if (!user) {
      return
    }
    user.refreshToken = refreshToken
  },

  getCustomerIdByUserId(userId: string) {
    return customerByUserId.get(userId) || null
  },

  getAddresses(customerId: string) {
    return addressesByCustomer.get(customerId) || []
  },

  addAddress(customerId: string, payload: Omit<DemoAddress, 'id' | 'customerId' | 'createdAt'>) {
    const address: DemoAddress = {
      id: nextId('addr'),
      customerId,
      createdAt: new Date().toISOString(),
      ...payload,
    }

    const list = addressesByCustomer.get(customerId) || []
    list.push(address)
    addressesByCustomer.set(customerId, list)
    return address
  },

  createOrder(customerId: string, payload: {
    pickupAddressId: string
    dropAddressId: string
    pickupLat: number
    pickupLng: number
    dropLat: number
    dropLng: number
    parcelCategory: string
    parcelWeight: number
    vehicleType: string
    deliveryType: string
  }) {
    const order: DemoOrder = {
      id: nextId('ord'),
      orderNumber: nextOrderNumber(),
      customerId,
      pickupAddressId: payload.pickupAddressId,
      dropAddressId: payload.dropAddressId,
      pickupLat: payload.pickupLat,
      pickupLng: payload.pickupLng,
      dropLat: payload.dropLat,
      dropLng: payload.dropLng,
      parcelCategory: payload.parcelCategory,
      parcelWeight: payload.parcelWeight,
      vehicleType: payload.vehicleType,
      deliveryType: payload.deliveryType,
      status: 'PENDING',
      finalPrice: Math.max(60, Math.round(payload.parcelWeight * 45)),
      createdAt: new Date().toISOString(),
      trackingLogs: [
        {
          id: nextId('trk'),
          status: 'PENDING',
          message: 'Order created',
          timestamp: new Date().toISOString(),
        },
      ],
    }

    const list = ordersByCustomer.get(customerId) || []
    list.unshift(order)
    ordersByCustomer.set(customerId, list)
    return order
  },

  getOrders(customerId: string) {
    return ordersByCustomer.get(customerId) || []
  },

  getOrderById(orderId: string) {
    for (const items of ordersByCustomer.values()) {
      const found = items.find((item) => item.id === orderId)
      if (found) {
        return found
      }
    }
    return null
  },

  getOrderByNumber(orderNumber: string) {
    for (const items of ordersByCustomer.values()) {
      const found = items.find((item) => item.orderNumber === orderNumber)
      if (found) {
        return found
      }
    }
    return null
  },

  getWallet() {
    return {
      balance: 1250,
      transactions: [
        { id: nextId('txn'), amount: 500, type: 'CREDIT', description: 'Added Money', createdAt: new Date().toISOString() },
        { id: nextId('txn'), amount: -120, type: 'DEBIT', description: 'Ride to Anna Nagar', createdAt: new Date().toISOString() },
      ],
    }
  },
}
