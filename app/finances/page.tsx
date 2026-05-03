import AppLayout from '@/components/layout/AppLayout'
import StatsHeader from '@/components/layout/StatsHeader'
import { formatCurrency, formatDate } from '@/lib/formatters'
import type { Finance } from '@/lib/supabase'

const MOCK_SUMMARY = {
  total_income: 4850, total_expenses: 620, ads_spend: 380, net_profit: 3850, roi_percent: 913.2,
}

const MOCK_FINANCES: (Finance & { client_name?: string })[] = [
  { id: '1', user_id: 'demo', type: 'income',  category: 'freelance',    amount: 1200, description: 'Prompt engineering package — SaaS client', date: '2026-04-28', client_name: 'Alex Turner' },
  { id: '2', user_id: 'demo', type: 'income',  category: 'freelance',    amount: 850,  description: 'Upwork milestone payment',               date: '2026-04-20' },
  { id: '3', user_id: 'demo', type: 'ads',     category: 'meta_ads',     amount: 380,  description: 'Facebook Lead Gen Campaign — April',      date: '2026-04-15' },
  { id: '4', user_id: 'demo', type: 'expense', category: 'subscription', amount: 120,  description: 'OpenAI API + ChatGPT Plus',               date: '2026-04-01' },
  { id: '5', user_id: 'demo', type: 'income',  category: 'consulting',   amount: 2800, description: '3-session AI strategy consulting',        date: '2026-03-28', client_name: 'Growth Co.' },
]

const TYPE_COLORS: Record<string, string> = {
  income:  'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  expense: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  ads:     'bg-amber-500/20 text-amber-300 border-amber-500/30',
}

export default function FinancesPage() {
  return (
    <AppLayout
      title="Finances"
      description="Track income, expenses, and ad spend."
      action={
        <button className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">
          + Add Entry
        </button>
      }
    >
      <StatsHeader summary={MOCK_SUMMARY} />

      <div className="rounded-xl border border-zinc-800 bg-zinc-900">
        <div className="border-b border-zinc-800 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-100">Transactions</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800">
              {['Date', 'Type', 'Category', 'Description', 'Client', 'Amount'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {MOCK_FINANCES.map(f => (
              <tr key={f.id} className="hover:bg-zinc-800/30 transition-colors">
                <td className="px-5 py-3.5 text-xs text-zinc-500">{formatDate(f.date)}</td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${TYPE_COLORS[f.type]}`}>
                    {f.type}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-xs text-zinc-500">{f.category ?? '—'}</td>
                <td className="px-5 py-3.5 text-xs text-zinc-300 max-w-xs truncate">{f.description}</td>
                <td className="px-5 py-3.5 text-xs text-zinc-500">{f.client_name ?? '—'}</td>
                <td className={`px-5 py-3.5 text-sm font-semibold tabular-nums ${f.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {f.type === 'income' ? '+' : '-'}{formatCurrency(f.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppLayout>
  )
}
