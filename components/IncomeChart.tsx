"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { gbp, MONTH_NAMES } from "@/lib/format";
import type { IncomeRow } from "@/lib/types";

export function IncomeChart({ data }: { data: IncomeRow[] }) {
  const chartData = data.map((r) => ({
    label: `${MONTH_NAMES[r.month - 1] ?? r.month} ${String(r.year).slice(-2)}`,
    netPay: r.netPay,
    overallBankPayment: r.overallBankPayment,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 32, left: 16, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(v) => gbp(v, { compact: true })}
        />
        <Tooltip formatter={(v) => gbp(Number(v))} />
        <Legend />
        <Bar dataKey="netPay" name="Net pay (payroll)" fill="#2563eb" radius={[3, 3, 0, 0]} />
        <Line
          type="monotone"
          dataKey="overallBankPayment"
          name="Received in bank"
          stroke="#d97706"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
