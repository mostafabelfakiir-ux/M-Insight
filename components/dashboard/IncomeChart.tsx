'use client'

import { useState, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts'

interface ChartPoint { month: string; income: number; expenses: number; profit: number }

function useIsMobile() {
  const [m, setM] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(max-width: 768px)')
    setM(mq.matches)
    const h = (e: MediaQueryListEvent) => setM(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])
  return m
}

// ── Tooltip ────────────────────────────────────────────────────────────────────
function MiniTooltip({ active, payload, label, color, dark }: {
  active?: boolean; payload?: any[]; label?: string; color: string; dark: boolean
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: dark ? '#1e1e1e' : '#fff',
      border: `1.5px solid ${color}30`,
      borderRadius: 12, padding: '8px 14px',
      boxShadow: `0 8px 20px ${color}25`,
    }}>
      <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 700, color: dark ? '#555' : '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color }}>{Number(payload[0].value).toLocaleString()} DH</p>
    </div>
  )
}

// ── Single Area Chart ──────────────────────────────────────────────────────────
function AreaCard({ data, dataKey, color, gradId, title, dark, rawTotal }: {
  data: ChartPoint[]; dataKey: 'income' | 'expenses'
  color: string; gradId: string; title: string; dark: boolean; rawTotal: number
}) {
  const total = rawTotal
  const panel = dark ? '#161616' : '#fff'
  const gridColor = dark ? '#1e1e1e' : '#f0f4ff'
  const axisColor = dark ? '#444' : '#9CA3AF'

  return (
    <div style={{
      flex: 1, background: panel, borderRadius: 18,
      boxShadow: dark ? '0 2px 12px rgba(0,0,0,0.4)' : '0 2px 12px rgba(0,0,0,0.06)',
      padding: '20px 20px 10px',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: axisColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</div>
        <div style={{ fontSize: 24, fontWeight: 800, color, marginTop: 4, lineHeight: 1 }}>
          {total.toLocaleString()} <span style={{ fontSize: 13, fontWeight: 600 }}>DH</span>
        </div>
      </div>

      <div style={{ width: '100%', height: 160 }}>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={data} margin={{ top: 4, right: 2, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity={dark ? 0.25 : 0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 4" stroke={gridColor} vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fill: axisColor, fontSize: 10, fontFamily: 'Inter,sans-serif', fontWeight: 600 }}
          axisLine={false} tickLine={false} dy={6}
        />
        <YAxis
          tick={{ fill: axisColor, fontSize: 10, fontFamily: 'Inter,sans-serif' }}
          axisLine={false} tickLine={false} width={32}
          tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
        />
        <Tooltip
          content={(props: any) => (
            <MiniTooltip active={props.active} payload={props.payload}
              label={String(props.label ?? '')} color={color} dark={dark} />
          )}
          cursor={{ stroke: `${color}30`, strokeWidth: 1.5 }}
        />
        <Area
          type="natural" dataKey={dataKey}
          stroke={color} strokeWidth={2.5}
          fill={`url(#${gradId})`} dot={false}
          activeDot={{ r: 5, fill: color, stroke: dark ? '#161616' : '#fff', strokeWidth: 2.5 }}
        />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>
  )
}

// ── Donut Chart ────────────────────────────────────────────────────────────────
function DonutCard({ data, dark, lang = 'ar' }: { data: ChartPoint[]; dark: boolean; lang?: 'ar' | 'en' | 'fr' }) {
  const income   = data.reduce((s, d) => s + d.income, 0)
  const expenses = data.reduce((s, d) => s + d.expenses, 0)
  const profit   = Math.max(0, income - expenses)
  const total    = income + expenses
  const panel    = dark ? '#161616' : '#fff'
  const sub      = dark ? '#555' : '#6B7280'

  const lbl = CHART_LABELS[lang] ?? CHART_LABELS.ar
  const sliceNames = {
    ar: { income: 'مداخيل', expenses: 'مصاريف', profit: 'ربح' },
    en: { income: 'Income', expenses: 'Expenses', profit: 'Profit' },
    fr: { income: 'Revenus', expenses: 'Dépenses', profit: 'Gain' },
  }[lang] ?? { income: 'مداخيل', expenses: 'مصاريف', profit: 'ربح' }

  const slices = [
    { name: sliceNames.income,   value: income,   color: '#0AB68B' },
    { name: sliceNames.expenses, value: expenses, color: '#EF4444' },
    { name: sliceNames.profit,   value: profit,   color: '#6366F1' },
  ].filter(s => s.value > 0)

  if (total === 0) return (
    <div style={{ background: panel, borderRadius: 18, boxShadow: dark ? '0 2px 12px rgba(0,0,0,0.4)' : '0 2px 12px rgba(0,0,0,0.06)', padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 220, color: sub, fontSize: 13 }}>
      {lang === 'ar' ? 'لا توجد بيانات' : lang === 'fr' ? 'Aucune donnée' : 'No data yet'}
    </div>
  )

  return (
    <div style={{ background: panel, borderRadius: 18, boxShadow: dark ? '0 2px 12px rgba(0,0,0,0.4)' : '0 2px 12px rgba(0,0,0,0.06)', padding: '20px 20px 16px', display: 'flex', flexDirection: 'column', minWidth: 220 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: dark ? '#444' : '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
        {lbl.overview}
      </div>
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
        <PieChart width={160} height={160}>
          <Pie data={slices} cx={75} cy={75} innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value" strokeWidth={0}>
            {slices.map((s, i) => <Cell key={i} fill={s.color} />)}
          </Pie>
        </PieChart>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
          <div style={{ fontSize: 11, color: sub, fontWeight: 600 }}>{lbl.net}</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: income - expenses >= 0 ? '#0AB68B' : '#EF4444', lineHeight: 1.2 }}>
            {((income - expenses) / 1000).toFixed(1)}k
          </div>
          <div style={{ fontSize: 9, color: sub }}>DH</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: sub, fontWeight: 500 }}>{s.name}</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: s.color }}>
              {total > 0 ? Math.round((s.value / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── interpolate for smooth curves ─────────────────────────────────────────────
function interpolate(data: ChartPoint[], key: 'income' | 'expenses', steps = 6): ChartPoint[] {
  if (data.length < 2) {
    const v = data[0]?.[key] ?? 0
    const m = data[0]?.month ?? ''
    // show flat line at real value — no fake bell curve
    return ['', m, ''].map((month, i) =>
      ({ month, income: 0, expenses: 0, profit: 0, [key]: v } as ChartPoint)
    )
  }
  const result: ChartPoint[] = []
  for (let i = 0; i < data.length - 1; i++) {
    const a = data[i][key], b = data[i + 1][key]
    for (let s = 0; s < steps; s++) {
      const t = s / steps
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      result.push({ ...data[i], month: s === 0 ? data[i].month : '', [key]: Math.round(a + (b - a) * ease) } as ChartPoint)
    }
  }
  result.push(data[data.length - 1])
  return result
}

const CHART_LABELS = {
  ar: { income: 'حركة المداخيل', expenses: 'حركة المصاريف', overview: 'نظرة عامة', net: 'صافي' },
  en: { income: 'Income Trend',  expenses: 'Expenses Trend', overview: 'Overview',    net: 'Net'  },
  fr: { income: 'Tendance revenus', expenses: 'Tendance dépenses', overview: 'Aperçu', net: 'Net' },
}

// ── Mobile Combined Chart ──────────────────────────────────────────────────────
function MobileChart({ data, dark, lang, lbl, totalIncome, totalExpenses }: {
  data: ChartPoint[]; dark: boolean; lang: 'ar' | 'en' | 'fr'
  lbl: typeof CHART_LABELS['ar']; totalIncome: number; totalExpenses: number
}) {
  const panel = dark ? '#161616' : '#fff'
  const gridColor = dark ? '#1e1e1e' : '#f0f4ff'
  const axisColor = dark ? '#444' : '#9CA3AF'
  const smooth = data.length <= 2
    ? (() => {
        const v_i = data[0]?.income ?? 0, v_e = data[0]?.expenses ?? 0, m = data[0]?.month ?? ''
        return ['', m, ''].map(month => ({ month, income: v_i, expenses: v_e, profit: v_i - v_e }))
      })()
    : data

  return (
    <div style={{ background: panel, borderRadius: 18, boxShadow: dark ? '0 2px 12px rgba(0,0,0,0.4)' : '0 2px 12px rgba(0,0,0,0.06)', padding: '16px 14px 10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: axisColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{lbl.income}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0AB68B' }}>{totalIncome.toLocaleString()} <span style={{ fontSize: 11 }}>DH</span></div>
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: axisColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{lbl.expenses}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#EF4444' }}>{totalExpenses.toLocaleString()} <span style={{ fontSize: 11 }}>DH</span></div>
        </div>
      </div>
      <div style={{ width: '100%', height: 140 }}>
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={smooth} margin={{ top: 4, right: 2, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="mgI" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0AB68B" stopOpacity={dark ? 0.2 : 0.3} />
            <stop offset="100%" stopColor="#0AB68B" stopOpacity={0.01} />
          </linearGradient>
          <linearGradient id="mgE" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EF4444" stopOpacity={dark ? 0.2 : 0.3} />
            <stop offset="100%" stopColor="#EF4444" stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 4" stroke={gridColor} vertical={false} />
        <XAxis dataKey="month" tick={{ fill: axisColor, fontSize: 9, fontWeight: 600 }} axisLine={false} tickLine={false} dy={6} />
        <YAxis tick={{ fill: axisColor, fontSize: 9 }} axisLine={false} tickLine={false} width={28} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
        <Tooltip content={(props: any) => {
          if (!props.active || !props.payload?.length) return null
          return (
            <div style={{ background: dark ? '#1e1e1e' : '#fff', border: `1px solid #eaedf5`, borderRadius: 10, padding: '6px 12px', fontSize: 11 }}>
              <p style={{ margin: 0, color: '#0AB68B', fontWeight: 700 }}>{lbl.income}: {Number(props.payload[0]?.value ?? 0).toLocaleString()} DH</p>
              <p style={{ margin: 0, color: '#EF4444', fontWeight: 700 }}>{lbl.expenses}: {Number(props.payload[1]?.value ?? 0).toLocaleString()} DH</p>
            </div>
          )
        }} cursor={{ stroke: '#9CA3AF30', strokeWidth: 1 }} />
        <Area type="natural" dataKey="income" stroke="#0AB68B" strokeWidth={2} fill="url(#mgI)" dot={false} activeDot={{ r: 4, fill: '#0AB68B' }} />
        <Area type="natural" dataKey="expenses" stroke="#EF4444" strokeWidth={2} fill="url(#mgE)" dot={false} activeDot={{ r: 4, fill: '#EF4444' }} />
        </AreaChart>
          </ResponsiveContainer>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: axisColor }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0AB68B', display: 'inline-block' }} />{lbl.income}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: axisColor }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} />{lbl.expenses}</span>
      </div>
    </div>
  )
}

// ── Main Export ────────────────────────────────────────────────────────────────
export default function IncomeChart({ data, dark = false, lang = 'ar' }: { data: ChartPoint[]; dark?: boolean; lang?: 'ar' | 'en' | 'fr' }) {
  const isMobile = useIsMobile()
  const smoothIncome   = data.length <= 2 ? interpolate(data, 'income')   : data
  const smoothExpenses = data.length <= 2 ? interpolate(data, 'expenses') : data
  const lbl = CHART_LABELS[lang] ?? CHART_LABELS.ar
  const totalIncome   = data.reduce((s, d) => s + d.income, 0)
  const totalExpenses = data.reduce((s, d) => s + d.expenses, 0)

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <MobileChart data={data} dark={dark} lang={lang} lbl={lbl} totalIncome={totalIncome} totalExpenses={totalExpenses} />
        <DonutCard data={data} dark={dark} lang={lang} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 18, alignItems: 'stretch' }}>
      <AreaCard data={smoothIncome}   dataKey="income"   color="#0AB68B" gradId="gradIncome"   title={lbl.income}   dark={dark} rawTotal={totalIncome} />
      <AreaCard data={smoothExpenses} dataKey="expenses" color="#EF4444" gradId="gradExpenses" title={lbl.expenses} dark={dark} rawTotal={totalExpenses} />
      <DonutCard data={data} dark={dark} lang={lang} />
    </div>
  )
}
