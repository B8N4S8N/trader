"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatUsd } from "@trader/shared";
import type { EquityPoint } from "../lib/queries";

const fmtTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

export function EquityChart({
  data,
  baseline,
}: {
  data: EquityPoint[];
  baseline: number;
}) {
  const up = data.length > 0 && (data[data.length - 1]?.equity ?? 0) >= baseline;
  const stroke = up ? "#34d399" : "#f87171";

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="t"
            tickFormatter={fmtTime}
            tick={{ fill: "#7c8db5", fontSize: 11 }}
            minTickGap={48}
            stroke="rgba(255,255,255,0.1)"
          />
          <YAxis
            domain={["auto", "auto"]}
            tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
            tick={{ fill: "#7c8db5", fontSize: 11 }}
            width={52}
            stroke="rgba(255,255,255,0.1)"
          />
          <Tooltip
            contentStyle={{
              background: "#0f1729",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              color: "#e5edf7",
            }}
            labelFormatter={(label) => new Date(label as string).toLocaleString()}
            formatter={(value: number, name) => [formatUsd(value), name === "equity" ? "Equity" : name]}
          />
          <Area
            type="monotone"
            dataKey="equity"
            stroke={stroke}
            strokeWidth={2}
            fill="url(#equityFill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
