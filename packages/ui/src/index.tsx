import React from "react";

type StatCardProps = {
  title: string;
  value: string;
  helper?: string;
};

export const StatCard = ({ title, value, helper }: StatCardProps) => (
  <div className="rounded-xl border border-slate-200 p-4">
    <p className="m-0 text-slate-500">{title}</p>
    <h3 className="my-2">{value}</h3>
    {helper ? <small>{helper}</small> : null}
  </div>
);
