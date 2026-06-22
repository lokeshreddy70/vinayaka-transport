"use client";

import { useEffect, useMemo, useState } from "react";

type Branch = {
  id: string;
  name: string;
  city: string;
  radiusKm: number;
};

type Rule = {
  id: string;
  branchId: string;
  vehicleType: "BIKE" | "AUTO" | "CAR";
  baseFare: string;
  perKmRate: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

export default function HomePage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/branches`).then((res) => res.json()),
      fetch(`${API_URL}/pricing-rules`).then((res) => res.json())
    ]).then(([branchData, ruleData]) => {
      setBranches(branchData);
      setRules(ruleData);
    });
  }, []);

  const totalRules = useMemo(() => rules.length, [rules]);

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-3xl font-bold text-ocean">Vinayaka Transport Admin Portal</h1>
      <p className="mt-2 text-slate-600">Branches, pricing, users, complaints and fraud monitoring.</p>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <Card title="Branches" value={String(branches.length)} />
        <Card title="Pricing Rules" value={String(totalRules)} />
        <Card title="Active Cities" value={String(new Set(branches.map((branch) => branch.city)).size)} />
      </section>

      <section className="mt-8 rounded-xl bg-white p-4 shadow">
        <h2 className="text-xl font-semibold">Branch Management</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2">Name</th>
                <th className="py-2">City</th>
                <th className="py-2">Radius (km)</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((branch) => (
                <tr key={branch.id} className="border-b">
                  <td className="py-2">{branch.name}</td>
                  <td className="py-2">{branch.city}</td>
                  <td className="py-2">{branch.radiusKm}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow">
      <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
