'use client'

import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface ChartPoint { month: string; income: number; ads: number; profit: number }

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, padding: '8px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
      <p style={{ margin: '0 0 4px', fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</p>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#10B981' }}>{payload[0].value.toLocaleString()} DH</p>
    </div>
  )
}

export default function IncomeChart({ data }: { data: ChartPoint[] }) {
  const max = Math.max(...data.map(d => d.income), 1)

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={32} barCategoryGap="30%">
        <XAxis
          dataKey="month"
          tick={{ fill: '#9CA3AF', fontSize: 11, fontFamily: 'Inter, sans-serif' }}
          axisLine={false}
          tickLine={false}
          dy={6}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(16,185,129,0.05)', radius: 6 } as any} />
        <Bar dataKey="income" radius={[6, 6, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.income === max ? '#10B981' : 'rgba(16,185,129,0.25)'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
