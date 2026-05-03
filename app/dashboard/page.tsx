import AppLayout from '@/components/layout/AppLayout'
import StatsHeader from '@/components/layout/StatsHeader'
import { CheckSquare, DollarSign, Trophy, TrendingUp } from 'lucide-react'

// Placeholder data — replace with Supabase queries
const MOCK_SUMMARY = {
  total_income:   4850,
  total_expenses:  620,
  ads_spend:       380,
  net_profit:     3850,
  roi_percent:    913.2,
}

const RECENT_TASKS = [
  { id: '1', title: 'Write 5-prompt sequence for e-commerce client', status: 'in_progress', deadline: '2026-05-07', priority: 'high' },
  { id: '2', title: 'Deliver ChatGPT fine-tuning guide', status: 'review',      deadline: '2026-05-05', priority: 'urgent' },
  { id: '3', title: 'Build system prompt for SaaS onboarding flow', status: 'todo', deadline: '2026-05-10', priority: 'medium' },
]

const QUICK_STATS = [
  { label: 'Milestones Saved',  value: '24', icon: <Trophy    className="h-4 w-4 text-amber-400"   />, color: 'text-amber-400'   },
  { label: 'Total Income',      value: '$4,850', icon: <DollarSign className="h-4 w-4 text-emerald-400" />, color: 'text-emerald-400' },
  { label: 'Tasks This Month',  value: '11',  icon: <CheckSquare className="h-4 w-4 text-sky-400"  />, color: 'text-sky-400'    },
  { label: 'Growth (MoM)',      value: '+38%', icon: <TrendingUp  className="h-4 w-4 text-violet-400" />, color: 'text-violet-400'  },
]

const STATUS_COLORS: Record<string, string> = {
  todo:        'bg-zinc-500/20 text-zinc-400',
  in_progress: 'bg-blue-500/20 text-blue-300',
  review:      'bg-amber-500/20 text-amber-300',
  done:        'bg-emerald-500/20 text-emerald-300',
}

const PRIORITY_COLORS: Record<string, string> = {
  medium: 'text-blue-300',
  high:   'text-amber-300',
  urgent: 'text-rose-400',
  low:    'text-zinc-500',
}

export default function DashboardPage() {
  return (
    <AppLayout
      title="Dashboard"
      description="Welcome back, Mostafa — here's your business at a glance."
    >
      <StatsHeader summary={MOCK_SUMMARY} activeTasks={3} totalClients={5} />

      {/* Quick stats row */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {QUICK_STATS.map(s => (
          <div key={s.label} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-800">
              {s.icon}
            </div>
            <div>
              <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-zinc-600 leading-tight">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Tasks */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-100">Active Tasks</h2>
          <a href="/tasks" className="text-xs text-violet-400 hover:text-violet-300">View all →</a>
        </div>
        <div className="divide-y divide-zinc-800">
          {RECENT_TASKS.map(task => (
            <div key={task.id} className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold flex-shrink-0 ${STATUS_COLORS[task.status]}`}>
                  {task.status.replace('_', ' ')}
                </span>
                <p className="truncate text-sm text-zinc-300">{task.title}</p>
              </div>
              <div className="ml-4 flex flex-shrink-0 items-center gap-3">
                <span className={`text-xs font-medium ${PRIORITY_COLORS[task.priority]}`}>
                  {task.priority}
                </span>
                <span className="text-xs text-zinc-600">{task.deadline}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
