'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { ToastContainer, showToast } from '../components/Toast'
import { VocabCard } from '../components/VocabCard'

type Category = { id: string; user_id: string; name: string; icon: string; type_scope: 'expense'|'income'|'both' }
type Tx = { id: string; user_id: string; date: string; amount: number; type: 'expense'|'income'; category_id: string|null; note?: string|null }
type Budget = { id: string; user_id: string; category_id: string; amount: number; period: string; start_date: string; rollover: boolean }
type UserSettings = { id: string; user_id: string; monthly_cutoff_day: number }

const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n||0)
const startOfDay = (d: Date) => { const x=new Date(d); x.setHours(0,0,0,0); return x }
const endOfDay = (d: Date) => { const x=new Date(d); x.setHours(23,59,59,999); return x }
const startOfMonth = (d: Date) => { const x=new Date(d); x.setDate(1); x.setHours(0,0,0,0); return x }
const endOfMonth = (d: Date) => { const x=new Date(d); x.setMonth(x.getMonth()+1,0); x.setHours(23,59,59,999); return x }
const getCustomMonthRange = (date: Date, cutoffDay: number) => {
  const d = new Date(date)
  let start: Date
  
  if (d.getDate() >= cutoffDay) {
    // Current period: cutoffDay of current month to (cutoffDay-1) of next month
    start = new Date(d.getFullYear(), d.getMonth(), cutoffDay, 0, 0, 0, 0)
  } else {
    // Previous period: cutoffDay of previous month to (cutoffDay-1) of current month  
    start = new Date(d.getFullYear(), d.getMonth() - 1, cutoffDay, 0, 0, 0, 0)
  }
  
  const end = new Date(start.getFullYear(), start.getMonth() + 1, cutoffDay - 1, 23, 59, 59, 999)
  return { from: start, to: end }
}
const startOfWeek = (d: Date) => { const x=new Date(d); const day=(x.getDay()+6)%7; x.setDate(x.getDate()-day); x.setHours(0,0,0,0); return x }
const endOfWeek = (d: Date) => { const x=startOfWeek(d); x.setDate(x.getDate()+6); x.setHours(23,59,59,999); return x }

export default function Page() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    return () => { sub.subscription?.unsubscribe() }
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
          <img src="/icon-256.png" alt="Logo MoneYudi" className="w-10 h-10" />
        </div>
        <p className="text-gray-600 font-medium">Memuat aplikasi...</p>
      </div>
    </div>
  )
  if (!session) return <AuthScreen />
  return <App userId={session.user.id} />
}

function AuthScreen() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  
  const signInGoogle = async () => {
    setGoogleLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' })
      if (error) showToast(error.message, 'error')
    } finally {
      setGoogleLoading(false)
    }
  }
  
  const signInEmail = async () => {
    if (!email.trim()) {
      showToast('Email tidak boleh kosong', 'error')
      return
    }
    
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({ email })
      if (error) {
        showToast(error.message, 'error')
      } else {
        showToast('Magic link berhasil dikirim! Cek email Anda.', 'success')
        setEmail('')
      }
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <img src="/icon-256.png" alt="Logo" className="w-12 h-12" />
          </div>
            <h1 className="text-3xl font-bold mb-2">
            <span className="text-gray-900">Mone</span>
            <span className="text-green-600">Yudi</span>
            </h1>
          <p className="text-gray-600">Kelola keuangan dengan mudah</p>
        </div>

        {/* Auth Card */}
        <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-3xl p-8 shadow-xl">
          <div className="space-y-6">
            {/* Google Sign In */}
            <button 
              onClick={signInGoogle}
              disabled={googleLoading || loading}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 rounded-2xl py-3 px-4 font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {googleLoading ? (
                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              {googleLoading ? 'Menghubungkan...' : 'Lanjut dengan Google'}
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">atau</span>
              </div>
            </div>

            {/* Email Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input 
                  type="email"
                  value={email} 
                  onChange={e=>setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && signInEmail()}
                  placeholder="nama@email.com" 
                  className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors duration-200"
                  disabled={loading || googleLoading}
                />
              </div>
              
              <button 
                onClick={signInEmail}
                disabled={loading || googleLoading || !email.trim()}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl py-3 px-4 font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  <>
                    <span>✉️</span>
                    Kirim Magic Link
                  </>
                )}
              </button>
            </div>

            {/* Info Text */}
            <div className="text-center">
              <p className="text-sm text-gray-500">
                Kami akan mengirim link login ke email Anda
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Dengan masuk, Anda menyetujui syarat dan ketentuan kami
          </p>
        </div>
      </div>
      <ToastContainer />
    </div>
  )
}

function App({ userId }: { userId: string }) {
  const [tab, setTab] = useState<'home'|'reports'|'budgets'|'settings'>('home')
  const [categories, setCategories] = useState<Category[]>([])
  const [txs, setTxs] = useState<Tx[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [userSettings, setUserSettings] = useState<UserSettings|null>(null)
  const today = new Date()

  const fetchAll = async () => {
    const [{ data: cats }, { data: trs }, { data: bgs }, settingsResult] = await Promise.all([
      supabase.from('categories').select('*').eq('user_id', userId).order('name', { ascending: true }),
      supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(500),
      supabase.from('budgets').select('*').eq('user_id', userId),
      supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle()
    ])
    setCategories(cats || [])
    setTxs(trs || [])
    setBudgets(bgs || [])
    setUserSettings(settingsResult.data || { id: '', user_id: userId, monthly_cutoff_day: 1 })
  }
  useEffect(() => { fetchAll() }, [userId])

  const todaysTx = useMemo(() => txs.filter(t => {
    const d = new Date(t.date)
    return d.getFullYear()===today.getFullYear() && d.getMonth()===today.getMonth() && d.getDate()===today.getDate()
  }), [txs])
  const todayExpense = useMemo(()=> todaysTx.filter(t=>t.type==='expense').reduce((a,b)=>a+Number(b.amount),0), [todaysTx])
  const todayIncome  = useMemo(()=> todaysTx.filter(t=>t.type==='income').reduce((a,b)=>a+Number(b.amount),0), [todaysTx])

  const addTx = async (tx: Omit<Tx,'id'|'user_id'>) => {
    const { data, error } = await supabase.from('transactions').insert({ ...tx, user_id: userId }).select('*').single()
    if (error) return showToast(error.message, 'error')
    setTxs(prev => [data as Tx, ...prev])
    showToast('Transaksi berhasil ditambahkan', 'success')
  }
  const delTx = async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id).eq('user_id', userId)
    if (error) return showToast(error.message, 'error')
    setTxs(prev => prev.filter(t => t.id !== id))
    showToast('Transaksi berhasil dihapus', 'success')
  }

  const upsertBudget = async (category_id: string, amount: number) => {
    const existing = budgets.find(b => b.category_id===category_id)
    if (existing) {
      const { data, error } = await supabase.from('budgets').update({ amount }).eq('id', existing.id).eq('user_id', userId).select('*').single()
      if (error) return showToast(error.message, 'error')
      setBudgets(prev => prev.map(b => b.id===existing.id ? data as Budget : b))
      showToast('Anggaran berhasil diperbarui', 'success')
    } else {
      const { data, error } = await supabase.from('budgets').insert({ user_id: userId, category_id, amount, period:'monthly' }).select('*').single()
      if (error) return showToast(error.message, 'error')
      setBudgets(prev => [...prev, data as Budget])
      showToast('Anggaran berhasil ditambahkan', 'success')
    }
  }

  return (
    <div className="min-h-screen">
      <Header tab={tab} setTab={setTab} />
      <main className="mx-auto max-w-3xl px-4 pb-28">
        {tab==='home' && (
          <Home
            categories={categories}
            todaysTx={todaysTx}
            todayExpense={todayExpense}
            todayIncome={todayIncome}
            onAdd={addTx}
            onDelete={delTx}
          />)}
        {tab==='reports' && (<Reports categories={categories} transactions={txs} userSettings={userSettings} onDelete={delTx} />)}
        {tab==='budgets' && (<Budgets categories={categories} budgets={budgets} transactions={txs} userSettings={userSettings} onUpdate={upsertBudget} />)}
        {tab==='settings' && (<Settings userId={userId} categories={categories} setCategories={setCategories} userSettings={userSettings} setUserSettings={setUserSettings} />)}
      </main>
      <TabBar tab={tab} setTab={setTab} />
      <ToastContainer />
    </div>
  )
}

function Header({ tab, setTab }:{ tab:any, setTab:any }){
  return (
    <header className="sticky top-0 z-10 backdrop-blur bg-white/75 border-b border-gray-100">
      <div className="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="moneyudi-logo-navbar.png" alt="MoneYudi" className="h-10 w-auto" />
        </div>

        <nav className="hidden sm:flex items-center gap-3 text-sm">
          {[
            { id: 'home', label: 'Hari Ini' },
            { id: 'reports', label: 'Laporan' },
            { id: 'budgets', label: 'Anggaran' },
            { id: 'settings', label: 'Pengaturan' },  
          ].map(x => (
            <button key={x.id} onClick={()=>setTab(x.id)} className={`px-3 py-1.5 rounded-full transition ${tab===x.id? 'bg-gray-900 text-white':'hover:bg-gray-100'}`}>
              {x.label}
            </button>
          ))}
        </nav>
        <button onClick={()=>supabase.auth.signOut()} className="text-sm text-gray-500 hover:text-gray-900">Keluar</button>
      </div>
    </header>
  )
}

function TabBar({ tab, setTab }:{ tab:any, setTab:any }){
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white border border-gray-200 shadow-lg rounded-2xl px-3 py-2 flex gap-1 sm:hidden">
      {[
        { id: 'home', label: 'Hari' },
        { id: 'reports', label: 'Laporan' },
        { id: 'budgets', label: 'Anggaran' },
        { id: 'settings', label: 'Set' },

      ].map(x => (
        <button key={x.id} onClick={()=>setTab(x.id)} className={`px-3 py-1.5 rounded-xl text-sm ${tab===x.id? 'bg-gray-900 text-white':'hover:bg-gray-100'}`}>{x.label}</button>
      ))}
    </div>
  )
}

function Home({ categories, todaysTx, todayExpense, todayIncome, onAdd, onDelete }:{ categories:Category[]; todaysTx:Tx[]; todayExpense:number; todayIncome:number; onAdd:(t:any)=>void; onDelete:(id:string)=>void; }){
  return (
    <section className="py-6 space-y-6">
      <QuickAdd categories={categories} onAdd={onAdd} />
      <div className="grid sm:grid-cols-2 gap-4">
        <StatCard title="Pengeluaran Hari Ini" value={fmt(todayExpense)} subtitle={`${todaysTx.filter(t=>t.type==='expense').length} transaksi`} />
        <StatCard title="Pemasukan Hari Ini" value={fmt(todayIncome)} subtitle={`${todaysTx.filter(t=>t.type==='income').length} transaksi`} />
      </div>
      <VocabCard />
      <Card>
        <div className="flex items-center justify-between mb-2"><h3 className="font-medium">Transaksi Terakhir (Hari Ini)</h3></div>
        <div className="divide-y divide-gray-100">
          {todaysTx.length===0 && <div className="py-8 text-center text-gray-500">Belum ada transaksi hari ini. Tambah dengan form di atas.</div>}
          {todaysTx.slice(0,10).map(t => (<TxRow key={t.id} t={t} categories={categories} onDelete={onDelete} />))}
        </div>
      </Card>
    </section>
  )
}

function QuickAdd({ categories, onAdd }:{ categories:Category[]; onAdd:(t:any)=>void; }){
  const [amount, setAmount] = useState<number>()
  const [type, setType] = useState<'expense'|'income'>('expense')
  const [categoryId, setCategoryId] = useState<string|undefined>(categories.find(c=>c.type_scope!=='income')?.id)
  const [note, setNote] = useState('')
  const [date, setDate] = useState(() => {
    // Get current local date and time in yyyy-MM-ddTHH:mm format (local time, not UTC)
    const now = new Date()
    const pad = (n: number) => n.toString().padStart(2, '0')
    const yyyy = now.getFullYear()
    const mm = pad(now.getMonth() + 1)
    const dd = pad(now.getDate())
    const hh = pad(now.getHours())
    const min = pad(now.getMinutes())
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`
  })

  useEffect(()=>{
    const valid = categories.filter(c => type==='income' ? c.type_scope==='income' : c.type_scope!=='income')
    if (valid.length>0 && !valid.some(c => c.id===categoryId)) setCategoryId(valid[0].id)
  }, [type, categories])

  const add = async () => {
    if (!amount || amount<=0) return showToast('Nominal harus > 0', 'error')
    await onAdd({ amount, type, category_id: categoryId || null, note, date: new Date(date).toISOString() })
    setAmount(0); 
    setNote(''); 
    setDate(() => {
    // Get current local date and time in yyyy-MM-ddTHH:mm format (local time, not UTC)
    const now = new Date()
    const pad = (n: number) => n.toString().padStart(2, '0')
    const yyyy = now.getFullYear()
    const mm = pad(now.getMonth() + 1)
    const dd = pad(now.getDate())
    const hh = pad(now.getHours())
    const min = pad(now.getMinutes())
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`
  })
  }

  const cats = categories.filter(c => type==='income' ? c.type_scope==='income' : c.type_scope!=='income')

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">Tambah Transaksi Cepat</h3>
        <div className="inline-flex rounded-lg bg-gray-100 p-1">
          <button className={`px-3 py-1.5 rounded-md text-sm ${type==='expense'?'bg-white shadow':''}`} onClick={()=>setType('expense')}>Pengeluaran</button>
          <button className={`px-3 py-1.5 rounded-md text-sm ${type==='income'?'bg-white shadow':''}`} onClick={()=>setType('income')}>Pemasukan</button>
        </div>
      </div>
      <div className="grid sm:grid-cols-4 gap-3">
        <div className="sm:col-span-2">
          <label className="text-sm text-gray-500">Nominal</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9.]*"
            value={amount === 0 ? '' : amount?.toLocaleString('id-ID') || ''}
            onChange={e => {
              const raw = e.target.value.replace(/[^\d]/g, '');
              setAmount(raw === '' ? 0 : Number(raw));
            }}
            placeholder="0"
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm text-gray-500">Tanggal</label>
          <input type="datetime-local" value={date} onChange={e=>setDate(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2" />
        </div>
        <div>
          <label className="text-sm text-gray-500">Kategori</label>
          <select value={categoryId} onChange={e=>setCategoryId(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 bg-white">
            {cats.map(c => (<option key={c.id} value={c.id}>{c.icon} {c.name}</option>))}
          </select>
        </div>
        <div className="sm:col-span-4">
          <label className="text-sm text-gray-500">Catatan (opsional)</label>
          <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Contoh: kopi pagi di cafe" className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2" />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-end gap-2">
        <button onClick={()=>{ setAmount(0); setNote('') }} className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">Reset</button>
        <button onClick={add} className="px-4 py-2 rounded-xl bg-gray-900 text-white hover:opacity-90">Simpan</button>
      </div>
    </Card>
  )
}

function StatCard({ title, value, subtitle }:{ title:string; value:string; subtitle?:string }){
  return (
    <div className="rounded-2xl border border-gray-100 p-4 shadow-sm">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {subtitle && <div className="text-sm text-gray-500 mt-1">{subtitle}</div>}
    </div>
  )
}

function TxRow({ t, categories, onDelete }:{ t:Tx; categories:Category[]; onDelete:(id:string)=>void }){
  const cat = categories.find(c => c.id===t.category_id)
  const isExpense = t.type==='expense'
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-xl">{cat?.icon || '•'}</div>
        <div>
          <div className="font-medium">{cat?.name || 'Tanpa Kategori'}</div>
          <div className="text-xs text-gray-500">{new Date(t.date).toLocaleString('id-ID')} {t.note?`· ${t.note}`:''}</div>
        </div>
      </div>
      <div className={`font-semibold ${isExpense? 'text-red-600':'text-green-600'}`}>{isExpense? '-' : '+'}{fmt(Number(t.amount))}</div>
      <button onClick={()=>onDelete(t.id)} className="ml-3 text-gray-400 hover:text-red-600" title="Hapus">🗑️</button>
    </div>
  )
}

function Reports({ categories, transactions, userSettings, onDelete }:{ categories:Category[]; transactions:Tx[]; userSettings:UserSettings|null; onDelete:(id:string)=>void }){
  const [mode, setMode] = useState<'daily'|'weekly'|'monthly'|'custom'>('custom')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0,10))
  const [showHistory, setShowHistory] = useState(false)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<'all'|string>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const range = useMemo(()=>{
    const d = new Date(date)
    if (mode==='daily') return { from: startOfDay(d), to: endOfDay(d), label: d.toLocaleDateString('id-ID') }
    if (mode==='weekly') return { from: startOfWeek(d), to: endOfWeek(d), label: `Minggu ${startOfWeek(d).toLocaleDateString('id-ID')} — ${endOfWeek(d).toLocaleDateString('id-ID')}` }
    if (mode==='monthly') return { from: startOfMonth(d), to: endOfMonth(d), label: d.toLocaleString('id-ID', { month: 'long', year: 'numeric' }) }
    if (mode==='custom' && userSettings) {
      const customRange = getCustomMonthRange(d, userSettings.monthly_cutoff_day)
      const fromStr = customRange.from.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
      const toStr = customRange.to.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
      return { from: customRange.from, to: customRange.to, label: `${fromStr} — ${toStr}` }
    }
    return { from: startOfMonth(d), to: endOfMonth(d), label: d.toLocaleString('id-ID', { month: 'long', year: 'numeric' }) }
  }, [mode, date, userSettings])

  const txs = transactions.filter(t => { const dt=new Date(t.date); return dt>=range.from && dt<=range.to })
  const expense = txs.filter(t=>t.type==='expense')
  const income  = txs.filter(t=>t.type==='income')
  const totalExpense = expense.reduce((a,b)=>a+Number(b.amount),0)
  const totalIncome  = income.reduce((a,b)=>a+Number(b.amount),0)
  const net = totalIncome - totalExpense

  const catMap: Record<string, number> = {}
  for (const t of expense) { catMap[t.category_id||''] = (catMap[t.category_id||'']||0) + Number(t.amount) }
  const catRows = Object.entries(catMap).map(([cid, amt]) => ({
    id: cid,
    name: categories.find(c=>c.id===cid)?.name || 'Lainnya',
    icon: categories.find(c=>c.id===cid)?.icon || '•',
    amount: amt,
  })).sort((a,b)=>b.amount-a.amount)

  const biggest = expense.reduce((max, t) => Number(t.amount) > Number((max as any).amount||0) ? t : max, {} as any)

  const historyTxs = useMemo(()=>{
    return transactions.filter(t => {
      if (cat!=='all' && t.category_id!==cat) return false
      if (from) { if (new Date(t.date) < startOfDay(new Date(from))) return false }
      if (to)   { if (new Date(t.date) > endOfDay(new Date(to))) return false }
      if (q) {
        const c = categories.find(c=>c.id===t.category_id)?.name || ''
        const hay = `${t.note||''} ${c}`.toLowerCase()
        if (!hay.includes(q.toLowerCase())) return false
      }
      return true
    })
  }, [transactions, q, cat, from, to, categories])

  return (
    <section className="py-6 space-y-6">
      <Card>
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div>
            <h3 className="font-medium">Ringkasan • {range.label}</h3>
            <div className="text-sm text-gray-500">{txs.length} transaksi</div>
          </div>
          <div className="flex items-center gap-2">
            <select value={mode} onChange={e=>setMode(e.target.value as any)} className="rounded-xl border border-gray-200 px-3 py-2">
              <option value="daily">Harian</option>
              <option value="weekly">Mingguan</option>
              <option value="monthly">Bulanan</option>
              <option value="custom">Custom (Cut-off)</option>
            </select>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="rounded-xl border border-gray-200 px-3 py-2" />
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-3 mt-4">
          <StatCard title="Total Pengeluaran" value={fmt(totalExpense)} />
          <StatCard title="Total Pemasukan" value={fmt(totalIncome)} />
          <StatCard title="Selisih (Net)" value={fmt(net)} />
        </div>
      </Card>

      <Card>
        <h3 className="font-medium mb-3">Kategori Teratas</h3>
        {catRows.length===0 && <div className="text-sm text-gray-500">Belum ada pengeluaran pada rentang ini.</div>}
        <div className="space-y-3">
          {catRows.map(row => (
            <div key={row.id} className="flex items<center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-lg">{row.icon}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="font-medium">{row.name}</div>
                  <div className="font-semibold">{fmt(row.amount)}</div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-gray-900" style={{ width: `${(row.amount / Math.max(1, catRows[0]?.amount || 1))*100}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {(biggest as any)?.id && (
        <Card>
          <h3 className="font-medium mb-3">Transaksi Terbesar</h3>
          <TxRow t={biggest as Tx} categories={categories} onDelete={()=>{}} />
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">Riwayat Transaksi</h3>
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showHistory ? 'Sembunyikan' : 'Tampilkan'} Filter
          </button>
        </div>
        
        {showHistory && (
          <div className="grid sm:grid-cols-4 gap-3 mb-4 p-3 bg-gray-50 rounded-xl">
            <input placeholder="Cari catatan/kategori" value={q} onChange={e=>setQ(e.target.value)} className="rounded-xl border border-gray-200 px-3 py-2" />
            <select value={cat} onChange={e=>setCat(e.target.value)} className="rounded-xl border border-gray-200 px-3 py-2">
              <option value="all">Semua Kategori</option>
              {categories.map(c => (<option key={c.id} value={c.id}>{c.icon} {c.name}</option>))}
            </select>
            <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="rounded-xl border border-gray-200 px-3 py-2" placeholder="Dari" />
            <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="rounded-xl border border-gray-200 px-3 py-2" placeholder="Sampai" />
          </div>
        )}
        
        <div className="text-sm text-gray-500 mb-2">
          {showHistory ? `${historyTxs.length} transaksi ditemukan` : `Menampilkan ${Math.min(20, transactions.length)} transaksi terbaru`}
        </div>
        
        <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
          {(showHistory ? historyTxs : transactions.slice(0, 20)).length === 0 && (
            <div className="py-8 text-center text-gray-500">
              {showHistory ? 'Tidak ada transaksi sesuai filter' : 'Belum ada transaksi'}
            </div>
          )}
          {(showHistory ? historyTxs : transactions.slice(0, 20)).map(t => (
            <TxRow key={t.id} t={t} categories={categories} onDelete={onDelete} />
          ))}
        </div>
      </Card>
    </section>
  )
}

function Budgets({ categories, budgets, transactions, userSettings, onUpdate }:{ categories:Category[]; budgets:Budget[]; transactions:Tx[]; userSettings:UserSettings|null; onUpdate:(cid:string, amt:number)=>void }){
  const { monthFrom, monthTo } = useMemo(() => {
    if (userSettings) {
      const customRange = getCustomMonthRange(new Date(), userSettings.monthly_cutoff_day)
      return { monthFrom: customRange.from, monthTo: customRange.to }
    }
    return { monthFrom: startOfMonth(new Date()), monthTo: endOfMonth(new Date()) }
  }, [userSettings])
  
  const spentByCat = useMemo(()=>{
    const map: Record<string, number> = {}
    for (const t of transactions) {
      const d = new Date(t.date)
      if (t.type==='expense' && d>=monthFrom && d<=monthTo) {
        const key = t.category_id||''
        map[key] = (map[key]||0) + Number(t.amount)
      }
    }
    return map
  }, [transactions, monthFrom, monthTo])
  const expenseCats = categories.filter(c=>c.type_scope!=='income')
  return (
    <section className="py-6 space-y-6">
      <div className="text-sm text-gray-500">
        Periode: {monthFrom.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} — {monthTo.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
      </div>
      <div className="space-y-4">
        {expenseCats.map(c => {
          const b = budgets.find(x=>x.category_id===c.id)
          const limit = Number(b?.amount||0)
          const spent = Number(spentByCat[c.id]||0)
          const pct = limit>0 ? Math.min(100, Math.round(spent/limit*100)) : 0
          const warn = limit>0 && spent >= 0.8*limit
          return (
            <Card key={c.id}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-xl">{c.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm text-gray-500">{limit>0? `${fmt(spent)} / ${fmt(limit)}` : fmt(spent)}</div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
                    <div className={`h-full ${warn? 'bg-red-500':'bg-gray-900'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <label className="text-sm text-gray-500">Limit bulanan</label>
                <input type="number" className="w-32 rounded-xl border border-gray-200 px-3 py-1.5" defaultValue={limit} onBlur={(e)=>onUpdate(c.id, Number(e.target.value||0))} placeholder="0" />
                <span className="text-sm text-gray-400">(ketik lalu pindah fokus untuk menyimpan)</span>
              </div>
              {warn && <div className="mt-2 text-xs text-red-600">⚠️ Pengeluaran mendekati/melebihi batas.</div>}
            </Card>
          )
        })}
      </div>
    </section>
  )
}



function Settings({ userId, categories, setCategories, userSettings, setUserSettings }:{ userId:string; categories:Category[]; setCategories:(c:Category[])=>void; userSettings:UserSettings|null; setUserSettings:(s:UserSettings)=>void }){
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('🧾')
  const [scope, setScope] = useState<'expense'|'income'|'both'>('expense')
  const [cutoffDay, setCutoffDay] = useState(userSettings?.monthly_cutoff_day || 1)

  const addCategory = async () => {
    if (!name.trim()) return showToast('Nama kategori wajib', 'error')
    const { data, error } = await supabase.from('categories').insert({ user_id: userId, name, icon, type_scope: scope }).select('*').single()
    if (error) return showToast(error.message, 'error')
    setCategories([...(categories||[]), data as Category])
    setName('')
    showToast('Kategori berhasil ditambahkan', 'success')
  }

  const updateCategory = async (id: string, patch: Partial<Category>) => {
    const { data, error } = await supabase.from('categories').update(patch).eq('id', id).eq('user_id', userId).select('*').single()
    if (error) return showToast(error.message, 'error')
    setCategories(categories.map(c => c.id===id ? data as Category : c))
    showToast('Kategori berhasil diperbarui', 'success')
  }

  const deleteCategory = async (id: string) => {
    if (!confirm('Hapus kategori ini? Transaksi yang terhubung akan kehilangan referensi.')) return
    const { error } = await supabase.from('categories').delete().eq('id', id).eq('user_id', userId)
    if (error) return showToast(error.message, 'error')
    setCategories(categories.filter(c => c.id!==id))
    showToast('Kategori berhasil dihapus', 'success')
  }

  const updateCutoffDay = async (day: number) => {
    if (!userSettings?.id) {
      const { data, error } = await supabase.from('user_settings').insert({ user_id: userId, monthly_cutoff_day: day }).select('*')
      if (error) return showToast(error.message, 'error')
      setUserSettings(data[0] as UserSettings)
    } else {
      const { data, error } = await supabase.from('user_settings').update({ monthly_cutoff_day: day }).eq('user_id', userId).select('*')
      if (error) return showToast(error.message, 'error')
      setUserSettings(data[0] as UserSettings)
    }
    showToast('Pengaturan berhasil disimpan', 'success')
  }

  return (
    <section className="py-6 space-y-6">
      <Card>
        <h3 className="font-medium mb-3">Pengaturan Laporan</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tanggal Cut-off Bulanan
            </label>
            <div className="flex items-center gap-3">
              <input 
              type="number" 
              min="1" 
              max="31" 
              value={cutoffDay === 0 ? '' : cutoffDay}
              onChange={e => {
                const val = e.target.value;
                setCutoffDay(val === '' ? 0 : Number(val));
              }}
              className="w-20 rounded-xl border border-gray-200 px-3 py-2"
              />
              <button 
              onClick={() => {
                if (!cutoffDay || cutoffDay < 1 || cutoffDay > 31) {
                showToast('Tanggal cut-off wajib diisi (1-31)', 'error');
                return;
                }
                updateCutoffDay(cutoffDay);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
              >
              Simpan
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Periode bulanan custom dimulai dari tanggal ini. Contoh: jika diset 25, maka periode saat ini adalah 25 Jul - 24 Agu.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="font-medium mb-3">Kategori</h3>
        <div className="grid sm:grid-cols-5 gap-3">
          <div className="sm:col-span-2">
            <label className="text-sm text-gray-500">Nama</label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="contoh: Kopi" className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2" />
          </div>
          <div>
            <label className="text-sm text-gray-500">Ikon (emoji)</label>
            <input value={icon} onChange={e=>setIcon(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2" />
          </div>
          <div>
            <label className="text-sm text-gray-500">Tipe</label>
            <select value={scope} onChange={e=>setScope(e.target.value as any)} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2">
              <option value="expense">Pengeluaran</option>
              <option value="income">Pemasukan</option>
              <option value="both">Keduanya</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={addCategory} className="w-full rounded-xl bg-gray-900 text-white py-2">Tambah</button>
          </div>
        </div>

        <div className="mt-5 divide-y divide-gray-100">
          {categories.length===0 && <div className="text-sm text-gray-500">Belum ada kategori.</div>}
          {categories.map(c => (
            <div key={c.id} className="py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-xl">{c.icon}</div>
              <input className="flex-1 rounded-xl border border-gray-200 px-3 py-2" defaultValue={c.name} onBlur={e=>updateCategory(c.id, { name: e.target.value })} />
              <input className="w-24 rounded-xl border border-gray-200 px-3 py-2" defaultValue={c.icon} onBlur={e=>updateCategory(c.id, { icon: e.target.value })} />
              <select defaultValue={c.type_scope} onChange={e=>updateCategory(c.id, { type_scope: e.target.value as any })} className="rounded-xl border border-gray-200 px-3 py-2">
                <option value="expense">Pengeluaran</option>
                <option value="income">Pemasukan</option>
                <option value="both">Keduanya</option>
              </select>
              <button onClick={()=>deleteCategory(c.id)} className="text-red-600">Hapus</button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="font-medium mb-3">Akun</h3>
        <button onClick={()=>supabase.auth.signOut()} className="rounded-xl border border-gray-200 px-4 py-2">Keluar</button>
      </Card>
    </section>
  )
}

function Card({ children }:{ children: React.ReactNode }){
  return <div className="rounded-2xl border border-gray-100 shadow-sm p-4">{children}</div>
}
