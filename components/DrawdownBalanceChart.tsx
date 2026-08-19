"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { gbp } from "@/lib/format";
import type { DrawdownRow } from "@/lib/types";

export function DrawdownBalanceChart({ data }: { data: DrawdownRow[] }) {
  const chartData = data.map((r) => ({
    age: r.age,
    ISA: r.isaStart,
    GIA: r.giaStart,
    SIPP: r.sippStart,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="age" tick={{ fontSize: 12 }} label={{ value: "Age", position: "insideBottom", offset: -4, fontSize: 12 }} />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(v) => gbp(v, { compact: true })}
        />
        <Tooltip formatter={(v) => gbp(Number(v))} labelFormatter={(l) => `Age ${l}`} />
        <Legend />
        <Area type="monotone" dataKey="ISA" stackId="1" stroke="#2563eb" fill="#2563eb" fillOpacity={0.6} />
        <Area type="monotone" dataKey="GIA" stackId="1" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.6} />
        <Area type="monotone" dataKey="SIPP" stackId="1" stroke="#059669" fill="#059669" fillOpacity={0.6} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
