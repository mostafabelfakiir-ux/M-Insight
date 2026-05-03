'use client'

import { useState } from 'react'
import MilestoneCard from './MilestoneCard'
import type { Milestone, MilestoneCategory } from '@/lib/supabase'
import { CATEGORY_META } from '@/lib/formatters'
import { Upload, Filter } from 'lucide-react'

const ALL_CATEGORIES = ['all', 'client_feedback', 'revenue_proof', 'prompt_result', 'case_study'] as const
type FilterCategory = typeof ALL_CATEGORIES[number]

interface MasonryGridProps {
  milestones: Milestone[]
  onUpload?: () => void
  onSelect?: (m: Milestone) => void
}

export default function MasonryGrid({ milestones, onUpload, onSelect }: MasonryGridProps) {
  const [active, setActive] = useState<FilterCategory>('all')

  const filtered = active === 'all'
    ? milestones
    : milestones.filter(m => m.category === active)

  // Split into 3 columns for masonry
  const columns: Milestone[][] = [[], [], []]
  filtered.forEach((m, i) => columns[i % 3].push(m))

  return (
    <div>
      {/* Filter bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-zinc-600" />
          <div className="flex flex-wrap gap-2">
            {ALL_CATEGORIES.map(cat => {
              const isAll  = cat === 'all'
              const label  = isAll ? 'All' : CATEGORY_META[cat]?.label ?? cat
              const isActive = active === cat
              return (
                <button
                  key={cat}
                  onClick={() => setActive(cat)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all border ${
                    isActive
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-200'
                  }`}
                >
                  {label}
                  {isAll && (
                    <span className="ml-1.5 rounded-full bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-300">
                      {milestones.length}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {onUpload && (
          <button
            onClick={onUpload}
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-violet-700 active:scale-95"
          >
            <Upload className="h-4 w-4" />
            Upload Milestone
          </button>
        )}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/50 py-20 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
            <Upload className="h-5 w-5 text-zinc-600" />
          </div>
          <p className="text-sm font-medium text-zinc-400">No milestones yet</p>
          <p className="mt-1 text-xs text-zinc-600">Upload screenshots, revenue proofs, or client feedback</p>
          {onUpload && (
            <button
              onClick={onUpload}
              className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
            >
              Add First Milestone
            </button>
          )}
        </div>
      )}

      {/* Masonry grid */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {columns.map((col, colIdx) => (
            <div key={colIdx} className="flex flex-col gap-4">
              {col.map(milestone => (
                <MilestoneCard
                  key={milestone.id}
                  milestone={milestone}
                  onClick={onSelect}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
