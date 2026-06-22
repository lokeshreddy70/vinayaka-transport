"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

export default function Page() {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [result, setResult] = useState<any>(null);

  async function search() {
    if (!trackingNumber) {
      return;
    }

    const response = await fetch(`${API_URL}/tracking/${trackingNumber}`);
    const data = await response.json();
    setResult(data);
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h1>Vinayaka Public Tracking</h1>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={trackingNumber}
          onChange={(event) => setTrackingNumber(event.target.value)}
          placeholder="Enter tracking number"
          style={{ padding: 10, width: 300 }}
        />
        <button onClick={search} style={{ padding: "10px 16px" }}>Track</button>
      </div>

      {result ? (
        <div style={{ marginTop: 20, background: "#fff", borderRadius: 12, padding: 16 }}>
          <p>Status: {result.status}</p>
          <p>ETA: {result.etaMinutes} min</p>
          <ul>
            {(result.timeline ?? []).map((item: any) => (
              <li key={item.id}>{item.status} - {item.message}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </main>
  );
}
