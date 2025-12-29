'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '../lib/api-client'
import { ToastContainer, showToast } from '../components/Toast'
import { VocabCard } from '../components/VocabCard'

type Category = { id: string; name: string; color: string }
type Tx = { id: string; date: string; amount: number; description?: string; categoryId: string; category?: Category }
type Budget = { id: string; amount: number; month: number; year: number }

const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n||0)
const startOfDay = (d: Date) => { const x=new Date(d); x.setHours(0,0,0,0); return x }
const endOfDay = (d: Date) => { const x=new Date(d); x.setHours(23,59,59,999); return x }
const startOfMonth = (d: Date) => { const x=new Date(d); x.setDate(1); x.setHours(0,0,0,0); return x }
const endOfMonth = (d: Date) => { const x=new Date(d); x.setMonth(x.getMonth()+1,0); x.setHours(23,59,59,999); return x }
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
  const today = new Date()

  const fetchAll = async () => {
    try {
      const [cats, transactions, bgs] = await Promise.all([
        apiClient.getCategories(),
        apiClient.getTransactions(),
        apiClient.getBudgets()
      ])
      setCategories(cats || [])
      setTxs(transactions || [])
      setBudgets(bgs || [])
    } catch (error: any) {
      showToast(error.message || 'Gagal memuat data', 'error')
    }
  }
  
  useEffect(() => { fetchAll() }, [])

  const todaysTx = useMemo(() => txs.filter(t => {
    const d = new Date(t.date)
    return d.getFullYear()===today.getFullYear() && d.getMonth()===today.getMonth() && d.getDate()===today.getDate()
  }), [txs])
  
  const todayExpense = useMemo(() => todaysTx.reduce((a,b) => a + Number(b.amount), 0), [todaysTx])

  const addTx = async (tx: { amount: number; description?: string; categoryId: string; date?: string }) => {
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

  return (
    <div className="min-h-screen">
      <Header tab={tab} setTab={setTab} />
      <main className="mx-auto max-w-3xl px-4 pb-28">
        {tab==='home' && (
          <Home
            categories={categories}
            todaysTx={todaysTx}
            todayExpense={todayExpense}
            onAdd={addTx}
            onDelete={delTx}
          />
        )}
        {tab==='reports' && (<Reports categories={categories} transactions={txs} onDelete={delTx} />)}
        {tab==='budgets' && (<Budgets categories={categories} budgets={budgets} transactions={txs} />)}
        {tab==='settings' && (<Settings categories={categories} setCategories={setCategories} />)}
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

function Home({ categories, todaysTx, todayExpense, onAdd, onDelete }:{ categories:Category[]; todaysTx:Tx[]; todayExpense:number; onAdd:(t:any)=>void; onDelete:(id:string)=>void; }){
  return (
    <section className="py-6 space-y-6">
      <QuickAdd categories={categories} onAdd={onAdd} />
      <div className="grid sm:grid-cols-2 gap-4">
        <StatCard title="Pengeluaran Hari Ini" value={fmt(todayExpense)} subtitle={`${todaysTx.length} transaksi`} />
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
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id || '')
  const [description, setDescription] = useState('')
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
    if (categories.length > 0 && !categoryId) {
      setCategoryId(categories[0].id)
    }
  }, [categories])

  const add = async () => {
    if (!amount || amount <= 0) return showToast('Nominal harus > 0', 'error')
    if (!categoryId) return showToast('Pilih kategori', 'error')
    
    await onAdd({ 
      amount, 
      categoryId, 
      description: description || undefined, 
      date: new Date(date).toISOString() 
    })
    
    setAmount(0)
    setDescription('')
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

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">Tambah Transaksi Cepat</h3>
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
            {categories.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </div>
        <div className="sm:col-span-4">
          <label className="text-sm text-gray-500">Catatan (opsional)</label>
          <input value={description} onChange={e=>setDescription(e.target.value)} placeholder="Contoh: kopi pagi di cafe" className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2" />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-end gap-2">
        <button onClick={()=>{ setAmount(0); setDescription('') }} className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">Reset</button>
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
  const cat = categories.find(c => c.id === t.categoryId) || t.category
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-xl" style={{backgroundColor: cat?.color || '#f3f4f6'}}>
          {cat?.name?.charAt(0) || '•'}
        </div>
        <div>
          <div className="font-medium">{cat?.name || 'Tanpa Kategori'}</div>
          <div className="text-xs text-gray-500">{new Date(t.date).toLocaleString('id-ID')} {t.description ? `· ${t.description}` : ''}</div>
        </div>
      </div>
      <div className="font-semibold text-red-600">-{fmt(Number(t.amount))}</div>
      <button onClick={()=>onDelete(t.id)} className="ml-3 text-gray-400 hover:text-red-600" title="Hapus">🗑️</button>
    </div>
  )
}

function Reports({ categories, transactions, onDelete }:{ categories:Category[]; transactions:Tx[]; onDelete:(id:string)=>void }){
  const [mode, setMode] = useState<'daily'|'weekly'|'monthly'>('monthly')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0,10))

  const range = useMemo(()=>{
    const d = new Date(date)
    if (mode==='daily') return { from: startOfDay(d), to: endOfDay(d), label: d.toLocaleDateString('id-ID') }
    if (mode==='weekly') return { from: startOfWeek(d), to: endOfWeek(d), label: `Minggu ${startOfWeek(d).toLocaleDateString('id-ID')} — ${endOfWeek(d).toLocaleDateString('id-ID')}` }
    return { from: startOfMonth(d), to: endOfMonth(d), label: d.toLocaleString('id-ID', { month: 'long', year: 'numeric' }) }
  }, [mode, date])

  const txs = transactions.filter(t => { const dt=new Date(t.date); return dt>=range.from && dt<=range.to })
  const totalExpense = txs.reduce((a,b)=>a+Number(b.amount),0)

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
            </select>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="rounded-xl border border-gray-200 px-3 py-2" />
          </div>
        </div>
        <div className="mt-4">
          <StatCard title="Total Pengeluaran" value={fmt(totalExpense)} />
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

function Budgets({ categories, budgets, transactions }:{ categories:Category[]; budgets:Budget[]; transactions:Tx[] }){
  return (
    <section className="py-6 space-y-6">
      <Card>
        <h3 className="font-medium mb-3">Anggaran Bulanan</h3>
        <div className="text-sm text-gray-500">Fitur anggaran akan segera hadir!</div>
      </Card>
    </section>
  )
}

function Settings({ categories, setCategories }:{ categories:Category[]; setCategories:(c:Category[])=>void }){
  const [name, setName] = useState('')
  const [color, setColor] = useState('#3B82F6')

  const addCategory = async () => {
    if (!name.trim()) return showToast('Nama kategori wajib', 'error')
    try {
      const data = await apiClient.createCategory({ name, color })
      setCategories([...categories, data])
      setName('')
      showToast('Kategori berhasil ditambahkan', 'success')
    } catch (error: any) {
      showToast(error.message || 'Gagal menambah kategori', 'error')
    }
  }

  const deleteCategory = async (id: string) => {
    if (!confirm('Hapus kategori ini?')) return
    try {
      await apiClient.deleteCategory(id)
      setCategories(categories.filter(c => c.id !== id))
      showToast('Kategori berhasil dihapus', 'success')
    } catch (error: any) {
      showToast(error.message || 'Gagal menghapus kategori', 'error')
    }
  }

  const logout = () => {
    apiClient.logout()
    window.location.reload()
  }

  return (
    <section className="py-6 space-y-6">
      <Card>
        <h3 className="font-medium mb-3">Kategori</h3>
        <div className="grid sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <label className="text-sm text-gray-500">Nama</label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="contoh: Makanan" className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2" />
          </div>
          <div>
            <label className="text-sm text-gray-500">Warna</label>
            <input type="color" value={color} onChange={e=>setColor(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 h-10" />
          </div>
          <div className="flex items-end">
            <button onClick={addCategory} className="w-full rounded-xl bg-gray-900 text-white py-2">Tambah</button>
          </div>
        </div>

        <div className="mt-5 divide-y divide-gray-100">
          {categories.length===0 && <div className="text-sm text-gray-500">Belum ada kategori.</div>}
          {categories.map(c => (
            <div key={c.id} className="py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold" style={{backgroundColor: c.color}}>
                {c.name.charAt(0)}
              </div>
              <div className="flex-1 font-medium">{c.name}</div>
              <button onClick={()=>deleteCategory(c.id)} className="text-red-600 hover:text-red-800">Hapus</button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="font-medium mb-3">Akun</h3>
        <button onClick={logout} className="rounded-xl border border-gray-200 px-4 py-2 hover:bg-gray-50">Keluar</button>
      </Card>
    </section>
  )
}

function Card({ children }:{ children: React.ReactNode }){
  return <div className="rounded-2xl border border-gray-100 shadow-sm p-4">{children}</div>
}