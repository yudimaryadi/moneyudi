'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '../lib/api-client'
import { ToastContainer, showToast } from '../components/Toast'
import { VocabCard } from '../components/VocabCard'

type Category = { id: string; name: string; icon: string; typeScope: 'expense'|'income'|'both' }
type Tx = { id: string; date: string; amount: number; type: 'expense'|'income'; categoryId: string|null; note?: string|null; category?: Category }
type Budget = { id: string; amount: number; categoryId: string; period: string; category?: Category }
type UserSettings = { id: string; monthlyCutoffDay: number }

const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n||0)
const startOfDay = (d: Date) => { const x=new Date(d); x.setHours(0,0,0,0); return x }
const endOfDay = (d: Date) => { const x=new Date(d); x.setHours(23,59,59,999); return x }
const startOfMonth = (d: Date) => { const x=new Date(d); x.setDate(1); x.setHours(0,0,0,0); return x }
const endOfMonth = (d: Date) => { const x=new Date(d); x.setMonth(x.getMonth()+1,0); x.setHours(23,59,59,999); return x }
const getCustomMonthRange = (date: Date, cutoffDay: number) => {
  const d = new Date(date)
  let start: Date
  
  if (d.getDate() >= cutoffDay) {
    start = new Date(d.getFullYear(), d.getMonth(), cutoffDay, 0, 0, 0, 0)
  } else {
    start = new Date(d.getFullYear(), d.getMonth() - 1, cutoffDay, 0, 0, 0, 0)
  }
  
  const end = new Date(start.getFullYear(), start.getMonth() + 1, cutoffDay - 1, 23, 59, 59, 999)
  return { from: start, to: end }
}
const startOfWeek = (d: Date) => { const x=new Date(d); const day=(x.getDay()+6)%7; x.setDate(x.getDate()-day); x.setHours(0,0,0,0); return x }
const endOfWeek = (d: Date) => { const x=startOfWeek(d); x.setDate(x.getDate()+6); x.setHours(23,59,59,999); return x }

export default function Page() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      apiClient.getCategories()
        .then(() => setUser({ id: 'current-user' }))
        .catch(() => {
          localStorage.removeItem('token')
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
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
  if (!user) return <AuthScreen setUser={setUser} />
  return <App />
}

function AuthScreen({ setUser }: { setUser: (u: any) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  
  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      showToast('Email dan password wajib diisi', 'error')
      return
    }
    
    setLoading(true)
    try {
      if (isLogin) {
        await apiClient.login(email, password)
        showToast('Login berhasil!', 'success')
      } else {
        if (!name.trim()) {
          showToast('Nama wajib diisi untuk registrasi', 'error')
          return
        }
        await apiClient.register(email, password, name)
        showToast('Registrasi berhasil!', 'success')
      }
      setUser({ id: 'current-user' })
    } catch (error: any) {
      showToast(error.message || 'Terjadi kesalahan', 'error')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
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

        <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-3xl p-8 shadow-xl">
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex rounded-lg bg-gray-100 p-1">
                <button 
                  className={`px-3 py-1.5 rounded-md text-sm ${isLogin ? 'bg-white shadow' : ''}`} 
                  onClick={() => setIsLogin(true)}
                >
                  Login
                </button>
                <button 
                  className={`px-3 py-1.5 rounded-md text-sm ${!isLogin ? 'bg-white shadow' : ''}`} 
                  onClick={() => setIsLogin(false)}
                >
                  Register
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nama</label>
                  <input 
                    type="text"
                    value={name} 
                    onChange={e => setName(e.target.value)}
                    placeholder="Nama lengkap" 
                    className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors duration-200"
                    disabled={loading}
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input 
                  type="email"
                  value={email} 
                  onChange={e => setEmail(e.target.value)}
                  placeholder="nama@email.com" 
                  className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors duration-200"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input 
                  type="password"
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password (min 6 karakter)" 
                  className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors duration-200"
                  disabled={loading}
                  onKeyDown={e => e.key === 'Enter' && handleAuth()}
                />
              </div>
              
              <button 
                onClick={handleAuth}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl py-3 px-4 font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {isLogin ? 'Masuk...' : 'Daftar...'}
                  </>
                ) : (
                  isLogin ? 'Masuk' : 'Daftar'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer />
    </div>
  )
}

function App() {
  const [tab, setTab] = useState<'home'|'reports'|'budgets'|'settings'>('home')
  const [categories, setCategories] = useState<Category[]>([])
  const [txs, setTxs] = useState<Tx[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [userSettings, setUserSettings] = useState<UserSettings>({ id: '', monthlyCutoffDay: 1 })
  const today = new Date()

  const fetchAll = async () => {
    try {
      const [cats, transactions, bgs, settings] = await Promise.all([
        apiClient.getCategories(),
        apiClient.getTransactions(),
        apiClient.getBudgets(),
        apiClient.getUserSettings()
      ])
      setCategories(cats || [])
      setTxs(transactions || [])
      setBudgets(bgs || [])
      setUserSettings(settings || { id: '', monthlyCutoffDay: 1 })
    } catch (error: any) {
      showToast(error.message || 'Gagal memuat data', 'error')
    }
  }
  
  useEffect(() => { fetchAll() }, [])

  const todaysTx = useMemo(() => txs.filter(t => {
    const d = new Date(t.date)
    return d.getFullYear()===today.getFullYear() && d.getMonth()===today.getMonth() && d.getDate()===today.getDate()
  }), [txs])
  
  const todayExpense = useMemo(() => todaysTx.filter(t=>t.type==='expense').reduce((a,b) => a + Number(b.amount), 0), [todaysTx])
  const todayIncome = useMemo(() => todaysTx.filter(t=>t.type==='income').reduce((a,b) => a + Number(b.amount), 0), [todaysTx])

  const addTx = async (tx: { amount: number; type: 'expense'|'income'; categoryId?: string; note?: string; date?: string }) => {
    try {
      const data = await apiClient.createTransaction(tx)
      setTxs(prev => [data, ...prev])
      showToast('Transaksi berhasil ditambahkan', 'success')
    } catch (error: any) {
      showToast(error.message || 'Gagal menambah transaksi', 'error')
    }
  }

  const delTx = async (id: string) => {
    try {
      await apiClient.deleteTransaction(id)
      setTxs(prev => prev.filter(t => t.id !== id))
      showToast('Transaksi berhasil dihapus', 'success')
    } catch (error: any) {
      showToast(error.message || 'Gagal menghapus transaksi', 'error')
    }
  }

  const upsertBudget = async (categoryId: string, amount: number) => {
    try {
      const existing = budgets.find(b => b.categoryId === categoryId)
      if (existing) {
        await apiClient.updateBudget(existing.id, { amount })
        setBudgets(prev => prev.map(b => b.id === existing.id ? { ...b, amount } : b))
        showToast('Anggaran berhasil diperbarui', 'success')
      } else {
        const data = await apiClient.createBudget({ amount, categoryId, period: 'monthly' })
        setBudgets(prev => [...prev, data])
        showToast('Anggaran berhasil ditambahkan', 'success')
      }
    } catch (error: any) {
      showToast(error.message || 'Gagal mengatur anggaran', 'error')
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
          />
        )}
        {tab==='reports' && (<Reports categories={categories} transactions={txs} userSettings={userSettings} onDelete={delTx} />)}
        {tab==='budgets' && (<Budgets categories={categories} budgets={budgets} transactions={txs} userSettings={userSettings} onUpdate={upsertBudget} />)}
        {tab==='settings' && (<Settings categories={categories} setCategories={setCategories} userSettings={userSettings} setUserSettings={setUserSettings} />)}
      </main>
      <TabBar tab={tab} setTab={setTab} />
      <ToastContainer />
    </div>
  )
}

function Header({ tab, setTab }:{ tab:any, setTab:any }){
  const logout = () => {
    apiClient.logout()
    window.location.reload()
  }

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
        <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-900">Keluar</button>
      </div>
    </header>
  )
}

function TabBar({ tab, setTab }:{ tab:any, setTab:any }){
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white border border-gray-200 shadow-lg rounded-2xl px-2 py-2 flex gap-1 sm:hidden">
      {[
        { id: 'home', label: 'Hari', icon: '🏠' },
        { id: 'reports', label: 'Laporan', icon: '📊' },
        { id: 'budgets', label: 'Anggaran', icon: '💰' },
        { id: 'settings', label: 'Set', icon: '⚙️' },
      ].map(x => (
        <button 
          key={x.id} 
          onClick={()=>setTab(x.id)} 
          className={`px-3 py-3 rounded-xl text-xs min-h-[48px] min-w-[60px] flex flex-col items-center gap-1 transition-all ${
            tab===x.id? 'bg-gray-900 text-white shadow-md':'hover:bg-gray-100 active:bg-gray-200'
          }`}
        >
          <span className="text-lg">{x.icon}</span>
          <span>{x.label}</span>
        </button>
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
  const [amount, setAmount] = useState<number>(0)
  const [type, setType] = useState<'expense'|'income'>('expense')
  const [categoryId, setCategoryId] = useState<string>('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(() => {
    const now = new Date()
    const pad = (n: number) => n.toString().padStart(2, '0')
    const yyyy = now.getFullYear()
    const mm = pad(now.getMonth() + 1)
    const dd = pad(now.getDate())
    const hh = pad(now.getHours())
    const min = pad(now.getMinutes())
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`
  })

  useEffect(() => {
    const valid = categories.filter(c => type==='income' ? c.typeScope==='income' || c.typeScope==='both' : c.typeScope==='expense' || c.typeScope==='both')
    if (valid.length > 0 && !valid.some(c => c.id === categoryId)) {
      setCategoryId(valid[0].id)
    }
  }, [type, categories])

  const add = async () => {
    if (!amount || amount <= 0) return showToast('Nominal harus > 0', 'error')
    
    await onAdd({ 
      amount, 
      type, 
      categoryId: categoryId || undefined, 
      note: note || undefined, 
      date: new Date(date).toISOString() 
    })
    
    setAmount(0)
    setNote('')
    setDate(() => {
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

  const cats = categories.filter(c => type==='income' ? c.typeScope==='income' || c.typeScope==='both' : c.typeScope==='expense' || c.typeScope==='both')

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">Tambah Transaksi Cepat</h3>
        <div className="inline-flex rounded-lg bg-gray-100 p-1 w-full">
          <button 
            className={`flex-1 py-3 px-3 rounded-md text-sm font-medium min-h-[44px] transition-colors ${
              type==='expense'?'bg-white shadow':'hover:bg-gray-200 active:bg-gray-300'
            }`} 
            onClick={()=>setType('expense')}
          >
            <div className="flex items-center justify-center gap-2">
              <span>💸</span>
              <span>Pengeluaran</span>
            </div>
          </button>
          <button 
            className={`flex-1 py-3 px-3 rounded-md text-sm font-medium min-h-[44px] transition-colors ${
              type==='income'?'bg-white shadow':'hover:bg-gray-200 active:bg-gray-300'
            }`} 
            onClick={()=>setType('income')}
          >
            <div className="flex items-center justify-center gap-2">
              <span>💰</span>
              <span>Pemasukan</span>
            </div>
          </button>
        </div>
      </div>
        <div className="grid gap-3">
          <div>
            <label className="text-sm text-gray-500 block mb-1">Nominal</label>
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
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-500 block mb-1">Tanggal</label>
              <input 
                type="datetime-local" 
                value={date} 
                onChange={e=>setDate(e.target.value)} 
                className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              />
            </div>
            <div>
              <label className="text-sm text-gray-500 block mb-1">Kategori</label>
              <select 
                value={categoryId} 
                onChange={e=>setCategoryId(e.target.value)} 
                className="w-full rounded-xl border border-gray-200 px-3 py-3 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {cats.map(c => (<option key={c.id} value={c.id}>{c.icon} {c.name}</option>))}
              </select>
            </div>
          </div>
          
          <div>
            <label className="text-sm text-gray-500 block mb-1">Catatan (opsional)</label>
            <input 
              value={note} 
              onChange={e=>setNote(e.target.value)} 
              placeholder="Contoh: kopi pagi di cafe" 
              className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            />
          </div>
        </div>
      <div className="mt-4 flex items-center justify-end gap-2">
        <button 
          onClick={()=>{ setAmount(0); setNote('') }} 
          className="px-6 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 active:bg-gray-100 min-h-[48px] transition-colors"
        >
          Reset
        </button>
        <button 
          onClick={add} 
          className="px-6 py-3 rounded-xl bg-gray-900 text-white hover:opacity-90 active:opacity-80 min-h-[48px] font-medium transition-all shadow-lg"
        >
          Simpan
        </button>
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
  const cat = categories.find(c => c.id === t.categoryId) || t.category
  const isExpense = t.type === 'expense'
  return (
    <div className="flex items-center justify-between py-3 group">
      <div className="flex items-center gap-3 flex-1">
        <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-xl flex-shrink-0">{cat?.icon || '💰'}</div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{cat?.name || 'Tanpa Kategori'}</div>
          <div className="text-xs text-gray-500 truncate">{new Date(t.date).toLocaleString('id-ID')} {t.note ? `· ${t.note}` : ''}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className={`font-semibold text-right ${isExpense ? 'text-red-600' : 'text-green-600'}`}>
          {isExpense ? '-' : '+'}{fmt(Number(t.amount))}
        </div>
        <button 
          onClick={()=>onDelete(t.id)} 
          className="p-2 text-gray-400 hover:text-red-600 active:bg-red-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center opacity-0 group-hover:opacity-100 sm:opacity-100" 
          title="Hapus"
        >
          🗑️
        </button>
      </div>
    </div>
  )
}

function Reports({ categories, transactions, userSettings, onDelete }:{ categories:Category[]; transactions:Tx[]; userSettings:UserSettings; onDelete:(id:string)=>void }){
  const [mode, setMode] = useState<'daily'|'weekly'|'monthly'|'custom'>('custom')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0,10))

  const range = useMemo(()=>{
    const d = new Date(date)
    if (mode==='daily') return { from: startOfDay(d), to: endOfDay(d), label: d.toLocaleDateString('id-ID') }
    if (mode==='weekly') return { from: startOfWeek(d), to: endOfWeek(d), label: `Minggu ${startOfWeek(d).toLocaleDateString('id-ID')} — ${endOfWeek(d).toLocaleDateString('id-ID')}` }
    if (mode==='monthly') return { from: startOfMonth(d), to: endOfMonth(d), label: d.toLocaleString('id-ID', { month: 'long', year: 'numeric' }) }
    if (mode==='custom' && userSettings) {
      const customRange = getCustomMonthRange(d, userSettings.monthlyCutoffDay)
      const fromStr = customRange.from.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
      const toStr = customRange.to.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
      return { from: customRange.from, to: customRange.to, label: `${fromStr} — ${toStr}` }
    }
    return { from: startOfMonth(d), to: endOfMonth(d), label: d.toLocaleString('id-ID', { month: 'long', year: 'numeric' }) }
  }, [mode, date, userSettings])

  const txs = transactions.filter(t => { const dt=new Date(t.date); return dt>=range.from && dt<=range.to })
  const expense = txs.filter(t=>t.type==='expense')
  const income = txs.filter(t=>t.type==='income')
  const totalExpense = expense.reduce((a,b)=>a+Number(b.amount),0)
  const totalIncome = income.reduce((a,b)=>a+Number(b.amount),0)
  const net = totalIncome - totalExpense

  return (
    <section className="py-6 space-y-6">
      <Card>
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div>
            <h3 className="font-medium">Ringkasan • {range.label}</h3>
            <div className="text-sm text-gray-500">{txs.length} transaksi</div>
          </div>
          <div className="flex items-center gap-2">
            <select 
              value={mode} 
              onChange={e=>setMode(e.target.value as any)} 
              className="rounded-xl border border-gray-200 px-3 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="daily">Harian</option>
              <option value="weekly">Mingguan</option>
              <option value="monthly">Bulanan</option>
              <option value="custom">Custom (Cut-off)</option>
            </select>
            <input 
              type="date" 
              value={date} 
              onChange={e=>setDate(e.target.value)} 
              className="rounded-xl border border-gray-200 px-3 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            />
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-3 mt-4">
          <StatCard title="Total Pengeluaran" value={fmt(totalExpense)} />
          <StatCard title="Total Pemasukan" value={fmt(totalIncome)} />
          <StatCard title="Selisih (Net)" value={fmt(net)} />
        </div>
      </Card>

      <Card>
        <h3 className="font-medium mb-3">Transaksi Terbaru</h3>
        <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
          {transactions.slice(0, 20).length === 0 && (
            <div className="py-8 text-center text-gray-500">Belum ada transaksi</div>
          )}
          {transactions.slice(0, 20).map(t => (
            <TxRow key={t.id} t={t} categories={categories} onDelete={onDelete} />
          ))}
        </div>
      </Card>
    </section>
  )
}

function Budgets({ categories, budgets, transactions, userSettings, onUpdate }:{ categories:Category[]; budgets:Budget[]; transactions:Tx[]; userSettings:UserSettings; onUpdate:(cid:string, amt:number)=>void }){
  const { monthFrom, monthTo } = useMemo(() => {
    if (userSettings) {
      const customRange = getCustomMonthRange(new Date(), userSettings.monthlyCutoffDay)
      return { monthFrom: customRange.from, monthTo: customRange.to }
    }
    return { monthFrom: startOfMonth(new Date()), monthTo: endOfMonth(new Date()) }
  }, [userSettings])
  
  const spentByCat = useMemo(()=>{
    const map: Record<string, number> = {}
    for (const t of transactions) {
      const d = new Date(t.date)
      if (t.type==='expense' && d>=monthFrom && d<=monthTo) {
        const key = t.categoryId||''
        map[key] = (map[key]||0) + Number(t.amount)
      }
    }
    return map
  }, [transactions, monthFrom, monthTo])
  
  const expenseCats = categories.filter(c=>c.typeScope!=='income')
  
  return (
    <section className="py-6 space-y-6">
      <div className="text-sm text-gray-500">
        Periode: {monthFrom.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} — {monthTo.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
      </div>
      <div className="space-y-4">
        {expenseCats.map(c => {
          const b = budgets.find(x=>x.categoryId===c.id)
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

function Settings({ categories, setCategories, userSettings, setUserSettings }:{ categories:Category[]; setCategories:(c:Category[])=>void; userSettings:UserSettings; setUserSettings:(s:UserSettings)=>void }){
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('🧾')
  const [scope, setScope] = useState<'expense'|'income'|'both'>('expense')
  const [cutoffDay, setCutoffDay] = useState(userSettings?.monthlyCutoffDay || 1)

  const addCategory = async () => {
    if (!name.trim()) return showToast('Nama kategori wajib', 'error')
    try {
      const data = await apiClient.createCategory({ name, icon, typeScope: scope })
      setCategories([...categories, data])
      setName('')
      showToast('Kategori berhasil ditambahkan', 'success')
    } catch (error: any) {
      showToast(error.message || 'Gagal menambah kategori', 'error')
    }
  }

  const updateCategory = async (id: string, patch: Partial<Category>) => {
    try {
      await apiClient.updateCategory(id, patch)
      setCategories(categories.map(c => c.id === id ? { ...c, ...patch } : c))
      showToast('Kategori berhasil diperbarui', 'success')
    } catch (error: any) {
      showToast(error.message || 'Gagal update kategori', 'error')
    }
  }

  const deleteCategory = async (id: string) => {
    if (!confirm('Hapus kategori ini? Transaksi yang terhubung akan kehilangan referensi.')) return
    try {
      await apiClient.deleteCategory(id)
      setCategories(categories.filter(c => c.id !== id))
      showToast('Kategori berhasil dihapus', 'success')
    } catch (error: any) {
      showToast(error.message || 'Gagal menghapus kategori', 'error')
    }
  }

  const updateCutoffDay = async (day: number) => {
    try {
      const updatedSettings = await apiClient.updateUserSettings({ monthlyCutoffDay: day })
      setUserSettings(updatedSettings)
      showToast('Pengaturan berhasil disimpan', 'success')
    } catch (error: any) {
      showToast(error.message || 'Gagal menyimpan pengaturan', 'error')
    }
  }

  const logout = () => {
    apiClient.logout()
    window.location.reload()
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
                inputMode="numeric"
                value={cutoffDay === 0 ? '' : cutoffDay}
                onChange={e => {
                  const val = e.target.value;
                  setCutoffDay(val === '' ? 0 : Number(val));
                }}
                className="w-20 rounded-xl border border-gray-200 px-3 py-3 text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button 
                onClick={() => {
                  if (!cutoffDay || cutoffDay < 1 || cutoffDay > 31) {
                    showToast('Tanggal cut-off wajib diisi (1-31)', 'error');
                    return;
                  }
                  updateCutoffDay(cutoffDay);
                }}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:bg-blue-800 min-h-[48px] font-medium transition-colors shadow-lg"
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
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-500 block mb-1">Nama</label>
            <input 
              value={name} 
              onChange={e=>setName(e.target.value)} 
              placeholder="contoh: Kopi" 
              className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-500 block mb-1">Ikon (emoji)</label>
              <input 
                value={icon} 
                onChange={e=>setIcon(e.target.value)} 
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              />
            </div>
            <div>
              <label className="text-sm text-gray-500 block mb-1">Tipe</label>
              <select 
                value={scope} 
                onChange={e=>setScope(e.target.value as any)} 
                className="w-full rounded-xl border border-gray-200 px-3 py-3 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="expense">Pengeluaran</option>
                <option value="income">Pemasukan</option>
                <option value="both">Keduanya</option>
              </select>
            </div>
          </div>
          
          <button 
            onClick={addCategory} 
            className="w-full rounded-xl bg-gray-900 text-white py-3 hover:opacity-90 active:opacity-80 min-h-[48px] font-medium transition-all shadow-lg"
          >
            Tambah Kategori
          </button>
        </div>

        <div className="mt-5 divide-y divide-gray-100">
          {categories.length===0 && <div className="text-sm text-gray-500">Belum ada kategori.</div>}
          {categories.map(c => (
            <div key={c.id} className="py-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-xl flex-shrink-0">{c.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-sm text-gray-500 capitalize">{c.typeScope === 'both' ? 'Pengeluaran & Pemasukan' : c.typeScope === 'expense' ? 'Pengeluaran' : 'Pemasukan'}</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <input 
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  defaultValue={c.name} 
                  onBlur={e=>updateCategory(c.id, { name: e.target.value })} 
                  placeholder="Nama kategori"
                />
                
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                    defaultValue={c.icon} 
                    onBlur={e=>updateCategory(c.id, { icon: e.target.value })} 
                    placeholder="Ikon"
                  />
                  <select 
                    defaultValue={c.typeScope} 
                    onChange={e=>updateCategory(c.id, { typeScope: e.target.value as any })} 
                    className="w-full rounded-xl border border-gray-200 px-3 py-3 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="expense">Pengeluaran</option>
                    <option value="income">Pemasukan</option>
                    <option value="both">Keduanya</option>
                  </select>
                </div>
                
                <button 
                  onClick={()=>deleteCategory(c.id)} 
                  className="w-full py-3 text-red-600 border border-red-200 rounded-xl hover:bg-red-50 active:bg-red-100 min-h-[48px] font-medium transition-colors"
                >
                  Hapus Kategori
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="font-medium mb-3">Akun</h3>
        <button 
          onClick={logout} 
          className="w-full rounded-xl border border-gray-200 px-6 py-3 hover:bg-gray-50 active:bg-gray-100 min-h-[48px] font-medium transition-colors"
        >
          Keluar dari Akun
        </button>
      </Card>
    </section>
  )
}

function Card({ children }:{ children: React.ReactNode }){
  return <div className="rounded-2xl border border-gray-100 shadow-sm p-4">{children}</div>
}