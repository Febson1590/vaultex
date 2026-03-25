"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { Loader2, TrendingUp } from "lucide-react";

interface PortfolioChartProps {
  data: { date: string; value: number }[];
  isLoading?: boolean;
}

// ─── Custom tooltip ──────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg px-3 py-2 text-sm border border-sky-500/20 shadow-xl"
        style={{ background: "rgba(4,10,22,0.96)" }}>
        <p className="text-slate-400 text-[11px] mb-0.5">{label}</p>
        <p className="text-white font-extrabold text-sm">
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

// ─── Y-axis formatter (handles any magnitude) ────────────────────────────────

function fmtY(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}k`;
  return `$${v.toFixed(0)}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PortfolioChart({ data, isLoading = false }: PortfolioChartProps) {
  const hasData = data.some(d => d.value > 0);

  // Compute a sensible x-axis tick interval based on data length
  // Goal: show ~6–8 labels regardless of range
  const xInterval = Math.max(0, Math.floor(data.length / 6) - 1);

  return (
    <div className="relative w-full h-full">

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg"
          style={{ background: "rgba(7,15,30,0.55)" }}>
          <Loader2 size={18} className="text-sky-400 animate-spin" />
        </div>
      )}

      {!hasData ? (
        /* ── Empty state ── */
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 pb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.15)" }}>
            <TrendingUp size={16} className="text-sky-600" />
          </div>
          <p className="text-xs text-slate-600 font-medium">
            No transaction history yet
          </p>
          <p className="text-[10px] text-slate-700">
            Deposit funds to start tracking your balance
          </p>
        </div>
      ) : (
        /* ── Real chart ── */
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <defs>
              <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#0ea5e9" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}    />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />

            <XAxis
              dataKey="date"
              tick={{ fill: "rgb(71,85,105)", fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              interval={xInterval}
            />

            <YAxis
              tick={{ fill: "rgb(71,85,105)", fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={fmtY}
              width={44}
            />

            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: "rgba(14,165,233,0.18)", strokeWidth: 1 }}
            />

            <Area
              type="monotone"
              dataKey="value"
              stroke="#0ea5e9"
              strokeWidth={1.5}
              fill="url(#portfolioGradient)"
              dot={false}
              activeDot={{
                r: 4,
                fill: "#0ea5e9",
                stroke: "#020b18",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
