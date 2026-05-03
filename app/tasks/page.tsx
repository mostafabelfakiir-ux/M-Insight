'use client'

import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { STATUS_META, PRIORITY_META, formatDate } from '@/lib/formatters'
import type { Task, TaskStatus } from '@/lib/supabase'

const ALL_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'review', 'done']

const MOCK_TASKS: Task[] = [
  { id: '1', user_id: 'demo', title: 'Write 5-prompt sequence for e-commerce client', status: 'in_progress', priority: 'high',   deadline: '2026-05-07' },
  { id: '2', user_id: 'demo', title: 'Deliver ChatGPT fine-tuning guide',             status: 'review',      priority: 'urgent', deadline: '2026-05-05' },
  { id: '3', user_id: 'demo', title: 'Build system prompt for SaaS onboarding flow',  status: 'todo',        priority: 'medium', deadline: '2026-05-10' },
  { id: '4', user_id: 'demo', title: 'Create prompt template library for client',     status: 'todo',        priority: 'medium', deadline: '2026-05-12' },
  { id: '5', user_id: 'demo', title: 'AI copywriting system prompt — real estate',    status: 'done',        priority: 'high',   deadline: '2026-04-30' },
  { id: '6', user_id: 'demo', title: 'Document prompt engineering methodology PDF',   status: 'in_progress', priority: 'low',    deadline: '2026-05-15' },
]

export default function TasksPage() {
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all')

  const filtered = filter === 'all' ? MOCK_TASKS : MOCK_TASKS.filter(t => t.status === filter)

  return (
    <AppLayout
      title="Tasks"
      description="Client requests, deadlines, and delivery status."
      action={
        <button className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">
          + New Task
        </button>
      }
    >
      {/* Kanban-style status filter */}
      <div className="mb-6 grid grid-cols-5 gap-3">
        {(['all', ...ALL_STATUSES] as const).map(s => {
          const count  = s === 'all' ? MOCK_TASKS.length : MOCK_TASKS.filter(t => t.status === s).length
          const meta   = s !== 'all' ? STATUS_META[s] : null
          const isActive = filter === s
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-xl border p-3 text-left transition-all ${
                isActive
                  ? 'border-violet-500/50 bg-violet-600/10'
                  : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
              }`}
            >
              <p className="text-lg font-bold text-zinc-100">{count}</p>
              <p className={`text-xs font-medium mt-0.5 ${meta ? '' : 'text-zinc-400'}`}>
                <span className={meta?.color ?? ''}>
                  {s === 'all' ? 'All Tasks' : (meta?.label ?? s)}
                </span>
              </p>
            </button>
          )
        })}
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {filtered.map(task => {
          const statusMeta   = STATUS_META[task.status]
          const priorityMeta = PRIORITY_META[task.priority]
          return (
            <div
              key={task.id}
              className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`inline-flex flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusMeta?.color ?? ''}`}>
                  {statusMeta?.label ?? task.status}
                </span>
                <p className="truncate text-sm font-medium text-zinc-200">{task.title}</p>
                {task.client && (
                  <span className="flex-shrink-0 text-xs text-zinc-600">{task.client.name}</span>
                )}
              </div>
              <div className="ml-4 flex flex-shrink-0 items-center gap-4">
                <span className={`text-xs font-semibold ${priorityMeta?.color ?? ''}`}>
                  {priorityMeta?.label ?? task.priority}
                </span>
                {task.deadline && (
                  <span className="text-xs text-zinc-600">{formatDate(task.deadline)}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </AppLayout>
  )
}
