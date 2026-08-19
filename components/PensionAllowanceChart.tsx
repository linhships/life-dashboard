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
import { gbp } from "@/lib/format";
import type { PensionAllowanceRow } from "@/lib/types";

export function PensionAllowanceChart({ data }: { data: PensionAllowanceRow[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="taxYear" tick={{ fontSize: 11 }} />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(v) => gbp(v, { compact: true })}
        />
        <Tooltip formatter={(v) => gbp(Number(v))} />
        <Legend />
        <Bar dataKey="finalAllowance" name="Allowance (that year)" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
        <Bar dataKey="contributions" name="Contributions made" fill="#2563eb" radius={[3, 3, 0, 0]} />
        <Line
          type="monotone"
          dataKey="carryForwardRemainder"
          name="Carry-forward remaining"
          stroke="#059669"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
