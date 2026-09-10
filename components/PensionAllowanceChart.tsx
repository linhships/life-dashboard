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
      <ComposedChart data={data} margin={{ top: 8, right: 32, left: 16, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ebe4da" />
        <XAxis dataKey="taxYear" tick={{ fontSize: 11 }} />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(v) => gbp(v, { compact: true })}
        />
        <Tooltip formatter={(v) => gbp(Number(v))} />
        <Legend />
        <Bar dataKey="finalAllowance" name="Allowance (that year)" fill="#e5ddd2" radius={[3, 3, 0, 0]} />
        <Bar dataKey="contributions" name="Contributions made" fill="#2f6b4f" radius={[3, 3, 0, 0]} />
        <Line
          type="monotone"
          dataKey="carryForwardRemainder"
          name="Carry-forward remaining"
          stroke="#c1843a"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
