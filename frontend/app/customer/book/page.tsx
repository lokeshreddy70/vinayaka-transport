'use client'

import { useState } from 'react'
import { MapPin, Package, Truck, Clock, MapPinIcon } from 'lucide-react'

export default function BookParcel() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    pickupLocation: '',
    dropLocation: '',
    parcelCategory: 'DOCUMENTS',
    parcelWeight: '',
    vehicleType: 'BIKE',
    deliveryType: 'STANDARD',
  })

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Send a Parcel</h1>
          <p className="text-gray-400">Fast, secure, and reliable delivery</p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-between mb-8">
          {[
            { num: 1, label: 'Locations', icon: MapPin },
            { num: 2, label: 'Details', icon: Package },
            { num: 3, label: 'Vehicle', icon: Truck },
            { num: 4, label: 'Review', icon: Clock },
          ].map((s, i) => (
            <div key={i} className="flex items-center">
              <div className={`flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg ${step >= s.num ? 'bg-orange-500 text-white' : 'bg-slate-700 text-gray-400'}`}>
                {s.num}
              </div>
              <div className="ml-3">
                <p className={`text-sm font-semibold ${step >= s.num ? 'text-white' : 'text-gray-400'}`}>{s.label}</p>
              </div>
              {i < 3 && <div className={`w-12 h-1 mx-4 ${step > s.num ? 'bg-orange-500' : 'bg-slate-700'}`} />}
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 mb-6">
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">Where are we sending this?</h2>

              <div>
                <label className="block text-white font-semibold mb-2">📍 Pickup Location</label>
                <input
                  type="text"
                  placeholder="Enter pickup address or click on map"
                  className="input-field"
                  value={formData.pickupLocation}
                  onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">📍 Drop Location</label>
                <input
                  type="text"
                  placeholder="Enter drop address or click on map"
                  className="input-field"
                  value={formData.dropLocation}
                  onChange={(e) => setFormData({ ...formData, dropLocation: e.target.value })}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">Parcel Details</h2>

              <div>
                <label className="block text-white font-semibold mb-2">📦 Category</label>
                <select className="input-field" value={formData.parcelCategory} onChange={(e) => setFormData({ ...formData, parcelCategory: e.target.value })}>
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
                <label className="block text-white font-semibold mb-2">⚖️ Weight (kg)</label>
                <input
                  type="number"
                  placeholder="Enter weight"
                  className="input-field"
                  value={formData.parcelWeight}
                  onChange={(e) => setFormData({ ...formData, parcelWeight: e.target.value })}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">Vehicle & Delivery Type</h2>

              <div>
                <label className="block text-white font-semibold mb-2">🚗 Vehicle Type</label>
                <select className="input-field" value={formData.vehicleType} onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}>
                  <option>BIKE</option>
                  <option>AUTO</option>
                  <option>MINI_VAN</option>
                  <option>CAR_PREMIUM</option>
                  <option>TRUCK</option>
                </select>
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">⏰ Delivery Type</label>
                <select className="input-field" value={formData.deliveryType} onChange={(e) => setFormData({ ...formData, deliveryType: e.target.value })}>
                  <option>STANDARD - 2-3 hours</option>
                  <option>EXPRESS - 45-60 minutes</option>
                  <option>PRIORITY - 30 minutes</option>
                  <option>EMERGENCY - 15 minutes</option>
                  <option>SCHEDULED - Schedule later</option>
                </select>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">Review Your Order</h2>

              <div className="space-y-4">
                <div className="bg-slate-700/50 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">From</p>
                  <p className="text-white font-semibold">{formData.pickupLocation || 'Not set'}</p>
                </div>

                <div className="bg-slate-700/50 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">To</p>
                  <p className="text-white font-semibold">{formData.dropLocation || 'Not set'}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-slate-700/50 p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Category</p>
                    <p className="text-white font-semibold">{formData.parcelCategory}</p>
                  </div>
                  <div className="bg-slate-700/50 p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Weight</p>
                    <p className="text-white font-semibold">{formData.parcelWeight} kg</p>
                  </div>
                </div>

                <div className="bg-orange-500/20 border border-orange-500/50 p-6 rounded-lg text-center">
                  <p className="text-gray-300 mb-2">Estimated Price</p>
                  <p className="text-4xl font-bold text-orange-400">₹149</p>
                  <p className="text-gray-400 text-sm mt-2">Premium delivery included</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            className="px-8 py-3 rounded-lg font-semibold text-gray-300 hover:text-white transition disabled:opacity-50"
            disabled={step === 1}
          >
            Back
          </button>

          {step === 4 ? (
            <button className="bg-orange-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-orange-600 transition">
              Confirm & Pay
            </button>
          ) : (
            <button
              onClick={() => setStep(step + 1)}
              className="bg-orange-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-orange-600 transition"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
