import Sidebar from './Sidebar'

interface AppLayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
  action?: React.ReactNode
}

export default function AppLayout({ children, title, description, action }: AppLayoutProps) {
  return (
    <div className="flex h-screen bg-[#09090b]">
      <Sidebar />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden pl-64">
        {/* Page header */}
        {title && (
          <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-zinc-800 bg-[#09090b] px-6">
            <div>
              <h1 className="text-lg font-semibold text-zinc-100">{title}</h1>
              {description && (
                <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
              )}
            </div>
            {action && <div>{action}</div>}
          </header>
        )}

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-6 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
