import { TrendingUp, TrendingDown, BarChart3, Target, CheckSquare, Megaphone } from 'lucide-react'
import { formatCurrency, formatROI } from '@/lib/formatters'
import type { FinanceSummary } from '@/lib/supabase'

interface StatCardProps {
  label: string
  value: string
  sub?: string
  trend?: 'up' | 'down' | 'neutral'
  icon: React.ReactNode
  accentClass?: string
}

function StatCard({ label, value, sub, trend, icon, accentClass = 'text-violet-400' }: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{label}</p>
          <p className={`mt-1.5 text-2xl font-bold ${accentClass}`}>{value}</p>
          {sub && (
            <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
              {trend === 'up'   && <TrendingUp  className="h-3 w-3 text-emerald-400" />}
              {trend === 'down' && <TrendingDown className="h-3 w-3 text-rose-400" />}
              {sub}
            </p>
          )}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800">
          {icon}
        </div>
      </div>
      {/* Decorative gradient */}
      <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-violet-600/5" />
    </div>
  )
}

interface StatsHeaderProps {
  summary?: FinanceSummary | null
  activeTasks?: number
  totalClients?: number
}

export default function StatsHeader({ summary, activeTasks = 0, totalClients = 0 }: StatsHeaderProps) {
  const profit   = summary?.net_profit   ?? 0
  const roi      = summary?.roi_percent  ?? null
  const adSpend  = summary?.ads_spend    ?? 0

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
      <StatCard
        label="Net Profit"
        value={formatCurrency(profit)}
        sub={profit >= 0 ? 'Positive cashflow' : 'Negative cashflow'}
        trend={profit >= 0 ? 'up' : 'down'}
        accentClass={profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}
        icon={<BarChart3 className="h-5 w-5 text-emerald-400" />}
      />
      <StatCard
        label="Ad ROI"
        value={formatROI(roi)}
        sub="Return on ad spend"
        trend={roi !== null && roi > 0 ? 'up' : roi !== null && roi < 0 ? 'down' : 'neutral'}
        accentClass={roi === null ? 'text-zinc-400' : roi > 0 ? 'text-emerald-400' : 'text-rose-400'}
        icon={<Target className="h-5 w-5 text-violet-400" />}
      />
      <StatCard
        label="Active Tasks"
        value={String(activeTasks)}
        sub={`Across ${totalClients} client${totalClients !== 1 ? 's' : ''}`}
        trend="neutral"
        accentClass="text-sky-400"
        icon={<CheckSquare className="h-5 w-5 text-sky-400" />}
      />
      <StatCard
        label="Ads Spend"
        value={formatCurrency(adSpend)}
        sub="Total ad investment"
        trend="neutral"
        accentClass="text-amber-400"
        icon={<Megaphone className="h-5 w-5 text-amber-400" />}
      />
    </div>
  )
}
