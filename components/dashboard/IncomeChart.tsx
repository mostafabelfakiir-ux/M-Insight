'use client'

import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface ChartPoint { month: string; income: number; ads: number; profit: number }

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0a] px-4 py-3">
      <p className="mb-1.5 text-[9px] font-medium uppercase tracking-widest text-zinc-600">{label}</p>
      <p className="font-mono text-sm font-light text-orange-400">${payload[0].value.toLocaleString()}</p>
    </div>
  )
}

export default function IncomeChart({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#f97316" stopOpacity={0.12} />
            <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
          </linearGradient>
        </defs>

        <XAxis
          dataKey="month"
          tick={{ fill: '#3f3f46', fontSize: 9, fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
          dy={8}
        />
        <YAxis hide />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(249,115,22,0.1)', strokeWidth: 1 }} />

        <Area
          type="monotone"
          dataKey="income"
          stroke="#f97316"
          strokeWidth={1.5}
          fill="url(#gradIncome)"
          dot={false}
          activeDot={{ r: 3, fill: '#f97316', strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
