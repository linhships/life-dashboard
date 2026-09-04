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
import type { NetWorthPoint } from "@/lib/aggregate";

const COLORS: Record<string, string> = {
  ISA: "#2563eb",
  GIA: "#7c3aed",
  SIPP: "#059669",
  Savings: "#d97706",
};

export function NetWorthChart({ data }: { data: NetWorthPoint[] }) {
  const buckets = Object.keys(COLORS).filter((b) =>
    data.some((d) => typeof d[b] === "number" && (d[b] as number) > 0)
  );

  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data} margin={{ top: 8, right: 32, left: 16, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(v) => gbp(v, { compact: true })}
        />
        <Tooltip formatter={(v) => gbp(Number(v))} />
        <Legend />
        {buckets.map((bucket) => (
          <Area
            key={bucket}
            type="monotone"
            dataKey={bucket}
            stackId="1"
            stroke={COLORS[bucket]}
            fill={COLORS[bucket]}
            fillOpacity={0.6}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
