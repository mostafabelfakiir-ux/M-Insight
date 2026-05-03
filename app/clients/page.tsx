import AppLayout from '@/components/layout/AppLayout'
import { formatCurrency, formatDate } from '@/lib/formatters'
import type { Client } from '@/lib/supabase'

const MOCK_CLIENTS: Client[] = [
  { id: '1', user_id: 'demo', name: 'Alex Turner',   email: 'alex@ecomstore.io',  company: 'EcomStore',     total_paid: 1200, created_at: '2026-03-10' },
  { id: '2', user_id: 'demo', name: 'Sara Moussa',   email: 'sara@growthco.io',   company: 'Growth Co.',    total_paid: 2800, created_at: '2026-02-15' },
  { id: '3', user_id: 'demo', name: 'James Okafor',  email: 'james@propify.io',   company: 'Propify',       total_paid: 850,  created_at: '2026-04-01' },
  { id: '4', user_id: 'demo', name: 'Lina Hoffmann', email: 'lina@saasflow.de',   company: 'SaaSFlow',      total_paid: 0,    created_at: '2026-04-28' },
]

export default function ClientsPage() {
  return (
    <AppLayout
      title="Clients"
      description="Your client roster and revenue overview."
      action={
        <button className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">
          + Add Client
        </button>
      }
    >
      <div className="rounded-xl border border-zinc-800 bg-zinc-900">
        <div className="border-b border-zinc-800 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-100">All Clients ({MOCK_CLIENTS.length})</h2>
        </div>
        <div className="divide-y divide-zinc-800/50">
          {MOCK_CLIENTS.map(client => (
            <div key={client.id} className="flex items-center justify-between px-5 py-4 hover:bg-zinc-800/30 transition-colors">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-violet-600/20 border border-violet-500/30 text-sm font-bold text-violet-300">
                  {client.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-100">{client.name}</p>
                  <p className="text-xs text-zinc-500">{client.company} · {client.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className={`text-sm font-bold ${client.total_paid > 0 ? 'text-emerald-400' : 'text-zinc-600'}`}>
                    {formatCurrency(client.total_paid)}
                  </p>
                  <p className="text-[10px] text-zinc-600">Total paid</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-500">{formatDate(client.created_at)}</p>
                  <p className="text-[10px] text-zinc-600">Since</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
