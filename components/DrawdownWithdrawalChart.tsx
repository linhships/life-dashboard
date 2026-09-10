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
import type { DrawdownRow } from "@/lib/types";

export function DrawdownWithdrawalChart({
  data,
  statePensionAge = 67,
  statePensionAmount = 11500,
}: {
  data: DrawdownRow[];
  statePensionAge?: number;
  statePensionAmount?: number;
}) {
  const chartData = data.map((r) => ({
    age: r.age,
    "From ISA": r.withdrawnIsa,
    "From GIA": r.withdrawnGia,
    "From SIPP": r.withdrawnSipp,
    "State pension": r.age >= statePensionAge ? statePensionAmount : 0,
    Tax: r.incomeTax + r.cgt,
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={chartData} margin={{ top: 8, right: 32, left: 16, bottom: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ebe4da" />
        <XAxis dataKey="age" tick={{ fontSize: 12 }} label={{ value: "Age", position: "insideBottom", offset: -4, fontSize: 12 }} />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(v) => gbp(v, { compact: true })}
        />
        <Tooltip formatter={(v) => gbp(Number(v))} labelFormatter={(l) => `Age ${l}`} />
        <Legend wrapperStyle={{ paddingTop: 20 }} />
        <Bar dataKey="From ISA" stackId="s" fill="#2f6b4f" />
        <Bar dataKey="From GIA" stackId="s" fill="#7e6aa8" />
        <Bar dataKey="From SIPP" stackId="s" fill="#c1843a" />
        <Bar dataKey="State pension" stackId="s" fill="#1f2923" />
        <Bar dataKey="Tax" stackId="s" fill="#c4614a" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
