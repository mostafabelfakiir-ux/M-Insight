'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  DollarSign,
  CheckSquare,
  Trophy,
  Users,
  Settings,
  Zap,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/finances',  icon: DollarSign,      label: 'Finances' },
  { href: '/tasks',     icon: CheckSquare,      label: 'Tasks' },
  { href: '/vault',     icon: Trophy,           label: 'Vault' },
  { href: '/clients',   icon: Users,            label: 'Clients' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-zinc-900 border-r border-zinc-800">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-5 border-b border-zinc-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
          <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <span className="text-sm font-bold text-white tracking-wide">M-Insight</span>
          <p className="text-[10px] text-zinc-500 leading-none mt-0.5">Prompt Engineering OS</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
          Menu
        </p>
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 border border-transparent'
              }`}
            >
              <Icon
                className={`h-4 w-4 flex-shrink-0 transition-colors ${
                  active ? 'text-violet-400' : 'text-zinc-500 group-hover:text-zinc-300'
                }`}
              />
              {label}
              {active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-400" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-zinc-800 px-3 py-4 space-y-1">
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-all border border-transparent"
        >
          <Settings className="h-4 w-4 text-zinc-500" />
          Settings
        </Link>
        <div className="mt-3 flex items-center gap-3 px-3 py-2">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-violet-600/30 border border-violet-500/40 text-xs font-bold text-violet-300">
            M
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-zinc-200">Mostafa</p>
            <p className="truncate text-[10px] text-zinc-500">Prompt Engineer</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
