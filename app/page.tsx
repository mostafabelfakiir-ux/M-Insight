'use client'

import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { db } from '@/lib/firebase'
import { collection, getDocs, addDoc, updateDoc, doc, query, orderBy } from 'firebase/firestore'
import {
  LayoutDashboard, Wallet, CheckSquare, Settings, LogOut,
  Circle, CheckCircle2, Plus, RefreshCw, TrendingUp, Trophy,
  Calendar, DollarSign, Clock, Bell,
} from 'lucide-react'

const IncomeChart = dynamic(() => import('@/components/dashboard/IncomeChart'), { ssr: false })

// ── types ─────────────────────────────────────────────────────────────────────
interface FireTask        { id: string; title: string; status: 'pending' | 'done'; createdAt: string }
interface FireDeposit     { id: string; clientName: string; projectName?: string; totalPrice: number; depositPaid: number; date: string }
interface FireAppointment { id: string; title: string; date: string; time: string }
interface FireMilestone   { id: string; title: string; date: string; successTag: string }
type View = 'dashboard' | 'finances' | 'tasks' | 'settings'

// ── helpers ───────────────────────────────────────────────────────────────────
function monthKey(d: string) {
  const dt = new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
}
function groupByMonth(finances: any[]) {
  const map: Record<string, { month: string; income: number; ads: number; profit: number; sortKey: string }> = {}
  finances.forEach(f => {
    if (!f.date) return
    const key = monthKey(f.date)
    const lbl = new Date(f.date).toLocaleString('en-US', { month: 'short' })
    if (!map[key]) map[key] = { month: lbl, income: 0, ads: 0, profit: 0, sortKey: key }
    if (f.type?.toLowerCase() === 'income') map[key].income += Number(f.amount) || 0
    if (f.type?.toLowerCase() === 'ads')    map[key].ads    += Number(f.amount) || 0
  })
  Object.values(map).forEach(m => { m.profit = m.income - m.ads })
  return Object.values(map).sort((a, b) => a.sortKey.localeCompare(b.sortKey))
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function dh(n: number) { return `${n.toLocaleString()} DH` }

// ── nav config ────────────────────────────────────────────────────────────────
const TEAL = '#0AB68B'
const NAV: { id: View; label: string; Icon: React.FC<{ size?: number }> }[] = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'finances',  label: 'Finances',  Icon: Wallet },
  { id: 'tasks',     label: 'Tasks',     Icon: CheckSquare },
  { id: 'settings',  label: 'Settings',  Icon: Settings },
]

// ── component ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [view, setView] = useState<View>('dashboard')

  const [finances,     setFinances]     = useState<any[]>([])
  const [finLoading,   setFinLoading]   = useState(true)
  const [finErr,       setFinErr]       = useState<any>(null)
  const [finName,      setFinName]      = useState('')
  const [finAmount,    setFinAmount]    = useState('')
  const [finType,      setFinType]      = useState('income')
  const [finBusy,      setFinBusy]      = useState(false)

  const [tasks,        setTasks]        = useState<FireTask[]>([])
  const [tasksLoading, setTasksLoading] = useState(true)
  const [taskTitle,    setTaskTitle]    = useState('')
  const [taskBusy,     setTaskBusy]     = useState(false)

  const [deposits,     setDeposits]     = useState<FireDeposit[]>([])
  const [depLoading,   setDepLoading]   = useState(true)
  const [depClient,    setDepClient]    = useState('')
  const [depProject,   setDepProject]   = useState('')
  const [depTotal,     setDepTotal]     = useState('')
  const [depPaid,      setDepPaid]      = useState('')
  const [depBusy,      setDepBusy]      = useState(false)

  const [appts,        setAppts]        = useState<FireAppointment[]>([])
  const [apptsLoading, setApptsLoading] = useState(true)
  const [apptTitle,    setApptTitle]    = useState('')
  const [apptDate,     setApptDate]     = useState('')
  const [apptTime,     setApptTime]     = useState('')
  const [apptBusy,     setApptBusy]     = useState(false)

  const [milestones,   setMilestones]   = useState<FireMilestone[]>([])
  const [mlsLoading,   setMlsLoading]   = useState(true)
  const [mlsTitle,     setMlsTitle]     = useState('')
  const [mlsDate,      setMlsDate]      = useState('')
  const [mlsTag,       setMlsTag]       = useState('')
  const [mlsBusy,      setMlsBusy]      = useState(false)

  // fetchers
  async function fetchFinances() {
    try {
      const snap = await getDocs(query(collection(db, 'finances'), orderBy('date', 'desc')))
      setFinances(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (e: any) { setFinErr(e) }
    finally { setFinLoading(false) }
  }
  async function fetchTasks() {
    try {
      const snap = await getDocs(query(collection(db, 'tasks'), orderBy('createdAt', 'desc')))
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })) as FireTask[])
    } catch { /* silent */ }
    finally { setTasksLoading(false) }
  }
  async function fetchDeposits() {
    try {
      const snap = await getDocs(query(collection(db, 'deposits'), orderBy('date', 'desc')))
      setDeposits(snap.docs.map(d => ({ id: d.id, ...d.data() })) as FireDeposit[])
    } catch { /* silent */ }
    finally { setDepLoading(false) }
  }
  async function fetchAppts() {
    try {
      const snap = await getDocs(query(collection(db, 'appointments'), orderBy('date', 'asc')))
      setAppts(snap.docs.map(d => ({ id: d.id, ...d.data() })) as FireAppointment[])
    } catch { /* silent */ }
    finally { setApptsLoading(false) }
  }
  async function fetchMilestones() {
    try {
      const snap = await getDocs(query(collection(db, 'milestones'), orderBy('date', 'desc')))
      setMilestones(snap.docs.map(d => ({ id: d.id, ...d.data() })) as FireMilestone[])
    } catch { /* silent */ }
    finally { setMlsLoading(false) }
  }
  useEffect(() => {
    fetchFinances(); fetchTasks(); fetchDeposits(); fetchAppts(); fetchMilestones()
  }, [])

  // handlers
  async function handleAddFinance(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (finBusy) return; setFinBusy(true)
    try {
      await addDoc(collection(db, 'finances'), { name: finName, amount: Number(finAmount), type: finType, date: new Date().toISOString() })
      setFinName(''); setFinAmount(''); setFinType('income')
      await fetchFinances()
    } catch (e: any) { alert(e.message) } finally { setFinBusy(false) }
  }
  async function handleAddTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!taskTitle.trim() || taskBusy) return; setTaskBusy(true)
    try {
      await addDoc(collection(db, 'tasks'), { title: taskTitle.trim(), status: 'pending', createdAt: new Date().toISOString() })
      setTaskTitle(''); await fetchTasks()
    } catch (e: any) { alert(e.message) } finally { setTaskBusy(false) }
  }
  async function handleToggleTask(task: FireTask) {
    const next = task.status === 'pending' ? 'done' : 'pending'
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: next } : t))
    try { await updateDoc(doc(db, 'tasks', task.id), { status: next }) }
    catch { setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t)) }
  }
  async function handleAddDeposit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (depBusy) return; setDepBusy(true)
    try {
      await addDoc(collection(db, 'deposits'), { clientName: depClient.trim(), projectName: depProject.trim(), totalPrice: Number(depTotal), depositPaid: Number(depPaid), date: new Date().toISOString() })
      setDepClient(''); setDepProject(''); setDepTotal(''); setDepPaid('')
      await fetchDeposits()
    } catch (e: any) { alert(e.message) } finally { setDepBusy(false) }
  }
  async function handleAddAppt(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (apptBusy) return; setApptBusy(true)
    try {
      await addDoc(collection(db, 'appointments'), { title: apptTitle.trim(), date: apptDate, time: apptTime })
      setApptTitle(''); setApptDate(''); setApptTime('')
      await fetchAppts()
    } catch (e: any) { alert(e.message) } finally { setApptBusy(false) }
  }
  async function handleAddMilestone(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (mlsBusy) return; setMlsBusy(true)
    try {
      await addDoc(collection(db, 'milestones'), { title: mlsTitle.trim(), date: mlsDate, successTag: mlsTag.trim() || 'Win' })
      setMlsTitle(''); setMlsDate(''); setMlsTag('')
      await fetchMilestones()
    } catch (e: any) { alert(e.message) } finally { setMlsBusy(false) }
  }

  // derived
  const income        = useMemo(() => finances.filter(f => f.type?.toLowerCase() === 'income').reduce((s, f) => s + (Number(f.amount) || 0), 0), [finances])
  const ads           = useMemo(() => finances.filter(f => f.type?.toLowerCase() === 'ads').reduce((s, f)    => s + (Number(f.amount) || 0), 0), [finances])
  const netProfit     = income - ads
  const monthlyGrowth = useMemo(() => {
    const now  = new Date()
    const cur  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const prev = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString())
    const curI  = finances.filter(f => f.type === 'income' && monthKey(f.date ?? '') === cur).reduce((s, f)  => s + (Number(f.amount) || 0), 0)
    const prevI = finances.filter(f => f.type === 'income' && monthKey(f.date ?? '') === prev).reduce((s, f) => s + (Number(f.amount) || 0), 0)
    if (prevI === 0) return curI > 0 ? 100 : null
    return Math.round((curI - prevI) / prevI * 100)
  }, [finances])
  const chartData     = useMemo(() => groupByMonth(finances), [finances])
  const pendingTasks  = tasks.filter(t => t.status === 'pending').length
  const doneTasks     = tasks.filter(t => t.status === 'done').length
  const totalDebt     = deposits.reduce((s, d) => s + Math.max(0, d.totalPrice - d.depositPaid), 0)
  const todayStr      = new Date().toISOString().slice(0, 10)
  const upcomingAppts = appts.filter(a => a.date >= todayStr)
  const totalContracted = deposits.reduce((s, d) => s + d.totalPrice, 0)

  if (finErr) return (
    <div className="err-screen">
      <div className="err-card">
        <p className="err-title">Connection Error</p>
        <p className="err-msg">{finErr.message}</p>
      </div>
    </div>
  )

  const viewLabel = NAV.find(n => n.id === view)?.label ?? 'Dashboard'

  return (
    <>
      <div className="app-shell">

        {/* ═══════════ SIDEBAR ═══════════ */}
        <aside className="sidebar">
          {/* Brand */}
          <div className="sb-brand">
            <div className="sb-logo">M</div>
            <div>
              <div className="sb-name">M-Insight</div>
              <div className="sb-sub">Business OS</div>
            </div>
          </div>

          <div className="sb-divider" />

          {/* Nav section label */}
          <div className="sb-section-label">NAVIGATION</div>

          {/* Nav items */}
          <nav className="sb-nav">
            {NAV.map(({ id, label, Icon }) => (
              <button key={id} onClick={() => setView(id)}
                className={`sb-item ${view === id ? 'sb-item--active' : ''}`}>
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <div className="sb-spacer" />
          <div className="sb-divider" />

          {/* Logout */}
          <button onClick={() => { if (confirm('Sign out?')) window.location.href = '/login' }}
            className="sb-item sb-logout">
            <LogOut size={16} />
            <span>Log out</span>
          </button>
        </aside>

        {/* ═══════════ MAIN AREA ═══════════ */}
        <div className="main-wrap">

          {/* Top bar */}
          <header className="top-bar">
            <div className="top-bar-left">
              <h1 className="top-title">{viewLabel}</h1>
            </div>
            <div className="top-bar-right">
              <span className="top-date">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
              <button className="top-bell"><Bell size={16} /></button>
              <div className="top-avatar">M</div>
            </div>
          </header>

          {/* Page content */}
          <div className="page-body">

            {/* ─── DASHBOARD ─── */}
            {view === 'dashboard' && (
              <div className="view-wrap">

                {/* 4 stat cards */}
                <div className="stats-row">
                  {([
                    { label: 'Total Revenue',    val: finLoading ? '…' : dh(income),         sub: monthlyGrowth !== null ? `${monthlyGrowth >= 0 ? '+' : ''}${monthlyGrowth}% vs last month` : 'All time',   up: monthlyGrowth === null || monthlyGrowth >= 0, Icon: TrendingUp,  color: TEAL,     bg: '#e6faf5' },
                    { label: 'Net Profit',        val: finLoading ? '…' : dh(netProfit),       sub: `After ${dh(ads)} ad spend`,    up: netProfit >= 0,                                                     Icon: DollarSign,  color: '#6366F1', bg: '#eef2ff' },
                    { label: 'Active Tasks',      val: tasksLoading ? '…' : String(pendingTasks), sub: `${doneTasks} completed`,       up: true,                                                             Icon: CheckSquare, color: '#F59E0B', bg: '#fef3c7' },
                    { label: 'Contracted Value',  val: depLoading ? '…' : dh(totalContracted), sub: `${dh(totalDebt)} remaining`,   up: totalDebt < totalContracted,                                         Icon: Wallet,      color: '#3B82F6', bg: '#dbeafe' },
                  ] as const).map(({ label, val, sub, up, Icon, color, bg }) => (
                    <div key={label} className="stat-card">
                      <div className="stat-icon" style={{ background: bg }}>
                        <Icon size={18} style={{ color }} />
                      </div>
                      <div className="stat-body">
                        <div className="stat-label">{label}</div>
                        <div className="stat-value">{val}</div>
                        <div className="stat-sub" style={{ color: up ? '#059669' : '#DC2626' }}>{sub}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chart  +  Tasks — side by side */}
                <div className="mid-row">

                  {/* Revenue Bar Chart */}
                  <div className="card chart-card">
                    <div className="card-header">
                      <div>
                        <div className="card-title">Revenue Trend</div>
                        <div className="card-sub">Monthly income</div>
                      </div>
                      <div className="chart-total">
                        <span className="chart-total-val">{dh(income)}</span>
                        {monthlyGrowth !== null && (
                          <span className="chart-total-trend" style={{ color: monthlyGrowth >= 0 ? '#059669' : '#DC2626' }}>
                            {monthlyGrowth >= 0 ? '↑' : '↓'} {Math.abs(monthlyGrowth)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="chart-body">
                      {finLoading ? (
                        <div className="chart-placeholder">Loading data…</div>
                      ) : chartData.length === 0 ? (
                        <div className="chart-placeholder">No transactions yet — add your first payment</div>
                      ) : (
                        <IncomeChart data={chartData} />
                      )}
                    </div>
                  </div>

                  {/* To-Do / Tasks */}
                  <div className="card tasks-card">
                    <div className="card-header">
                      <div>
                        <div className="card-title">To-Do List</div>
                        <div className="card-sub">{pendingTasks} pending · {doneTasks} done</div>
                      </div>
                      <button onClick={() => setView('tasks')} className="link-btn">All tasks →</button>
                    </div>

                    {/* Inline add */}
                    <form onSubmit={handleAddTask} className="task-add-form">
                      <input
                        required value={taskTitle} onChange={e => setTaskTitle(e.target.value)}
                        placeholder="New task…" className="task-input"
                      />
                      <button type="submit" disabled={taskBusy} className="task-add-btn">
                        <Plus size={14} />
                      </button>
                    </form>

                    {/* Task list */}
                    <div className="task-list">
                      {tasksLoading ? (
                        <div className="task-empty">Loading…</div>
                      ) : tasks.length === 0 ? (
                        <div className="task-empty">No tasks yet. Add one above.</div>
                      ) : (
                        <>
                          {tasks.filter(t => t.status === 'pending').map(t => (
                            <button key={t.id} onClick={() => handleToggleTask(t)} className="task-row">
                              <div className="task-circle" />
                              <span className="task-text">{t.title}</span>
                              <span className="task-badge task-badge--pending">Pending</span>
                            </button>
                          ))}
                          {tasks.filter(t => t.status === 'done').map(t => (
                            <button key={t.id} onClick={() => handleToggleTask(t)} className="task-row task-row--done">
                              <CheckCircle2 size={16} style={{ color: TEAL, flexShrink: 0 }} />
                              <span className="task-text task-text--done">{t.title}</span>
                              <span className="task-badge task-badge--done">Done</span>
                            </button>
                          ))}
                        </>
                      )}
                    </div>

                    {/* Progress footer */}
                    {tasks.length > 0 && (
                      <div className="task-footer">
                        <span>{tasks.length} total</span>
                        <div className="task-progress">
                          <div className="task-progress-fill"
                            style={{ width: `${(doneTasks / tasks.length) * 100}%` }} />
                        </div>
                        <span>{Math.round((doneTasks / tasks.length) * 100)}%</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Client Projects */}
                <div className="card projects-card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">Client Projects</div>
                      <div className="card-sub">Remaining owed: <strong style={{ color: '#F59E0B' }}>{dh(totalDebt)}</strong></div>
                    </div>
                    <button onClick={() => setView('finances')} className="link-btn">Finances →</button>
                  </div>
                  <div className="projects-grid">
                    {depLoading ? (
                      <div className="card-sub">Loading…</div>
                    ) : deposits.length === 0 ? (
                      <div className="card-sub">No projects yet</div>
                    ) : deposits.map(d => {
                      const rem = Math.max(0, d.totalPrice - d.depositPaid)
                      const pct = d.totalPrice > 0 ? Math.min(100, (d.depositPaid / d.totalPrice) * 100) : 0
                      const sc  = rem === 0 ? TEAL : d.depositPaid === 0 ? '#EF4444' : '#F59E0B'
                      const sl  = rem === 0 ? 'Paid' : d.depositPaid === 0 ? 'Pending' : 'Partial'
                      return (
                        <div key={d.id} className="project-item">
                          <div className="project-header">
                            <div>
                              <div className="project-name">{d.clientName}</div>
                              {d.projectName && <div className="project-sub">{d.projectName}</div>}
                            </div>
                            <span className="project-badge" style={{ color: sc, background: `${sc}18` }}>{sl}</span>
                          </div>
                          <div className="project-bar-track">
                            <div className="project-bar-fill" style={{ width: `${pct}%`, background: sc }} />
                          </div>
                          <div className="project-amounts">
                            <span>{dh(d.depositPaid)} paid</span>
                            <span style={{ color: sc, fontWeight: 600 }}>
                              {rem > 0 ? `${dh(rem)} left` : '✓ Complete'}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

              </div>
            )}

            {/* ─── FINANCES ─── */}
            {view === 'finances' && (
              <div className="view-wrap">

                <div className="stats-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  {([
                    { label: 'Total Revenue', val: finLoading ? '…' : dh(income),    color: TEAL },
                    { label: 'Net Profit',    val: finLoading ? '…' : dh(netProfit), color: netProfit >= 0 ? '#059669' : '#EF4444' },
                    { label: 'Ads Spend',     val: finLoading ? '…' : dh(ads),       color: '#6B7280' },
                  ] as const).map(({ label, val, color }) => (
                    <div key={label} className="card" style={{ padding: '20px 22px' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{label}</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color }}>{val}</div>
                    </div>
                  ))}
                </div>

                <div className="two-col-grid">
                  {/* Ledger */}
                  <div className="card" style={{ overflow: 'hidden' }}>
                    <div className="card-header" style={{ padding: '18px 22px', borderBottom: '1px solid #f3f4f6' }}>
                      <div className="card-title">Transactions</div>
                      <button onClick={fetchFinances} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><RefreshCw size={14} /></button>
                    </div>
                    <table className="ledger-table">
                      <thead>
                        <tr>
                          {['Description', 'Type', 'Date', 'Amount'].map(h => (
                            <th key={h}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {finLoading ? (
                          <tr><td colSpan={4} className="table-empty">Loading…</td></tr>
                        ) : finances.length === 0 ? (
                          <tr><td colSpan={4} className="table-empty">No transactions yet</td></tr>
                        ) : finances.map(f => (
                          <tr key={f.id}>
                            <td style={{ color: '#111827', fontWeight: 500 }}>{f.name || 'Entry'}</td>
                            <td>
                              <span className={`type-badge ${f.type?.toLowerCase() === 'income' ? 'type-badge--income' : 'type-badge--ads'}`}>
                                {f.type ?? '—'}
                              </span>
                            </td>
                            <td style={{ color: '#9CA3AF' }}>{f.date ? fmtDate(f.date) : '—'}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: f.type?.toLowerCase() === 'income' ? TEAL : '#EF4444' }}>
                              {f.type?.toLowerCase() === 'income' ? '+' : '−'}{dh(Number(f.amount))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Add transaction */}
                  <div>
                    <div className="card" style={{ padding: '20px 22px', marginBottom: 18 }}>
                      <div className="card-title" style={{ marginBottom: 16 }}>Add Transaction</div>
                      <form onSubmit={handleAddFinance} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <FInput label="Description" placeholder="e.g. Client payment" value={finName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFinName(e.target.value)} required />
                        <FInput label="Amount (DH)" placeholder="0" type="number" value={finAmount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFinAmount(e.target.value)} required />
                        <div>
                          <label className="finput-label">Type</label>
                          <select value={finType} onChange={e => setFinType(e.target.value)} className="finput">
                            <option value="income">Income</option>
                            <option value="ads">Ads Spend</option>
                          </select>
                        </div>
                        <button type="submit" disabled={finBusy} className="primary-btn">
                          {finBusy ? 'Saving…' : '+ Add Entry'}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>

                {/* Deposits */}
                <div className="card" style={{ overflow: 'hidden' }}>
                  <div className="card-header" style={{ padding: '18px 22px', borderBottom: '1px solid #f3f4f6' }}>
                    <div>
                      <div className="card-title">Client Deposits</div>
                      <div className="card-sub">Remaining: <strong style={{ color: '#F59E0B' }}>{dh(totalDebt)}</strong></div>
                    </div>
                  </div>
                  <div style={{ padding: '18px 22px' }}>
                    <div className="projects-grid" style={{ marginBottom: deposits.length > 0 ? 20 : 0 }}>
                      {depLoading ? <p className="card-sub">Loading…</p> : deposits.map(d => {
                        const rem = Math.max(0, d.totalPrice - d.depositPaid)
                        const pct = d.totalPrice > 0 ? Math.min(100, (d.depositPaid / d.totalPrice) * 100) : 0
                        const sc  = rem === 0 ? TEAL : d.depositPaid === 0 ? '#EF4444' : '#F59E0B'
                        const sl  = rem === 0 ? 'Paid' : d.depositPaid === 0 ? 'Pending' : 'Partial'
                        return (
                          <div key={d.id} className="project-item">
                            <div className="project-header">
                              <div>
                                <div className="project-name">{d.clientName}</div>
                                {d.projectName && <div className="project-sub">{d.projectName}</div>}
                              </div>
                              <span className="project-badge" style={{ color: sc, background: `${sc}18` }}>{sl}</span>
                            </div>
                            <div className="project-bar-track">
                              <div className="project-bar-fill" style={{ width: `${pct}%`, background: sc }} />
                            </div>
                            <div className="project-amounts">
                              <span>Paid: {dh(d.depositPaid)}</span>
                              <span>Total: {dh(d.totalPrice)}</span>
                              {rem > 0 && <span style={{ color: '#F59E0B', fontWeight: 600 }}>{dh(rem)} left</span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <form onSubmit={handleAddDeposit} className="deposit-form">
                      <FInput label="Client" placeholder="Name" value={depClient} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDepClient(e.target.value)} required />
                      <FInput label="Project" placeholder="Project" value={depProject} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDepProject(e.target.value)} />
                      <FInput label="Total (DH)" placeholder="0" type="number" value={depTotal} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDepTotal(e.target.value)} required />
                      <FInput label="Deposit (DH)" placeholder="0" type="number" value={depPaid} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDepPaid(e.target.value)} required />
                      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button type="submit" disabled={depBusy} className="primary-btn" style={{ background: '#F59E0B' }}>
                          {depBusy ? '…' : '+ Add'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

              </div>
            )}

            {/* ─── TASKS ─── */}
            {view === 'tasks' && (
              <div className="view-wrap">
                <div className="stats-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  {([
                    { label: 'Total',       val: String(tasks.length),   color: '#111827' },
                    { label: 'In Progress', val: String(pendingTasks),   color: '#F59E0B' },
                    { label: 'Completed',   val: String(doneTasks),      color: TEAL },
                  ] as const).map(({ label, val, color }) => (
                    <div key={label} className="card" style={{ padding: '20px 22px' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{label}</div>
                      <div style={{ fontSize: 28, fontWeight: 700, color }}>{tasksLoading ? '…' : val}</div>
                    </div>
                  ))}
                </div>

                <div className="card" style={{ padding: '18px 22px', marginBottom: 16 }}>
                  <form onSubmit={handleAddTask} style={{ display: 'flex', gap: 10 }}>
                    <input required value={taskTitle} onChange={e => setTaskTitle(e.target.value)}
                      placeholder="Add a new task and press Enter…" className="finput" style={{ flex: 1 }} />
                    <button type="submit" disabled={taskBusy} className="primary-btn" style={{ flexShrink: 0 }}>
                      <Plus size={14} style={{ marginRight: 6 }} /> Add Task
                    </button>
                  </form>
                </div>

                <div className="card" style={{ overflow: 'hidden' }}>
                  {tasksLoading ? (
                    <div className="task-empty" style={{ padding: 40 }}>Loading…</div>
                  ) : tasks.length === 0 ? (
                    <div className="task-empty" style={{ padding: 40 }}>No tasks yet. Add one above.</div>
                  ) : tasks.map((t, i) => (
                    <button key={t.id} onClick={() => handleToggleTask(t)}
                      className={`task-row task-row--full ${t.status === 'done' ? 'task-row--done' : ''}`}
                      style={{ borderBottom: i < tasks.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                      {t.status === 'done'
                        ? <CheckCircle2 size={17} style={{ color: TEAL, flexShrink: 0 }} />
                        : <Circle size={17} style={{ color: '#9CA3AF', flexShrink: 0 }} />}
                      <span className={`task-text ${t.status === 'done' ? 'task-text--done' : ''}`}>{t.title}</span>
                      <span className={`task-badge ${t.status === 'done' ? 'task-badge--done' : 'task-badge--pending'}`}>
                        {t.status === 'done' ? 'Completed' : 'In Progress'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ─── SETTINGS ─── */}
            {view === 'settings' && (
              <div className="view-wrap">
                <div className="two-col-grid">

                  {/* Appointments */}
                  <div className="card" style={{ overflow: 'hidden' }}>
                    <div className="card-header" style={{ padding: '18px 22px', borderBottom: '1px solid #f3f4f6' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Calendar size={16} style={{ color: TEAL }} />
                        <div className="card-title">Appointments</div>
                        <span style={{ fontSize: 12, color: '#9CA3AF' }}>({upcomingAppts.length} upcoming)</span>
                      </div>
                    </div>
                    <div style={{ padding: '16px 22px' }}>
                      <form onSubmit={handleAddAppt} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 120px auto', gap: 10, marginBottom: 16, alignItems: 'flex-end' }}>
                        <FInput label="Title" placeholder="Meeting…" value={apptTitle} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApptTitle(e.target.value)} required />
                        <FInput label="Date" type="date" value={apptDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApptDate(e.target.value)} required />
                        <FInput label="Time" type="time" value={apptTime} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApptTime(e.target.value)} required />
                        <button type="submit" disabled={apptBusy} className="primary-btn" style={{ height: 38, padding: '0 16px' }}>
                          {apptBusy ? '…' : 'Add'}
                        </button>
                      </form>
                      {apptsLoading ? <p className="card-sub">Loading…</p> : appts.length === 0 ? (
                        <p className="card-sub">No appointments yet.</p>
                      ) : appts.map((a, i) => {
                        const isToday = a.date === todayStr
                        const isPast  = a.date < todayStr
                        return (
                          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: i < appts.length - 1 ? '1px solid #f3f4f6' : 'none', opacity: isPast ? 0.4 : 1 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: isToday ? TEAL : isPast ? '#D1D5DB' : '#3B82F6', flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                              {isToday && <span style={{ fontSize: 10, fontWeight: 700, color: TEAL, display: 'block', marginBottom: 1 }}>TODAY</span>}
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#111827' }}>{a.title}</p>
                            </div>
                            <span style={{ fontSize: 12, color: '#9CA3AF' }}>{a.date} · {a.time}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Hall of Fame */}
                  <div className="card" style={{ overflow: 'hidden' }}>
                    <div className="card-header" style={{ padding: '18px 22px', borderBottom: '1px solid #f3f4f6' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Trophy size={16} style={{ color: '#F59E0B' }} />
                        <div className="card-title">Hall of Fame</div>
                        <span style={{ fontSize: 12, color: '#9CA3AF' }}>({milestones.length} wins)</span>
                      </div>
                    </div>
                    <div style={{ padding: '16px 22px' }}>
                      <form onSubmit={handleAddMilestone} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                        <FInput label="Achievement" placeholder="What did you win?" value={mlsTitle} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMlsTitle(e.target.value)} required />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <FInput label="Date" type="date" value={mlsDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMlsDate(e.target.value)} required />
                          <FInput label="Tag" placeholder="e.g. First Sale" value={mlsTag} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMlsTag(e.target.value)} />
                        </div>
                        <button type="submit" disabled={mlsBusy} className="primary-btn" style={{ background: '#F59E0B' }}>
                          {mlsBusy ? 'Saving…' : '🏆 Log Win'}
                        </button>
                      </form>
                      {mlsLoading ? <p className="card-sub">Loading…</p> : milestones.length === 0 ? (
                        <p className="card-sub">No wins logged yet.</p>
                      ) : milestones.map((m, i) => (
                        <div key={m.id} style={{ padding: '10px 0', borderBottom: i < milestones.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{m.title}</span>
                            <span style={{ fontSize: 11, color: '#9CA3AF' }}>{m.date ? fmtDate(m.date) : ''}</span>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 500, color: '#D97706', background: '#fef3c7', padding: '2px 8px', borderRadius: 20 }}>{m.successTag}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* App info */}
                  <div className="card" style={{ padding: '20px 22px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <Clock size={15} style={{ color: TEAL }} />
                      <div className="card-title">App Info</div>
                    </div>
                    <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 2 }}>
                      <div><strong style={{ color: '#374151' }}>Version:</strong> M-Insight Pro</div>
                      <div><strong style={{ color: '#374151' }}>Transactions:</strong> {finances.length}</div>
                      <div><strong style={{ color: '#374151' }}>Tasks tracked:</strong> {tasks.length}</div>
                      <div><strong style={{ color: '#374151' }}>Projects:</strong> {deposits.length}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>{/* /page-body */}
        </div>{/* /main-wrap */}
      </div>{/* /app-shell */}

      {/* ═══════════ STYLES ═══════════ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        /* ── layout ── */
        .app-shell   { display:flex; height:100vh; overflow:hidden; background:#f4f7fe; font-family:'Inter',-apple-system,sans-serif; }
        .sidebar     { width:220px; min-width:220px; background:#fff; border-right:1px solid #e9ecef; display:flex; flex-direction:column; height:100vh; overflow:hidden; }
        .main-wrap   { flex:1; display:flex; flex-direction:column; height:100vh; overflow:hidden; min-width:0; }
        .top-bar     { height:58px; min-height:58px; background:#fff; border-bottom:1px solid #e9ecef; display:flex; align-items:center; justify-content:space-between; padding:0 28px; }
        .page-body   { flex:1; overflow-y:auto; padding:24px 28px 40px; }
        .view-wrap   { max-width:1200px; margin:0 auto; display:flex; flex-direction:column; gap:20px; }

        /* ── sidebar ── */
        .sb-brand       { display:flex; align-items:center; gap:11px; padding:22px 20px 16px; }
        .sb-logo        { width:34px; height:34px; background:${TEAL}; border-radius:9px; display:flex; align-items:center; justify-content:center; color:#fff; font-size:15px; font-weight:700; flex-shrink:0; }
        .sb-name        { font-size:14px; font-weight:700; color:#111827; line-height:1; }
        .sb-sub         { font-size:10px; color:#9CA3AF; margin-top:2px; }
        .sb-divider     { height:1px; background:#f3f4f6; margin:0 16px; }
        .sb-section-label { font-size:10px; font-weight:700; color:#9CA3AF; letter-spacing:0.08em; padding:12px 20px 6px; }
        .sb-nav         { padding:4px 10px; }
        .sb-item        { display:flex; align-items:center; gap:10px; width:100%; padding:9px 12px; border:none; border-radius:10px; cursor:pointer; margin-bottom:2px; font-size:13px; font-weight:500; color:#6B7280; background:transparent; text-align:left; transition:background 0.12s,color 0.12s; border-left:3px solid transparent; }
        .sb-item:hover  { background:#f9fafb; color:#374151; }
        .sb-item--active{ background:rgba(10,182,139,0.09)!important; color:${TEAL}!important; border-left-color:${TEAL}!important; font-weight:600; }
        .sb-spacer      { flex:1; }
        .sb-logout      { margin:0 10px 18px; color:#9CA3AF; }
        .sb-logout:hover{ color:#EF4444!important; background:rgba(239,68,68,0.06)!important; }

        /* ── top bar ── */
        .top-title    { font-size:17px; font-weight:700; color:#111827; margin:0; }
        .top-bar-left { display:flex; align-items:center; gap:12px; }
        .top-bar-right{ display:flex; align-items:center; gap:14px; }
        .top-date     { font-size:12px; color:#9CA3AF; }
        .top-bell     { background:#f4f7fe; border:none; cursor:pointer; width:34px; height:34px; border-radius:9px; display:flex; align-items:center; justify-content:center; color:#6B7280; }
        .top-avatar   { width:34px; height:34px; border-radius:9px; background:${TEAL}; color:#fff; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; cursor:pointer; }

        /* ── cards ── */
        .card         { background:#fff; border-radius:16px; box-shadow:0 2px 8px rgba(0,0,0,0.05),0 1px 2px rgba(0,0,0,0.04); }
        .card-header  { display:flex; align-items:flex-start; justify-content:space-between; padding:20px 22px 16px; }
        .card-title   { font-size:14px; font-weight:700; color:#111827; }
        .card-sub     { font-size:12px; color:#9CA3AF; margin-top:3px; }
        .link-btn     { background:none; border:none; cursor:pointer; font-size:12px; color:${TEAL}; font-weight:600; padding:0; white-space:nowrap; }

        /* ── stat cards ── */
        .stats-row    { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }
        .stat-card    { background:#fff; border-radius:16px; box-shadow:0 2px 8px rgba(0,0,0,0.05),0 1px 2px rgba(0,0,0,0.04); padding:20px 20px; display:flex; align-items:flex-start; gap:14px; }
        .stat-icon    { width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .stat-body    { flex:1; min-width:0; }
        .stat-label   { font-size:11px; font-weight:600; color:#9CA3AF; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:4px; }
        .stat-value   { font-size:20px; font-weight:700; color:#111827; line-height:1.1; margin-bottom:4px; }
        .stat-sub     { font-size:11px; font-weight:500; }

        /* ── mid row (chart + tasks) ── */
        .mid-row      { display:grid; grid-template-columns:3fr 2fr; gap:18px; }
        .chart-card   { padding:22px 24px; }
        .chart-body   { margin-top:8px; }
        .chart-placeholder { height:200px; display:flex; align-items:center; justify-content:center; font-size:13px; color:#9CA3AF; }
        .chart-total  { text-align:right; }
        .chart-total-val   { font-size:18px; font-weight:700; color:${TEAL}; display:block; }
        .chart-total-trend { font-size:11px; font-weight:600; }

        /* ── tasks card ── */
        .tasks-card       { display:flex; flex-direction:column; overflow:hidden; }
        .task-add-form    { display:flex; gap:8px; padding:12px 20px; border-bottom:1px solid #f3f4f6; border-top:1px solid #f3f4f6; flex-shrink:0; }
        .task-input       { flex:1; background:#f9fafb; border:1px solid #e5e7eb; color:#111827; border-radius:9px; font-size:13px; padding:8px 12px; outline:none; font-family:inherit; }
        .task-input:focus { border-color:${TEAL}; }
        .task-input::placeholder { color:#9CA3AF; }
        .task-add-btn     { width:34px; height:34px; background:${TEAL}; border:none; border-radius:9px; color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .task-list        { flex:1; overflow-y:auto; max-height:280px; }
        .task-empty       { text-align:center; color:#9CA3AF; font-size:13px; padding:24px; }
        .task-row         { display:flex; align-items:center; gap:10px; width:100%; padding:11px 20px; background:none; border:none; border-bottom:1px solid #f9fafb; cursor:pointer; text-align:left; transition:background 0.1s; }
        .task-row:hover   { background:#fafafa; }
        .task-row--full   { padding:13px 22px; }
        .task-row--done   { opacity:0.5; }
        .task-circle      { width:16px; height:16px; border-radius:50%; border:2px solid #D1D5DB; flex-shrink:0; }
        .task-text        { flex:1; font-size:13px; color:#111827; line-height:1.4; }
        .task-text--done  { text-decoration:line-through; color:#9CA3AF; }
        .task-badge       { font-size:10px; font-weight:700; padding:2px 8px; border-radius:20px; flex-shrink:0; }
        .task-badge--pending { color:#D97706; background:#fef3c7; }
        .task-badge--done    { color:${TEAL}; background:#d1fae5; }
        .task-footer      { display:flex; align-items:center; gap:10px; padding:10px 20px; border-top:1px solid #f3f4f6; font-size:11px; color:#9CA3AF; flex-shrink:0; }
        .task-progress    { flex:1; height:4px; background:#f3f4f6; border-radius:2px; overflow:hidden; }
        .task-progress-fill { height:100%; background:${TEAL}; border-radius:2px; transition:width 0.4s ease; }

        /* ── projects ── */
        .projects-card  { padding:22px 24px; }
        .projects-grid  { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:14px; }
        .project-item   { border:1px solid #e9ecef; border-radius:12px; padding:14px; }
        .project-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; }
        .project-name   { font-size:13px; font-weight:700; color:#111827; }
        .project-sub    { font-size:11px; color:#9CA3AF; margin-top:2px; }
        .project-badge  { font-size:10px; font-weight:700; padding:3px 9px; border-radius:20px; flex-shrink:0; }
        .project-bar-track { height:5px; background:#f3f4f6; border-radius:3px; overflow:hidden; margin-bottom:8px; }
        .project-bar-fill  { height:100%; border-radius:3px; }
        .project-amounts   { display:flex; justify-content:space-between; font-size:11px; color:#9CA3AF; }

        /* ── finances ── */
        .two-col-grid  { display:grid; grid-template-columns:1fr 320px; gap:18px; }
        .ledger-table  { width:100%; border-collapse:collapse; }
        .ledger-table th { padding:10px 20px; text-align:left; font-size:11px; font-weight:600; color:#9CA3AF; text-transform:uppercase; letter-spacing:0.05em; border-bottom:1px solid #f3f4f6; }
        .ledger-table td { padding:11px 20px; font-size:13px; border-bottom:1px solid #fafafa; }
        .table-empty   { padding:40px 20px; text-align:center; color:#9CA3AF; font-size:13px; }
        .type-badge    { font-size:10px; font-weight:600; padding:2px 9px; border-radius:20px; }
        .type-badge--income { color:#059669; background:#d1fae5; }
        .type-badge--ads    { color:#DC2626; background:#fee2e2; }
        .deposit-form  { display:grid; grid-template-columns:1fr 1fr 1fr 1fr auto; gap:10px; align-items:flex-end; }

        /* ── form inputs ── */
        .finput-label  { display:block; font-size:11px; font-weight:600; color:#6B7280; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:5px; }
        .finput        { background:#f9fafb; border:1px solid #e5e7eb; color:#111827; border-radius:9px; font-size:13px; padding:8px 11px; outline:none; font-family:inherit; width:100%; }
        .finput:focus  { border-color:${TEAL}; }
        .finput::placeholder { color:#9CA3AF; }
        .primary-btn   { background:${TEAL}; color:#fff; border:none; border-radius:9px; padding:9px 18px; font-size:13px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; white-space:nowrap; }
        .primary-btn:disabled { opacity:0.6; cursor:not-allowed; }

        /* ── error screen ── */
        .err-screen { display:flex; min-height:100vh; align-items:center; justify-content:center; background:#f4f7fe; }
        .err-card   { background:#fff; border-radius:16px; padding:32px; max-width:400px; text-align:center; box-shadow:0 4px 20px rgba(0,0,0,0.08); }
        .err-title  { color:#EF4444; font-weight:700; font-size:15px; margin:0 0 8px; }
        .err-msg    { color:#6B7280; font-size:13px; margin:0; }

        /* ── misc ── */
        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="time"]::-webkit-calendar-picker-indicator { opacity:0.4; cursor:pointer; }
        select { appearance:none; cursor:pointer; }
        button { font-family:'Inter',-apple-system,sans-serif; }
      `}</style>
    </>
  )
}

// ── FInput ────────────────────────────────────────────────────────────────────
interface FInputProps extends React.InputHTMLAttributes<HTMLInputElement> { label: string }
function FInput({ label, ...props }: FInputProps) {
  return (
    <div>
      <label className="finput-label">{label}</label>
      <input {...props} className={`finput ${props.className ?? ''}`} />
    </div>
  )
}
