'use client'
/**
 * ONE-TIME seed page  →  visit http://localhost:3000/seed  →  click button
 * Delete this file (app/seed/) after seeding.
 */

import { useState } from 'react'
import { db } from '@/lib/firebase'
import { collection, addDoc, getDocs } from 'firebase/firestore'

// ── data ─────────────────────────────────────────────────────────────────────

const FINANCES = [
  { name: 'Sofyan — Simple SaaS IPTV (Paid in full)',             amount: 600,  type: 'income', date: '2025-04-01T00:00:00.000Z' },
  { name: 'École — School Management & Transport (Deposit)',       amount: 500,  type: 'income', date: '2025-04-10T00:00:00.000Z' },
  { name: 'Bya3 w Chray — Stock & Credit System (Deposit)',       amount: 300,  type: 'income', date: '2025-04-15T00:00:00.000Z' },
]

const DEPOSITS = [
  { clientName: 'Sofyan',             projectName: 'Simple SaaS IPTV',                 totalPrice: 600,  depositPaid: 600, date: '2025-04-01T00:00:00.000Z' },
  { clientName: 'Sid mn Fes (NARSA)', projectName: 'Work Management System',            totalPrice: 1500, depositPaid: 0,   date: '2025-04-05T00:00:00.000Z' },
  { clientName: 'École — School',     projectName: 'School Management & Transport',     totalPrice: 2500, depositPaid: 500, date: '2025-04-10T00:00:00.000Z' },
  { clientName: 'Bya3 w Chray',       projectName: 'Stock & Credit System',             totalPrice: 1200, depositPaid: 300, date: '2025-04-15T00:00:00.000Z' },
]

// ── component ─────────────────────────────────────────────────────────────────

type Log = { ok: boolean; text: string }

export default function SeedPage() {
  const [logs,   setLogs]   = useState<Log[]>([])
  const [busy,   setBusy]   = useState(false)
  const [done,   setDone]   = useState(false)

  function push(ok: boolean, text: string) {
    setLogs(prev => [...prev, { ok, text }])
  }

  async function runSeed() {
    setBusy(true)
    setLogs([])

    try {
      // guard: abort if data already exists
      const existing = await getDocs(collection(db, 'deposits'))
      if (!existing.empty) {
        push(false, `⚠️  Deposits collection already has ${existing.size} document(s). Aborting to avoid duplicates.`)
        push(false, 'Delete existing documents in Firebase Console first, then try again.')
        setBusy(false)
        return
      }

      push(true, '── Finances (payments received) ──────────────')
      let total = 0
      for (const f of FINANCES) {
        const ref = await addDoc(collection(db, 'finances'), f)
        total += f.amount
        push(true, `✓  +${f.amount} DH  ·  ${f.name}  [${ref.id.slice(0,8)}…]`)
      }
      push(true, `→  Revenue card total: ${total.toLocaleString()} DH`)

      push(true, '')
      push(true, '── Deposits (project tracker) ────────────────')
      for (const d of DEPOSITS) {
        const ref = await addDoc(collection(db, 'deposits'), d)
        const rem = d.totalPrice - d.depositPaid
        const st  = rem === 0 ? '✅ PAID' : d.depositPaid === 0 ? '⚠️  PENDING' : '🔄 PARTIAL'
        push(true, `${st}  ${d.clientName}  ·  Total ${d.totalPrice} · Paid ${d.depositPaid} · Remaining ${rem} DH  [${ref.id.slice(0,8)}…]`)
      }

      push(true, '')
      push(true, '── Summary ───────────────────────────────────')
      push(true, `Revenue in bank    : ${total.toLocaleString()} DH`)
      push(true, `Total contracted   : ${DEPOSITS.reduce((s,d)=>s+d.totalPrice,0).toLocaleString()} DH`)
      push(true, `Still owed to you  : ${DEPOSITS.reduce((s,d)=>s+Math.max(0,d.totalPrice-d.depositPaid),0).toLocaleString()} DH`)
      push(true, '')
      push(true, '✓ Seed complete — go to the dashboard to see your data!')

      setDone(true)
    } catch (err: any) {
      push(false, `✗ Error: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ fontFamily: "'Inter','Cairo',sans-serif" }} className="min-h-screen bg-[#060606] p-10 text-zinc-300">
      <div className="mx-auto max-w-2xl">

        <div className="mb-8">
          <h1 className="text-lg font-semibold text-white">M-Insight · Data Seed</h1>
          <p className="mt-1 text-sm text-zinc-600">Adds your 4 real client projects to Firestore. Run once, then delete <code className="text-zinc-500">app/seed/</code>.</p>
        </div>

        <div className="mb-6 rounded-2xl border border-white/[0.05] p-5 text-xs text-zinc-500 space-y-1.5">
          <p className="font-medium text-zinc-400 mb-3">What will be added:</p>
          <p>💰 <span className="text-orange-400">Finances</span>: Sofyan 600 DH · École 500 DH deposit · Bya3 w Chray 300 DH deposit</p>
          <p>📋 <span className="text-zinc-300">Deposits</span>: Sofyan (PAID) · Sid mn Fes NARSA (PENDING 1,500 DH) · École (2,000 DH remaining) · Bya3 w Chray (900 DH remaining)</p>
          <p className="pt-1 text-zinc-600">Total revenue after seed: <span className="text-white font-medium">1,400 DH</span></p>
        </div>

        {!done && (
          <button
            onClick={runSeed}
            disabled={busy}
            className="mb-8 rounded-xl bg-orange-600 px-8 py-3 text-sm font-medium text-white transition-all hover:bg-orange-500 active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? 'Seeding…' : '▶  Run Seed'}
          </button>
        )}

        {done && (
          <div className="mb-8 flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-3">
            <span className="text-emerald-400 text-sm font-medium">✓ Done!</span>
            <a href="/" className="text-sm text-zinc-400 underline hover:text-white">← Go to dashboard</a>
            <span className="text-zinc-700 text-xs ml-auto">Delete <code>app/seed/</code> when ready</span>
          </div>
        )}

        {logs.length > 0 && (
          <div className="rounded-2xl border border-white/[0.05] bg-[#0a0a0a] p-5 font-mono text-[11px] leading-relaxed">
            {logs.map((l, i) => (
              <div key={i} className={l.ok ? 'text-zinc-400' : 'text-red-400'}>{l.text || ' '}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
