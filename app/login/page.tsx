'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth'
const TEAL = '#0AB68B'
const INVITE_CODE = 'HISABI2025'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode]       = useState<'login' | 'register'>('login')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]       = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [busy, setBusy]         = useState(false)
  const [err, setErr]           = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      if (user) router.replace('/')
      else setChecking(false)
    })
    return unsub
  }, [])

  async function handleReset() {
    if (!email) { setErr('أدخل بريدك الإلكتروني أولاً'); return }
    setBusy(true); setErr('')
    try {
      await sendPasswordResetEmail(auth, email)
      setResetSent(true)
    } catch {
      setErr('البريد غير صحيح أو غير مسجل')
    } finally { setBusy(false) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setErr('')
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        if (password.length < 6) { setErr('كلمة المرور 6 أحرف على الأقل'); setBusy(false); return }
        if (inviteCode.trim().toUpperCase() !== INVITE_CODE) { setErr('كود الدعوة غير صحيح'); setBusy(false); return }
        await createUserWithEmailAndPassword(auth, email, password)
      }
      router.replace('/')
    } catch (e: any) {
      const code = e.code || ''
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential')
        setErr('البريد أو كلمة المرور غير صحيحة')
      else if (code === 'auth/email-already-in-use')
        setErr('هذا البريد مسجل بالفعل')
      else if (code === 'auth/invalid-email')
        setErr('البريد الإلكتروني غير صالح')
      else
        setErr('حدث خطأ، حاول مجدداً')
    } finally {
      setBusy(false)
    }
  }

  if (checking) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4ff' }}>
      <div style={{ width: 36, height: 36, border: `3px solid ${TEAL}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f5f0 100%)', padding: 20, fontFamily: "'Cairo','Inter',sans-serif" }} dir="rtl">

      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, background: `linear-gradient(135deg,${TEAL},#07c99b)`, borderRadius: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 28, fontWeight: 900, boxShadow: '0 8px 24px rgba(10,182,139,0.35)', marginBottom: 16 }}>
            م
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#111827' }}>Hisabi</div>
          <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>حسابك في يدك</div>
        </div>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: 24, boxShadow: '0 8px 40px rgba(0,0,0,0.10)', padding: '32px 28px' }}>

          {/* Tabs */}
          <div style={{ display: 'flex', background: '#f5f7ff', borderRadius: 12, padding: 4, marginBottom: 28, gap: 4 }}>
            {(['login', 'register'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setErr('') }} style={{
                flex: 1, padding: '9px 0', border: 'none', borderRadius: 9, cursor: 'pointer',
                fontSize: 13, fontWeight: 700,
                background: mode === m ? '#fff' : 'transparent',
                color: mode === m ? TEAL : '#9CA3AF',
                boxShadow: mode === m ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                transition: 'all .15s',
              }}>
                {m === 'login' ? 'تسجيل الدخول' : 'حساب جديد'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {mode === 'register' && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#6B7280', marginBottom: 6 }}>الاسم</label>
                  <input
                    value={name} onChange={e => setName(e.target.value)}
                    placeholder="اسمك الكامل"
                    style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #eaedf5', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#f9fafb', color: '#111827', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#6B7280', marginBottom: 6 }}>كود الدعوة</label>
                  <input
                    value={inviteCode} onChange={e => setInviteCode(e.target.value)}
                    placeholder="أدخل كود الدعوة"
                    style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #eaedf5', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#f9fafb', color: '#111827', boxSizing: 'border-box', direction: 'ltr', textAlign: 'right', letterSpacing: 2 }}
                  />
                </div>
              </>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#6B7280', marginBottom: 6 }}>البريد الإلكتروني</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="example@email.com"
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #eaedf5', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#f9fafb', color: '#111827', boxSizing: 'border-box', direction: 'ltr', textAlign: 'right' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#6B7280' }}>كلمة المرور</label>
                {mode === 'login' && (
                  <button type="button" onClick={handleReset} disabled={busy} style={{ fontSize: 11, fontWeight: 600, color: TEAL, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    نسيت كلمة المرور؟
                  </button>
                )}
              </div>
              <input
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #eaedf5', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#f9fafb', color: '#111827', boxSizing: 'border-box' }}
              />
            </div>

            {resetSent && (
              <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#16A34A', fontWeight: 600 }}>
                ✓ تم إرسال رابط إعادة التعيين على بريدك
              </div>
            )}

            {err && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#DC2626', fontWeight: 600 }}>
                {err}
              </div>
            )}

            <button type="submit" disabled={busy} style={{
              width: '100%', padding: '13px 0', border: 'none', borderRadius: 12, cursor: busy ? 'not-allowed' : 'pointer',
              fontSize: 15, fontWeight: 800, color: '#fff',
              background: busy ? '#9CA3AF' : `linear-gradient(135deg,${TEAL},#07c99b)`,
              boxShadow: busy ? 'none' : '0 6px 20px rgba(10,182,139,0.35)',
              transition: 'all .15s',
              fontFamily: 'inherit',
            }}>
              {busy ? '...' : mode === 'login' ? 'دخول' : 'إنشاء الحساب'}
            </button>

          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 20 }}>
          Hisabi Pro · نظام آمن ومحمي
        </p>
      </div>

      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        input:focus{border-color:${TEAL} !important;box-shadow:0 0 0 3px ${TEAL}20 !important}
      `}</style>
    </div>
  )
}
