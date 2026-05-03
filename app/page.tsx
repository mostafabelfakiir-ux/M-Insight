'use client'

import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { db } from '@/lib/firebase'
import { collection, getDocs, addDoc, updateDoc, doc, query, orderBy } from 'firebase/firestore'
import {
  LayoutDashboard, Wallet, CheckSquare, Calendar, Trophy,
  Sun, Moon, Circle, CheckCircle2, Plus, RefreshCw, LogOut,
  TrendingUp, ArrowUpRight,
} from 'lucide-react'

const IncomeChart = dynamic(() => import('@/components/dashboard/IncomeChart'), { ssr: false })

// ── types ─────────────────────────────────────────────────────────────────────
interface FireTask        { id: string; title: string; status: 'pending' | 'done'; createdAt: string }
interface FireDeposit     { id: string; clientName: string; projectName?: string; totalPrice: number; depositPaid: number; date: string }
interface FireAppointment { id: string; title: string; date: string; time: string }
interface FireMilestone   { id: string; title: string; date: string; successTag: string }
type View = 'dashboard' | 'finances' | 'tasks' | 'appointments' | 'milestones'

// ── helpers ───────────────────────────────────────────────────────────────────
function monthKey(d: string) {
  const dt = new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
}
function groupByMonth(finances: any[]) {
  const map: Record<string, { month: string; income: number; ads: number; profit: number; sortKey: string }> = {}
  finances.forEach(f => {
    if (!f.date) return
    const d = new Date(f.date)
    const key = monthKey(f.date)
    const lbl = d.toLocaleString('en-US', { month: 'short', year: '2-digit' })
    if (!map[key]) map[key] = { month: lbl, income: 0, ads: 0, profit: 0, sortKey: key }
    if (f.type?.toLowerCase() === 'income') map[key].income += Number(f.amount) || 0
    if (f.type?.toLowerCase() === 'ads')    map[key].ads    += Number(f.amount) || 0
  })
  Object.values(map).forEach(m => { m.profit = m.income - m.ads })
  return Object.values(map).sort((a, b) => a.sortKey.localeCompare(b.sortKey))
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
function dh(n: number) { return `${n.toLocaleString()} DH` }

// ── nav items ─────────────────────────────────────────────────────────────────
const NAV: { id: View; label: string; ar: string; Icon: React.FC<{ size?: number; style?: React.CSSProperties }> }[] = [
  { id: 'dashboard',    label: 'Dashboard',      ar: 'الرئيسية',      Icon: LayoutDashboard },
  { id: 'finances',     label: 'Finances',        ar: 'الماليات',      Icon: Wallet },
  { id: 'tasks',        label: 'Tasks',           ar: 'المهام',         Icon: CheckSquare },
  { id: 'appointments', label: 'Appointments',    ar: 'المواعيد',      Icon: Calendar },
  { id: 'milestones',   label: 'Hall of Fame',    ar: 'قاعة الأبطال', Icon: Trophy },
]

const PURPLE = '#8B5CF6'
const ORANGE = '#F97316'

// ── main component ────────────────────────────────────────────────────────────
export default function Home() {
  const [view, setView] = useState<View>('dashboard')
  const [dark, setDark] = useState(true)

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

  const [clock, setClock] = useState('')
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('en-GB', { hour12: false }))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

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

  async function handleAddFinance(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (finBusy) return
    setFinBusy(true)
    try {
      await addDoc(collection(db, 'finances'), { name: finName, amount: Number(finAmount), type: finType, date: new Date().toISOString() })
      setFinName(''); setFinAmount(''); setFinType('income')
      await fetchFinances()
    } catch (e: any) { alert('Error: ' + e.message) }
    finally { setFinBusy(false) }
  }
  async function handleAddTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!taskTitle.trim() || taskBusy) return
    setTaskBusy(true)
    try {
      await addDoc(collection(db, 'tasks'), { title: taskTitle.trim(), status: 'pending', createdAt: new Date().toISOString() })
      setTaskTitle('')
      await fetchTasks()
    } catch (e: any) { alert('Error: ' + e.message) }
    finally { setTaskBusy(false) }
  }
  async function handleToggleTask(task: FireTask) {
    const next = task.status === 'pending' ? 'done' : 'pending'
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: next } : t))
    try {
      await updateDoc(doc(db, 'tasks', task.id), { status: next })
    } catch {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t))
    }
  }
  async function handleAddDeposit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (depBusy) return
    setDepBusy(true)
    try {
      await addDoc(collection(db, 'deposits'), {
        clientName: depClient.trim(), projectName: depProject.trim(),
        totalPrice: Number(depTotal), depositPaid: Number(depPaid),
        date: new Date().toISOString(),
      })
      setDepClient(''); setDepProject(''); setDepTotal(''); setDepPaid('')
      await fetchDeposits()
    } catch (e: any) { alert('Error: ' + e.message) }
    finally { setDepBusy(false) }
  }
  async function handleAddAppt(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (apptBusy) return
    setApptBusy(true)
    try {
      await addDoc(collection(db, 'appointments'), { title: apptTitle.trim(), date: apptDate, time: apptTime })
      setApptTitle(''); setApptDate(''); setApptTime('')
      await fetchAppts()
    } catch (e: any) { alert('Error: ' + e.message) }
    finally { setApptBusy(false) }
  }
  async function handleAddMilestone(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (mlsBusy) return
    setMlsBusy(true)
    try {
      await addDoc(collection(db, 'milestones'), { title: mlsTitle.trim(), date: mlsDate, successTag: mlsTag.trim() || 'First Win' })
      setMlsTitle(''); setMlsDate(''); setMlsTag('')
      await fetchMilestones()
    } catch (e: any) { alert('Error: ' + e.message) }
    finally { setMlsBusy(false) }
  }

  const income       = useMemo(() => finances.filter(f => f.type?.toLowerCase() === 'income').reduce((s, f) => s + (Number(f.amount) || 0), 0), [finances])
  const ads          = useMemo(() => finances.filter(f => f.type?.toLowerCase() === 'ads').reduce((s, f) => s + (Number(f.amount) || 0), 0), [finances])
  const netProfit    = income - ads
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

  // ── theme tokens ──────────────────────────────────────────────────────────
  const T = dark ? {
    bg:      '#0B0B10',
    sidebar: '#0F0F18',
    surface: '#16161F',
    surface2:'#1C1C2A',
    card:    '#191924',
    border:  'rgba(255,255,255,0.07)',
    text:    '#F3F4F6',
    text2:   '#9CA3AF',
    muted:   '#4B5563',
    inputBg: 'rgba(255,255,255,0.04)',
  } : {
    bg:      '#EDF0F8',
    sidebar: '#FFFFFF',
    surface: '#FFFFFF',
    surface2:'#F4F6FC',
    card:    '#FFFFFF',
    border:  'rgba(0,0,0,0.07)',
    text:    '#111827',
    text2:   '#6B7280',
    muted:   '#9CA3AF',
    inputBg: 'rgba(0,0,0,0.03)',
  }
  const sh = dark
    ? '0 2px 8px rgba(0,0,0,0.4), 0 8px 32px rgba(0,0,0,0.2)'
    : '0 1px 4px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)'

  if (finErr) {
    return (
      <div style={{ background: T.bg, fontFamily: "'Inter','Cairo',sans-serif" }} className="flex min-h-screen items-center justify-center p-10">
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 24, boxShadow: sh }} className="max-w-md w-full p-8 text-center">
          <p className="mb-2 text-sm font-medium text-red-400">Firebase error · خطأ في الاتصال</p>
          <p style={{ color: T.text2 }} className="text-xs">{finErr.message}</p>
        </div>
      </div>
    )
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Inter','Cairo',sans-serif", background: T.bg, color: T.text, minHeight: '100vh' }}
         className="flex">

      {/* ═══ SIDEBAR ═══ */}
      <aside style={{ background: T.sidebar, borderRight: `1px solid ${T.border}`, width: 240, minHeight: '100vh' }}
             className="hidden md:flex flex-col flex-shrink-0 sticky top-0 h-screen">

        {/* brand */}
        <div className="px-6 py-7">
          <div className="flex items-center gap-3">
            <div style={{ background: `linear-gradient(135deg, ${PURPLE}, ${ORANGE})`, width: 34, height: 34, borderRadius: 10 }}
                 className="flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">M</span>
            </div>
            <div>
              <p style={{ color: T.text }} className="text-sm font-semibold tracking-tight leading-none">M-Insight</p>
              <p style={{ color: T.muted }} className="text-[10px] mt-0.5">PRO · نظام الإدارة</p>
            </div>
          </div>
        </div>

        {/* nav */}
        <nav className="flex-1 px-3 space-y-0.5">
          {NAV.map(({ id, label, ar, Icon }) => {
            const active = view === id
            return (
              <button key={id} onClick={() => setView(id)}
                style={{
                  background: active ? (dark ? 'rgba(139,92,246,0.14)' : 'rgba(139,92,246,0.08)') : 'transparent',
                  color: active ? PURPLE : T.text2,
                  borderRadius: 14, width: '100%', textAlign: 'left',
                  borderLeft: active ? `2px solid ${PURPLE}` : '2px solid transparent',
                }}
                className="flex items-center gap-3 px-4 py-3 transition-all hover:opacity-80">
                <Icon size={16} style={{ color: active ? PURPLE : T.muted }} />
                <div>
                  <p className="text-[13px] font-medium leading-none">{label}</p>
                  <p style={{ color: T.muted }} className="text-[10px] mt-0.5">{ar}</p>
                </div>
              </button>
            )
          })}
        </nav>

        {/* bottom controls */}
        <div className="px-4 pb-6 space-y-2">
          <button onClick={() => setDark(d => !d)}
            style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 14 }}
            className="w-full flex items-center gap-3 px-4 py-3 transition-all hover:opacity-80">
            {dark
              ? <Sun size={15} style={{ color: ORANGE }} />
              : <Moon size={15} style={{ color: PURPLE }} />}
            <div>
              <p style={{ color: T.text2 }} className="text-[12px] font-medium leading-none">{dark ? 'Light Mode' : 'Dark Mode'}</p>
              <p style={{ color: T.muted }} className="text-[10px] mt-0.5">{dark ? 'وضع النهار' : 'وضع الليل'}</p>
            </div>
          </button>
          <button onClick={() => { if (confirm('Sign out?')) window.location.href = '/login' }}
            style={{ color: T.muted }}
            className="w-full flex items-center gap-3 px-4 py-2 text-[12px] transition-all hover:opacity-70">
            <LogOut size={13} />
            <span>Sign Out · خروج</span>
          </button>
        </div>
      </aside>

      {/* ═══ MAIN AREA ═══ */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* top bar */}
        <header style={{ background: T.sidebar, borderBottom: `1px solid ${T.border}` }}
                className="flex items-center justify-between px-6 md:px-8 py-4 sticky top-0 z-10">
          <div>
            <p style={{ color: T.text }} className="text-base font-semibold leading-none">{NAV.find(n => n.id === view)?.label}</p>
            <p style={{ color: T.muted }} className="text-[11px] mt-0.5">{NAV.find(n => n.id === view)?.ar}</p>
          </div>
          <div className="flex items-center gap-4">
            <span style={{ color: T.muted }} className="font-mono text-xs tabular-nums hidden md:block">{clock}</span>
            <div style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 10 }} className="px-3 py-1.5">
              <p style={{ color: T.muted }} className="text-[10px] font-medium">
                {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
              </p>
            </div>
            {/* mobile theme toggle */}
            <button onClick={() => setDark(d => !d)} className="md:hidden" style={{ color: T.muted }}>
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        {/* mobile bottom nav */}
        <nav style={{ background: T.sidebar, borderTop: `1px solid ${T.border}` }}
             className="md:hidden fixed bottom-0 left-0 right-0 z-20 flex">
          {NAV.map(({ id, label, Icon }) => {
            const active = view === id
            return (
              <button key={id} onClick={() => setView(id)}
                style={{ color: active ? PURPLE : T.muted, flex: 1 }}
                className="flex flex-col items-center gap-0.5 py-3 transition-all">
                <Icon size={18} />
                <span className="text-[9px] font-medium">{label}</span>
              </button>
            )
          })}
        </nav>

        {/* content */}
        <main style={{ background: T.bg }} className="flex-1 p-5 md:p-8 pb-24 md:pb-8 overflow-y-auto">

          {/* ─── DASHBOARD VIEW ─── */}
          {view === 'dashboard' && (
            <div className="space-y-7 max-w-[1200px]">
              <div>
                <h2 style={{ color: T.text }} className="text-xl md:text-2xl font-semibold">
                  {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'} 👋
                </h2>
                <p style={{ color: T.text2 }} className="text-sm mt-1">Here's what's happening · ما يجري في عملك</p>
              </div>

              {/* stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {([
                  { label: 'Revenue', ar: 'المداخيل',        val: finLoading ? null : income,              fmt: (v: number) => dh(v),      Icon: TrendingUp,    color: ORANGE,    soft: dark ? 'rgba(249,115,22,0.12)' : 'rgba(249,115,22,0.08)',   growth: monthlyGrowth },
                  { label: 'Net Profit', ar: 'صافي الربح',   val: finLoading ? null : netProfit,           fmt: (v: number) => dh(v),      Icon: ArrowUpRight,  color: PURPLE,    soft: dark ? 'rgba(139,92,246,0.12)' : 'rgba(139,92,246,0.08)',   growth: null },
                  { label: 'Open Tasks', ar: 'المهام المفتوحة', val: tasksLoading ? null : pendingTasks,   fmt: (v: number) => v.toString(), Icon: CheckSquare,  color: '#10B981', soft: dark ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.08)', growth: null },
                  { label: 'Meetings', ar: 'المواعيد القادمة', val: apptsLoading ? null : upcomingAppts.length, fmt: (v: number) => v.toString(), Icon: Calendar, color: '#3B82F6', soft: dark ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.08)', growth: null },
                ] as const).map(({ label, ar, val, fmt, Icon, color, soft, growth }) => (
                  <div key={label} style={{ background: T.card, border: `1px solid ${T.border}`, boxShadow: sh, borderRadius: 20 }} className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div style={{ background: soft, borderRadius: 12, padding: 10 }}>
                        <Icon size={18} style={{ color }} />
                      </div>
                      {growth !== null && growth !== undefined && (
                        <span style={{ color: growth >= 0 ? '#10B981' : '#EF4444', fontSize: 11, fontWeight: 600 }}>
                          {growth >= 0 ? '+' : ''}{growth}%
                        </span>
                      )}
                    </div>
                    <p style={{ color: T.text }} className="font-mono text-xl md:text-2xl font-semibold tabular-nums leading-none">
                      {val === null ? '…' : fmt(val)}
                    </p>
                    <p style={{ color: T.text2 }} className="text-xs mt-1.5 font-medium">{label}</p>
                    <p style={{ color: T.muted }} className="text-[10px]">{ar}</p>
                  </div>
                ))}
              </div>

              {/* chart */}
              <div style={{ background: T.card, border: `1px solid ${T.border}`, boxShadow: sh, borderRadius: 24 }} className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p style={{ color: T.text }} className="text-sm font-semibold">Revenue Overview · الإيرادات</p>
                    <p style={{ color: T.muted }} className="text-xs mt-0.5">Monthly income trend</p>
                  </div>
                  <span style={{ color: ORANGE }} className="font-mono text-lg font-semibold tabular-nums">{dh(income)}</span>
                </div>
                {finLoading ? (
                  <div style={{ height: 180 }} className="flex items-center justify-center">
                    <p style={{ color: T.muted }} className="text-xs animate-pulse">Loading…</p>
                  </div>
                ) : chartData.length === 0 ? (
                  <div style={{ height: 180 }} className="flex items-center justify-center">
                    <p style={{ color: T.muted }} className="text-xs">No data yet · لا بيانات</p>
                  </div>
                ) : <IncomeChart data={chartData} />}
              </div>

              {/* projects quick view */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p style={{ color: T.text }} className="text-sm font-semibold">Active Projects · المشاريع</p>
                    <p style={{ color: T.muted }} className="text-xs mt-0.5">Remaining: <span style={{ color: ORANGE }}>{dh(totalDebt)}</span></p>
                  </div>
                  <button onClick={() => setView('finances')} style={{ color: PURPLE }} className="text-xs font-medium hover:opacity-70 transition-opacity">
                    View all →
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {depLoading ? (
                    [1,2].map(i => <div key={i} style={{ background: T.card, height: 88, borderRadius: 18 }} className="animate-pulse" />)
                  ) : deposits.length === 0 ? (
                    <p style={{ color: T.muted }} className="text-sm col-span-2 py-6 text-center">No projects yet</p>
                  ) : deposits.map(d => {
                    const rem = Math.max(0, d.totalPrice - d.depositPaid)
                    const pct = Math.min(100, (d.depositPaid / d.totalPrice) * 100)
                    const sc  = rem === 0 ? '#10B981' : d.depositPaid === 0 ? '#EF4444' : ORANGE
                    const sl  = rem === 0 ? 'Paid · مدفوع' : d.depositPaid === 0 ? 'Pending · معلّق' : 'Partial · جزئي'
                    return (
                      <div key={d.id} style={{ background: T.card, border: `1px solid ${T.border}`, boxShadow: sh, borderRadius: 20 }} className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p style={{ color: T.text }} className="text-sm font-semibold">{d.clientName}</p>
                            {d.projectName && <p style={{ color: T.muted }} className="text-[11px] mt-0.5">{d.projectName}</p>}
                          </div>
                          <span style={{ color: sc, background: `${sc}18`, borderRadius: 8, fontSize: 10, fontWeight: 600, padding: '3px 9px' }}>{sl}</span>
                        </div>
                        <div style={{ background: T.border, borderRadius: 4, height: 4, overflow: 'hidden' }} className="mb-3">
                          <div style={{ width: `${pct}%`, background: sc, height: '100%', borderRadius: 4 }} />
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span style={{ color: T.text2 }}>Paid: <strong style={{ color: T.text }}>{dh(d.depositPaid)}</strong></span>
                          <span style={{ color: T.text2 }}>Total: <strong style={{ color: T.text }}>{dh(d.totalPrice)}</strong></span>
                          {rem > 0 && <span style={{ color: ORANGE }} className="font-semibold">{dh(rem)} left</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ─── FINANCES VIEW ─── */}
          {view === 'finances' && (
            <div className="space-y-7 max-w-[1200px]">

              {/* summary strip */}
              <div className="grid grid-cols-3 gap-4">
                {([
                  { label: 'Total Revenue', ar: 'إجمالي المداخيل', val: finLoading ? '…' : dh(income),     color: ORANGE },
                  { label: 'Net Profit',    ar: 'صافي الربح',       val: finLoading ? '…' : dh(netProfit),  color: netProfit >= 0 ? PURPLE : '#EF4444' },
                  { label: 'Ads Spend',     ar: 'الإعلانات',        val: finLoading ? '…' : dh(ads),        color: T.text2 },
                ] as const).map(({ label, ar, val, color }) => (
                  <div key={label} style={{ background: T.card, border: `1px solid ${T.border}`, boxShadow: sh, borderRadius: 20 }} className="p-5">
                    <p style={{ color: T.muted }} className="text-[10px] font-medium uppercase tracking-wider">{label}</p>
                    <p style={{ color: T.muted }} className="text-[9px] mt-0.5 mb-3">{ar}</p>
                    <p style={{ color }} className="font-mono text-lg md:text-xl font-semibold tabular-nums">{val}</p>
                  </div>
                ))}
              </div>

              {/* ledger + add form */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <p style={{ color: T.text }} className="text-sm font-semibold">Transactions · سجل المعاملات</p>
                    <button onClick={fetchFinances} style={{ color: T.muted }} className="hover:opacity-70 transition-opacity">
                      <RefreshCw size={14} />
                    </button>
                  </div>
                  <div style={{ background: T.card, border: `1px solid ${T.border}`, boxShadow: sh, borderRadius: 20, overflow: 'hidden' }}>
                    <table className="w-full">
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                          {['Description', 'Type', 'Date', 'Amount'].map(h => (
                            <th key={h} style={{ color: T.muted }} className="px-5 py-3 text-left text-[10px] font-medium uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {finLoading ? (
                          <tr><td colSpan={4} style={{ color: T.muted }} className="px-5 py-12 text-center text-xs animate-pulse">Loading…</td></tr>
                        ) : finances.length === 0 ? (
                          <tr><td colSpan={4} style={{ color: T.muted }} className="px-5 py-14 text-center text-xs">No records · لا سجلات</td></tr>
                        ) : finances.map((f, i) => (
                          <tr key={f.id} style={{ borderBottom: i < finances.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                            <td style={{ color: T.text }} className="px-5 py-3.5 text-xs font-medium">{f.name || 'Entry'}</td>
                            <td className="px-5 py-3.5">
                              <span style={{
                                color: f.type?.toLowerCase() === 'income' ? ORANGE : '#EF4444',
                                background: f.type?.toLowerCase() === 'income' ? `${ORANGE}18` : 'rgba(239,68,68,0.12)',
                                borderRadius: 7, fontSize: 10, fontWeight: 600, padding: '2px 8px',
                              }}>{f.type ?? '—'}</span>
                            </td>
                            <td style={{ color: T.muted }} className="px-5 py-3.5 text-[11px] tabular-nums">{f.date ? fmtDate(f.date) : '—'}</td>
                            <td style={{ color: f.type?.toLowerCase() === 'income' ? T.text : '#EF4444' }}
                                className="px-5 py-3.5 text-right text-sm font-semibold tabular-nums">
                              {f.type?.toLowerCase() === 'income' ? '+' : '−'}{dh(Number(f.amount))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* add finance form */}
                <div>
                  <p style={{ color: T.text }} className="text-sm font-semibold mb-4">New Entry · إدخال جديد</p>
                  <div style={{ background: T.card, border: `1px solid ${T.border}`, boxShadow: sh, borderRadius: 20 }} className="p-5">
                    <form onSubmit={handleAddFinance} className="space-y-3">
                      <GInput T={T} label="Description" placeholder="e.g. Client payment…" value={finName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFinName(e.target.value)} required />
                      <GInput T={T} label="Amount (DH)" placeholder="0" type="number" value={finAmount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFinAmount(e.target.value)} required />
                      <div>
                        <label style={{ color: T.muted }} className="block text-[10px] font-medium uppercase tracking-wider mb-1.5">Type</label>
                        <select value={finType} onChange={e => setFinType(e.target.value)}
                          style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.text, borderRadius: 10, fontSize: 13, padding: '8px 12px', width: '100%', outline: 'none', fontFamily: 'inherit' }}>
                          <option value="income" style={{ background: T.surface }}>Income</option>
                          <option value="ads"    style={{ background: T.surface }}>Ads Spend</option>
                        </select>
                      </div>
                      <button type="submit" disabled={finBusy}
                        style={{ background: `linear-gradient(135deg, ${PURPLE}, #6D28D9)`, borderRadius: 12, color: '#fff', width: '100%', padding: '10px', fontSize: 13, fontWeight: 600, opacity: finBusy ? 0.5 : 1, cursor: finBusy ? 'not-allowed' : 'pointer' }}
                        className="transition-all hover:opacity-90 active:scale-[0.98] mt-1">
                        {finBusy ? 'Processing…' : '+ Add Entry'}
                      </button>
                    </form>
                  </div>
                </div>
              </div>

              {/* deposits panel */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p style={{ color: T.text }} className="text-sm font-semibold">Client Deposits · التسبيقات</p>
                    <p style={{ color: T.muted }} className="text-xs mt-0.5">Remaining owed: <span style={{ color: ORANGE }}>{dh(totalDebt)}</span></p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                  {depLoading ? (
                    [1,2,3,4].map(i => <div key={i} style={{ background: T.card, height: 130, borderRadius: 20 }} className="animate-pulse" />)
                  ) : deposits.length === 0 ? (
                    <p style={{ color: T.muted }} className="col-span-4 text-sm text-center py-8">No deposits yet</p>
                  ) : deposits.map(d => {
                    const rem = Math.max(0, d.totalPrice - d.depositPaid)
                    const pct = Math.min(100, (d.depositPaid / d.totalPrice) * 100)
                    const sc  = rem === 0 ? '#10B981' : d.depositPaid === 0 ? '#EF4444' : ORANGE
                    return (
                      <div key={d.id} style={{ background: T.card, border: `1px solid ${T.border}`, boxShadow: sh, borderRadius: 20 }} className="p-5">
                        <div className="flex justify-between items-start mb-2">
                          <p style={{ color: T.text }} className="text-sm font-semibold leading-snug">{d.clientName}</p>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: sc, flexShrink: 0, marginTop: 4 }} />
                        </div>
                        {d.projectName && <p style={{ color: T.muted }} className="text-[11px] mb-3">{d.projectName}</p>}
                        <div style={{ background: T.border, borderRadius: 4, height: 4, overflow: 'hidden' }} className="mb-3">
                          <div style={{ width: `${pct}%`, background: sc, height: '100%', borderRadius: 4 }} />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span style={{ color: T.muted }}>Total</span>
                            <span style={{ color: T.text }} className="font-medium">{dh(d.totalPrice)}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span style={{ color: T.muted }}>Paid</span>
                            <span style={{ color: '#10B981' }} className="font-medium">{dh(d.depositPaid)}</span>
                          </div>
                          {rem > 0 && (
                            <div className="flex justify-between text-[11px]">
                              <span style={{ color: T.muted }}>Remaining</span>
                              <span style={{ color: ORANGE }} className="font-medium">{dh(rem)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* add deposit form */}
                <div style={{ background: T.card, border: `1px solid ${T.border}`, boxShadow: sh, borderRadius: 20 }} className="p-5">
                  <p style={{ color: T.text }} className="text-sm font-semibold mb-4">Add Project · أضف مشروعاً</p>
                  <form onSubmit={handleAddDeposit} className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <GInput T={T} label="Client Name" placeholder="Client…" value={depClient} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDepClient(e.target.value)} required />
                    <GInput T={T} label="Project" placeholder="Project name…" value={depProject} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDepProject(e.target.value)} />
                    <GInput T={T} label="Total (DH)" placeholder="0" type="number" value={depTotal} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDepTotal(e.target.value)} required />
                    <GInput T={T} label="Deposit (DH)" placeholder="0" type="number" value={depPaid} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDepPaid(e.target.value)} required />
                    <div className="col-span-2 md:col-span-4 flex justify-end">
                      <button type="submit" disabled={depBusy}
                        style={{ background: ORANGE, borderRadius: 12, color: '#fff', padding: '9px 24px', fontSize: 13, fontWeight: 600, opacity: depBusy ? 0.5 : 1, cursor: depBusy ? 'not-allowed' : 'pointer' }}
                        className="transition-all hover:opacity-90 active:scale-[0.98]">
                        {depBusy ? 'Saving…' : '+ Add Project'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* ─── TASKS VIEW ─── */}
          {view === 'tasks' && (
            <div className="space-y-6 max-w-[900px]">
              <div className="grid grid-cols-3 gap-4">
                {([
                  { label: 'Total', ar: 'الكل',         val: tasks.length,   color: T.text },
                  { label: 'In Progress', ar: 'قيد التنفيذ', val: pendingTasks, color: ORANGE },
                  { label: 'Completed', ar: 'مكتملة',   val: doneTasks,      color: '#10B981' },
                ] as const).map(({ label, ar, val, color }) => (
                  <div key={label} style={{ background: T.card, border: `1px solid ${T.border}`, boxShadow: sh, borderRadius: 20 }} className="p-5">
                    <p style={{ color: T.muted }} className="text-[10px] font-medium uppercase tracking-wider">{label}</p>
                    <p style={{ color: T.muted }} className="text-[9px] mt-0.5 mb-3">{ar}</p>
                    <p style={{ color }} className="font-mono text-2xl font-semibold">{tasksLoading ? '…' : val}</p>
                  </div>
                ))}
              </div>

              <div style={{ background: T.card, border: `1px solid ${T.border}`, boxShadow: sh, borderRadius: 20 }} className="p-5">
                <form onSubmit={handleAddTask} className="flex gap-3">
                  <input required value={taskTitle} onChange={e => setTaskTitle(e.target.value)}
                    placeholder="Add a new task… · أضف مهمة"
                    style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.text, borderRadius: 12, fontSize: 13, padding: '10px 14px', flex: 1, outline: 'none', fontFamily: 'inherit' }} />
                  <button type="submit" disabled={taskBusy}
                    style={{ background: PURPLE, borderRadius: 12, color: '#fff', padding: '10px 20px', fontSize: 13, fontWeight: 600, opacity: taskBusy ? 0.5 : 1, flexShrink: 0, cursor: taskBusy ? 'not-allowed' : 'pointer' }}
                    className="flex items-center gap-2 transition-all hover:opacity-90 active:scale-[0.98]">
                    <Plus size={14} /> Add
                  </button>
                </form>
              </div>

              <div style={{ background: T.card, border: `1px solid ${T.border}`, boxShadow: sh, borderRadius: 20, overflow: 'hidden' }}>
                {tasksLoading ? (
                  <div className="space-y-2 p-4 animate-pulse">
                    {[1,2,3].map(i => <div key={i} style={{ background: T.border, height: 52, borderRadius: 12 }} />)}
                  </div>
                ) : tasks.length === 0 ? (
                  <p style={{ color: T.muted }} className="text-sm text-center py-14">No tasks yet · لا مهام بعد</p>
                ) : tasks.map((task, i) => (
                  <button key={task.id} onClick={() => handleToggleTask(task)}
                    style={{ borderBottom: i < tasks.length - 1 ? `1px solid ${T.border}` : 'none', width: '100%', background: 'transparent', cursor: 'pointer' }}
                    className="flex items-center gap-4 px-6 py-4 text-left transition-all hover:bg-white/[0.02]">
                    {task.status === 'done'
                      ? <CheckCircle2 size={18} style={{ color: PURPLE, flexShrink: 0 }} />
                      : <Circle size={18} style={{ color: T.muted, flexShrink: 0 }} />}
                    <span style={{ color: task.status === 'done' ? T.muted : T.text, flex: 1 }}
                          className={`text-sm ${task.status === 'done' ? 'line-through' : ''}`}>
                      {task.title}
                    </span>
                    <span style={{
                      color: task.status === 'done' ? '#10B981' : ORANGE,
                      background: task.status === 'done' ? 'rgba(16,185,129,0.1)' : `${ORANGE}15`,
                      borderRadius: 8, fontSize: 10, fontWeight: 600, padding: '3px 9px',
                    }}>
                      {task.status === 'done' ? 'Done · مكتمل' : 'Pending · قيد التنفيذ'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ─── APPOINTMENTS VIEW ─── */}
          {view === 'appointments' && (
            <div className="space-y-6 max-w-[900px]">
              <div style={{ background: T.card, border: `1px solid ${T.border}`, boxShadow: sh, borderRadius: 20 }} className="p-6">
                <p style={{ color: T.text }} className="text-sm font-semibold mb-4">Schedule Appointment · حدد موعداً</p>
                <form onSubmit={handleAddAppt} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <GInput T={T} label="Title" placeholder="Meeting name…" value={apptTitle} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApptTitle(e.target.value)} required />
                  <GInput T={T} label="Date" type="date" value={apptDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApptDate(e.target.value)} required />
                  <GInput T={T} label="Time" type="time" value={apptTime} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApptTime(e.target.value)} required />
                  <div className="md:col-span-3 flex justify-end">
                    <button type="submit" disabled={apptBusy}
                      style={{ background: `linear-gradient(135deg, ${PURPLE}, #6D28D9)`, borderRadius: 12, color: '#fff', padding: '10px 24px', fontSize: 13, fontWeight: 600, opacity: apptBusy ? 0.5 : 1, cursor: apptBusy ? 'not-allowed' : 'pointer' }}
                      className="transition-all hover:opacity-90 active:scale-[0.98]">
                      {apptBusy ? 'Saving…' : '+ Schedule'}
                    </button>
                  </div>
                </form>
              </div>

              <div>
                <p style={{ color: T.text }} className="text-sm font-semibold mb-3">
                  All Appointments · المواعيد <span style={{ color: T.muted }} className="text-xs font-normal">({upcomingAppts.length} upcoming)</span>
                </p>
                <div className="space-y-3">
                  {apptsLoading ? (
                    [1,2,3].map(i => <div key={i} style={{ background: T.card, height: 72, borderRadius: 16 }} className="animate-pulse" />)
                  ) : appts.length === 0 ? (
                    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 20 }} className="text-center py-12">
                      <p style={{ color: T.muted }} className="text-sm">No appointments yet · لا مواعيد</p>
                    </div>
                  ) : appts.map(a => {
                    const isPast  = a.date < todayStr
                    const isToday = a.date === todayStr
                    return (
                      <div key={a.id}
                           style={{
                             background: isToday ? (dark ? 'rgba(139,92,246,0.08)' : 'rgba(139,92,246,0.04)') : T.card,
                             border: `1px solid ${isToday ? `${PURPLE}35` : T.border}`,
                             borderRadius: 16, boxShadow: sh, opacity: isPast ? 0.45 : 1,
                           }}
                           className="flex items-center gap-4 px-5 py-4">
                        <div style={{ background: isToday ? `${PURPLE}20` : T.surface2, borderRadius: 12, padding: 10, flexShrink: 0 }}>
                          <Calendar size={18} style={{ color: isToday ? PURPLE : T.muted }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          {isToday && <p style={{ color: PURPLE }} className="text-[10px] font-bold uppercase tracking-wider mb-0.5">Today · اليوم</p>}
                          <p style={{ color: isPast ? T.muted : T.text }} className="text-sm font-medium truncate">{a.title}</p>
                          <p style={{ color: T.muted }} className="text-[11px] mt-0.5">{a.date} · {a.time}</p>
                        </div>
                        {isToday && (
                          <span style={{ color: PURPLE, background: `${PURPLE}18`, borderRadius: 8, fontSize: 10, fontWeight: 600, padding: '3px 10px' }}>Now</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ─── HALL OF FAME VIEW ─── */}
          {view === 'milestones' && (
            <div className="space-y-7 max-w-[1100px]">
              <div className="flex items-end justify-between">
                <div>
                  <p style={{ color: T.muted }} className="text-[10px] font-medium uppercase tracking-widest">Hall of Fame</p>
                  <h2 style={{ color: T.text }} className="text-xl font-semibold mt-1">قاعة الأبطال</h2>
                  <p style={{ color: T.muted }} className="text-xs mt-1">First wins &amp; milestones · الإنجازات الأولى</p>
                </div>
                <span style={{ color: T.muted }} className="text-sm">{milestones.length} win{milestones.length !== 1 ? 's' : ''}</span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
                <div className="lg:col-span-2">
                  {mlsLoading ? (
                    <div className="grid grid-cols-2 gap-4 animate-pulse">
                      {[1,2,3,4].map(i => <div key={i} style={{ background: T.card, height: 120, borderRadius: 20 }} />)}
                    </div>
                  ) : milestones.length === 0 ? (
                    <div style={{ background: T.card, border: `2px dashed ${T.border}`, borderRadius: 24 }}
                         className="flex flex-col items-center justify-center gap-3 py-20">
                      <Trophy size={32} style={{ color: T.muted }} />
                      <p style={{ color: T.muted }} className="text-sm">No wins yet · لا إنجازات بعد</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {milestones.map((m, i) => (
                        <div key={m.id}
                             style={{ background: T.card, border: `1px solid ${i % 2 === 0 ? `${ORANGE}25` : `${PURPLE}25`}`, boxShadow: sh, borderRadius: 20 }}
                             className="p-5 transition-all hover:scale-[1.01]">
                          <div className="flex items-start justify-between mb-3">
                            <div style={{ background: i % 2 === 0 ? `${ORANGE}18` : `${PURPLE}18`, borderRadius: 12, padding: 9 }}>
                              <Trophy size={16} style={{ color: i % 2 === 0 ? ORANGE : PURPLE }} />
                            </div>
                            <span style={{ color: T.muted }} className="font-mono text-[10px]">{m.date ? fmtDate(m.date) : ''}</span>
                          </div>
                          <p style={{ color: T.text }} className="text-sm font-semibold leading-snug mb-2">{m.title}</p>
                          <span style={{ color: i % 2 === 0 ? ORANGE : PURPLE, background: i % 2 === 0 ? `${ORANGE}12` : `${PURPLE}12`, borderRadius: 8, fontSize: 10, fontWeight: 600, padding: '3px 8px' }}>
                            {m.successTag}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ background: T.card, border: `1px solid ${T.border}`, boxShadow: sh, borderRadius: 20 }} className="p-6">
                    <div className="flex items-center gap-2 mb-5">
                      <Trophy size={16} style={{ color: ORANGE }} />
                      <p style={{ color: T.text }} className="text-sm font-semibold">Log a Win · سجّل إنجازاً</p>
                    </div>
                    <form onSubmit={handleAddMilestone} className="space-y-3">
                      <GInput T={T} label="Achievement" placeholder="What did you achieve?…" value={mlsTitle} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMlsTitle(e.target.value)} required />
                      <GInput T={T} label="Date" type="date" value={mlsDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMlsDate(e.target.value)} required />
                      <GInput T={T} label="Tag" placeholder="e.g. First Sale…" value={mlsTag} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMlsTag(e.target.value)} />
                      <button type="submit" disabled={mlsBusy}
                        style={{ background: `linear-gradient(135deg, ${ORANGE}, #D97706)`, borderRadius: 12, color: '#fff', width: '100%', padding: '10px', fontSize: 13, fontWeight: 600, opacity: mlsBusy ? 0.5 : 1, cursor: mlsBusy ? 'not-allowed' : 'pointer' }}
                        className="transition-all hover:opacity-90 active:scale-[0.98] mt-2">
                        {mlsBusy ? 'Saving…' : '🏆 Add to Hall of Fame'}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300;0,14..32,400;0,14..32,500;0,14..32,600&family=Cairo:wght@300;400;600&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="time"]::-webkit-calendar-picker-indicator {
          filter: ${dark ? 'invert(1) opacity(0.25)' : 'opacity(0.4)'};
          cursor: pointer;
        }
        ::-webkit-scrollbar       { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${dark ? '#2A2A38' : '#D1D5DB'}; border-radius: 4px; }
      `}</style>
    </div>
  )
}

// ── GInput ────────────────────────────────────────────────────────────────────
interface GInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  T: { inputBg: string; border: string; text: string; muted: string }
  label: string
}
function GInput({ T, label, ...props }: GInputProps) {
  return (
    <div>
      <label style={{ color: T.muted }} className="block text-[10px] font-medium uppercase tracking-wider mb-1.5">{label}</label>
      <input
        {...props}
        style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.text, borderRadius: 10, fontSize: 13, padding: '8px 12px', width: '100%', outline: 'none', fontFamily: 'inherit' }}
      />
    </div>
  )
}
