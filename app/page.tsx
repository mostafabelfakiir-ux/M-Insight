'use client'

import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { db, auth } from '@/lib/firebase'
import { onAuthStateChanged, signOut, User } from 'firebase/auth'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore'
import {
  LayoutDashboard, Wallet, CheckSquare, Settings, LogOut,
  CheckCircle2, Plus, TrendingUp, Trophy, Package,
  Calendar, DollarSign, Bell, Trash2, ArrowUpRight, ArrowDownRight, Moon, Sun, MessageCircle,
} from 'lucide-react'
import { generateMonthlyReport } from '@/lib/generateMonthlyReport'

const RevenueChart = dynamic(() => import('@/components/dashboard/IncomeChart'), { ssr: false })

// ── types ──────────────────────────────────────────────────────────────────────
interface FireLoss        { id: string; title: string; amount: number; date: string }
interface FireTask        { id: string; title: string; status: 'pending' | 'done'; createdAt: string; dueDate?: string }
interface FireDeposit     { id: string; clientName: string; projectName?: string; totalPrice: number; depositPaid: number; date: string; phone?: string }
interface FireAppointment { id: string; title: string; date: string; time: string }
interface FireProduct     { id: string; name: string; buyPrice: number; sellPrice: number; quantity: number; image?: string; createdAt?: string }
type View = 'dashboard' | 'finances' | 'stock' | 'tasks' | 'settings'
type Lang = 'ar' | 'en' | 'fr'

// ── i18n ───────────────────────────────────────────────────────────────────────
const T = {
  ar: {
    appName: 'Hisabi', appRole: 'نظام الأعمال',
    dashboard: 'الرئيسية', finances: 'المالية', stock: 'المخزون', tasks: 'المهام', settings: 'المواعيد',
    product: 'المنتج', buyPrice: 'سعر الشراء', sellPrice: 'سعر البيع', quantity: 'الكمية', recordSale: 'تسجيل بيع', lowStock: 'مخزون منخفض',
    logout: 'خروج',
    totalRevenue: 'إجمالي الدخل', totalExpenses: 'إجمالي المصاريف', netProfit: 'الربح الصافي',
    vsLastMonth: 'مقارنة بالشهر الماضي', allTime: 'إجمالي',
    expensesLogged: 'مصروف مسجل', profitable: 'أنت رابح', atLoss: 'في الخسارة',
    noData: 'لا توجد بيانات بعد — أضف أول معاملة',
    tasks2: 'المهام', pending: 'معلقة', done: 'منجزة', seeAll: 'عرض الكل ←',
    addTask: 'أضف مهمة جديدة…', finances2: 'المالية ←',
    clientProjects: 'مشاريع العملاء', remaining: 'المتبقي:',
    noProjects: 'لا توجد مشاريع بعد.', noTasks: 'لا توجد مهام بعد.',
    loading: 'جاري التحميل…',
    paid: 'مدفوع', unpaid: 'غير مدفوع', partial: 'جزئي',
    income: 'الدخل', expenses: 'المصاريف', addIncome: 'إضافة دخل',
    addExpense: 'إضافة مصروف', description: 'الوصف', amount: 'المبلغ (DH)',
    category: 'الفئة', save: 'حفظ', saving: 'جاري الحفظ…',
    clientDeposits: 'دفعات العملاء', client: 'العميل', project: 'المشروع',
    total: 'الإجمالي', deposit: 'الدفعة', add: 'إضافة',
    totalTasks: 'الإجمالي', inProgress: 'قيد التنفيذ', completed: 'منجزة',
    addTaskBtn: 'إضافة مهمة', inProgressBadge: 'قيد التنفيذ', doneBadge: 'منجزة',
    appointments: 'المواعيد', upcoming: 'قادمة', today: 'اليوم',
    hallOfFame: 'قاعة الشرف', wins: 'إنجازات',
    achievement: 'الإنجاز', date: 'التاريخ', tag: 'الوسم', logWin: '🏆 سجل إنجاز',
    appInfo: 'معلومات التطبيق', version: 'الإصدار',
    incomeEntries: 'إدخالات الدخل', expenseEntries: 'المصاريف', taskCount: 'المهام', projectCount: 'المشاريع',
    noIncome: 'لا يوجد دخل بعد', noExpenses: 'لا توجد مصاريف بعد', noAppts: 'لا توجد مواعيد بعد.', noWins: 'لا توجد إنجازات بعد.',
    time: 'الوقت', title: 'العنوان',
    dhPaid: 'مدفوع', dhLeft: 'متبقي', complete: '✓ مكتمل', completeBtn: 'مكتمل',
    categories: ['مواد', 'نقل', 'إيجار', 'أجور', 'فواتير', 'تسويق', 'أخرى'],
  },
  en: {
    appName: 'Hisabi', appRole: 'Business OS',
    dashboard: 'Dashboard', finances: 'Finances', stock: 'Stock', tasks: 'Tasks', settings: 'Schedule',
    product: 'Product', buyPrice: 'Buy Price', sellPrice: 'Sell Price', quantity: 'Quantity', recordSale: 'Record Sale', lowStock: 'Low Stock',
    logout: 'Log out',
    totalRevenue: 'Total Revenue', totalExpenses: 'Total Expenses', netProfit: 'Net Profit',
    vsLastMonth: 'vs last month', allTime: 'All time',
    expensesLogged: 'expense logged', profitable: 'You are profitable', atLoss: 'Operating at a loss',
    noData: 'No transactions yet — add your first entry',
    tasks2: 'Tasks', pending: 'pending', done: 'done', seeAll: 'See all →',
    addTask: 'Add new task…', finances2: 'Finances →',
    clientProjects: 'Client Projects', remaining: 'Remaining:',
    noProjects: 'No projects yet.', noTasks: 'No tasks yet.',
    loading: 'Loading…',
    paid: 'Paid', unpaid: 'Unpaid', partial: 'Partial',
    income: 'Income', expenses: 'Expenses', addIncome: 'Add Income',
    addExpense: 'Add Expense', description: 'Description', amount: 'Amount (DH)',
    category: 'Category', save: '+ Save', saving: 'Saving…',
    clientDeposits: 'Client Deposits', client: 'Client', project: 'Project',
    total: 'Total (DH)', deposit: 'Deposit (DH)', add: '+ Add',
    totalTasks: 'Total', inProgress: 'In Progress', completed: 'Completed',
    addTaskBtn: 'Add Task', inProgressBadge: 'In Progress', doneBadge: 'Completed',
    appointments: 'Appointments', upcoming: 'upcoming', today: 'TODAY',
    hallOfFame: 'Hall of Fame', wins: 'wins',
    achievement: 'Achievement', date: 'Date', tag: 'Tag', logWin: '🏆 Log Win',
    appInfo: 'App Info', version: 'Version',
    incomeEntries: 'Income entries', expenseEntries: 'Expenses', taskCount: 'Tasks', projectCount: 'Projects',
    noIncome: 'No income yet', noExpenses: 'No expenses yet', noAppts: 'No appointments yet.', noWins: 'No wins yet.',
    time: 'Time', title: 'Title',
    dhPaid: 'paid', dhLeft: 'left', complete: '✓ Complete', completeBtn: 'Complete',
    categories: ['Materials', 'Transport', 'Rent', 'Salaries', 'Utilities', 'Marketing', 'Other'],
  },
  fr: {
    appName: 'Hisabi', appRole: 'Système Business',
    dashboard: 'Tableau de bord', finances: 'Finances', stock: 'Stock', tasks: 'Tâches', settings: 'Rendez-vous',
    product: 'Produit', buyPrice: 'Prix d\'achat', sellPrice: 'Prix de vente', quantity: 'Quantité', recordSale: 'Enregistrer Vente', lowStock: 'Stock Faible',
    logout: 'Déconnexion',
    totalRevenue: 'Revenus totaux', totalExpenses: 'Dépenses totales', netProfit: 'Gain Réel',
    vsLastMonth: 'vs mois dernier', allTime: 'Total',
    expensesLogged: 'dépense enregistrée', profitable: 'Vous êtes rentable', atLoss: 'Vous êtes en perte',
    noData: 'Aucune transaction — ajoutez la première',
    tasks2: 'Tâches', pending: 'en attente', done: 'terminée', seeAll: 'Voir tout →',
    addTask: 'Ajouter une tâche…', finances2: 'Finances →',
    clientProjects: 'Projets clients', remaining: 'Restant :',
    noProjects: 'Aucun projet pour le moment.', noTasks: 'Aucune tâche pour le moment.',
    loading: 'Chargement…',
    paid: 'Payé', unpaid: 'Non payé', partial: 'Partiel',
    income: 'Revenus', expenses: 'Dépenses', addIncome: 'Ajouter un revenu',
    addExpense: 'Ajouter une dépense', description: 'Description', amount: 'Montant (DH)',
    category: 'Catégorie', save: '+ Enregistrer', saving: 'Enregistrement…',
    clientDeposits: 'Acomptes clients', client: 'Client', project: 'Projet',
    total: 'Total (DH)', deposit: 'Acompte (DH)', add: '+ Ajouter',
    totalTasks: 'Total', inProgress: 'En cours', completed: 'Terminé',
    addTaskBtn: 'Ajouter tâche', inProgressBadge: 'En cours', doneBadge: 'Terminé',
    appointments: 'Rendez-vous', upcoming: 'à venir', today: "AUJOURD'HUI",
    hallOfFame: 'Tableau d\'honneur', wins: 'réussites',
    achievement: 'Réussite', date: 'Date', tag: 'Étiquette', logWin: '🏆 Enregistrer',
    appInfo: 'Infos application', version: 'Version',
    incomeEntries: 'Entrées de revenus', expenseEntries: 'Dépenses', taskCount: 'Tâches', projectCount: 'Projets',
    noIncome: 'Aucun revenu', noExpenses: 'Aucune dépense', noAppts: 'Aucun rendez-vous.', noWins: 'Aucune réussite.',
    time: 'Heure', title: 'Titre',
    dhPaid: 'payé', dhLeft: 'restant', complete: '✓ Complet', completeBtn: 'Complet',
    categories: ['Matières', 'Transport', 'Loyer', 'Salaires', 'Factures', 'Marketing', 'Autre'],
  },
}

// ── helpers ────────────────────────────────────────────────────────────────────
function whatsappReminder(d: { clientName: string; projectName?: string; totalPrice: number; depositPaid: number; phone?: string }, lang: Lang = 'ar') {
  const rem = Math.max(0, d.totalPrice - d.depositPaid)
  const proj = d.projectName || (lang === 'ar' ? 'المشروع' : lang === 'fr' ? 'le projet' : 'the project')
  const msg = lang === 'en'
    ? `Hello ${d.clientName},\n\nThis is a reminder for project "${proj}"\nTotal: ${d.totalPrice.toLocaleString()} DH\nPaid: ${d.depositPaid.toLocaleString()} DH\nRemaining: ${rem.toLocaleString()} DH\n\nPlease get in touch to settle the remaining balance.\nThank you 🙏`
    : lang === 'fr'
    ? `Bonjour ${d.clientName},\n\nRappel concernant le projet "${proj}"\nTotal : ${d.totalPrice.toLocaleString()} DH\nPayé : ${d.depositPaid.toLocaleString()} DH\nRestant : ${rem.toLocaleString()} DH\n\nMerci de nous contacter pour régler le solde restant.\nMerci 🙏`
    : `السلام عليكم ${d.clientName}،\n\nتذكير بخصوص مشروع "${proj}"\nالمبلغ الإجمالي: ${d.totalPrice.toLocaleString()} DH\nالمدفوع: ${d.depositPaid.toLocaleString()} DH\nالمتبقي: ${rem.toLocaleString()} DH\n\nنرجو التواصل لتسوية المبلغ المتبقي.\nشكراً 🙏`
  const phone = d.phone ? d.phone.replace(/\D/g, '').replace(/^0/, '212') : ''
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
}

function safeDate(d: any): Date | null {
  if (!d) return null
  if (typeof d.toMillis === 'function') return new Date(d.toMillis())
  if (typeof d.seconds === 'number') return new Date(d.seconds * 1000)
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return null
  return dt
}

function monthKey(d: any): string {
  const dt = safeDate(d)
  if (!dt) return 'unknown'
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
}

const MONTH_LOCALE: Record<string, string> = { ar: 'ar-MA', en: 'en-US', fr: 'fr-FR' }

function groupByMonth(finances: any[], losses: any[], lang = 'ar') {
  const locale = MONTH_LOCALE[lang] ?? 'ar-MA'
  const map: Record<string, { month: string; income: number; expenses: number; profit: number; sortKey: string }> = {}
  finances.forEach(f => {
    if (!f.date) return
    const dt = safeDate(f.date)
    if (!dt) return
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
    let lbl = 'unknown'
    try {
      lbl = dt.toLocaleString(locale, { month: 'short' })
    } catch {}
    if (!map[key]) map[key] = { month: lbl, income: 0, expenses: 0, profit: 0, sortKey: key }
    if (f.type?.toLowerCase() === 'income') map[key].income += Number(f.amount) || 0
  })
  losses.forEach(l => {
    if (!l.date) return
    const dt = safeDate(l.date)
    if (!dt) return
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
    let lbl = 'unknown'
    try {
      lbl = dt.toLocaleString(locale, { month: 'short' })
    } catch {}
    if (!map[key]) map[key] = { month: lbl, income: 0, expenses: 0, profit: 0, sortKey: key }
    map[key].expenses += Number(l.amount) || 0
  })
  Object.values(map).forEach(m => { m.profit = m.income - m.expenses })
  return Object.values(map).sort((a, b) => a.sortKey.localeCompare(b.sortKey))
}

function fmtDate(d: any) {
  const dt = safeDate(d)
  if (!dt) return '—'
  try {
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return '—'
  }
}

function dh(n: number) { 
  if (isNaN(n) || n === null || n === undefined) return '0 DH'
  return `${n.toLocaleString()} DH` 
}

const TEAL = '#0AB68B'
const NAV_IDS: View[] = ['dashboard', 'finances', 'stock', 'tasks', 'settings']
const NAV_ICONS: React.FC<{ size?: number; strokeWidth?: number }>[] = [LayoutDashboard, Wallet, Package, CheckSquare, Calendar]

// ── component ──────────────────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter()
  const [user,         setUser]         = useState<User | null>(null)
  const [authLoading,  setAuthLoading]  = useState(true)
  const [view, setViewRaw] = useState<View>('dashboard')
  function setView(v: View) { setViewRaw(v); localStorage.setItem('view', v) }
  const [dark, setDark] = useState(false)
  const [lang,         setLang]         = useState<Lang>('ar')
  const [isMobile,     setIsMobile]     = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('view') as View
      if (NAV_IDS.includes(saved)) setViewRaw(saved)
      const theme = localStorage.getItem('theme')
      if (theme === 'dark') setDark(true)
    }
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      if (!u) router.replace('/login')
      else setUser(u)
      setAuthLoading(false)
    })
    return unsub
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 768px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches)
    if (mq.addEventListener) {
      mq.addEventListener('change', handler)
    } else if (mq.addListener) {
      mq.addListener(handler)
    }
    return () => {
      if (mq.removeEventListener) {
        mq.removeEventListener('change', handler)
      } else if (mq.removeListener) {
        mq.removeListener(handler)
      }
    }
  }, [])

  const t = T[lang]
  const isRtl = lang === 'ar'
  const nextLang = (l: Lang): Lang => l === 'ar' ? 'en' : l === 'en' ? 'fr' : 'ar'

  const langLabel = (l: Lang) => l === 'ar' ? 'EN' : l === 'en' ? 'FR' : 'ع'

  // theme tokens
  const bg     = dark ? '#0d0d0d' : '#f0f4ff'
  const panel  = dark ? '#161616' : '#ffffff'
  const border = dark ? '#222222' : '#eaedf5'
  const txt    = dark ? '#e5e5e5' : '#111827'
  const sub    = dark ? '#555555' : '#9CA3AF'
  const inputBg= dark ? '#1e1e1e' : '#f5f7ff'
  const inputBorder = dark ? '#2a2a2a' : '#eaedf5'

  const NAV_LABELS = [t.dashboard, t.finances, t.stock, t.tasks, t.settings]

  const [finances,     setFinances]     = useState<any[]>([])
  const [finLoading,   setFinLoading]   = useState(true)
  const [finErr,       setFinErr]       = useState<any>(null)
  const [finName,      setFinName]      = useState('')
  const [finAmount,    setFinAmount]    = useState('')
  const [finBusy,      setFinBusy]      = useState(false)

  const [products,     setProducts]     = useState<FireProduct[]>([])
  const [prodLoading,  setProdLoading]  = useState(true)
  const [prodName,     setProdName]     = useState('')
  const [prodBuy,      setProdBuy]      = useState('')
  const [prodSell,     setProdSell]     = useState('')
  const [prodQty,      setProdQty]      = useState('')
  const [prodImage,    setProdImage]    = useState('')
  const [prodBusy,     setProdBusy]     = useState(false)
  const [showStockSale,setShowStockSale] = useState<FireProduct | null>(null)
  const [saleQty,      setSaleQty]      = useState('1')

  const [tasks,        setTasks]        = useState<FireTask[]>([])
  const [tasksLoading, setTasksLoading] = useState(true)
  const [taskTitle,    setTaskTitle]    = useState('')
  const [taskDue,      setTaskDue]      = useState('')
  const [taskBusy,     setTaskBusy]     = useState(false)

  const [deposits,     setDeposits]     = useState<FireDeposit[]>([])
  const [depLoading,   setDepLoading]   = useState(true)
  const [depClient,    setDepClient]    = useState('')
  const [depProject,   setDepProject]   = useState('')
  const [depTotal,     setDepTotal]     = useState('')
  const [depPaid,      setDepPaid]      = useState('')
  const [depPhone,     setDepPhone]     = useState('')
  const [depBusy,      setDepBusy]      = useState(false)

  const [appts,        setAppts]        = useState<FireAppointment[]>([])
  const [apptsLoading, setApptsLoading] = useState(true)
  const [apptTitle,    setApptTitle]    = useState('')
  const [apptDate,     setApptDate]     = useState('')
  const [apptTime,     setApptTime]     = useState('')
  const [apptBusy,     setApptBusy]     = useState(false)



  const [losses,      setLosses]      = useState<FireLoss[]>([])
  const [lossLoading, setLossLoading] = useState(true)
  const [lossTitle,   setLossTitle]   = useState('')
  const [lossAmount,  setLossAmount]  = useState('')
  const [lossBusy,    setLossBusy]    = useState(false)


  const uid = user?.uid ?? ''

  async function fetchFinances() {
    if (!uid) return
    try {
      const s = await getDocs(query(collection(db, 'finances'), where('userId', '==', uid)))
      setFinances(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => (b.date ?? '').localeCompare(a.date ?? '')))
    } catch (e: any) { setFinErr(e) } finally { setFinLoading(false) }
  }
  async function fetchTasks() {
    if (!uid) return
    try {
      const s = await getDocs(query(collection(db, 'tasks'), where('userId', '==', uid)))
      setTasks(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')) as FireTask[])
    } catch {} finally { setTasksLoading(false) }
  }
  async function fetchDeposits() {
    if (!uid) return
    try {
      const s = await getDocs(query(collection(db, 'deposits'), where('userId', '==', uid)))
      setDeposits(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => (b.date ?? '').localeCompare(a.date ?? '')) as FireDeposit[])
    } catch {} finally { setDepLoading(false) }
  }
  async function fetchAppts() {
    if (!uid) return
    try {
      const s = await getDocs(query(collection(db, 'appointments'), where('userId', '==', uid)))
      setAppts(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => (a.date ?? '').localeCompare(b.date ?? '')) as FireAppointment[])
    } catch {} finally { setApptsLoading(false) }
  }
  async function fetchProducts() {
    if (!uid) return
    try {
      const s = await getDocs(query(collection(db, 'products'), where('userId', '==', uid)))
      setProducts(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')) as FireProduct[])
    } catch {} finally { setProdLoading(false) }
  }

  useEffect(() => {
    if (!uid) return
    fetchFinances(); fetchTasks(); fetchDeposits(); fetchAppts(); fetchLosses(); fetchProducts()
  }, [uid])

  async function fetchLosses() {
    if (!uid) return
    try {
      const s = await getDocs(query(collection(db, 'losses'), where('userId', '==', uid)))
      setLosses(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => (b.date ?? '').localeCompare(a.date ?? '')) as FireLoss[])
    } catch {} finally { setLossLoading(false) }
  }
  async function handleAddLoss(e: React.FormEvent) {
    e.preventDefault(); if (lossBusy) return; setLossBusy(true)
    try {
      await addDoc(collection(db, 'losses'), { userId: uid, title: lossTitle.trim(), amount: Number(lossAmount), date: new Date().toISOString() })
      setLossTitle(''); setLossAmount(''); await fetchLosses()
    } catch (e: any) { alert(e.message) } finally { setLossBusy(false) }
  }
  async function handleDeleteLoss(id: string) {
    setLosses(p => p.filter(l => l.id !== id))
    try { await deleteDoc(doc(db, 'losses', id)) } catch { await fetchLosses() }
  }
  async function handleAddFinance(e: React.FormEvent) {
    e.preventDefault(); if (finBusy) return; setFinBusy(true)
    try {
      await addDoc(collection(db, 'finances'), { userId: uid, name: finName, amount: Number(finAmount), type: 'income', date: new Date().toISOString() })
      setFinName(''); setFinAmount(''); await fetchFinances()
    } catch (e: any) { alert(e.message) } finally { setFinBusy(false) }
  }
  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault(); if (!taskTitle.trim() || taskBusy) return; setTaskBusy(true)
    try {
      const data: any = { userId: uid, title: taskTitle.trim(), status: 'pending', createdAt: new Date().toISOString() }
      if (taskDue) data.dueDate = taskDue
      await addDoc(collection(db, 'tasks'), data)
      setTaskTitle(''); setTaskDue(''); await fetchTasks()
    } catch (e: any) { alert(e.message) } finally { setTaskBusy(false) }
  }
  async function handleToggleTask(task: FireTask) {
    const next = task.status === 'pending' ? 'done' : 'pending'
    setTasks(p => p.map(t => t.id === task.id ? { ...t, status: next } : t))
    try { await updateDoc(doc(db, 'tasks', task.id), { status: next }) }
    catch { setTasks(p => p.map(t => t.id === task.id ? { ...t, status: task.status } : t)) }
  }
  async function handleDeleteTask(id: string) {
    setTasks(p => p.filter(t => t.id !== id))
    try { await deleteDoc(doc(db, 'tasks', id)) } catch { await fetchTasks() }
  }
  async function handleDeleteDeposit(id: string) {
    setDeposits(p => p.filter(d => d.id !== id))
    try { await deleteDoc(doc(db, 'deposits', id)) } catch { await fetchDeposits() }
  }
  async function handleCompleteDeposit(d: FireDeposit) {
    const rem = Math.max(0, d.totalPrice - d.depositPaid)
    if (rem <= 0) return
    // optimistic update
    setDeposits(p => p.map(x => x.id === d.id ? { ...x, depositPaid: d.totalPrice } : x))
    try {
      await Promise.all([
        updateDoc(doc(db, 'deposits', d.id), { depositPaid: d.totalPrice }),
        addDoc(collection(db, 'finances'), {
          userId: uid,
          name: `${d.clientName}${d.projectName ? ` — ${d.projectName}` : ''}`,
          amount: rem,
          type: 'income',
          date: new Date().toISOString(),
        }),
      ])
      await fetchFinances()
    } catch {
      await fetchDeposits()
    }
  }
  async function seedDemoData() {
    if (!uid) return
    const d = (offsetDays: number) => new Date(Date.now() - offsetDays * 86400000).toISOString()
    const batch = [
      // finances (income)
      addDoc(collection(db, 'finances'), { userId: uid, name: 'أيوب — تصميم شعار', amount: 1500, type: 'income', date: d(60) }),
      addDoc(collection(db, 'finances'), { userId: uid, name: 'سارة — موقع إلكتروني', amount: 3200, type: 'income', date: d(45) }),
      addDoc(collection(db, 'finances'), { userId: uid, name: 'شركة النور — تطبيق', amount: 5000, type: 'income', date: d(30) }),
      addDoc(collection(db, 'finances'), { userId: uid, name: 'محمد — إعلانات', amount: 2000, type: 'income', date: d(15) }),
      addDoc(collection(db, 'finances'), { userId: uid, name: 'ياسين — متجر', amount: 1800, type: 'income', date: d(3) }),
      // losses (expenses)
      addDoc(collection(db, 'losses'), { userId: uid, title: 'إيجار المكتب', amount: 2000, date: d(55) }),
      addDoc(collection(db, 'losses'), { userId: uid, title: 'فاتورة الإنترنت', amount: 300, date: d(40) }),
      addDoc(collection(db, 'losses'), { userId: uid, title: 'Adobe CC', amount: 600, date: d(25) }),
      addDoc(collection(db, 'losses'), { userId: uid, title: 'نقل وتنقل', amount: 450, date: d(10) }),
      // deposits (clients)
      addDoc(collection(db, 'deposits'), { userId: uid, clientName: 'أيوب', projectName: 'تصميم هوية', totalPrice: 3000, depositPaid: 1500, phone: '0612345678', date: d(50) }),
      addDoc(collection(db, 'deposits'), { userId: uid, clientName: 'سارة', projectName: 'موقع متجر', totalPrice: 5000, depositPaid: 5000, phone: '0698765432', date: d(35) }),
      addDoc(collection(db, 'deposits'), { userId: uid, clientName: 'شركة النور', projectName: 'تطبيق موبايل', totalPrice: 8000, depositPaid: 3000, phone: '0666111222', date: d(20) }),
      // tasks
      addDoc(collection(db, 'tasks'), { userId: uid, title: 'تسليم تصميم شعار أيوب', status: 'pending', createdAt: d(5), dueDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10) }),
      addDoc(collection(db, 'tasks'), { userId: uid, title: 'اجتماع شركة النور', status: 'pending', createdAt: d(3), dueDate: new Date().toISOString().slice(0, 10) }),
      addDoc(collection(db, 'tasks'), { userId: uid, title: 'تحديث موقع سارة', status: 'done', createdAt: d(20) }),
      addDoc(collection(db, 'tasks'), { userId: uid, title: 'فاتورة شهر أبريل', status: 'done', createdAt: d(35) }),
      // appointments
      addDoc(collection(db, 'appointments'), { userId: uid, title: 'اجتماع شركة النور', date: new Date().toISOString().slice(0, 10), time: new Date(Date.now() + 3600000).toTimeString().slice(0, 5) }),
      addDoc(collection(db, 'appointments'), { userId: uid, title: 'عرض مشروع ياسين', date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10), time: '10:00' }),
      addDoc(collection(db, 'appointments'), { userId: uid, title: 'تسليم موقع سارة', date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), time: '14:30' }),
    ]
    await Promise.all(batch)
    await Promise.all([fetchFinances(), fetchLosses(), fetchDeposits(), fetchTasks(), fetchAppts()])
    alert(lang === 'ar' ? 'تمت تعبئة البيانات التجريبية بنجاح!' : lang === 'fr' ? 'Données démo générées !' : 'Demo data seeded successfully!')
  }

  async function clearAllData() {
    if (!uid) return
    if (!confirm(lang === 'ar' ? 'هل أنت متأكد من حذف جميع البيانات؟' : lang === 'fr' ? 'Supprimer toutes les données ?' : 'Delete all data?')) return
    try {
      setFinances([])
      setLosses([])
      setDeposits([])
      setTasks([])
      setAppts([])
      
      const deleteCollectionDocs = async (colName: string, items: any[]) => {
        const batch = items.map(item => deleteDoc(doc(db, colName, item.id)))
        await Promise.all(batch)
      }
      
      await Promise.all([
        deleteCollectionDocs('finances', finances),
        deleteCollectionDocs('losses', losses),
        deleteCollectionDocs('deposits', deposits),
        deleteCollectionDocs('tasks', tasks),
        deleteCollectionDocs('appointments', appts),
        deleteCollectionDocs('products', products)
      ])
      
      await Promise.all([fetchFinances(), fetchLosses(), fetchDeposits(), fetchTasks(), fetchAppts(), fetchProducts()])
    } catch (e: any) {
      alert(e.message)
    }
  }

  async function handleAddDeposit(e: React.FormEvent) {
    e.preventDefault(); if (depBusy) return; setDepBusy(true)
    try {
      await addDoc(collection(db, 'deposits'), { userId: uid, clientName: depClient.trim(), projectName: depProject.trim(), totalPrice: Number(depTotal), depositPaid: Number(depPaid), phone: depPhone.trim(), date: new Date().toISOString() })
      setDepClient(''); setDepProject(''); setDepTotal(''); setDepPaid(''); setDepPhone(''); await fetchDeposits()
    } catch (e: any) { alert(e.message) } finally { setDepBusy(false) }
  }
  async function handleAddAppt(e: React.FormEvent) {
    e.preventDefault(); if (apptBusy) return; setApptBusy(true)
    try {
      await addDoc(collection(db, 'appointments'), { userId: uid, title: apptTitle.trim(), date: apptDate, time: apptTime })
      setApptTitle(''); setApptDate(''); setApptTime(''); await fetchAppts()
    } catch (e: any) { alert(e.message) } finally { setApptBusy(false) }
  }
  async function handleDeleteFinance(id: string) {
    setFinances(p => p.filter(f => f.id !== id))
    try { await deleteDoc(doc(db, 'finances', id)) } catch { await fetchFinances() }
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault(); if (prodBusy) return; setProdBusy(true)
    try {
      await addDoc(collection(db, 'products'), { userId: uid, name: prodName.trim(), buyPrice: Number(prodBuy), sellPrice: Number(prodSell), quantity: Number(prodQty), image: prodImage.trim(), createdAt: new Date().toISOString() })
      setProdName(''); setProdBuy(''); setProdSell(''); setProdQty(''); setProdImage(''); await fetchProducts()
    } catch (e: any) { alert(e.message) } finally { setProdBusy(false) }
  }
  async function handleDeleteProduct(id: string) {
    setProducts(p => p.filter(x => x.id !== id))
    try { await deleteDoc(doc(db, 'products', id)) } catch { await fetchProducts() }
  }
  async function handleStockSale(e: React.FormEvent) {
    e.preventDefault(); if (!showStockSale || prodBusy) return; setProdBusy(true)
    const q = Number(saleQty)
    if (q <= 0 || q > showStockSale.quantity) { alert(lang === 'ar' ? 'الكمية غير صالحة' : 'Invalid quantity'); setProdBusy(false); return }
    try {
      const newQty = showStockSale.quantity - q
      await updateDoc(doc(db, 'products', showStockSale.id), { quantity: newQty })
      await addDoc(collection(db, 'finances'), { 
        userId: uid, name: `${lang === 'ar' ? 'بيع:' : 'Sale:'} ${showStockSale.name} (${q})`, amount: showStockSale.sellPrice * q, 
        cogs: showStockSale.buyPrice * q, type: 'income', date: new Date().toISOString() 
      })
      setShowStockSale(null); setSaleQty('1')
      await Promise.all([fetchProducts(), fetchFinances()])
    } catch (e: any) { alert(e.message) } finally { setProdBusy(false) }
  }

  const income     = useMemo(() => finances.filter(f => f.type?.toLowerCase() === 'income').reduce((s, f) => s + (Number(f.amount) || 0), 0), [finances])
  const totalExp   = useMemo(() => losses.reduce((s, l) => s + (Number(l.amount) || 0), 0), [losses])
  const totalCogs  = useMemo(() => finances.reduce((s, f) => s + (Number((f as any).cogs) || 0), 0), [finances])
  const netProfit  = income - totalExp - totalCogs
  const monthlyGrowth = useMemo(() => {
    const now  = new Date()
    const cur  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const prev = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString())
    const curI  = finances.filter(f => f.type === 'income' && monthKey(f.date ?? '') === cur).reduce((s, f) => s + (Number(f.amount) || 0), 0)
    const prevI = finances.filter(f => f.type === 'income' && monthKey(f.date ?? '') === prev).reduce((s, f) => s + (Number(f.amount) || 0), 0)
    if (prevI === 0) return curI > 0 ? 100 : null
    return Math.round((curI - prevI) / prevI * 100)
  }, [finances])
  const chartData     = useMemo(() => groupByMonth(finances, losses, lang), [finances, losses, lang])
  const pendingTasks  = tasks.filter(t => t.status === 'pending').length
  const doneTasks     = tasks.filter(t => t.status === 'done').length
  const totalDebt     = deposits.reduce((s, d) => s + Math.max(0, d.totalPrice - d.depositPaid), 0)
  const [currentTime, setCurrentTime] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const todayStr      = currentTime.toISOString().slice(0, 10)
  const upcomingAppts = appts.filter(a => a.date >= todayStr)

  // all appointments within 24h, sorted soonest first
  const urgentAppts = useMemo(() => {
    return appts.map(a => {
      if (!a.date || !a.time) return { ...a, diff: Infinity }
      const apptDt = new Date(`${a.date}T${a.time}`)
      const diff = (apptDt.getTime() - currentTime.getTime()) / 60000
      return { ...a, diff }
    }).filter(a => a.diff >= -15 && a.diff <= 24 * 60).sort((a, b) => a.diff - b.diff)
  }, [appts, currentTime])

  // split into red (≤60 min) and orange (>60 min, ≤24h)
  const nearAppts = urgentAppts.filter(a => a.diff <= 60)
  const soonAppts = urgentAppts.filter(a => a.diff > 60)

  // tasks overdue or due today (pending only)
  const urgentTasks = useMemo(() =>
    tasks.filter(t => t.status === 'pending' && t.dueDate && t.dueDate <= todayStr)
  , [tasks, todayStr])

  // request notification permission once user is logged in
  useEffect(() => {
    if (!user) return
    if (typeof window !== 'undefined' && 'Notification' in window && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [user])

  // check appointments + tasks every minute and fire notifications
  useEffect(() => {
    if (!user) return
    const notified = new Set<string>()
    function check() {
      if (typeof window === 'undefined' || typeof Notification === 'undefined' || Notification.permission !== 'granted') return
      const now = new Date()
      const today = now.toISOString().slice(0, 10)
      
      // appointments
      appts.forEach(a => {
        if (!a.date || !a.time) return
        const apptDt = new Date(`${a.date}T${a.time}`)
        const diff = (apptDt.getTime() - now.getTime()) / 60000
        
        let milestone = null
        if (diff >= -1 && diff <= 1) milestone = 0
        else if (diff > 1 && diff <= 15) milestone = 15
        else if (diff > 15 && diff <= 30) milestone = 30
        else if (diff > 23 * 60 && diff <= 24 * 60) milestone = 1440

        if (milestone !== null) {
          const key = `${a.id}-m${milestone}`
          if (!notified.has(key)) {
            notified.add(key)
            const mins = Math.round(diff)
            let body: string
            if (milestone === 1440) {
              body = lang === 'ar' ? `تذكير: موعد غداً — ${a.title}` : lang === 'fr' ? `Rappel : Rendez-vous demain — ${a.title}` : `Reminder: Appointment tomorrow — ${a.title}`
            } else if (mins <= 0) {
              body = lang === 'ar' ? `الموعد الآن: ${a.title}` : lang === 'fr' ? `Rendez-vous maintenant : ${a.title}` : `Appointment now: ${a.title}`
            } else {
              body = lang === 'ar' ? `موعد بعد ${mins} دقيقة: ${a.title}` : lang === 'fr' ? `Rendez-vous dans ${mins} min : ${a.title}` : `Appointment in ${mins} min: ${a.title}`
            }
            new Notification('Hisabi', { body, icon: '/favicon.ico' })
          }
        }
      })
      
      // tasks due today or overdue
      tasks.forEach(task => {
        if (task.status === 'done' || !task.dueDate) return
        if (task.dueDate <= today && !notified.has(`task-${task.id}`)) {
          notified.add(`task-${task.id}`)
          const overdue = task.dueDate < today
          const body = overdue
            ? (lang === 'ar' ? `مهمة متأخرة: ${task.title}` : lang === 'fr' ? `Tâche en retard : ${task.title}` : `Overdue task: ${task.title}`)
            : (lang === 'ar' ? `مهمة اليوم: ${task.title}` : lang === 'fr' ? `Tâche aujourd'hui : ${task.title}` : `Task due today: ${task.title}`)
          new Notification('Hisabi', { body, icon: '/favicon.ico' })
        }
      })
    }
    check()
    const timer = setInterval(check, 60000)
    return () => clearInterval(timer)
  }, [user, appts, tasks, lang])

  // ── shared styles (computed from theme) ──
  const panelStyle = { background: panel, borderRadius: 16, boxShadow: dark ? '0 2px 12px rgba(0,0,0,0.4)' : '0 2px 10px rgba(0,0,0,0.055)' }
  const inputStyle = { background: inputBg, border: `1.5px solid ${inputBorder}`, color: txt, borderRadius: 9, fontSize: 13, padding: '9px 11px', outline: 'none', fontFamily: 'inherit', width: '100%' }
  const labelStyle = { display: 'block', fontSize: 10, fontWeight: 700, color: sub, textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 5 }

  if (authLoading || !user) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4ff' }}>
      <div style={{ width: 36, height: 36, border: `3px solid ${TEAL}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (finErr) return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: bg }}>
      <div style={{ ...panelStyle, padding: 40, textAlign: 'center' }}>
        <p style={{ color: '#EF4444', fontWeight: 700, fontSize: 16, margin: '0 0 8px' }}>Connection Error</p>
        <p style={{ color: sub, fontSize: 13, margin: 0 }}>{finErr.message}</p>
      </div>
    </div>
  )

  return (
    <>
      <div dir={isRtl ? 'rtl' : 'ltr'} style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: bg, fontFamily: isRtl ? "'Cairo','Inter',sans-serif" : "'Inter',sans-serif" }}>

        {/* SIDEBAR — desktop only */}
        {!isMobile && <aside style={{ width: 224, minWidth: 224, background: panel, borderRight: isRtl ? 'none' : `1px solid ${border}`, borderLeft: isRtl ? `1px solid ${border}` : 'none', display: 'flex', flexDirection: 'column', height: '100vh' }}>
          {/* brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '22px 18px 16px' }}>
            <div style={{ width: 36, height: 36, background: `linear-gradient(135deg,${TEAL},#07c99b)`, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16, fontWeight: 800, flexShrink: 0, boxShadow: '0 4px 12px rgba(10,182,139,0.3)' }}>
              {isRtl ? 'م' : 'M'}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: txt }}>{t.appName}</div>
              <div style={{ fontSize: 10, color: sub, marginTop: 1 }}>{t.appRole}</div>
            </div>
          </div>

          {/* section label */}
          <div style={{ fontSize: 10, fontWeight: 700, color: dark ? '#333' : '#C4CAD4', letterSpacing: '0.1em', padding: '14px 20px 6px' }}>
            {isRtl ? 'القائمة' : 'MENU'}
          </div>

          {/* nav */}
          <nav style={{ padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {NAV_IDS.map((id, i) => {
              const Icon = NAV_ICONS[i]
              const active = view === id
              return (
                <button key={id} onClick={() => setView(id)} style={{
                  display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '9px 10px',
                  border: 'none', borderRadius: 11, cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 500,
                  color: active ? TEAL : sub, background: active ? `${TEAL}18` : 'transparent',
                  textAlign: isRtl ? 'right' : 'left', position: 'relative', flexDirection: isRtl ? 'row-reverse' : 'row',
                }}>
                  <span style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: active ? `${TEAL}20` : (dark ? '#1e1e1e' : '#f5f7ff'), flexShrink: 0, position: 'relative' }}>
                    <Icon size={16} strokeWidth={2} />
                    {id === 'settings' && nearAppts.length > 0 && (
                      <span style={{ position: 'absolute', top: -3, right: -3, width: 8, height: 8, borderRadius: '50%', background: '#EF4444', border: `2px solid ${panel}` }} />
                    )}
                    {id === 'settings' && nearAppts.length === 0 && soonAppts.length > 0 && (
                      <span style={{ position: 'absolute', top: -3, right: -3, width: 8, height: 8, borderRadius: '50%', background: '#F97316', border: `2px solid ${panel}` }} />
                    )}
                    {id === 'tasks' && urgentTasks.length > 0 && (
                      <span style={{ position: 'absolute', top: -3, right: -3, width: 8, height: 8, borderRadius: '50%', background: '#EF4444', border: `2px solid ${panel}` }} />
                    )}
                  </span>
                  <span>{NAV_LABELS[i]}</span>
                  {active && <span style={{ width: 6, height: 6, borderRadius: '50%', background: TEAL, marginLeft: isRtl ? 0 : 'auto', marginRight: isRtl ? 'auto' : 0 }} />}
                </button>
              )
            })}
          </nav>

          <div style={{ flex: 1 }} />

          {/* Discreet Clear Data button at the bottom of the sidebar space */}
          <div style={{ padding: '0 10px 14px', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
            <button onClick={clearAllData} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: dark ? '#ef444455' : '#EF444495', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, padding: '4px 8px', borderRadius: 6, transition: 'all 0.2s' }}>
              🗑️ {lang === 'ar' ? 'مسح كل البيانات' : lang === 'fr' ? 'Effacer les données' : 'Clear All Data'}
            </button>
          </div>

          {/* theme + lang toggles */}
          <div style={{ padding: '0 10px 8px', display: 'flex', gap: 6 }}>
            <button onClick={() => setDark(d => { const n = !d; localStorage.setItem('theme', n ? 'dark' : 'light'); return n })} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 10px', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: sub, background: dark ? '#1e1e1e' : '#f5f7ff' }}>
              {dark ? <Sun size={14} /> : <Moon size={14} />}
              {dark ? (lang === 'ar' ? 'فاتح' : lang === 'fr' ? 'Clair' : 'Light') : (lang === 'ar' ? 'داكن' : lang === 'fr' ? 'Sombre' : 'Dark')}
            </button>
            <button onClick={() => setLang(nextLang)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 10px', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: TEAL, background: `${TEAL}14` }}>
              {langLabel(lang)}
            </button>
          </div>


          {/* logout */}
          <div style={{ padding: '0 10px 18px' }}>
            <button onClick={() => { if (confirm(isRtl ? 'تأكيد الخروج؟' : 'Sign out?')) signOut(auth) }} style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '9px 10px', border: 'none', borderRadius: 11, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: sub, background: 'transparent', flexDirection: isRtl ? 'row-reverse' : 'row' }}>
              <LogOut size={15} /><span>{t.logout}</span>
            </button>
          </div>
        </aside>}

        {/* MAIN */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', minWidth: 0 }}>
          {/* topbar */}
          <header style={{ height: 62, minHeight: 62, background: panel, borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 26px' }}>
            <div>
              <h1 style={{ fontSize: 17, fontWeight: 800, color: txt }}>{NAV_LABELS[NAV_IDS.indexOf(view)]}</h1>
              <p className="topbar-date" style={{ fontSize: 11, color: sub, marginTop: 1 }}>{new Date().toLocaleDateString(lang === 'ar' ? 'ar-MA-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button 
                onClick={() => generateMonthlyReport({ lang, finances, losses, products, income, totalExp, totalCogs, netProfit })} 
                style={{ height: 34, padding: '0 12px', background: `${TEAL}20`, border: 'none', borderRadius: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: TEAL, fontSize: 12, fontWeight: 700, gap: 6 }}
                title={lang === 'ar' ? 'تنزيل التقرير الشهري' : 'Download Monthly Report'}
              >
                <ArrowDownRight size={14} />
                {!isMobile && (lang === 'ar' ? 'تقرير' : lang === 'fr' ? 'Rapport' : 'Report')}
              </button>
              {isMobile && (
                <button onClick={() => setDark(d => { const n = !d; localStorage.setItem('theme', n ? 'dark' : 'light'); return n })} style={{ width: 34, height: 34, background: dark ? '#1e1e1e' : '#f5f7ff', border: 'none', borderRadius: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: sub }}>
                  {dark ? <Sun size={16} /> : <Moon size={16} />}
                </button>
              )}
              {!isMobile && (
                <button style={{ width: 34, height: 34, background: dark ? '#1e1e1e' : '#f5f7ff', border: 'none', borderRadius: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: sub }}>
                  <Bell size={16} />
                </button>
              )}
              <div style={{ width: 34, height: 34, borderRadius: 9, background: `linear-gradient(135deg,${TEAL},#07c99b)`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                {isRtl ? 'م' : 'M'}
              </div>
            </div>
          </header>

          {/* content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '14px 14px 90px' : '24px 28px 48px' }}>
            <div style={{ maxWidth: 1300, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: isMobile ? 14 : 20 }}>

              {/* ── DASHBOARD ── */}
              {view === 'dashboard' && (isMobile ? (
                // ══════════════ MOBILE DASHBOARD ══════════════
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                  {nearAppts.length > 0 && (
                    <div style={{ background: 'linear-gradient(135deg,#EF4444,#dc2626)', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setView('settings')}>
                      <span style={{ fontSize: 18 }}>🔴</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>
                          {lang === 'ar' ? `موعد قريب: ${nearAppts[0].title}` : lang === 'fr' ? `RDV proche : ${nearAppts[0].title}` : `Upcoming now: ${nearAppts[0].title}`}
                        </div>
                        <div style={{ fontSize: 11, color: '#fecaca', marginTop: 1 }}>{nearAppts[0].date} · {nearAppts[0].time}</div>
                      </div>
                    </div>
                  )}
                  {soonAppts.length > 0 && (
                    <div style={{ background: 'linear-gradient(135deg,#F97316,#ea580c)', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setView('settings')}>
                      <span style={{ fontSize: 18 }}>🟠</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>
                          {soonAppts[0].date === todayStr
                            ? (lang === 'ar' ? `موعد اليوم: ${soonAppts[0].title}` : lang === 'fr' ? `RDV aujourd'hui : ${soonAppts[0].title}` : `Today: ${soonAppts[0].title}`)
                            : (lang === 'ar' ? `موعد غداً: ${soonAppts[0].title}` : lang === 'fr' ? `RDV demain : ${soonAppts[0].title}` : `Tomorrow: ${soonAppts[0].title}`)}
                        </div>
                        <div style={{ fontSize: 11, color: '#ffedd5', marginTop: 1 }}>{soonAppts[0].date} · {soonAppts[0].time}</div>
                      </div>
                    </div>
                  )}
                  {urgentTasks.length > 0 && (
                    <div style={{ background: 'linear-gradient(135deg,#F59E0B,#d97706)', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setView('tasks')}>
                      <span style={{ fontSize: 18 }}>⚠️</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>
                          {lang === 'ar' ? `مهمة متأخرة: ${urgentTasks[0].title}` : lang === 'fr' ? `Tâche en retard : ${urgentTasks[0].title}` : `Overdue: ${urgentTasks[0].title}`}
                        </div>
                        <div style={{ fontSize: 11, color: '#fef3c7', marginTop: 1 }}>
                          {urgentTasks[0].dueDate}
                          {urgentTasks.length > 1 && ` · +${urgentTasks.length - 1}`}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Hero card — net profit */}
                  <div style={{ background: `linear-gradient(135deg, #0AB68B 0%, #059669 100%)`, borderRadius: 20, padding: '22px 20px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', right: -20, top: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
                    <div style={{ position: 'absolute', right: 20, bottom: -30, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>صافي الربح</div>
                    <div style={{ fontSize: 34, fontWeight: 900, color: '#fff', lineHeight: 1, marginBottom: 6 }}>
                      {finLoading ? '…' : `${netProfit.toLocaleString()}`}
                      <span style={{ fontSize: 14, fontWeight: 600, marginLeft: 6, opacity: 0.8 }}>DH</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                      {netProfit === 0 ? '—' : netProfit > 0 ? `↑ ${t.profitable}` : `↓ ${t.atLoss}`}
                      {monthlyGrowth !== null && ` · ${monthlyGrowth >= 0 ? '+' : ''}${monthlyGrowth}% هذا الشهر`}
                    </div>
                  </div>

                  {/* 2 mini cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ ...panelStyle, padding: '14px 16px' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: sub, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>الدخل</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: TEAL }}>{finLoading ? '…' : `${income.toLocaleString()}`}</div>
                      <div style={{ fontSize: 10, color: sub }}>DH</div>
                    </div>
                  </div>

                  {/* Chart */}
                  {!finLoading && chartData.length > 0
                    ? <MiniChartCard data={chartData} dark={dark} panel={panel} sub={sub} txt={txt} border={border} />
                    : <div style={{ ...panelStyle, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: sub }}>{finLoading ? t.loading : t.noData}</div>
                  }

                  {/* Tasks */}
                  <div style={{ ...panelStyle, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: txt }}>المهام</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: sub }}>{pendingTasks} معلقة · {doneTasks} منجزة</span>
                        <button onClick={() => setView('tasks')} style={{ background: `${TEAL}18`, border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: TEAL, cursor: 'pointer' }}>الكل</button>
                      </div>
                    </div>
                    <form onSubmit={handleAddTask} style={{ display: 'flex', gap: 8, padding: '8px 14px 10px', borderTop: `1px solid ${border}` }}>
                      <input required value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="أضف مهمة…" style={{ ...inputStyle, flex: 1, fontSize: 13 }} />
                      <button type="submit" disabled={taskBusy} style={{ width: 36, height: 36, background: TEAL, border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Plus size={16} /></button>
                    </form>
                    {tasks.length > 0 && (
                      <div style={{ padding: '0 14px 4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 3, background: dark ? '#222' : '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: TEAL, width: `${(doneTasks / tasks.length) * 100}%` }} />
                          </div>
                          <span style={{ fontSize: 10, color: sub }}>{Math.round((doneTasks / tasks.length) * 100)}%</span>
                        </div>
                      </div>
                    )}
                    <div>
                      {tasksLoading ? <div style={{ textAlign: 'center', color: sub, padding: 16, fontSize: 13 }}>جاري التحميل…</div>
                        : tasks.length === 0 ? <div style={{ textAlign: 'center', color: sub, padding: 16, fontSize: 13 }}>لا توجد مهام بعد</div>
                        : tasks.slice(0, 5).map((task, i) => (
                          <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderTop: `1px solid ${dark ? '#1a1a1a' : '#f5f5f5'}`, opacity: task.status === 'done' ? 0.45 : 1 }}>
                            <button onClick={() => handleToggleTask(task)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
                              {task.status === 'done'
                                ? <CheckCircle2 size={20} style={{ color: TEAL }} />
                                : <span style={{ display: 'block', width: 20, height: 20, borderRadius: '50%', border: `2px solid ${dark ? '#444' : '#D1D5DB'}` }} />}
                            </button>
                            <span style={{ flex: 1, fontSize: 13, color: txt, textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>{task.title}</span>
                            <button onClick={() => handleDeleteTask(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: dark ? '#ef444466' : '#EF4444', padding: 4, display: 'flex' }}><Trash2 size={14} /></button>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Client Projects */}
                  <div style={{ ...panelStyle, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 12px' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: txt }}>مشاريع العملاء</div>
                      {totalDebt > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: '#F59E0B' }}>{dh(totalDebt)} متبقي</span>}
                    </div>
                    {depLoading ? <div style={{ textAlign: 'center', color: sub, padding: 16, fontSize: 13 }}>جاري التحميل…</div>
                      : deposits.length === 0 ? <div style={{ textAlign: 'center', color: sub, padding: 16, fontSize: 13 }}>لا توجد مشاريع بعد</div>
                      : deposits.map((d, i) => {
                        const rem = Math.max(0, d.totalPrice - d.depositPaid)
                        const pct = d.totalPrice > 0 ? Math.min(100, (d.depositPaid / d.totalPrice) * 100) : 0
                        const sc  = rem === 0 ? TEAL : d.depositPaid === 0 ? '#EF4444' : '#F59E0B'
                        const sl  = rem === 0 ? 'مدفوع' : d.depositPaid === 0 ? 'غير مدفوع' : 'جزئي'
                        return (
                          <div key={d.id} style={{ padding: '12px 16px', borderTop: `1px solid ${dark ? '#1a1a1a' : '#f5f5f5'}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: txt }}>{d.clientName}</div>
                                {d.projectName && <div style={{ fontSize: 11, color: sub }}>{d.projectName}</div>}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, color: sc, background: `${sc}18` }}>{sl}</span>
                                <button onClick={() => { if (confirm('حذف هذا الكليان؟')) handleDeleteDeposit(d.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: dark ? '#ef444466' : '#EF4444', padding: 3, borderRadius: 6, display: 'flex' }}><Trash2 size={13} /></button>
                              </div>
                            </div>
                            <div style={{ height: 4, background: dark ? '#222' : '#f3f4f6', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                              <div style={{ height: '100%', borderRadius: 3, background: sc, width: `${pct}%` }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: sub, marginBottom: 8 }}>
                              <span>{dh(d.depositPaid)} مدفوع</span>
                              <span style={{ color: sc, fontWeight: 700 }}>{rem > 0 ? `${dh(rem)} متبقي` : '✓ مكتمل'}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              {Math.max(0, d.totalPrice - d.depositPaid) > 0 && (<>
                                <button onClick={() => whatsappReminder(d, lang)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#25D36612', border: '1px solid #25D36625', borderRadius: 8, padding: '7px 0', fontSize: 11, fontWeight: 700, color: '#25D366', cursor: 'pointer' }}>
                                  <MessageCircle size={12} /> WhatsApp
                                </button>
                                <button onClick={() => handleCompleteDeposit(d)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: `${TEAL}15`, border: `1px solid ${TEAL}30`, borderRadius: 8, padding: '7px 0', fontSize: 11, fontWeight: 700, color: TEAL, cursor: 'pointer' }}>
                                  <CheckCircle2 size={12} style={{ color: TEAL }} /> {t.completeBtn}
                                </button>
                              </>)}
                            </div>
                          </div>
                        )
                      })}
                  </div>

                </div>
              ) : (
                // ══════════════ DESKTOP DASHBOARD ══════════════
                <>
                  {(nearAppts.length > 0 || soonAppts.length > 0 || urgentTasks.length > 0) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {nearAppts.length > 0 && (
                        <div style={{ background: 'linear-gradient(135deg,#EF4444,#dc2626)', borderRadius: 14, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => setView('settings')}>
                          <span style={{ fontSize: 20 }}>🔴</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>
                              {lang === 'ar' ? `موعد قريب: ${nearAppts[0].title}` : lang === 'fr' ? `Rendez-vous proche : ${nearAppts[0].title}` : `Upcoming now: ${nearAppts[0].title}`}
                            </div>
                            <div style={{ fontSize: 11, color: '#fecaca', marginTop: 2 }}>
                              {nearAppts[0].date} · {nearAppts[0].time}
                              {nearAppts.length > 1 && ` · +${nearAppts.length - 1}`}
                            </div>
                          </div>
                          <span style={{ fontSize: 11, color: '#fecaca', fontWeight: 600 }}>{lang === 'ar' ? 'عرض ←' : lang === 'fr' ? 'Voir →' : 'View →'}</span>
                        </div>
                      )}
                      {soonAppts.length > 0 && (
                        <div style={{ background: 'linear-gradient(135deg,#F97316,#ea580c)', borderRadius: 14, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => setView('settings')}>
                          <span style={{ fontSize: 20 }}>🟠</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>
                              {soonAppts[0].date === todayStr
                                ? (lang === 'ar' ? `موعد اليوم: ${soonAppts[0].title}` : lang === 'fr' ? `RDV aujourd'hui : ${soonAppts[0].title}` : `Today: ${soonAppts[0].title}`)
                                : (lang === 'ar' ? `موعد غداً: ${soonAppts[0].title}` : lang === 'fr' ? `Rendez-vous demain : ${soonAppts[0].title}` : `Tomorrow: ${soonAppts[0].title}`)}
                            </div>
                            <div style={{ fontSize: 11, color: '#ffedd5', marginTop: 2 }}>
                              {soonAppts[0].date} · {soonAppts[0].time}
                              {soonAppts.length > 1 && ` · +${soonAppts.length - 1}`}
                            </div>
                          </div>
                          <span style={{ fontSize: 11, color: '#ffedd5', fontWeight: 600 }}>{lang === 'ar' ? 'عرض ←' : lang === 'fr' ? 'Voir →' : 'View →'}</span>
                        </div>
                      )}
                      {urgentTasks.length > 0 && (
                        <div style={{ background: 'linear-gradient(135deg,#F59E0B,#d97706)', borderRadius: 14, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => setView('tasks')}>
                          <span style={{ fontSize: 20 }}>⚠️</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>
                              {lang === 'ar' ? `مهمة متأخرة: ${urgentTasks[0].title}` : lang === 'fr' ? `Tâche en retard : ${urgentTasks[0].title}` : `Overdue task: ${urgentTasks[0].title}`}
                            </div>
                            <div style={{ fontSize: 11, color: '#fef3c7', marginTop: 2 }}>
                              {urgentTasks[0].dueDate}
                              {urgentTasks.length > 1 && ` · +${urgentTasks.length - 1}`}
                            </div>
                          </div>
                          <span style={{ fontSize: 11, color: '#fef3c7', fontWeight: 600 }}>{lang === 'ar' ? 'عرض ←' : lang === 'fr' ? 'Voir →' : 'View →'}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
                    <StatCard dark={dark} label={t.totalRevenue} value={finLoading ? t.loading : dh(income)}
                      sub={monthlyGrowth !== null ? `${monthlyGrowth >= 0 ? '+' : ''}${monthlyGrowth}% ${t.vsLastMonth}` : t.allTime}
                      positive={monthlyGrowth === null || monthlyGrowth >= 0}
                      gradient="linear-gradient(135deg,#0AB68B,#07c99b)" icon={<TrendingUp size={22} />} panel={panel} />
                    <StatCard dark={dark} label={t.totalExpenses} value={(finLoading || lossLoading) ? t.loading : dh(totalExp)}
                      sub={`${losses.length} ${t.expensesLogged}`}
                      positive={false} gradient="linear-gradient(135deg,#EF4444,#f87171)" icon={<Wallet size={22} />} panel={panel} />
                    <StatCard dark={dark} label={t.netProfit} value={(finLoading || lossLoading) ? t.loading : dh(netProfit)}
                      sub={netProfit === 0 ? '—' : netProfit > 0 ? t.profitable : t.atLoss}
                      positive={netProfit > 0}
                      gradient={netProfit === 0 ? 'linear-gradient(135deg,#9CA3AF,#d1d5db)' : netProfit > 0 ? 'linear-gradient(135deg,#6366F1,#818cf8)' : 'linear-gradient(135deg,#F59E0B,#fbbf24)'}
                      icon={<DollarSign size={22} />} big panel={panel} />
                  </div>
                  {!finLoading && chartData.length > 0
                    ? <RevenueChart data={chartData} dark={dark} lang={lang} />
                    : <div style={{ height: 220, ...panelStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: sub }}>{finLoading ? t.loading : t.noData}</div>
                  }
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div style={{ ...panelStyle, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '18px 22px 14px' }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: txt }}>{t.tasks2}</div>
                          <div style={{ fontSize: 12, color: sub, marginTop: 2 }}>{pendingTasks} {t.pending} · {doneTasks} {t.done}</div>
                        </div>
                        <button onClick={() => setView('tasks')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: TEAL, fontWeight: 700 }}>{t.seeAll}</button>
                      </div>
                      <form onSubmit={handleAddTask} style={{ display: 'flex', gap: 8, padding: '10px 18px', borderBottom: `1px solid ${border}`, borderTop: `1px solid ${border}` }}>
                        <input required value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder={t.addTask} style={{ ...inputStyle, flex: 1 }} />
                        <button type="submit" disabled={taskBusy} style={{ width: 34, height: 34, background: TEAL, border: 'none', borderRadius: 9, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Plus size={15} /></button>
                      </form>
                      <div style={{ flex: 1, overflowY: 'auto', maxHeight: 300 }}>
                        {tasksLoading ? <div style={{ textAlign: 'center', color: sub, fontSize: 13, padding: 22 }}>{t.loading}</div>
                          : tasks.length === 0 ? <div style={{ textAlign: 'center', color: sub, fontSize: 13, padding: 22 }}>{t.noTasks}</div>
                          : tasks.slice(0, 10).map(task => (
                            <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderBottom: `1px solid ${dark ? '#1a1a1a' : '#f9fafb'}`, opacity: task.status === 'done' ? 0.5 : 1 }}>
                              <button onClick={() => handleToggleTask(task)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0, flexShrink: 0 }}>
                                {task.status === 'done' ? <CheckCircle2 size={17} style={{ color: TEAL }} /> : <span style={{ display: 'block', width: 16, height: 16, borderRadius: '50%', border: `2px solid ${dark ? '#444' : '#D1D5DB'}` }} />}
                              </button>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ fontSize: 13, color: txt, textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>{task.title}</span>
                                {task.dueDate && task.status !== 'done' && (
                                  <span style={{ display: 'inline-block', marginRight: 6, fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 20, color: task.dueDate <= todayStr ? '#fff' : sub, background: task.dueDate < todayStr ? '#EF4444' : task.dueDate === todayStr ? '#F59E0B' : 'transparent' }}>
                                    {task.dueDate < todayStr ? (lang === 'ar' ? 'متأخر' : 'Retard') : task.dueDate === todayStr ? (lang === 'ar' ? 'اليوم' : "Auj.") : task.dueDate}
                                  </span>
                                )}
                              </div>
                              <button onClick={() => handleDeleteTask(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: dark ? '#ef444466' : '#EF4444', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}><Trash2 size={13} /></button>
                            </div>
                          ))}
                      </div>
                      {tasks.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 18px', borderTop: `1px solid ${border}`, fontSize: 11, color: sub }}>
                          <div style={{ flex: 1, height: 4, background: dark ? '#222' : '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: TEAL, borderRadius: 3, width: `${(doneTasks / tasks.length) * 100}%` }} />
                          </div>
                          <span>{Math.round((doneTasks / tasks.length) * 100)}% {t.done}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ ...panelStyle, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '18px 22px 14px' }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: txt }}>{t.clientProjects}</div>
                          {totalDebt > 0 && <div style={{ fontSize: 12, color: sub, marginTop: 2 }}>{t.remaining} <strong style={{ color: '#F59E0B' }}>{dh(totalDebt)}</strong></div>}
                        </div>
                        <button onClick={() => setView('finances')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: TEAL, fontWeight: 700 }}>{t.finances2}</button>
                      </div>
                      <div style={{ padding: '0 20px 20px', flex: 1, overflowY: 'auto' }}>
                        {depLoading ? <p style={{ fontSize: 12, color: sub }}>{t.loading}</p>
                          : deposits.length === 0 ? <p style={{ fontSize: 12, color: sub }}>{t.noProjects}</p>
                          : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
                            {deposits.map(d => {
                              const rem = Math.max(0, d.totalPrice - d.depositPaid)
                              const pct = d.totalPrice > 0 ? Math.min(100, (d.depositPaid / d.totalPrice) * 100) : 0
                              const sc  = rem === 0 ? TEAL : d.depositPaid === 0 ? '#EF4444' : '#F59E0B'
                              const sl  = rem === 0 ? t.paid : d.depositPaid === 0 ? t.unpaid : t.partial
                              return (
                                <div key={d.id} style={{ border: `1.5px solid ${border}`, borderRadius: 13, padding: 14 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                    <div>
                                      <div style={{ fontSize: 13, fontWeight: 700, color: txt }}>{d.clientName}</div>
                                      {d.projectName && <div style={{ fontSize: 11, color: sub, marginTop: 2 }}>{d.projectName}</div>}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, color: sc, background: `${sc}18` }}>{sl}</span>
                                      <button onClick={() => { if (confirm(lang === 'ar' ? 'حذف هذا الكليان؟' : 'Delete this client?')) handleDeleteDeposit(d.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: dark ? '#ef444466' : '#EF4444', padding: 3, borderRadius: 6, display: 'flex' }}><Trash2 size={13} /></button>
                                    </div>
                                  </div>
                                  <div style={{ height: 5, background: dark ? '#222' : '#f3f4f6', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                                    <div style={{ height: '100%', borderRadius: 3, background: sc, width: `${pct}%` }} />
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: sub, marginBottom: 8 }}>
                                    <span>{dh(d.depositPaid)} {t.dhPaid}</span>
                                    <span style={{ color: sc, fontWeight: 700 }}>{rem > 0 ? `${dh(rem)} ${t.dhLeft}` : t.complete}</span>
                                  </div>
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    {rem > 0 && (<>
                                      <button onClick={() => whatsappReminder(d, lang)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: '#25D36612', border: '1px solid #25D36625', borderRadius: 8, padding: '6px 0', fontSize: 11, fontWeight: 700, color: '#25D366', cursor: 'pointer' }}>
                                        <MessageCircle size={12} /> WA
                                      </button>
                                      <button onClick={() => handleCompleteDeposit(d)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: `${TEAL}15`, border: `1px solid ${TEAL}30`, borderRadius: 8, padding: '6px 0', fontSize: 11, fontWeight: 700, color: TEAL, cursor: 'pointer' }}>
                                        <CheckCircle2 size={12} style={{ color: TEAL }} /> {t.completeBtn}
                                      </button>
                                    </>)}
                                  </div>
                                </div>
                              )
                            })}
                          </div>}
                      </div>
                    </div>
                  </div>
                </>
              ))}

              {/* ── FINANCES ── */}
              {view === 'finances' && (<>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3,1fr)', gap: isMobile ? 10 : 16 }}>
                  {([
                    { label: t.totalRevenue,  val: finLoading ? t.loading : dh(income),    color: TEAL },
                    { label: t.totalExpenses, val: lossLoading ? t.loading : dh(totalExp), color: '#EF4444' },
                    { label: t.netProfit,     val: (finLoading || lossLoading) ? t.loading : dh(netProfit), color: netProfit >= 0 ? '#059669' : '#EF4444' },
                  ]).map(({ label, val, color }) => (
                    <div key={label} style={{ ...panelStyle, padding: '22px 24px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: sub, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>
                      <div style={{ fontSize: 26, fontWeight: 800, color }}>{val}</div>
                    </div>
                  ))}
                </div>

                {/* forms row */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                  <div style={{ ...panelStyle, padding: 22 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: TEAL, display: 'inline-block' }} />
                      <div style={{ fontSize: 14, fontWeight: 700, color: txt }}>{t.addIncome}</div>
                    </div>
                    <form onSubmit={handleAddFinance} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div><label style={labelStyle}>{t.description}</label><input required value={finName} onChange={e => setFinName(e.target.value)} placeholder={lang === 'ar' ? 'مثال: دفعة عميل' : lang === 'fr' ? 'Ex: Paiement client' : 'e.g. Client payment'} style={inputStyle} /></div>
                      <div><label style={labelStyle}>{t.amount}</label><input required type="number" value={finAmount} onChange={e => setFinAmount(e.target.value)} placeholder="0" style={inputStyle} /></div>
                      <button type="submit" disabled={finBusy} style={{ background: TEAL, color: '#fff', border: 'none', borderRadius: 9, padding: '11px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: finBusy ? 0.6 : 1, width: '100%' }}>{finBusy ? t.saving : t.save}</button>
                    </form>
                  </div>
                  <div style={{ ...panelStyle, padding: 22 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} />
                      <div style={{ fontSize: 14, fontWeight: 700, color: txt }}>{t.addExpense}</div>
                    </div>
                    <form onSubmit={handleAddLoss} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div><label style={labelStyle}>{t.description}</label><input required value={lossTitle} onChange={e => setLossTitle(e.target.value)} placeholder={lang === 'ar' ? 'مثال: إيجار' : lang === 'fr' ? 'Ex: Loyer' : 'e.g. Rent'} style={inputStyle} /></div>
                      <div><label style={labelStyle}>{t.amount}</label><input required type="number" value={lossAmount} onChange={e => setLossAmount(e.target.value)} placeholder="0" style={inputStyle} /></div>
                      <button type="submit" disabled={lossBusy} style={{ background: '#EF4444', color: '#fff', border: 'none', borderRadius: 9, padding: '11px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: lossBusy ? 0.6 : 1, width: '100%' }}>{lossBusy ? t.saving : t.save}</button>
                    </form>
                  </div>
                </div>

                {/* tables row */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                  {/* income table */}
                  <div style={{ ...panelStyle, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '18px 22px 14px', borderBottom: `1px solid ${border}` }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: TEAL, flexShrink: 0, display: 'inline-block' }} />
                      <div style={{ fontSize: 14, fontWeight: 700, color: txt }}>{t.income}</div>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr>{[t.description, t.date, t.amount, ''].map(h => <th key={h} style={{ padding: '9px 18px', textAlign: isRtl ? 'right' : 'left', fontSize: 10, fontWeight: 700, color: sub, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${border}` }}>{h}</th>)}</tr></thead>
                      <tbody>
                        {finLoading ? <tr><td colSpan={4} style={{ padding: '30px 18px', textAlign: 'center', color: sub, fontSize: 13 }}>{t.loading}</td></tr>
                          : finances.filter(f => f.type?.toLowerCase() === 'income').length === 0
                          ? <tr><td colSpan={4} style={{ padding: '30px 18px', textAlign: 'center', color: sub, fontSize: 13 }}>{t.noIncome}</td></tr>
                          : finances.filter(f => f.type?.toLowerCase() === 'income').map(f => (
                            <tr key={f.id}>
                              <td style={{ padding: '10px 18px', fontSize: 13, color: txt, fontWeight: 600, borderBottom: `1px solid ${dark ? '#1a1a1a' : '#fafafa'}` }}>{f.name || 'Entry'}</td>
                              <td style={{ padding: '10px 18px', fontSize: 13, color: sub, borderBottom: `1px solid ${dark ? '#1a1a1a' : '#fafafa'}` }}>{f.date ? fmtDate(f.date) : '—'}</td>
                              <td style={{ padding: '10px 18px', fontSize: 13, color: TEAL, fontWeight: 700, textAlign: 'right', borderBottom: `1px solid ${dark ? '#1a1a1a' : '#fafafa'}` }}>+{dh(Number(f.amount))}</td>
                              <td style={{ padding: '10px 18px', borderBottom: `1px solid ${dark ? '#1a1a1a' : '#fafafa'}` }}><button onClick={() => handleDeleteFinance(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: dark ? '#ef444466' : '#EF4444', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}><Trash2 size={12} /></button></td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {/* expenses table */}
                  <div style={{ ...panelStyle, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '18px 22px 14px', borderBottom: `1px solid ${border}` }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#EF4444', flexShrink: 0, display: 'inline-block' }} />
                      <div style={{ fontSize: 14, fontWeight: 700, color: txt }}>{t.expenses}</div>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr>{[t.title, t.date, t.amount, ''].map(h => <th key={h} style={{ padding: '9px 18px', textAlign: isRtl ? 'right' : 'left', fontSize: 10, fontWeight: 700, color: sub, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${border}` }}>{h}</th>)}</tr></thead>
                      <tbody>
                        {lossLoading ? <tr><td colSpan={4} style={{ padding: '30px 18px', textAlign: 'center', color: sub, fontSize: 13 }}>{t.loading}</td></tr>
                          : losses.length === 0
                          ? <tr><td colSpan={4} style={{ padding: '30px 18px', textAlign: 'center', color: sub, fontSize: 13 }}>{t.noExpenses}</td></tr>
                          : losses.map(l => (
                            <tr key={l.id}>
                              <td style={{ padding: '10px 18px', fontSize: 13, color: txt, fontWeight: 600, borderBottom: `1px solid ${dark ? '#1a1a1a' : '#fafafa'}` }}>{l.title}</td>
                              <td style={{ padding: '10px 18px', fontSize: 13, color: sub, borderBottom: `1px solid ${dark ? '#1a1a1a' : '#fafafa'}` }}>{l.date ? fmtDate(l.date) : '—'}</td>
                              <td style={{ padding: '10px 18px', fontSize: 13, color: '#EF4444', fontWeight: 700, textAlign: 'right', borderBottom: `1px solid ${dark ? '#1a1a1a' : '#fafafa'}` }}>−{dh(Number(l.amount))}</td>
                              <td style={{ padding: '10px 18px', borderBottom: `1px solid ${dark ? '#1a1a1a' : '#fafafa'}` }}><button onClick={() => handleDeleteLoss(l.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: dark ? '#ef444466' : '#EF4444', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}><Trash2 size={12} /></button></td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* client deposits */}
                <div style={{ ...panelStyle, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 14px', borderBottom: `1px solid ${border}` }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: txt }}>{t.clientDeposits}</div>
                    {totalDebt > 0 && <div style={{ fontSize: 12, color: sub }}>{t.remaining} <strong style={{ color: '#F59E0B' }}>{dh(totalDebt)}</strong></div>}
                  </div>
                  <div style={{ padding: '20px 24px' }}>
                    {deposits.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12, marginBottom: 20 }}>
                        {deposits.map(d => {
                          const rem = Math.max(0, d.totalPrice - d.depositPaid)
                          const pct = d.totalPrice > 0 ? Math.min(100, (d.depositPaid / d.totalPrice) * 100) : 0
                          const sc  = rem === 0 ? TEAL : d.depositPaid === 0 ? '#EF4444' : '#F59E0B'
                          const sl  = rem === 0 ? t.paid : d.depositPaid === 0 ? t.unpaid : t.partial
                          return (
                            <div key={d.id} style={{ border: `1.5px solid ${border}`, borderRadius: 13, padding: 14 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: txt }}>{d.clientName}</div>
                                  {d.projectName && <div style={{ fontSize: 11, color: sub, marginTop: 2 }}>{d.projectName}</div>}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, color: sc, background: `${sc}18` }}>{sl}</span>
                                  <button onClick={() => { if (confirm(lang === 'ar' ? 'حذف هذا الكليان؟' : 'Delete?')) handleDeleteDeposit(d.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: dark ? '#ef444466' : '#EF4444', padding: 3, borderRadius: 6, display: 'flex' }}><Trash2 size={13} /></button>
                                </div>
                              </div>
                              <div style={{ height: 5, background: dark ? '#222' : '#f3f4f6', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                                <div style={{ height: '100%', borderRadius: 3, background: sc, width: `${pct}%` }} />
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: sub, marginBottom: 10 }}>
                                <span>{t.paid}: {dh(d.depositPaid)}</span>
                                <span>{t.total}: {dh(d.totalPrice)}</span>
                                {rem > 0 && <span style={{ color: '#F59E0B', fontWeight: 700 }}>{dh(rem)} {t.dhLeft}</span>}
                              </div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                {rem > 0 && (<>
                                  <button onClick={() => whatsappReminder(d, lang)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#25D36614', border: '1px solid #25D36630', borderRadius: 8, padding: '7px 0', fontSize: 11, fontWeight: 700, color: '#25D366', cursor: 'pointer' }}>
                                    <MessageCircle size={13} /> WhatsApp
                                  </button>
                                  <button onClick={() => handleCompleteDeposit(d)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: `${TEAL}15`, border: `1px solid ${TEAL}30`, borderRadius: 8, padding: '7px 0', fontSize: 11, fontWeight: 700, color: TEAL, cursor: 'pointer' }}>
                                    <CheckCircle2 size={13} style={{ color: TEAL }} /> {t.completeBtn}
                                  </button>
                                </>)}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    <form onSubmit={handleAddDeposit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                        <div><label style={labelStyle}>{t.client}</label><input required value={depClient} onChange={e => setDepClient(e.target.value)} placeholder={lang === 'ar' ? 'اسم العميل' : lang === 'fr' ? 'Nom du client' : 'Client name'} style={inputStyle} /></div>
                        <div><label style={labelStyle}>{t.project}</label><input value={depProject} onChange={e => setDepProject(e.target.value)} placeholder={lang === 'ar' ? 'اسم المشروع' : lang === 'fr' ? 'Nom du projet' : 'Project name'} style={inputStyle} /></div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: 10 }}>
                        <div><label style={labelStyle}>{t.total}</label><input required type="number" value={depTotal} onChange={e => setDepTotal(e.target.value)} placeholder="0" style={inputStyle} /></div>
                        <div><label style={labelStyle}>{t.deposit}</label><input required type="number" value={depPaid} onChange={e => setDepPaid(e.target.value)} placeholder="0" style={inputStyle} /></div>
                        <div><label style={labelStyle}>{lang === 'ar' ? 'واتساب' : 'WhatsApp'}</label><input value={depPhone} onChange={e => setDepPhone(e.target.value)} placeholder="0612345678" style={{ ...inputStyle, direction: 'ltr' }} /></div>
                      </div>
                      <button type="submit" disabled={depBusy} style={{ background: '#F59E0B', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%' }}>{depBusy ? '…' : t.add}</button>
                    </form>
                  </div>
                </div>
              </>)}

              {/* ── STOCK ── */}
              {view === 'stock' && (<>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: isMobile ? 10 : 16, marginBottom: 20 }}>
                  {([
                    { label: lang === 'ar' ? 'إجمالي المنتجات' : lang === 'fr' ? 'Total Produits' : 'Total Products', val: String(products.length), color: txt },
                    { label: lang === 'ar' ? 'قيمة المخزون' : lang === 'fr' ? 'Valeur du Stock' : 'Stock Value', val: dh(products.reduce((s, p) => s + p.quantity * p.buyPrice, 0)), color: TEAL },
                    { label: t.lowStock, val: String(products.filter(p => p.quantity < 5).length), color: '#EF4444' }
                  ]).map((st, i) => (
                    <div key={i} style={{ ...panelStyle, padding: '16px', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: sub, marginBottom: 6 }}>{st.label}</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: st.color }}>{st.val}</div>
                    </div>
                  ))}
                </div>

                <div className="fin-grid-layout" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, alignItems: 'flex-start' }}>
                  {/* Form */}
                  <div style={{ ...panelStyle, padding: 20, position: 'sticky', top: 0 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 800, color: txt, marginBottom: 16 }}>
                      {lang === 'ar' ? 'إضافة منتج' : lang === 'fr' ? 'Ajouter Produit' : 'Add Product'}
                    </h3>
                    <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <label style={labelStyle}>{t.product}</label>
                        <input required value={prodName} onChange={e => setProdName(e.target.value)} style={inputStyle} />
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <label style={labelStyle}>{t.buyPrice}</label>
                          <input required type="number" step="0.01" value={prodBuy} onChange={e => setProdBuy(e.target.value)} style={inputStyle} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={labelStyle}>{t.sellPrice}</label>
                          <input required type="number" step="0.01" value={prodSell} onChange={e => setProdSell(e.target.value)} style={inputStyle} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <label style={labelStyle}>{t.quantity}</label>
                          <input required type="number" value={prodQty} onChange={e => setProdQty(e.target.value)} style={inputStyle} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={labelStyle}>{lang === 'ar' ? 'صورة المنتج' : lang === 'fr' ? 'Image du produit' : 'Product Image'}</label>
                          <input type="file" accept="image/*" onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            const reader = new FileReader()
                            reader.onload = (ev) => {
                              const img = new Image()
                              img.onload = () => {
                                const canvas = document.createElement('canvas')
                                const MAX_WIDTH = 300
                                const scaleSize = MAX_WIDTH / img.width
                                canvas.width = MAX_WIDTH
                                canvas.height = img.height * scaleSize
                                const ctx = canvas.getContext('2d')
                                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)
                                setProdImage(canvas.toDataURL('image/jpeg', 0.7))
                              }
                              img.src = ev.target?.result as string
                            }
                            reader.readAsDataURL(file)
                          }} style={{ ...inputStyle, padding: '6px' }} />
                        </div>
                      </div>
                      {prodImage && <img src={prodImage} alt="Preview" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, alignSelf: 'center' }} />}
                      <button type="submit" disabled={prodBusy} style={{ marginTop: 6, background: TEAL, color: '#fff', border: 'none', borderRadius: 9, padding: '11px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: prodBusy ? 0.7 : 1 }}>
                        {prodBusy ? t.saving : t.save}
                      </button>
                    </form>
                  </div>

                  {/* List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {prodLoading ? <div style={{ color: sub, textAlign: 'center', padding: 40 }}>{t.loading}</div> :
                     products.length === 0 ? <div style={{ color: sub, textAlign: 'center', padding: 40 }}>{lang === 'ar' ? 'لا توجد منتجات بعد' : lang === 'fr' ? 'Aucun produit' : 'No products yet'}</div> :
                     products.map(p => (
                       <div key={p.id} style={{ ...panelStyle, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
                         {p.quantity < 5 && <div style={{ position: 'absolute', left: isRtl ? 'auto' : 0, right: isRtl ? 0 : 'auto', top: 0, bottom: 0, width: 4, background: '#EF4444' }} />}
                         <div>
                           <div style={{ fontSize: 15, fontWeight: 800, color: txt, display: 'flex', alignItems: 'center', gap: 8 }}>
                             {p.name}
                             {p.quantity < 5 && <span style={{ fontSize: 10, background: '#EF444415', color: '#EF4444', padding: '2px 8px', borderRadius: 10 }}>{t.lowStock}</span>}
                           </div>
                           <div style={{ fontSize: 12, color: sub, marginTop: 4 }}>
                             {t.buyPrice}: <span style={{ color: txt, fontWeight: 600 }}>{dh(p.buyPrice)}</span> · {t.sellPrice}: <span style={{ color: txt, fontWeight: 600 }}>{dh(p.sellPrice)}</span>
                           </div>
                         </div>
                         <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                           <div style={{ textAlign: 'center' }}>
                             <div style={{ fontSize: 10, color: sub, fontWeight: 700 }}>{t.quantity}</div>
                             <div style={{ fontSize: 18, fontWeight: 900, color: p.quantity < 5 ? '#EF4444' : txt }}>{p.quantity}</div>
                           </div>
                           <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                             <button onClick={() => setShowStockSale(p)} style={{ background: `${TEAL}15`, border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 700, color: TEAL, cursor: 'pointer' }}>
                               {t.recordSale}
                             </button>
                             <button onClick={() => { if(confirm('Are you sure?')) handleDeleteProduct(p.id) }} style={{ background: 'none', border: 'none', color: '#EF444490', fontSize: 11, cursor: 'pointer', textAlign: 'center' }}>
                               <Trash2 size={14} style={{ display: 'inline-block' }} />
                             </button>
                           </div>
                         </div>
                       </div>
                     ))}
                  </div>
                </div>

                {/* Record Sale Modal */}
                {showStockSale && (
                  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ ...panelStyle, width: '90%', maxWidth: 360, padding: 24 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 800, color: txt, marginBottom: 16 }}>{t.recordSale}: {showStockSale.name}</h3>
                      <form onSubmit={handleStockSale} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div>
                          <label style={labelStyle}>{t.quantity}</label>
                          <input required type="number" min="1" max={showStockSale.quantity} value={saleQty} onChange={e => setSaleQty(e.target.value)} style={{ ...inputStyle, fontSize: 16, padding: '12px' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: sub }}>
                          <span>{t.sellPrice}: {dh(showStockSale.sellPrice)}</span>
                          <span style={{ fontWeight: 700, color: TEAL }}>{lang === 'ar' ? 'المجموع:' : 'Total:'} {dh(showStockSale.sellPrice * Number(saleQty || 0))}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                          <button type="button" onClick={() => setShowStockSale(null)} style={{ flex: 1, background: dark ? '#333' : '#eee', color: txt, border: 'none', borderRadius: 8, padding: 10, fontWeight: 700, cursor: 'pointer' }}>
                            {lang === 'ar' ? 'إلغاء' : lang === 'fr' ? 'Annuler' : 'Cancel'}
                          </button>
                          <button type="submit" disabled={prodBusy} style={{ flex: 1, background: TEAL, color: '#fff', border: 'none', borderRadius: 8, padding: 10, fontWeight: 700, cursor: 'pointer' }}>
                            {t.save}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </>)}

              {/* ── TASKS ── */}
              {view === 'tasks' && (<>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: isMobile ? 10 : 16 }}>
                  {([
                    { label: t.totalTasks, val: String(tasks.length), color: txt },
                    { label: t.inProgress, val: String(pendingTasks),  color: '#F59E0B' },
                    { label: t.completed,  val: String(doneTasks),     color: TEAL },
                  ]).map(({ label, val, color }) => (
                    <div key={label} style={{ ...panelStyle, padding: '22px 24px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: sub, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>
                      <div style={{ fontSize: 32, fontWeight: 800, color }}>{tasksLoading ? '…' : val}</div>
                    </div>
                  ))}
                </div>
                <div style={{ ...panelStyle, padding: '18px 22px' }}>
                  <form onSubmit={handleAddTask} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <input required value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder={t.addTask} style={{ ...inputStyle, flex: '1 1 200px' }} />
                    <input type="date" value={taskDue} onChange={e => setTaskDue(e.target.value)} style={{ ...inputStyle, width: 'auto', flexShrink: 0, colorScheme: dark ? 'dark' : 'light' }} />
                    <button type="submit" disabled={taskBusy} style={{ background: TEAL, color: '#fff', border: 'none', borderRadius: 9, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <Plus size={14} />{t.addTaskBtn}
                    </button>
                  </form>
                </div>
                <div style={{ ...panelStyle, overflow: 'hidden' }}>
                  {tasksLoading ? <div style={{ textAlign: 'center', color: sub, fontSize: 13, padding: '20px 0' }}>{t.loading}</div>
                    : tasks.length === 0 ? <div style={{ textAlign: 'center', color: sub, fontSize: 13, padding: '20px 0' }}>{t.noTasks}</div>
                    : tasks.map((task, i) => (
                      <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', borderBottom: i < tasks.length - 1 ? `1px solid ${border}` : 'none', opacity: task.status === 'done' ? 0.5 : 1 }}>
                        <button onClick={() => handleToggleTask(task)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0, flexShrink: 0 }}>
                          {task.status === 'done' ? <CheckCircle2 size={18} style={{ color: TEAL }} /> : <span style={{ display: 'block', width: 16, height: 16, borderRadius: '50%', border: `2px solid ${dark ? '#444' : '#D1D5DB'}` }} />}
                        </button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 13, color: txt, textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>{task.title}</span>
                          {task.dueDate && task.status !== 'done' && (
                            <span style={{ display: 'inline-block', marginRight: 8, fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 20, color: task.dueDate < todayStr ? '#fff' : task.dueDate === todayStr ? '#fff' : sub, background: task.dueDate < todayStr ? '#EF4444' : task.dueDate === todayStr ? '#F59E0B' : (dark ? '#2a2a2a' : '#f3f4f6') }}>
                              {task.dueDate < todayStr ? (lang === 'ar' ? 'متأخر' : lang === 'fr' ? 'En retard' : 'Overdue') : task.dueDate === todayStr ? (lang === 'ar' ? 'اليوم' : "Auj." ) : task.dueDate}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, color: task.status === 'done' ? TEAL : '#D97706', background: task.status === 'done' ? (dark ? '#0a2e20' : '#d1fae5') : (dark ? '#2a1f00' : '#fef3c7'), flexShrink: 0 }}>
                          {task.status === 'done' ? t.doneBadge : t.inProgressBadge}
                        </span>
                        <button onClick={() => handleDeleteTask(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: dark ? '#ef444466' : '#EF4444', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}><Trash2 size={14} /></button>
                      </div>
                    ))}
                </div>
              </>)}

              {/* ── SETTINGS ── */}
              {view === 'settings' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* rendez-vous */}
                  <div style={{ ...panelStyle, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '22px 26px 16px', borderBottom: `1px solid ${border}` }}>
                      <Calendar size={18} style={{ color: TEAL }} />
                      <div style={{ fontSize: 18, fontWeight: 800, color: txt }}>{t.appointments}</div>
                      <span style={{ fontSize: 13, color: sub, marginRight: 4 }}>({upcomingAppts.length} {t.upcoming})</span>
                    </div>
                    <div style={{ padding: '20px 26px' }}>
                      <form onSubmit={handleAddAppt} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                        <div><label style={labelStyle}>{t.title}</label><input required value={apptTitle} onChange={e => setApptTitle(e.target.value)} placeholder={lang === 'ar' ? 'اجتماع…' : lang === 'fr' ? 'Réunion…' : 'Meeting…'} style={inputStyle} /></div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div><label style={labelStyle}>{t.date}</label><input required type="date" value={apptDate} onChange={e => setApptDate(e.target.value)} style={{ ...inputStyle, colorScheme: dark ? 'dark' : 'light' }} /></div>
                          <div><label style={labelStyle}>{t.time}</label><input required type="time" value={apptTime} onChange={e => setApptTime(e.target.value)} style={{ ...inputStyle, colorScheme: dark ? 'dark' : 'light' }} /></div>
                        </div>
                        <button type="submit" disabled={apptBusy} style={{ background: TEAL, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: apptBusy ? 0.6 : 1 }}>{apptBusy ? '…' : t.add}</button>
                      </form>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                        {apptsLoading ? <p style={{ fontSize: 13, color: sub, margin: 0 }}>{t.loading}</p> : appts.length === 0
                          ? <p style={{ fontSize: 13, color: sub, margin: 0 }}>{t.noAppts}</p>
                          : appts.map((a, i) => {
                            const isToday = a.date === todayStr, isPast = a.date < todayStr
                            return (
                              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 12, background: isToday ? `${TEAL}12` : dark ? '#1a1a1a' : '#f8faff', opacity: isPast ? 0.45 : 1 }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: isToday ? TEAL : isPast ? (dark ? '#333' : '#D1D5DB') : '#3B82F6', flexShrink: 0 }} />
                                <div style={{ flex: 1 }}>
                                  {isToday && <span style={{ fontSize: 10, fontWeight: 800, color: TEAL, display: 'block', letterSpacing: '0.05em' }}>{t.today}</span>}
                                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: txt }}>{a.title}</p>
                                  <p style={{ margin: 0, fontSize: 12, color: sub, marginTop: 2 }}>{a.date} · {a.time}</p>
                                </div>
                                <button onClick={async () => { await deleteDoc(doc(db, 'appointments', a.id)); setAppts(p => p.filter(x => x.id !== a.id)) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: dark ? '#ef444466' : '#EF4444', padding: 4, borderRadius: 6 }}><Trash2 size={14} /></button>
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  </div>



                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* MOBILE BOTTOM NAV */}
      {isMobile && <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: panel, borderTop: `1px solid ${border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        padding: '8px 0 12px', gap: 0,
      }}>
        {NAV_IDS.map((id, i) => {
          const Icon = NAV_ICONS[i]
          const active = view === id
          return (
            <button key={id} onClick={() => setView(id)} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              background: 'none', border: 'none', cursor: 'pointer',
              color: active ? TEAL : sub, padding: '4px 0',
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: active ? `${TEAL}18` : 'transparent', transition: 'background .15s', position: 'relative' }}>
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                {id === 'settings' && nearAppts.length > 0 && (
                  <span style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: '50%', background: '#EF4444', border: `2px solid ${panel}` }} />
                )}
                {id === 'settings' && nearAppts.length === 0 && soonAppts.length > 0 && (
                  <span style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: '50%', background: '#F97316', border: `2px solid ${panel}` }} />
                )}
                {id === 'tasks' && urgentTasks.length > 0 && (
                  <span style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: '50%', background: '#EF4444', border: `2px solid ${panel}` }} />
                )}
              </div>
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{NAV_LABELS[i]}</span>
            </button>
          )
        })}
        {/* lang toggle in bottom nav */}
        <button onClick={() => setLang(nextLang)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: TEAL, padding: '4px 0' }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${TEAL}14` }}>
            <span style={{ fontSize: 13, fontWeight: 800 }}>{langLabel(lang)}</span>
          </div>
          <span style={{ fontSize: 10, fontWeight: 700 }}>{lang === 'ar' ? 'عربي' : lang === 'en' ? 'EN' : 'FR'}</span>
        </button>
        {/* logout in bottom nav */}
        <button onClick={() => { if (confirm(isRtl ? 'تأكيد الخروج؟' : 'Sign out?')) signOut(auth) }} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: '4px 0' }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EF444414' }}>
            <LogOut size={20} strokeWidth={1.8} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 500 }}>{t.logout}</span>
        </button>
      </nav>}


      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        button{font-family:inherit}
        select{appearance:none;cursor:pointer}
        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="time"]::-webkit-calendar-picker-indicator{opacity:0.4;cursor:pointer;filter:${dark ? 'invert(1)' : 'none'}}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${dark ? '#2a2a2a' : '#e5e7eb'};border-radius:10px}

        /* ── MOBILE ── */
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-bottomnav { display: flex !important; }
          .main-content { padding-bottom: 80px !important; }
          .cards3-grid { grid-template-columns: 1fr 1fr !important; }
          .cards3-grid > *:last-child { grid-column: 1 / -1; }
          .dash-bottom-grid { grid-template-columns: 1fr !important; }
          .fin-grid-layout { grid-template-columns: 1fr !important; }
          .fin-forms-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          .dep-form-grid { grid-template-columns: 1fr 1fr !important; }
          .dep-form-grid > *:last-child { grid-column: 1 / -1; }
          .settings-grid { grid-template-columns: 1fr !important; }
          .tasks-stats-grid { grid-template-columns: 1fr 1fr 1fr !important; }
          .chart-hide-mobile { display: none !important; }
          .topbar-date { display: none !important; }
          .content-pad { padding: 16px 14px 16px !important; }
          .panel-head-pad { padding: 14px 16px 10px !important; }
          .panel-inner-pad { padding: 14px 16px !important; }
          table { font-size: 12px !important; }
          table td, table th { padding: 8px 10px !important; }
        }

        @media (min-width: 769px) {
          .mobile-bottomnav { display: none !important; }
          .desktop-sidebar { display: flex !important; }
        }
      `}</style>
    </>
  )
}

// ── MiniChartCard (mobile) — area chart like cardiogram ──────────────────────
import { AreaChart, Area, XAxis, ResponsiveContainer, Tooltip } from 'recharts'

function padChart(data: any[], key: 'income' | 'expenses'): any[] {
  if (data.length >= 3) return data
  const v = data[0]?.[key] ?? 0
  const m = data[0]?.month ?? ''
  // flat line at real value — no fake numbers
  return ['', m, ''].map(month => ({ month, income: 0, expenses: 0, profit: 0, [key]: v }))
}

function MiniChartCard({ data, dark, panel, sub, txt, border }: {
  data: any[]; dark: boolean; panel: string; sub: string; txt: string; border: string
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const income   = data.reduce((s: number, d: any) => s + d.income, 0)
  const expenses = data.reduce((s: number, d: any) => s + d.expenses, 0)
  const incomeData   = padChart(data, 'income')
  const expensesData = padChart(data, 'expenses')

  if (!mounted) {
    return <div style={{ height: 200, background: panel, borderRadius: 16, border: `1px solid ${border}` }} />
  }

  return (
    <div style={{ background: panel, borderRadius: 16, padding: '16px 18px 10px', boxShadow: dark ? '0 2px 12px rgba(0,0,0,0.4)' : '0 2px 10px rgba(0,0,0,0.055)' }}>
      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: sub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>الدخل الشهري</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0AB68B', marginTop: 2 }}>{(income / 1000).toFixed(1)}k <span style={{ fontSize: 11, fontWeight: 600 }}>DH</span></div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: sub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>المصاريف</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#EF4444', marginTop: 2 }}>{(expenses / 1000).toFixed(1)}k <span style={{ fontSize: 11, fontWeight: 600 }}>DH</span></div>
        </div>
      </div>

      {/* income area chart */}
      <div style={{ marginBottom: 6, width: '100%', height: 90 }}>
        <div style={{ fontSize: 9, color: '#0AB68B', fontWeight: 700, marginBottom: 2 }}>INCOME</div>
        <div style={{ width: '100%', height: 70 }}>
          <ResponsiveContainer width="100%" height={70}>
            <AreaChart data={incomeData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="mgi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0AB68B" stopOpacity={dark ? 0.3 : 0.4} />
                  <stop offset="100%" stopColor="#0AB68B" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fill: sub, fontSize: 9 }} axisLine={false} tickLine={false} dy={4} />
              <Tooltip formatter={(v: any) => [`${Number(v).toLocaleString()} DH`, '']} contentStyle={{ background: dark ? '#1e1e1e' : '#fff', border: 'none', borderRadius: 8, fontSize: 11 }} />
              <Area type="natural" dataKey="income" stroke="#0AB68B" strokeWidth={2} fill="url(#mgi)" dot={false} activeDot={{ r: 4, fill: '#0AB68B', stroke: panel, strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* expenses area chart */}
      <div style={{ width: '100%', height: 90 }}>
        <div style={{ fontSize: 9, color: '#EF4444', fontWeight: 700, marginBottom: 2 }}>EXPENSES</div>
        <div style={{ width: '100%', height: 70 }}>
          <ResponsiveContainer width="100%" height={70}>
            <AreaChart data={expensesData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="mge" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity={dark ? 0.3 : 0.4} />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fill: sub, fontSize: 9 }} axisLine={false} tickLine={false} dy={4} />
              <Tooltip formatter={(v: any) => [`${Number(v).toLocaleString()} DH`, '']} contentStyle={{ background: dark ? '#1e1e1e' : '#fff', border: 'none', borderRadius: 8, fontSize: 11 }} />
              <Area type="natural" dataKey="expenses" stroke="#EF4444" strokeWidth={2} fill="url(#mge)" dot={false} activeDot={{ r: 4, fill: '#EF4444', stroke: panel, strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

// ── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, positive, gradient, icon, big, panel, dark, spanFull }: {
  label: string; value: string; sub: string; positive: boolean
  gradient: string; icon: React.ReactNode; big?: boolean; panel: string; dark: boolean; spanFull?: boolean
}) {
  const txt = dark ? '#e5e5e5' : '#111827'
  const subC = dark ? '#555555' : '#9CA3AF'
  return (
    <div style={{ background: panel, borderRadius: 16, padding: '18px 18px', boxShadow: dark ? '0 2px 12px rgba(0,0,0,0.4)' : '0 2px 10px rgba(0,0,0,0.055)', display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', overflow: 'hidden', gridColumn: spanFull ? '1 / -1' : undefined }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 6px 14px rgba(0,0,0,0.15)' }}>
          {icon}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: positive ? '#059669' : '#EF4444' }}>
          {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {sub}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: subC, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: big ? 24 : 20, fontWeight: 800, color: txt, lineHeight: 1.1 }}>{value}</div>
      </div>
      <div style={{ position: 'absolute', right: -16, top: -16, width: 80, height: 80, borderRadius: '50%', background: gradient, opacity: 0.07 }} />
    </div>
  )
}
