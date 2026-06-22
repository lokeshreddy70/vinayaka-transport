"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

export default function Page() {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/orders?page=1&limit=20`)
      .then((res) => res.json())
      .then((data) => setOrders(data.items ?? []));
  }, []);

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <h1>Vinayaka Operations Counter Portal</h1>
      <p>Quick booking, dispatch, parcel storage, and cash close workflows.</p>
      <table style={{ width: "100%", marginTop: 16, background: "#fff", borderRadius: 12, padding: 16 }}>
        <thead>
          <tr>
            <th align="left">Tracking</th>
            <th align="left">Status</th>
            <th align="left">Route</th>
            <th align="left">Fare</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>{order.trackingNumber}</td>
              <td>{order.status}</td>
              <td>{order.pickupAddress} to {order.dropAddress}</td>
              <td>{order.finalFare}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
