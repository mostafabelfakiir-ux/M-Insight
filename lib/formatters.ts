export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateStr))
}

export function formatROI(value: number | null): string {
  if (value === null) return 'N/A'
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
}

export const CATEGORY_META: Record<string, { label: string; color: string }> = {
  client_feedback: { label: 'Client Feedback', color: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
  revenue_proof:   { label: 'Revenue Proof',   color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  prompt_result:   { label: 'Prompt Result',   color: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
  case_study:      { label: 'Case Study',      color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
}

export const STATUS_META: Record<string, { label: string; color: string }> = {
  todo:        { label: 'To Do',       color: 'bg-zinc-500/20 text-zinc-400' },
  in_progress: { label: 'In Progress', color: 'bg-blue-500/20 text-blue-300' },
  review:      { label: 'Review',      color: 'bg-amber-500/20 text-amber-300' },
  done:        { label: 'Done',        color: 'bg-emerald-500/20 text-emerald-300' },
}

export const PRIORITY_META: Record<string, { label: string; color: string }> = {
  low:    { label: 'Low',    color: 'text-zinc-400' },
  medium: { label: 'Medium', color: 'text-blue-300' },
  high:   { label: 'High',   color: 'text-amber-300' },
  urgent: { label: 'Urgent', color: 'text-rose-400' },
}
