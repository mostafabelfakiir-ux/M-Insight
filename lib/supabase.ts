// Shared TypeScript interfaces for M-Insight
// Firebase is used as the backend (lib/firebase.ts), these are just type definitions.

export type FinanceType     = 'income' | 'expense' | 'ads'
export type TaskStatus      = 'todo' | 'in_progress' | 'review' | 'done'
export type TaskPriority    = 'low' | 'medium' | 'high' | 'urgent'
export type MilestoneCategory = 'client_feedback' | 'revenue_proof' | 'prompt_result' | 'case_study'

export interface Client {
  id: string
  user_id: string
  name: string
  email?: string
  company?: string
  avatar_url?: string
  total_paid: number
  created_at: string
}

export interface Finance {
  id: string
  user_id: string
  client_id?: string
  type: FinanceType
  category?: string
  amount: number
  description?: string
  date: string
}

export interface Task {
  id: string
  user_id: string
  client_id?: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  deadline?: string
  client?: Client
}

export interface Milestone {
  id: string
  user_id: string
  client_id?: string
  image_url: string
  category: MilestoneCategory
  title: string
  description?: string
  amount?: number
  is_featured: boolean
  date: string
  client?: Client
}

export interface FinanceSummary {
  total_income: number
  total_expenses: number
  ads_spend: number
  net_profit: number
  roi_percent: number | null
}
