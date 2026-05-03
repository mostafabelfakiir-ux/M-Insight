/**
 * Seed script — run from project root:
 *   node scripts/seed.mjs
 *
 * Uses the Firestore REST API (no gRPC, no App ID required).
 */

import { readFileSync } from 'node:fs'

// ── load .env.local ──────────────────────────────────────────────────────────
const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
const env = Object.fromEntries(
  raw.split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()] })
)

const PROJECT_ID = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
const API_KEY    = env.NEXT_PUBLIC_FIREBASE_API_KEY
const BASE       = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

if (!PROJECT_ID || !API_KEY) {
  console.error('Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID or NEXT_PUBLIC_FIREBASE_API_KEY in .env.local')
  process.exit(1)
}

// ── data ─────────────────────────────────────────────────────────────────────

// Money actually received → drives the Revenue card  (600 + 500 + 300 = 1,400 DH)
const FINANCES = [
  { name: 'Sofyan — Simple SaaS IPTV (Paid in full)',             amount: 600,  type: 'income', date: '2025-04-01T00:00:00.000Z' },
  { name: 'École — School Management & Transport (Deposit)',       amount: 500,  type: 'income', date: '2025-04-10T00:00:00.000Z' },
  { name: 'Bya3 w Chray — Stock & Credit System (Deposit)',       amount: 300,  type: 'income', date: '2025-04-15T00:00:00.000Z' },
]

// Full project tracking → drives the Deposits panel
const DEPOSITS = [
  { clientName: 'Sofyan',              projectName: 'Simple SaaS IPTV',                  totalPrice: 600,  depositPaid: 600, date: '2025-04-01T00:00:00.000Z' },
  { clientName: 'Sid mn Fes (NARSA)',  projectName: 'Work Management System',             totalPrice: 1500, depositPaid: 0,   date: '2025-04-05T00:00:00.000Z' },
  { clientName: 'École — School',      projectName: 'School Management & Transport',      totalPrice: 2500, depositPaid: 500, date: '2025-04-10T00:00:00.000Z' },
  { clientName: 'Bya3 w Chray',        projectName: 'Stock & Credit System',              totalPrice: 1200, depositPaid: 300, date: '2025-04-15T00:00:00.000Z' },
]

// ── Firestore REST helpers ────────────────────────────────────────────────────

function toFirestoreDoc(obj) {
  const fields = {}
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string')  fields[k] = { stringValue: v }
    if (typeof v === 'number')  fields[k] = { doubleValue: v }
    if (typeof v === 'boolean') fields[k] = { booleanValue: v }
  }
  return { fields }
}

async function addDoc(collectionName, data) {
  const res = await fetch(`${BASE}/${collectionName}?key=${API_KEY}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(toFirestoreDoc(data)),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(`${res.status} — ${err.error?.message ?? JSON.stringify(err)}`)
  }
  const doc = await res.json()
  return doc.name.split('/').pop()  // document ID
}

// ── formatting ────────────────────────────────────────────────────────────────

const DIM  = '\x1b[2m'; const GRN = '\x1b[32m'; const YLW = '\x1b[33m'
const RED  = '\x1b[31m'; const RST = '\x1b[0m';  const B   = '\x1b[1m'
function fmt(n) { return n.toLocaleString('fr-MA') + ' DH' }

// ── seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log(`\n${B}M-Insight — Data Seed${RST}  ${DIM}project: ${PROJECT_ID}${RST}`)
  console.log('─'.repeat(52))

  // finances
  console.log(`\n${B}Finances${RST}  ${DIM}(payments received → Revenue card)${RST}`)
  let totalReceived = 0
  for (const f of FINANCES) {
    const id = await addDoc('finances', f)
    totalReceived += f.amount
    console.log(`  ${GRN}✓${RST}  ${f.name}`)
    console.log(`     ${B}+${fmt(f.amount)}${RST}  ${DIM}id: ${id}${RST}`)
  }
  console.log(`\n  ${DIM}→ Revenue card will show:${RST} ${B}${GRN}${fmt(totalReceived)}${RST}`)

  // deposits
  console.log(`\n${B}Deposits${RST}  ${DIM}(project tracker → Deposits panel)${RST}`)
  for (const d of DEPOSITS) {
    const id      = await addDoc('deposits', d)
    const rem     = d.totalPrice - d.depositPaid
    const status  = rem === 0                ? `${GRN}PAID    ${RST}`
                  : d.depositPaid === 0      ? `${RED}PENDING ${RST}`
                  :                            `${YLW}PARTIAL ${RST}`
    console.log(`  ${status}  ${B}${d.clientName}${RST}  ${DIM}${d.projectName}${RST}`)
    console.log(`           Total ${fmt(d.totalPrice)} · Paid ${fmt(d.depositPaid)} · ${B}Remaining ${fmt(rem)}${RST}  ${DIM}${id}${RST}`)
  }

  // summary
  const totalContracts = DEPOSITS.reduce((s, d) => s + d.totalPrice, 0)
  const totalOwed      = DEPOSITS.reduce((s, d) => s + Math.max(0, d.totalPrice - d.depositPaid), 0)
  console.log('\n' + '─'.repeat(52))
  console.log(`${B}Summary${RST}`)
  console.log(`  Revenue in bank    ${GRN}${B}${fmt(totalReceived)}${RST}`)
  console.log(`  Total contracted   ${fmt(totalContracts)}`)
  console.log(`  Still owed to you  ${YLW}${B}${fmt(totalOwed)}${RST}`)
  console.log(`\n${GRN}${B}✓ Done.${RST}  Reload the dashboard to see your data.\n`)
  process.exit(0)
}

seed().catch(err => {
  console.error(`\n${RED}${B}✗ Seed failed:${RST} ${err.message}\n`)
  process.exit(1)
})
