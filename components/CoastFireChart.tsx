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
  ReferenceLine,
} from "recharts";
import { gbp } from "@/lib/format";

export interface CoastFirePoint {
  year: number;
  age: number;
  isaGia: number;
  sipp: number;
}

export function CoastFireChart({
  data,
  retirementYear,
  sippAccessYear,
}: {
  data: CoastFirePoint[];
  retirementYear?: number;
  sippAccessYear?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={360}>
      <AreaChart data={data} margin={{ top: 28, right: 40, left: 16, bottom: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="year"
          tick={{ fontSize: 12 }}
          label={{ value: "Year", position: "insideBottom", offset: -4, fontSize: 12 }}
        />
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
        <Legend wrapperStyle={{ paddingTop: 20 }} />
        <Area
          type="monotone"
          dataKey="isaGia"
          name="ISA + GIA"
          stackId="1"
          stroke="#2563eb"
          fill="#2563eb"
          fillOpacity={0.6}
        />
        <Area
          type="monotone"
          dataKey="sipp"
          name="SIPP (pension)"
          stackId="1"
          stroke="#059669"
          fill="#059669"
          fillOpacity={0.6}
        />
        {retirementYear && (
          <ReferenceLine
            x={retirementYear}
            stroke="#64748b"
            strokeDasharray="4 4"
            label={{ value: "Stop working", fontSize: 11, position: "top" }}
          />
        )}
        {sippAccessYear && (
          <ReferenceLine
            x={sippAccessYear}
            stroke="#64748b"
            strokeDasharray="4 4"
            label={(labelProps: { viewBox?: { x: number; y: number } }) => {
              const viewBox = labelProps.viewBox;
              if (!viewBox) return undefined;
              return (
                <text
                  x={viewBox.x - 5}
                  y={viewBox.y - 5}
                  textAnchor="end"
                  fontSize={11}
                  fill="#666"
                >
                  SIPP access
                </text>
              );
            }}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
