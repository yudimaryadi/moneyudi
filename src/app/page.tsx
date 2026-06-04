"use client";

import { useEffect, useMemo, useState } from "react";
import { apiClient } from "../lib/api-client";
import { ToastContainer, showToast } from "../components/Toast";
import { VocabCard } from "../components/VocabCard";

type Category = {
  id: string;
  name: string;
  icon: string;
  typeScope: "expense" | "income" | "both";
};
type Tx = {
  id: string;
  date: string;
  amount: number;
  type: "expense" | "income";
  categoryId: string | null;
  note?: string | null;
  category?: Category;
};
type Budget = {
  id: string;
  amount: number;
  categoryId: string;
  period: string;
  category?: Category;
};
type UserSettings = { id: string; monthlyCutoffDay: number };

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n || 0);
const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const endOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};
const getCustomMonthRange = (date: Date, cutoffDay: number) => {
  const d = new Date(date);
  let start: Date;

  if (d.getDate() >= cutoffDay) {
    start = new Date(d.getFullYear(), d.getMonth(), cutoffDay, 0, 0, 0, 0);
  } else {
    start = new Date(d.getFullYear(), d.getMonth() - 1, cutoffDay, 0, 0, 0, 0);
  }

  const end = new Date(
    start.getFullYear(),
    start.getMonth() + 1,
    cutoffDay - 1,
    23,
    59,
    59,
    999,
  );
  return { from: start, to: end };
};
const startOfWeek = (d: Date) => {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
};
const endOfWeek = (d: Date) => {
  const x = startOfWeek(d);
  x.setDate(x.getDate() + 6);
  x.setHours(23, 59, 59, 999);
  return x;
};

export default function Page() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      apiClient
        .getCategories()
        .then(() => setUser({ id: "current-user" }))
        .catch(() => {
          localStorage.removeItem("token");
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  if (loading)
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[#11b981] to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
            <img
              src="/icon-256.png"
              alt="Logo MoneYudi"
              className="w-10 h-10"
            />
          </div>
          <p className="text-slate-600 font-medium">Memuat aplikasi...</p>
        </div>
      </div>
    );
  if (!user) return <AuthScreen setUser={setUser} />;
  return <App />;
}

function AuthScreen({ setUser }: { setUser: (u: any) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      showToast("Email dan password wajib diisi", "error");
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await apiClient.login(email, password);
        showToast("Login berhasil!", "success");
      } else {
        if (!name.trim()) {
          showToast("Nama wajib diisi untuk registrasi", "error");
          return;
        }
        await apiClient.register(email, password, name);
        showToast("Registrasi berhasil!", "success");
      }
      setUser({ id: "current-user" });
    } catch (error: any) {
      showToast(error.message || "Terjadi kesalahan", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-[#11b981] to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
            <img src="/icon-256.png" alt="Logo" className="w-12 h-12" />
          </div>
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-slate-800">Mone</span>
            <span className="text-emerald-600">Yudi</span>
          </h1>
          <p className="text-slate-600">Kelola keuangan dengan mudah</p>
        </div>

        <div className="bg-white/90 backdrop-blur-sm border border-slate-200/50 rounded-3xl p-8 shadow-xl">
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex rounded-lg bg-slate-100 p-1">
                <button
                  className={`px-3 py-1.5 rounded-md text-sm ${
                    isLogin ? "bg-white shadow text-slate-700" : "text-slate-600"
                  }`}
                  onClick={() => setIsLogin(true)}
                >
                  Login
                </button>
                <button
                  className={`px-3 py-1.5 rounded-md text-sm ${
                    !isLogin ? "bg-white shadow text-slate-700" : "text-slate-600"
                  }`}
                  onClick={() => setIsLogin(false)}
                >
                  Register
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nama
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nama lengkap"
                    className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 focus:border-[#11b981] focus:outline-none transition-colors duration-200 bg-white"
                    disabled={loading}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 focus:border-[#11b981] focus:outline-none transition-colors duration-200 bg-white"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password (min 6 karakter)"
                  className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 focus:border-[#11b981] focus:outline-none transition-colors duration-200 bg-white"
                  disabled={loading}
                  onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                />
              </div>

              <button
                onClick={handleAuth}
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#11b981] to-emerald-600 text-white rounded-2xl py-3 px-4 font-semibold hover:from-[#0f9f73] hover:to-emerald-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {isLogin ? "Masuk..." : "Daftar..."}
                  </>
                ) : isLogin ? (
                  "Masuk"
                ) : (
                  "Daftar"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}

function App() {
  const [tab, setTab] = useState<"home" | "reports" | "budgets" | "settings">(
    "home",
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings>({
    id: "",
    monthlyCutoffDay: 1,
  });
  const today = new Date();

  const fetchAll = async () => {
    try {
      const [cats, transactions, bgs, settings] = await Promise.all([
        apiClient.getCategories(),
        apiClient.getTransactions(),
        apiClient.getBudgets(),
        apiClient.getUserSettings(),
      ]);
      setCategories(cats || []);
      setTxs(transactions || []);
      setBudgets(bgs || []);
      setUserSettings(settings || { id: "", monthlyCutoffDay: 1 });
    } catch (error: any) {
      showToast(error.message || "Gagal memuat data", "error");
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const todaysTx = useMemo(
    () =>
      txs.filter((t) => {
        const d = new Date(t.date);
        return (
          d.getFullYear() === today.getFullYear() &&
          d.getMonth() === today.getMonth() &&
          d.getDate() === today.getDate()
        );
      }),
    [txs],
  );

  const todayExpense = useMemo(
    () =>
      todaysTx
        .filter((t) => t.type === "expense")
        .reduce((a, b) => a + Number(b.amount), 0),
    [todaysTx],
  );
  const todayIncome = useMemo(
    () =>
      todaysTx
        .filter((t) => t.type === "income")
        .reduce((a, b) => a + Number(b.amount), 0),
    [todaysTx],
  );

  const addTx = async (tx: {
    amount: number;
    type: "expense" | "income";
    categoryId?: string;
    note?: string;
    date?: string;
  }) => {
    try {
      const data = await apiClient.createTransaction({
        amount: tx.amount,
        type: tx.type,
        categoryId: tx.categoryId || "",
        note: tx.note,
        date: tx.date,
      });
      setTxs((prev) => [data, ...prev]);
      showToast("Transaksi berhasil ditambahkan", "success");
    } catch (error: any) {
      showToast(error.message || "Gagal menambah transaksi", "error");
    }
  };

  const delTx = async (id: string) => {
    try {
      await apiClient.deleteTransaction(id);
      setTxs((prev) => prev.filter((t) => t.id !== id));
      showToast("Transaksi berhasil dihapus", "success");
    } catch (error: any) {
      showToast(error.message || "Gagal menghapus transaksi", "error");
    }
  };

  const upsertBudget = async (categoryId: string, amount: number) => {
    try {
      const existing = budgets.find((b) => b.categoryId === categoryId);
      if (existing) {
        await apiClient.updateBudget(existing.id, { amount });
        setBudgets((prev) =>
          prev.map((b) => (b.id === existing.id ? { ...b, amount } : b)),
        );
        showToast("Anggaran berhasil diperbarui", "success");
      } else {
        const data = await apiClient.createBudget({
          amount,
          categoryId,
          period: "monthly",
        });
        setBudgets((prev) => [...prev, data]);
        showToast("Anggaran berhasil ditambahkan", "success");
      }
    } catch (error: any) {
      showToast(error.message || "Gagal mengatur anggaran", "error");
    }
  };

  return (
    <div className="min-h-screen">
      <Header tab={tab} setTab={setTab} />
      <main className="mx-auto max-w-3xl px-4 pb-28">
        {tab === "home" && (
          <Home
            categories={categories}
            todaysTx={todaysTx}
            todayExpense={todayExpense}
            todayIncome={todayIncome}
            onAdd={addTx}
            onDelete={delTx}
          />
        )}
        {tab === "reports" && (
          <Reports
            categories={categories}
            transactions={txs}
            userSettings={userSettings}
            onDelete={delTx}
          />
        )}
        {tab === "budgets" && (
          <Budgets
            categories={categories}
            budgets={budgets}
            transactions={txs}
            userSettings={userSettings}
            onUpdate={upsertBudget}
          />
        )}
        {tab === "settings" && (
          <Settings
            categories={categories}
            setCategories={setCategories}
            userSettings={userSettings}
            setUserSettings={setUserSettings}
            transactions={txs}
          />
        )}
      </main>
      <TabBar tab={tab} setTab={setTab} />
      <ToastContainer />
    </div>
  );
}

function Header({ tab, setTab }: { tab: any; setTab: any }) {
  const logout = () => {
    apiClient.logout();
    window.location.reload();
  };

  return (
    <header className="sticky top-0 z-10 backdrop-blur bg-white/80 border-b border-slate-200">
      <div className="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src="moneyudi-logo-navbar.png"
            alt="MoneYudi"
            className="h-10 w-auto"
          />
        </div>

        <nav className="hidden sm:flex items-center gap-3 text-sm">
          {[
            { id: "home", label: "Hari Ini" },
            { id: "reports", label: "Laporan" },
            { id: "budgets", label: "Anggaran" },
            { id: "settings", label: "Pengaturan" },
          ].map((x) => (
            <button
              key={x.id}
              onClick={() => setTab(x.id)}
              className={`px-4 py-2 rounded-full transition-all duration-200 font-medium ${
                tab === x.id ? "bg-[#11b981] text-white shadow-lg" : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
              }`}
            >
              {x.label}
            </button>
          ))}
        </nav>
        <button
          onClick={logout}
          className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          Keluar
        </button>
      </div>
    </header>
  );
}

function TabBar({ tab, setTab }: { tab: any; setTab: any }) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm border border-slate-200 shadow-xl rounded-2xl px-2 py-2 flex gap-1 sm:hidden">
      {[
        { id: "home", label: "Hari", icon: "🏠" },
        { id: "reports", label: "Laporan", icon: "📊" },
        { id: "budgets", label: "Anggaran", icon: "💰" },
        { id: "settings", label: "Set", icon: "⚙️" },
      ].map((x) => (
        <button
          key={x.id}
          onClick={() => setTab(x.id)}
          className={`px-3 py-3 rounded-xl text-xs min-h-[48px] min-w-[60px] flex flex-col items-center gap-1 transition-all duration-200 ${
            tab === x.id
              ? "bg-[#11b981] text-white shadow-lg scale-105"
              : "text-slate-600 hover:bg-slate-100 active:bg-slate-200"
          }`}
        >
          <span className="text-lg">{x.icon}</span>
          <span className="font-medium">{x.label}</span>
        </button>
      ))}
    </div>
  );
}

function Home({
  categories,
  todaysTx,
  todayExpense,
  todayIncome,
  onAdd,
  onDelete,
}: {
  categories: Category[];
  todaysTx: Tx[];
  todayExpense: number;
  todayIncome: number;
  onAdd: (t: any) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <section className="py-6 space-y-6">
      <QuickAdd categories={categories} onAdd={onAdd} />
      <div className="grid sm:grid-cols-2 gap-4">
        <StatCard
          title="Pengeluaran Hari Ini"
          value={fmt(todayExpense)}
          subtitle={`${
            todaysTx.filter((t) => t.type === "expense").length
          } transaksi`}
        />
        <StatCard
          title="Pemasukan Hari Ini"
          value={fmt(todayIncome)}
          subtitle={`${
            todaysTx.filter((t) => t.type === "income").length
          } transaksi`}
        />
      </div>
      <VocabCard />
      <Card>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">Transaksi Terakhir (Hari Ini)</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {todaysTx.length === 0 && (
            <div className="py-8 text-center text-gray-500">
              Belum ada transaksi hari ini. Tambah dengan form di atas.
            </div>
          )}
          {todaysTx.slice(0, 10).map((t) => (
            <TxRow
              key={t.id}
              t={t}
              categories={categories}
              onDelete={onDelete}
            />
          ))}
        </div>
      </Card>
    </section>
  );
}

function QuickAdd({
  categories,
  onAdd,
}: {
  categories: Category[];
  onAdd: (t: any) => void;
}) {
  const [amount, setAmount] = useState<number>(0);
  const [type, setType] = useState<"expense" | "income">("expense");
  const [categoryId, setCategoryId] = useState<string>("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(() => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const yyyy = now.getFullYear();
    const mm = pad(now.getMonth() + 1);
    const dd = pad(now.getDate());
    const hh = pad(now.getHours());
    const min = pad(now.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  });

  useEffect(() => {
    const valid = categories.filter((c) =>
      type === "income"
        ? c.typeScope === "income" || c.typeScope === "both"
        : c.typeScope === "expense" || c.typeScope === "both",
    );
    if (valid.length > 0 && !valid.some((c) => c.id === categoryId)) {
      setCategoryId(valid[0].id);
    }
  }, [type, categories]);

  const add = async () => {
    if (!amount || amount <= 0) return showToast("Nominal harus > 0", "error");
    if (loading) return;

    setLoading(true);
    try {
      await onAdd({
        amount,
        type,
        categoryId: categoryId || undefined,
        note: note || undefined,
        date: new Date(date).toISOString(),
      });

      setAmount(0);
      setNote("");
      setDate(() => {
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, "0");
        const yyyy = now.getFullYear();
        const mm = pad(now.getMonth() + 1);
        const dd = pad(now.getDate());
        const hh = pad(now.getHours());
        const min = pad(now.getMinutes());
        return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
      });
    } finally {
      setLoading(false);
    }
  };

  const cats = categories.filter((c) =>
    type === "income"
      ? c.typeScope === "income" || c.typeScope === "both"
      : c.typeScope === "expense" || c.typeScope === "both",
  );

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="inline-flex rounded-lg bg-slate-100 p-1 w-full">
          <button
            className={`flex-1 py-3 px-3 rounded-md text-sm font-medium min-h-[44px] transition-all duration-200 ${
              type === "expense"
                ? "bg-white shadow-md text-slate-700"
                : "text-slate-600 hover:bg-slate-200 active:bg-slate-300"
            }`}
            onClick={() => setType("expense")}
            disabled={loading}
          >
            <div className="flex items-center justify-center gap-2">
              <span>💸</span>
              <span>Pengeluaran</span>
            </div>
          </button>
          <button
            className={`flex-1 py-3 px-3 rounded-md text-sm font-medium min-h-[44px] transition-all duration-200 ${
              type === "income"
                ? "bg-white shadow-md text-slate-700"
                : "text-slate-600 hover:bg-slate-200 active:bg-slate-300"
            }`}
            onClick={() => setType("income")}
            disabled={loading}
          >
            <div className="flex items-center justify-center gap-2">
              <span>💰</span>
              <span>Pemasukan</span>
            </div>
          </button>
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-sm text-slate-600 font-medium block mb-2">Nominal</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9.]*"
            value={amount === 0 ? "" : amount?.toLocaleString("id-ID") || ""}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^\d]/g, "");
              setAmount(raw === "" ? 0 : Number(raw));
            }}
            placeholder="0"
            className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-lg focus:ring-2 focus:ring-[#11b981] focus:border-[#11b981] transition-colors bg-white"
            disabled={loading}
          />
        </div>

        <div className="grid gap-3">
          <div>
            <label className="text-sm text-gray-500 block mb-1">Tanggal</label>
            <input
              type="date"
              value={date.slice(0, 10)}
              onChange={(e) => setDate(`${e.target.value}T12:00:00`)}
              className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
          </div>
        </div>

        <div className="grid gap-3">
          <div>
            <label className="text-sm text-gray-500 block mb-1">Kategori</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-3 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            >
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-500 block mb-1">
            Catatan (opsional)
          </label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Contoh: kopi pagi di cafe"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          onClick={() => {
            setAmount(0);
            setNote("");
          }}
          className="px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-600 hover:bg-slate-50 active:bg-slate-100 min-h-[48px] transition-all duration-200 font-medium disabled:opacity-50"
          disabled={loading}
        >
          Reset
        </button>
        <button
          onClick={add}
          disabled={loading}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#11b981] to-emerald-600 text-white hover:from-[#0f9f73] hover:to-emerald-700 active:from-[#0d8a65] active:to-emerald-800 min-h-[48px] font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Menyimpan...
            </>
          ) : (
            "Simpan"
          )}
        </button>
      </div>
    </Card>
  );
}

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="text-sm text-slate-500 font-medium">{title}</div>
      <div className="text-2xl font-bold mt-2 text-slate-800">{value}</div>
      {subtitle && <div className="text-sm text-slate-500 mt-1">{subtitle}</div>}
    </div>
  );
}

function TxRow({
  t,
  categories,
  onDelete,
}: {
  t: Tx;
  categories: Category[];
  onDelete: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const cat = categories.find((c) => c.id === t.categoryId) || t.category;
  const isExpense = t.type === "expense";
  
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleting) return;
    setDeleting(true);
    try {
      await onDelete(t.id);
    } finally {
      setDeleting(false);
    }
  };
  
  const handleRowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };
  
  return (
    <div className="flex items-center justify-between py-3 group" onClick={handleRowClick}>
      <div className="flex items-center gap-3 flex-1">
        <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-xl flex-shrink-0">
          {cat?.icon || "💰"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">
            {cat?.name || "Tanpa Kategori"}
          </div>
          <div className="text-xs text-gray-500 truncate">
            {new Date(t.date).toLocaleDateString("id-ID")}{" "}
            {t.note ? `· ${t.note}` : ""}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div
          className={`font-semibold text-right ${
            isExpense ? "text-red-600" : "text-green-600"
          }`}
        >
          {isExpense ? "-" : "+"}
          {fmt(Number(t.amount))}
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="p-2 text-gray-400 hover:text-red-600 active:bg-red-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center opacity-0 group-hover:opacity-100 sm:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Hapus"
        >
          {deleting ? (
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            "🗑️"
          )}
        </button>
      </div>
    </div>
  );
}

function ReportTxRow({
  t,
  categories,
  onDelete,
  onDateClick,
}: {
  t: Tx;
  categories: Category[];
  onDelete: (id: string) => void;
  onDateClick: (date: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const cat = categories.find((c) => c.id === t.categoryId) || t.category;
  const isExpense = t.type === "expense";
  const dateStr = new Date(t.date).toISOString().slice(0, 10);
  
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleting) return;
    setDeleting(true);
    try {
      await onDelete(t.id);
    } finally {
      setDeleting(false);
    }
  };
  
  const handleDateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDateClick(dateStr);
  };
  
  const handleAmountClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };
  
  return (
    <div className="flex items-center justify-between py-3 group">
      <div className="flex items-center gap-3 flex-1">
        <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-xl flex-shrink-0">
          {cat?.icon || "💰"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">
            {cat?.name || "Tanpa Kategori"}
          </div>
          <div className="text-xs text-gray-500 truncate">
            <button
              onClick={handleDateClick}
              className="hover:text-blue-600 hover:underline transition-colors"
              title="Klik untuk filter tanggal ini"
            >
              {new Date(t.date).toLocaleDateString("id-ID")}
            </button>
            {t.note ? ` · ${t.note}` : ""}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div
          onClick={handleAmountClick}
          className={`font-semibold text-right cursor-default ${
            isExpense ? "text-red-600" : "text-green-600"
          }`}
        >
          {isExpense ? "-" : "+"}
          {fmt(Number(t.amount))}
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="p-2 text-gray-400 hover:text-red-600 active:bg-red-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center opacity-0 group-hover:opacity-100 sm:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Hapus"
        >
          {deleting ? (
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            "🗑️"
          )}
        </button>
      </div>
    </div>
  );
}

const PIE_COLORS = [
  "#11b981", "#f59e0b", "#ef4444", "#8b5cf6", "#3b82f6",
  "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#84cc16",
];

function PieChart({
  transactions,
  categories,
  userSettings,
}: {
  transactions: Tx[];
  categories: Category[];
  userSettings: UserSettings;
}) {
  const { from, to, label } = useMemo(() => {
    const r = getCustomMonthRange(new Date(), userSettings.monthlyCutoffDay);
    const fromStr = r.from.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    const toStr = r.to.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    return { from: r.from, to: r.to, label: `${fromStr} — ${toStr}` };
  }, [userSettings]);

  const [hovered, setHovered] = useState<string | null>(null);

  const data = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of transactions) {
      if (t.type !== "expense") continue;
      const d = new Date(t.date);
      if (d < from || d > to) continue;
      const key = t.categoryId || "__none__";
      map[key] = (map[key] || 0) + Number(t.amount);
    }
    const total = Object.values(map).reduce((a, b) => a + b, 0);
    return Object.entries(map)
      .map(([catId, amount]) => {
        const cat = categories.find((c) => c.id === catId);
        return { catId, amount, pct: total > 0 ? (amount / total) * 100 : 0, cat };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [transactions, categories, from, to]);

  if (data.length === 0)
    return (
      <Card>
        <h3 className="font-semibold text-slate-700 mb-1">Pengeluaran per Kategori</h3>
        <p className="text-xs text-slate-500 mb-4">{label}</p>
        <div className="py-8 text-center text-slate-400 text-sm">Belum ada data pengeluaran</div>
      </Card>
    );

  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const r = 70;
  const ir = 42;

  let cumAngle = -Math.PI / 2;
  const slices = data.map((d, i) => {
    const angle = (d.pct / 100) * 2 * Math.PI;
    const startAngle = cumAngle;
    cumAngle += angle;
    const endAngle = cumAngle;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const ix1 = cx + ir * Math.cos(startAngle);
    const iy1 = cy + ir * Math.sin(startAngle);
    const ix2 = cx + ir * Math.cos(endAngle);
    const iy2 = cy + ir * Math.sin(endAngle);
    const large = angle > Math.PI ? 1 : 0;
    const path = `M ${ix1} ${iy1} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${ir} ${ir} 0 ${large} 0 ${ix1} ${iy1} Z`;
    return { ...d, path, color: PIE_COLORS[i % PIE_COLORS.length] };
  });

  const total = data.reduce((a, b) => a + b.amount, 0);
  const hoveredSlice = slices.find((s) => s.catId === hovered);

  return (
    <Card>
      <h3 className="font-semibold text-slate-700 mb-1">Pengeluaran per Kategori</h3>
      <p className="text-xs text-slate-500 mb-4">{label}</p>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative flex-shrink-0">
          <svg width={size} height={size}>
            {slices.map((s) => (
              <path
                key={s.catId}
                d={s.path}
                fill={s.color}
                opacity={hovered && hovered !== s.catId ? 0.4 : 1}
                className="cursor-pointer transition-opacity duration-150"
                onMouseEnter={() => setHovered(s.catId)}
                onMouseLeave={() => setHovered(null)}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {hoveredSlice ? (
              <>
                <span className="text-lg">{hoveredSlice.cat?.icon || "💰"}</span>
                <span className="text-xs font-semibold text-slate-700 text-center px-2 leading-tight">
                  {hoveredSlice.pct.toFixed(1)}%
                </span>
              </>
            ) : (
              <>
                <span className="text-xs text-slate-500">Total</span>
                <span className="text-xs font-bold text-slate-700">{fmt(total)}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex-1 w-full space-y-2">
          {slices.map((s) => (
            <div
              key={s.catId}
              className="flex items-center gap-2 cursor-pointer"
              onMouseEnter={() => setHovered(s.catId)}
              onMouseLeave={() => setHovered(null)}
            >
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.color }} />
              <span className="text-sm flex-shrink-0">{s.cat?.icon || "💰"}</span>
              <span className="text-sm text-slate-700 truncate flex-1">{s.cat?.name || "Tanpa Kategori"}</span>
              <span className="text-xs text-slate-500 flex-shrink-0">{s.pct.toFixed(1)}%</span>
              <span className="text-xs font-medium text-slate-700 flex-shrink-0">{fmt(s.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function Reports({
  categories,
  transactions,
  userSettings,
  onDelete,
}: {
  categories: Category[];
  transactions: Tx[];
  userSettings: UserSettings;
  onDelete: (id: string) => void;
}) {
  const [listFrom, setListFrom] = useState(() => getCustomMonthRange(new Date(), userSettings.monthlyCutoffDay).from.toISOString().slice(0, 10));
  const [listTo, setListTo] = useState(() => getCustomMonthRange(new Date(), userSettings.monthlyCutoffDay).to.toISOString().slice(0, 10));
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTxs = useMemo(() => {
    let txs = transactions.filter((t) => {
      const dt = new Date(t.date);
      return dt >= startOfDay(new Date(listFrom)) && dt <= endOfDay(new Date(listTo));
    });
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      txs = txs.filter((t) => {
        const cat = categories.find((c) => c.id === t.categoryId);
        return `${t.note || ""} ${cat?.name || ""} ${t.amount}`.toLowerCase().includes(q);
      });
    }
    return txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, listFrom, listTo, searchQuery, categories]);

  const totalExpense = filteredTxs.filter((t) => t.type === "expense").reduce((a, b) => a + Number(b.amount), 0);
  const totalIncome = filteredTxs.filter((t) => t.type === "income").reduce((a, b) => a + Number(b.amount), 0);

  const handleDateClick = (clickedDate: string) => {
    setListFrom(clickedDate);
    setListTo(clickedDate);
  };

  return (
    <section className="py-6 space-y-6">
      <PieChart transactions={transactions} categories={categories} userSettings={userSettings} />
      <Card>
        <h3 className="font-semibold text-slate-700 mb-3">Daftar Transaksi</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <input
              type="date"
              value={listFrom}
              onChange={(e) => setListFrom(e.target.value)}
              className="flex-1 min-w-0 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-[#11b981] focus:border-transparent"
            />
            <span className="text-gray-400">—</span>
            <input
              type="date"
              value={listTo}
              onChange={(e) => setListTo(e.target.value)}
              className="flex-1 min-w-0 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-[#11b981] focus:border-transparent"
            />
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Cari..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-7 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#11b981] focus:border-transparent text-sm w-32"
            />
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">✕</button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="rounded-xl bg-red-50 px-4 py-3">
            <div className="text-xs text-red-500 font-medium">Pengeluaran</div>
            <div className="text-base font-bold text-red-600">{fmt(totalExpense)}</div>
          </div>
          <div className="rounded-xl bg-emerald-50 px-4 py-3">
            <div className="text-xs text-emerald-600 font-medium">Pemasukan</div>
            <div className="text-base font-bold text-emerald-600">{fmt(totalIncome)}</div>
          </div>
        </div>
        <div className="text-xs text-slate-400 mb-2">{filteredTxs.length} transaksi</div>
        <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
          {filteredTxs.length === 0 && (
            <div className="py-8 text-center text-gray-500 text-sm">
              {searchQuery ? "Tidak ada transaksi yang ditemukan" : "Belum ada transaksi"}
            </div>
          )}
          {filteredTxs.map((t) => (
            <ReportTxRow key={t.id} t={t} categories={categories} onDelete={onDelete} onDateClick={handleDateClick} />
          ))}
        </div>
      </Card>
    </section>
  );
}

function Budgets({
  categories,
  budgets,
  transactions,
  userSettings,
  onUpdate,
}: {
  categories: Category[];
  budgets: Budget[];
  transactions: Tx[];
  userSettings: UserSettings;
  onUpdate: (cid: string, amt: number) => void;
}) {
  const { monthFrom, monthTo } = useMemo(() => {
    if (userSettings) {
      const customRange = getCustomMonthRange(
        new Date(),
        userSettings.monthlyCutoffDay,
      );
      return { monthFrom: customRange.from, monthTo: customRange.to };
    }
    const now = new Date();
    return {
      monthFrom: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
      monthTo: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    };
  }, [userSettings]);

  const spentByCat = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of transactions) {
      const d = new Date(t.date);
      if (t.type === "expense" && d >= monthFrom && d <= monthTo) {
        const key = t.categoryId || "";
        map[key] = (map[key] || 0) + Number(t.amount);
      }
    }
    return map;
  }, [transactions, monthFrom, monthTo]);

  const expenseCats = categories.filter((c) => c.typeScope !== "income");

  return (
    <section className="py-6 space-y-6">
      <div className="text-sm text-gray-500">
        Periode:{" "}
        {monthFrom.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
        })}{" "}
        —{" "}
        {monthTo.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </div>
      <div className="space-y-4">
        {expenseCats.map((c) => {
          const b = budgets.find((x) => x.categoryId === c.id);
          const limit = Number(b?.amount || 0);
          const spent = Number(spentByCat[c.id] || 0);
          const pct =
            limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
          const warn = limit > 0 && spent >= 0.8 * limit;
          return (
            <Card key={c.id}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-xl">
                  {c.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm text-gray-500">
                      {limit > 0 ? `${fmt(spent)} / ${fmt(limit)}` : fmt(spent)}
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full ${
                        warn ? "bg-red-500" : "bg-gray-900"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <label className="text-sm text-gray-500">Limit bulanan</label>
                <input
                  type="number"
                  className="w-32 rounded-xl border border-gray-200 px-3 py-1.5"
                  defaultValue={limit}
                  onBlur={(e) => onUpdate(c.id, Number(e.target.value || 0))}
                  placeholder="0"
                />
                <span className="text-sm text-gray-400">
                  (ketik lalu pindah fokus untuk menyimpan)
                </span>
              </div>
              {warn && (
                <div className="mt-2 text-xs text-red-600">
                  ⚠️ Pengeluaran mendekati/melebihi batas.
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function Settings({
  categories,
  setCategories,
  userSettings,
  setUserSettings,
  transactions,
}: {
  categories: Category[];
  setCategories: (c: Category[]) => void;
  userSettings: UserSettings;
  setUserSettings: (s: UserSettings) => void;
  transactions: Tx[];
}) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🧾");
  const [scope, setScope] = useState<"expense" | "income" | "both">("expense");
  const [cutoffDay, setCutoffDay] = useState(
    userSettings?.monthlyCutoffDay || 1,
  );
  const [addingCategory, setAddingCategory] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const addCategory = async () => {
    if (!name.trim()) return showToast("Nama kategori wajib", "error");
    if (addingCategory) return;
    
    setAddingCategory(true);
    try {
      const data = await apiClient.createCategory({
        name,
        icon,
        typeScope: scope,
      });
      setCategories([...categories, data]);
      setName("");
      showToast("Kategori berhasil ditambahkan", "success");
    } catch (error: any) {
      showToast(error.message || "Gagal menambah kategori", "error");
    } finally {
      setAddingCategory(false);
    }
  };

  const updateCategory = async (id: string, patch: Partial<Category>) => {
    try {
      await apiClient.updateCategory(id, patch);
      setCategories(
        categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      );
      showToast("Kategori berhasil diperbarui", "success");
    } catch (error: any) {
      showToast(error.message || "Gagal update kategori", "error");
    }
  };

  const deleteCategory = async (id: string) => {
    if (
      !confirm(
        "Hapus kategori ini? Transaksi yang terhubung akan kehilangan referensi.",
      )
    )
      return;
    try {
      await apiClient.deleteCategory(id);
      setCategories(categories.filter((c) => c.id !== id));
      showToast("Kategori berhasil dihapus", "success");
    } catch (error: any) {
      showToast(error.message || "Gagal menghapus kategori", "error");
    }
  };

  const updateCutoffDay = async (day: number) => {
    if (savingSettings) return;
    
    setSavingSettings(true);
    try {
      const updatedSettings = await apiClient.updateUserSettings({
        monthlyCutoffDay: day,
      });
      setUserSettings(updatedSettings);
      showToast("Pengaturan berhasil disimpan", "success");
    } catch (error: any) {
      showToast(error.message || "Gagal menyimpan pengaturan", "error");
    } finally {
      setSavingSettings(false);
    }
  };

  const logout = () => {
    apiClient.logout();
    window.location.reload();
  };

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
                value={cutoffDay === 0 ? "" : cutoffDay}
                onChange={(e) => {
                  const val = e.target.value;
                  setCutoffDay(val === "" ? 0 : Number(val));
                }}
                className="w-20 rounded-xl border border-gray-200 px-3 py-3 text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={savingSettings}
              />
              <button
                onClick={() => {
                  if (!cutoffDay || cutoffDay < 1 || cutoffDay > 31) {
                    showToast("Tanggal cut-off wajib diisi (1-31)", "error");
                    return;
                  }
                  updateCutoffDay(cutoffDay);
                }}
                disabled={savingSettings}
                className="px-6 py-3 bg-[#11b981] text-white rounded-xl hover:bg-[#0f9f73] active:bg-[#0d8a65] min-h-[48px] font-medium transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {savingSettings ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan"
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Periode bulanan custom dimulai dari tanggal ini. Contoh: jika
              diset 25, maka periode saat ini adalah 25 Jul - 24 Agu.
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
              onChange={(e) => setName(e.target.value)}
              placeholder="contoh: Kopi"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={addingCategory}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-500 block mb-1">
                Ikon (emoji)
              </label>
              <input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={addingCategory}
              />
            </div>
            <div>
              <label className="text-sm text-gray-500 block mb-1">Tipe</label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as any)}
                className="w-full rounded-xl border border-gray-200 px-3 py-3 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={addingCategory}
              >
                <option value="expense">Pengeluaran</option>
                <option value="income">Pemasukan</option>
                <option value="both">Keduanya</option>
              </select>
            </div>
          </div>

          <button
            onClick={addCategory}
            disabled={addingCategory}
            className="w-full rounded-xl bg-gray-900 text-white py-3 hover:opacity-90 active:opacity-80 min-h-[48px] font-medium transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {addingCategory ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Menambah...
              </>
            ) : (
              "Tambah Kategori"
            )}
          </button>
        </div>

        <div className="mt-5 divide-y divide-gray-100">
          {categories.length === 0 && (
            <div className="text-sm text-gray-500">Belum ada kategori.</div>
          )}
          {categories.map((c) => (
            <CategoryRow
              key={c.id}
              category={c}
              onUpdate={updateCategory}
              onDelete={deleteCategory}
            />
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="font-medium mb-3">Data Management</h3>
        <DataManagement transactions={transactions} categories={categories} />
      </Card>

      <Card>
        <h3 className="font-medium mb-3">Ubah Password</h3>
        <ChangePasswordForm />
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
  );
}

function CategoryRow({
  category,
  onUpdate,
  onDelete,
}: {
  category: Category;
  onUpdate: (id: string, patch: Partial<Category>) => void;
  onDelete: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  
  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await onDelete(category.id);
    } finally {
      setDeleting(false);
    }
  };
  
  return (
    <div className="py-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-xl flex-shrink-0">
          {category.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium">{category.name}</div>
          <div className="text-sm text-gray-500 capitalize">
            {category.typeScope === "both"
              ? "Pengeluaran & Pemasukan"
              : category.typeScope === "expense"
                ? "Pengeluaran"
                : "Pemasukan"}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <input
          className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          defaultValue={category.name}
          onBlur={(e) => onUpdate(category.id, { name: e.target.value })}
          placeholder="Nama kategori"
        />

        <div className="grid grid-cols-2 gap-2">
          <input
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            defaultValue={category.icon}
            onBlur={(e) => onUpdate(category.id, { icon: e.target.value })}
            placeholder="Ikon"
          />
          <select
            defaultValue={category.typeScope}
            onChange={(e) => onUpdate(category.id, { typeScope: e.target.value as any })}
            className="w-full rounded-xl border border-gray-200 px-3 py-3 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="expense">Pengeluaran</option>
            <option value="income">Pemasukan</option>
            <option value="both">Keduanya</option>
          </select>
        </div>

        <button
          onClick={handleDelete}
          disabled={deleting}
          className="w-full py-3 text-red-600 border border-red-200 rounded-xl hover:bg-red-50 active:bg-red-100 min-h-[48px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {deleting ? (
            <>
              <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
              Menghapus...
            </>
          ) : (
            "Hapus Kategori"
          )}
        </button>
      </div>
    </div>
  );
}

function DataManagement({
  transactions,
  categories,
}: {
  transactions: Tx[];
  categories: Category[];
}) {
  const exportToCSV = () => {
    const headers = ["Date", "Type", "Amount", "Category", "Note"];
    const rows = transactions.map((t) => {
      const cat = categories.find((c) => c.id === t.categoryId);
      return [
        new Date(t.date).toLocaleDateString("id-ID"),
        t.type === "expense" ? "Pengeluaran" : "Pemasukan",
        t.amount.toString(),
        cat?.name || "Tanpa Kategori",
        t.note || "",
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `transactions_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    showToast("Data berhasil diekspor", "success");
  };

  const importFromFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n");
        showToast(`File berisi ${lines.length - 1} baris data`, "success");
        // TODO: Parse and import data
      } catch (error) {
        showToast("Format file tidak valid", "error");
      }
    };
    reader.readAsText(file);
  };

  const deleteAllData = async () => {
    if (!confirm("Hapus SEMUA data? Tindakan ini tidak dapat dibatalkan!"))
      return;
    if (!confirm("Yakin ingin menghapus semua transaksi dan kategori?")) return;

    try {
      // Delete all transactions
      await Promise.all(
        transactions.map((t) => apiClient.deleteTransaction(t.id)),
      );
      showToast("Semua data berhasil dihapus", "success");
      window.location.reload();
    } catch (error: any) {
      showToast(error.message || "Gagal menghapus data", "error");
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={exportToCSV}
          className="px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 active:bg-green-800 min-h-[48px] font-medium transition-colors shadow-lg"
        >
          📤 Export CSV
        </button>

        <label className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:bg-blue-800 min-h-[48px] font-medium transition-colors shadow-lg cursor-pointer flex items-center justify-center">
          📥 Import CSV
          <input
            type="file"
            accept=".csv"
            onChange={importFromFile}
            className="hidden"
          />
        </label>
      </div>

      <button
        onClick={deleteAllData}
        className="w-full py-3 text-red-600 border border-red-200 rounded-xl hover:bg-red-50 active:bg-red-100 min-h-[48px] font-medium transition-colors"
      >
        🗑️ Hapus Semua Data
      </button>

      <button
        onClick={async () => {
          if (!confirm("Hapus akun permanen? Semua data akan hilang!")) return;
          if (!confirm("Yakin? Tindakan ini TIDAK DAPAT dibatalkan!")) return;
          try {
            await apiClient.deleteAccount();
            showToast("Akun berhasil dihapus", "success");
            apiClient.logout();
            window.location.reload();
          } catch (error: any) {
            showToast(error.message || "Gagal menghapus akun", "error");
          }
        }}
        className="w-full py-3 text-white bg-red-600 rounded-xl hover:bg-red-700 active:bg-red-800 min-h-[48px] font-medium transition-colors"
      >
        ⚠️ Hapus Akun Permanen
      </button>

      <p className="text-xs text-gray-500">
        Export: Download semua transaksi dalam format CSV
        <br />
        Import: Upload file CSV untuk import data
        <br />
        Hapus: Menghapus semua transaksi (tidak dapat dibatalkan)
      </p>
    </div>
  );
}

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast("Semua field wajib diisi", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast("Password baru tidak cocok", "error");
      return;
    }

    if (newPassword.length < 6) {
      showToast("Password baru minimal 6 karakter", "error");
      return;
    }

    setLoading(true);
    try {
      await apiClient.changePassword(currentPassword, newPassword);
      showToast("Password berhasil diubah", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      showToast(error.message || "Gagal mengubah password", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="text-sm text-gray-500 block mb-1">
          Password Lama
        </label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={loading}
        />
      </div>

      <div>
        <label className="text-sm text-gray-500 block mb-1">
          Password Baru
        </label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={loading}
        />
      </div>

      <div>
        <label className="text-sm text-gray-500 block mb-1">
          Konfirmasi Password Baru
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={loading}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 active:bg-blue-800 min-h-[48px] font-medium transition-colors shadow-lg disabled:opacity-50"
      >
        {loading ? "Mengubah..." : "Ubah Password"}
      </button>
    </form>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 p-6">
      {children}
    </div>
  );
}
