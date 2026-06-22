import React from "react";

type StatCardProps = {
  title: string;
  value: string;
  helper?: string;
};

export const StatCard = ({ title, value, helper }: StatCardProps) => (
  <div style={{ border: "1px solid #d6d6d6", borderRadius: 12, padding: 16 }}>
    <p style={{ margin: 0, color: "#5f6b7a" }}>{title}</p>
    <h3 style={{ marginTop: 8, marginBottom: 8 }}>{value}</h3>
    {helper ? <small>{helper}</small> : null}
  </div>
);
