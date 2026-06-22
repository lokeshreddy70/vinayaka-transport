"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

export default function Page() {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/orders?status=ASSIGNED&page=1&limit=20`)
      .then((res) => res.json())
      .then((data) => setOrders(data.items ?? []));
  }, []);

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <h1>Vinayaka Rider Portal</h1>
      <p>Accept orders, pickup scan, transit updates, and delivery proof.</p>
      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        {orders.map((order) => (
          <div key={order.id} style={{ background: "#fff", borderRadius: 12, padding: 14 }}>
            <p><strong>{order.trackingNumber}</strong> - {order.status}</p>
            <p>{order.pickupAddress} to {order.dropAddress}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
