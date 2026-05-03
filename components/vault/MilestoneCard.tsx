'use client'

import Image from 'next/image'
import { Star, Calendar, DollarSign } from 'lucide-react'
import { CATEGORY_META, formatDate, formatCurrency } from '@/lib/formatters'
import type { Milestone } from '@/lib/supabase'

interface MilestoneCardProps {
  milestone: Milestone
  onClick?: (m: Milestone) => void
}

export default function MilestoneCard({ milestone, onClick }: MilestoneCardProps) {
  const meta = CATEGORY_META[milestone.category]

  return (
    <div
      onClick={() => onClick?.(milestone)}
      className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 cursor-pointer transition-all duration-200 hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-900/20 hover:-translate-y-0.5"
    >
      {/* Image */}
      <div className="relative w-full overflow-hidden bg-zinc-800">
        <Image
          src={milestone.image_url}
          alt={milestone.title}
          width={600}
          height={400}
          className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
          style={{ height: 'auto' }}
          unoptimized
        />
        {/* Featured star */}
        {milestone.is_featured && (
          <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/90 backdrop-blur-sm">
            <Star className="h-3 w-3 text-white fill-white" />
          </div>
        )}
        {/* Category badge */}
        <div className="absolute bottom-2 left-2">
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm ${meta?.color ?? 'bg-zinc-700 text-zinc-300 border-zinc-600'}`}>
            {meta?.label ?? milestone.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-sm font-semibold text-zinc-100 line-clamp-1 group-hover:text-violet-300 transition-colors">
          {milestone.title}
        </h3>
        {milestone.description && (
          <p className="mt-1 text-xs text-zinc-500 line-clamp-2 leading-relaxed">
            {milestone.description}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1 text-[10px] text-zinc-600">
            <Calendar className="h-3 w-3" />
            {formatDate(milestone.date)}
          </div>
          {milestone.amount && milestone.amount > 0 && (
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
              <DollarSign className="h-3 w-3" />
              {formatCurrency(milestone.amount)}
            </div>
          )}
        </div>

        {milestone.client && (
          <p className="mt-2 text-[10px] text-zinc-600 truncate">
            Client: {milestone.client.name}
          </p>
        )}
      </div>
    </div>
  )
}
