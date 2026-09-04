"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { gbp } from "@/lib/format";

export interface ContributionYear {
  year: number;
  age: number;
  isaContrib: number;
  giaContrib: number;
  sippContrib: number;
}

export function ContributionChart({ data }: { data: ContributionYear[] }) {
  const chartData = data.map((p) => ({
    year: p.year,
    age: p.age,
    ISA: p.isaContrib,
    GIA: p.giaContrib,
    SIPP: p.sippContrib,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 8, right: 32, left: 16, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="year" tick={{ fontSize: 12 }} />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(v) => gbp(v, { compact: true })}
        />
        <Tooltip
          formatter={(v) => gbp(Number(v))}
          labelFormatter={(label, payload) => {
            const age = payload?.[0]?.payload?.age;
            return age ? `${label} (age ${age})` : label;
          }}
        />
        <Legend />
        <Bar dataKey="ISA" fill="#2563eb" radius={[3, 3, 0, 0]} />
        <Bar dataKey="GIA" fill="#7c3aed" radius={[3, 3, 0, 0]} />
        <Bar dataKey="SIPP" fill="#059669" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
