"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  createdAt?: string;
  details?: string; // JSON of Detail[] (receipt line items)
};
type Detail = { name: string; qty: number; price: number };
const parseDetails = (t: Tx): Detail[] => {
  try {
    const d = JSON.parse(t.details || "[]");
    return Array.isArray(d) ? d : [];
  } catch {
    return [];
  }
};
// Newest-added first (createdAt), falling back to the transaction date
const byNewest = (a: Tx, b: Tx) => (b.createdAt || b.date).localeCompare(a.createdAt || a.date);
type Budget = {
  id: string;
  amount: number;
  categoryId: string;
  period: string;
  category?: Category;
};
type UserSettings = { id: string; monthlyCutoffDay: number };
type AiItem = Awaited<ReturnType<typeof apiClient.parseAi>>["items"][number];

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
// Expense total per category inside [from, to]
const spentByCategory = (txs: Tx[], from: Date, to: Date) => {
  const map: Record<string, number> = {};
  for (const t of txs) {
    const d = new Date(t.date);
    if (t.type !== "expense" || d < from || d > to) continue;
    const key = t.categoryId || "__none__";
    map[key] = (map[key] || 0) + Number(t.amount);
  }
  return map;
};

// YYYY-MM-DD in local time (toISOString shifts to UTC → off by one day in WIB)
const ymd = (d: Date) => d.toLocaleDateString("sv-SE");
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-surface to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#11b981] rounded-2xl flex items-center justify-center shadow-lg">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-surface to-blue-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-[#11b981] rounded-2xl flex items-center justify-center shadow-lg">
            <img src="/icon-256.png" alt="Logo" className="w-12 h-12" />
          </div>
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-slate-800">Mone</span>
            <span className="text-emerald-600">Yudi</span>
          </h1>
          <p className="text-slate-600">Kelola keuangan dengan mudah</p>
        </div>

        <div className="bg-surface/90 backdrop-blur-sm border border-slate-200/50 rounded-3xl p-8 shadow-xl">
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex rounded-lg bg-slate-100 p-1">
                <button
                  className={`px-3 py-1.5 rounded-md text-sm ${
                    isLogin ? "bg-surface shadow text-slate-700" : "text-slate-600"
                  }`}
                  onClick={() => setIsLogin(true)}
                >
                  Login
                </button>
                <button
                  className={`px-3 py-1.5 rounded-md text-sm ${
                    !isLogin ? "bg-surface shadow text-slate-700" : "text-slate-600"
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
                    className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 focus:border-[#11b981] focus:outline-none transition-colors duration-200 bg-surface"
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
                  className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 focus:border-[#11b981] focus:outline-none transition-colors duration-200 bg-surface"
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
                  className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 focus:border-[#11b981] focus:outline-none transition-colors duration-200 bg-surface"
                  disabled={loading}
                  onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                />
              </div>

              <button
                onClick={handleAuth}
                disabled={loading}
                className="w-full bg-[#11b981] text-white rounded-2xl py-3 px-4 font-semibold hover:bg-[#0f9f73] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
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
  const [receipt, setReceipt] = useState<File | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null); // photo from the tab bar camera button
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
      }).sort(byNewest),
    [txs],
  );

  const detailTx = txs.find((t) => t.id === detailId);

  // Budget warnings for the current cut-off period (>= 80% of limit)
  const period = getCustomMonthRange(new Date(), Number(userSettings.monthlyCutoffDay) || 1);
  const budgetUsage = (all: Tx[]) => {
    const spent = spentByCategory(all, period.from, period.to);
    return budgets
      .map((b) => {
        const limit = Number(b.amount) || 0;
        const used = spent[b.categoryId] || 0;
        return { cat: categories.find((c) => c.id === b.categoryId), limit, used, pct: limit ? (used / limit) * 100 : 0 };
      })
      .filter((x) => x.limit > 0 && x.cat);
  };
  const budgetAlerts = budgetUsage(txs)
    .filter((x) => x.pct >= 80)
    .sort((a, b) => b.pct - a.pct);
  const txsRef = useRef(txs);
  txsRef.current = txs;
  const warnBudget = (all: Tx[], categoryId?: string | null) => {
    const u = budgetUsage(all).find((x) => x.cat!.id === categoryId);
    if (!u || u.pct < 80) return;
    const msg = `${u.cat!.icon} ${u.cat!.name}: ${fmt(u.used)} dari ${fmt(u.limit)}`;
    if (u.pct >= 100) showToast(`Anggaran terlampaui! ${msg}`, "error");
    else showToast(`Anggaran hampir habis (${Math.round(u.pct)}%). ${msg}`, "info");
  };

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
    details?: Detail[];
  }) => {
    try {
      const data = await apiClient.createTransaction({
        amount: tx.amount,
        type: tx.type,
        categoryId: tx.categoryId || "",
        note: tx.note,
        date: tx.date,
        details: tx.details?.length ? tx.details : undefined,
      });
      setTxs((prev) => [data, ...prev]);
      txsRef.current = [data, ...txsRef.current]; // keep fresh for back-to-back saves
      showToast("Transaksi berhasil ditambahkan", "success");
      if (data.type === "expense") warnBudget(txsRef.current, data.categoryId);
    } catch (error: any) {
      showToast(error.message || "Gagal menambah transaksi", "error");
    }
  };

  const updateTx = async (id: string, patch: Partial<Tx>) => {
    try {
      const data = await apiClient.updateTransaction(id, patch as any);
      setTxs((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)));
      showToast("Transaksi diperbarui", "success");
      if (data.type === "expense") warnBudget(txsRef.current.map((t) => (t.id === id ? { ...t, ...data } : t)), data.categoryId);
      return true;
    } catch (error: any) {
      showToast(error.message || "Gagal memperbarui transaksi", "error");
      return false;
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
      <main className="mx-auto max-w-3xl px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:pb-12">
        {tab === "home" && (
          <Home
            categories={categories}
            todaysTx={todaysTx}
            todayExpense={todayExpense}
            todayIncome={todayIncome}
            onAdd={addTx}
            onDelete={delTx}
            onOpen={(t) => setDetailId(t.id)}
            budgetAlerts={budgetAlerts}
            onOpenBudgets={() => setTab("budgets")}
            receipt={receipt}
            onReceiptDone={() => setReceipt(null)}
          />
        )}
        {tab === "reports" && (
          <Reports
            categories={categories}
            transactions={txs}
            userSettings={userSettings}
            onDelete={delTx}
            onOpen={(t) => setDetailId(t.id)}
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
      {detailTx && (
        <TxDetail t={detailTx} categories={categories} onClose={() => setDetailId(null)} onDelete={delTx} onUpdate={updateTx} />
      )}
      <TabBar
        tab={tab}
        setTab={setTab}
        onReceipt={(f) => {
          setTab("home");
          setReceipt(f);
        }}
      />
      <ToastContainer />
    </div>
  );
}

// Lucide-style stroke icons (ISC). Emoji stay only for user-chosen category icons.
const ICONS = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
  chart: "M3 3v18h18M8 17v-5M13 17V8M18 17v-9",
  wallet: "M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5M16 14h.01",
  settings: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6",
  sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
  moon: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z",
  mic: "M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v3",
  camera: "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  sparkles: "M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 17v4M17 19h4",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  trash: "M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6",
  x: "M18 6 6 18M6 6l12 12",
  pencil: "M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z",
  stop: "M6 6h12v12H6z",
  chevronLeft: "m15 18-6-6 6-6",
  chevronRight: "m9 18 6-6-6-6",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3",
};
function Icon({ name, className = "w-5 h-5" }: { name: keyof typeof ICONS; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next ? "#0b1120" : "#ffffff");
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
    setDark(next);
  };
  return { dark, toggle };
}

function Logo() {
  return (
    <div className="flex items-center gap-2 select-none">
      <span className="grid place-items-center w-9 h-9 rounded-xl bg-slate-900 text-surface text-sm font-extrabold">MY</span>
      <span className="text-lg font-bold tracking-tight">
        <span className="text-slate-900">Mone</span>
        <span className="text-emerald-500">Yudi</span>
      </span>
    </div>
  );
}

const NAV = [
  { id: "home", label: "Hari Ini", icon: "home" },
  { id: "reports", label: "Laporan", icon: "chart" },
  { id: "budgets", label: "Anggaran", icon: "wallet" },
  { id: "settings", label: "Pengaturan", icon: "settings" },
] as const;

function Header({ tab, setTab }: { tab: any; setTab: any }) {
  const { dark, toggle } = useTheme();
  const logout = () => {
    apiClient.logout();
    window.location.reload();
  };
  const iconBtn = "grid place-items-center w-11 h-11 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors";

  return (
    <header className="sticky top-0 z-20 backdrop-blur bg-surface/80 border-b border-slate-200 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto max-w-3xl px-4 h-16 flex items-center justify-between gap-2">
        <Logo />
        <nav className="hidden sm:flex items-center gap-1 text-sm" aria-label="Navigasi utama">
          {NAV.map((x) => (
            <button
              key={x.id}
              onClick={() => setTab(x.id)}
              aria-current={tab === x.id ? "page" : undefined}
              className={`px-4 py-2 rounded-full transition-colors duration-200 font-medium ${
                tab === x.id ? "bg-[#11b981] text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
              }`}
            >
              {x.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <button onClick={toggle} className={iconBtn} aria-label={dark ? "Ganti ke tema terang" : "Ganti ke tema gelap"} title={dark ? "Tema terang" : "Tema gelap"}>
            <Icon name={dark ? "sun" : "moon"} />
          </button>
          <button onClick={logout} className={iconBtn} aria-label="Keluar" title="Keluar">
            <Icon name="logout" />
          </button>
        </div>
      </div>
    </header>
  );
}

function TabBar({ tab, setTab, onReceipt }: { tab: any; setTab: any; onReceipt: (f: File) => void }) {
  const item = (x: (typeof NAV)[number]) => {
    const active = tab === x.id;
    return (
      <button
        key={x.id}
        onClick={() => setTab(x.id)}
        aria-current={active ? "page" : undefined}
        className={`flex flex-col items-center justify-center gap-1 h-16 text-[11px] font-medium transition-colors ${
          active ? "text-emerald-600" : "text-slate-500 active:bg-slate-100"
        }`}
      >
        <span className={`grid place-items-center w-12 h-7 rounded-full transition-colors ${active ? "bg-emerald-100" : ""}`}>
          <Icon name={x.icon} />
        </span>
        {x.label}
      </button>
    );
  };
  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-20 sm:hidden bg-surface/95 backdrop-blur border-t border-slate-200 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-5">
        {NAV.slice(0, 2).map(item)}
        {/* Raised quick action: opens the rear camera straight to receipt scanning */}
        <div className="flex flex-col items-center justify-end h-16 pb-1.5">
          <label
            aria-label="Foto struk"
            className="-mt-7 grid place-items-center w-14 h-14 rounded-full bg-[#11b981] text-white shadow-lg shadow-emerald-500/30 ring-4 ring-app active:scale-95 transition-transform cursor-pointer"
          >
            <Icon name="camera" className="w-6 h-6" />
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) onReceipt(f);
              }}
            />
          </label>
          <span className="mt-1 text-[11px] font-medium text-slate-500">Struk</span>
        </div>
        {NAV.slice(2).map(item)}
      </div>
    </nav>
  );
}

function Home({
  categories,
  todaysTx,
  todayExpense,
  todayIncome,
  onAdd,
  onDelete,
  onOpen,
  budgetAlerts,
  onOpenBudgets,
  receipt,
  onReceiptDone,
}: {
  categories: Category[];
  todaysTx: Tx[];
  todayExpense: number;
  todayIncome: number;
  onAdd: (t: any) => void;
  onDelete: (id: string) => void;
  onOpen: (t: Tx) => void;
  budgetAlerts: { cat?: Category; limit: number; used: number; pct: number }[];
  onOpenBudgets: () => void;
  receipt: File | null;
  onReceiptDone: () => void;
}) {
  return (
    <section className="py-6 space-y-6">
      <QuickAdd categories={categories} onAdd={onAdd} receipt={receipt} onReceiptDone={onReceiptDone} />
      {budgetAlerts.length > 0 && (
        <button
          onClick={onOpenBudgets}
          className="w-full text-left rounded-2xl border border-red-200 bg-red-50 p-4 hover:opacity-90 transition-opacity"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-red-800">Peringatan anggaran</span>
            <span className="text-xs text-red-700">Lihat anggaran →</span>
          </div>
          <ul className="space-y-3">
            {budgetAlerts.map((a) => (
              <li key={a.cat!.id}>
                <div className="flex justify-between gap-2 text-sm">
                  <span className="text-slate-800 truncate">
                    {a.cat!.icon} {a.cat!.name}
                  </span>
                  <span className={`font-semibold tabular-nums ${a.pct >= 100 ? "text-red-600" : "text-slate-700"}`}>
                    {Math.round(a.pct)}% {a.pct >= 100 ? "· lewat" : ""}
                  </span>
                </div>
                <div className="h-1.5 mt-1.5 rounded-full bg-red-100 overflow-hidden">
                  <div className={`h-full ${a.pct >= 100 ? "bg-red-500" : "bg-amber-500"}`} style={{ width: `${Math.min(100, a.pct)}%` }} />
                </div>
                <div className="mt-1 text-xs text-slate-500 tabular-nums">
                  {fmt(a.used)} dari {fmt(a.limit)}
                </div>
              </li>
            ))}
          </ul>
        </button>
      )}
      <div className="grid grid-cols-2 gap-3">
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
              onOpen={onOpen}
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
  receipt,
  onReceiptDone,
}: {
  categories: Category[];
  onAdd: (t: any) => void;
  receipt: File | null;
  onReceiptDone: () => void;
}) {
  const [amount, setAmount] = useState<number>(0);
  const [details, setDetails] = useState<Detail[]>([]); // receipt line items from AI
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
        details,
      });

      setAmount(0);
      setNote("");
      setDetails([]);
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

  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const formRef = useRef<HTMLElement>(null);
  const [drafts, setDrafts] = useState<AiItem[]>([]);
  const [listening, setListening] = useState(false);
  const noteOf = (r: AiItem) => (r.description ? `${r.title} — ${r.description}` : r.title);

  const parseAi = async (payload: { text?: string; image?: string; mimeType?: string } = { text: aiText }) => {
    if ((!payload.text?.trim() && !payload.image) || aiLoading) return;
    setAiLoading(true);
    try {
      const { items } = await apiClient.parseAi(payload);
      setAiText("");
      if (items.length > 1) {
        setDrafts(items); // banyak transaksi → tampilkan daftar untuk dicek
        return;
      }
      const r = items[0];
      setType(r.type);
      setAmount(r.amount);
      if (r.categoryId) setCategoryId(r.categoryId);
      setNote(noteOf(r));
      setDetails(r.details || []);
      setDate(`${r.date}T12:00`);
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      showToast("Dicek dulu, lalu tekan Simpan", "success");
    } catch (error: any) {
      showToast(error.message || "AI gagal memproses", "error");
    } finally {
      setAiLoading(false);
    }
  };

  // Native Web Speech API (Chrome/Edge/Safari); tombol disembunyikan bila tidak didukung
  const SpeechRec =
    typeof window !== "undefined" &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  // Voice-note style: tap to start, tap again to stop & send. iOS Safari often
  // never ends recognition on its own, so stop is explicit + auto-stop after 20s.
  const recRef = useRef<any>(null);
  const heardRef = useRef("");
  const autoStop = useRef<ReturnType<typeof setTimeout>>();
  const finishListening = (rec: any) => {
    if (recRef.current !== rec) return; // already finished (onend + fallback both call this)
    recRef.current = null;
    clearTimeout(autoStop.current);
    setListening(false);
    const said = heardRef.current.trim();
    if (said) parseAi({ text: said });
  };
  const stopListening = () => {
    const rec = recRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {}
    // Fallback when the browser ignores stop(): force it after 1.5s
    setTimeout(() => {
      if (recRef.current !== rec) return;
      try {
        rec.abort();
      } catch {}
      finishListening(rec);
    }, 1500);
  };
  const toggleListen = () => {
    if (!SpeechRec || aiLoading) return;
    if (recRef.current) return stopListening();
    const rec = new SpeechRec();
    rec.lang = "id-ID";
    rec.interimResults = true; // show words while speaking
    rec.continuous = false;
    heardRef.current = "";
    rec.onresult = (e: any) => {
      heardRef.current = Array.from(e.results as ArrayLike<any>)
        .map((r) => r[0].transcript)
        .join(" ");
      setAiText(heardRef.current);
    };
    rec.onerror = (e: any) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed")
        showToast("Izin mikrofon ditolak. Aktifkan di pengaturan browser.", "error");
      else if (e.error !== "aborted" && e.error !== "no-speech") showToast("Suara tidak terdengar, coba lagi", "error");
    };
    rec.onend = () => finishListening(rec);
    recRef.current = rec;
    setAiText("");
    setListening(true);
    rec.start();
    autoStop.current = setTimeout(stopListening, 20000);
  };
  // Release the mic if the component unmounts mid-recording
  useEffect(() => () => recRef.current?.abort?.(), []);

  // Kecilkan foto dulu (maks 1600px, JPEG) agar muat di batas body request
  const scanReceipt = async (file?: File) => {
    if (!file) return;
    try {
      const bmp = await createImageBitmap(file);
      const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bmp.width * scale);
      canvas.height = Math.round(bmp.height * scale);
      canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
      const image = canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
      await parseAi({ text: aiText, image, mimeType: "image/jpeg" });
    } catch {
      showToast("Gagal membaca foto", "error");
    }
  };

  // Photo taken from the tab bar camera button; ref guards against double-run
  const handledReceipt = useRef<File | null>(null);
  useEffect(() => {
    if (!receipt || handledReceipt.current === receipt) return;
    handledReceipt.current = receipt;
    window.scrollTo({ top: 0, behavior: "smooth" });
    scanReceipt(receipt).finally(onReceiptDone);
  }, [receipt]);

  const saveDrafts = async () => {
    setLoading(true);
    try {
      for (const d of drafts) {
        await onAdd({
          amount: d.amount,
          type: d.type,
          categoryId: d.categoryId || undefined,
          note: noteOf(d),
          details: d.details,
          date: new Date(`${d.date}T12:00`).toISOString(),
        });
      }
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  };

  const cats = categories.filter((c) =>
    type === "income"
      ? c.typeScope === "income" || c.typeScope === "both"
      : c.typeScope === "expense" || c.typeScope === "both",
  );

  const field =
    "w-full rounded-xl border border-slate-200 bg-surface px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#11b981]/40 focus:border-[#11b981] transition-colors disabled:opacity-60";
  const label = "block text-sm font-medium text-slate-600 mb-1.5";
  const chip =
    "inline-flex items-center gap-2 h-11 px-4 rounded-xl border border-slate-200 bg-surface text-sm font-medium text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer";

  return (
    <div className="space-y-4">
      <section aria-labelledby="ai-title" className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-surface p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="grid place-items-center w-8 h-8 rounded-lg bg-[#11b981] text-white">
            <Icon name="sparkles" className="w-4 h-4" />
          </span>
          <div>
            <h2 id="ai-title" className="font-semibold text-slate-800 leading-tight">Catat cepat pakai AI</h2>
            <p className="text-xs text-slate-500">Ketik, ucapkan, atau foto struk</p>
          </div>
        </div>
        <label htmlFor="ai-text" className="sr-only">Teks transaksi</label>
        <textarea
          id="ai-text"
          rows={2}
          value={aiText}
          onChange={(e) => setAiText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              parseAi();
            }
          }}
          enterKeyHint="send"
          placeholder={listening ? "Mendengarkan… ketuk Stop jika selesai" : "Contoh: nasi padang 25rb, kopi 15k, parkir 2000"}
          className={`${field} resize-none leading-relaxed`}
          disabled={aiLoading}
        />
        <div className="flex items-center gap-2 mt-3">
          {SpeechRec && (
            <button
              onClick={toggleListen}
              disabled={aiLoading}
              aria-pressed={listening}
              aria-label={listening ? "Berhenti merekam dan proses" : "Mulai input suara"}
              className={`${chip} ${listening ? "!border-red-300 !bg-red-50 !text-red-600" : ""}`}
            >
              {listening ? (
                <span className="relative flex w-4 h-4 items-center justify-center" aria-hidden="true">
                  <span className="absolute inline-flex w-full h-full rounded-full bg-red-400 opacity-60 animate-ping" />
                  <Icon name="stop" className="relative w-3.5 h-3.5" />
                </span>
              ) : (
                <Icon name="mic" className="w-4 h-4" />
              )}
              <span>{listening ? "Stop" : "Suara"}</span>
            </button>
          )}
          <label className={`${chip} ${aiLoading ? "opacity-50 pointer-events-none" : ""}`}>
            <Icon name="camera" className="w-4 h-4" />
            <span>Struk</span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                scanReceipt(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          <button
            onClick={() => parseAi()}
            disabled={aiLoading || !aiText.trim()}
            className="ml-auto inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-[#11b981] text-white font-semibold hover:bg-[#0f9f73] active:bg-[#0d8a65] transition-colors disabled:opacity-50"
          >
            {aiLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="sr-only sm:not-sr-only">Memproses</span>
              </>
            ) : (
              "Proses"
            )}
          </button>
        </div>
        <p aria-live="polite" className="sr-only">{aiLoading ? "AI sedang memproses" : ""}</p>

        {drafts.length > 0 && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-surface">
            <div className="px-4 pt-3 pb-1 text-sm font-medium text-slate-700">
              {drafts.length} transaksi terbaca — cek dulu
            </div>
            <ul className="divide-y divide-slate-100">
              {drafts.map((d, i) => {
                const cat = categories.find((c) => c.id === d.categoryId);
                return (
                  <li key={i} className="flex items-center gap-3 pl-4 pr-1 py-2">
                    <span className="text-xl" aria-hidden="true">{cat?.icon || "💰"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{d.title}</div>
                      <div className="text-xs text-slate-500 truncate">
                        {cat?.name || "Tanpa Kategori"} · {new Date(`${d.date}T12:00`).toLocaleDateString("id-ID")}
                      </div>
                    </div>
                    <span className={`text-sm font-semibold tabular-nums ${d.type === "expense" ? "text-red-600" : "text-green-600"}`}>
                      {d.type === "expense" ? "−" : "+"}{fmt(d.amount)}
                    </span>
                    <button
                      onClick={() => setDrafts(drafts.filter((_, j) => j !== i))}
                      aria-label={`Buang ${d.title}`}
                      className="grid place-items-center w-11 h-11 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                      disabled={loading}
                    >
                      <Icon name="x" className="w-4 h-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="flex gap-2 p-3 border-t border-slate-100">
              <button onClick={() => setDrafts([])} disabled={loading} className="h-11 px-4 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 disabled:opacity-50">
                Batal
              </button>
              <button onClick={saveDrafts} disabled={loading} className="flex-1 h-11 rounded-xl bg-[#11b981] text-white font-semibold hover:bg-[#0f9f73] disabled:opacity-50">
                {loading ? "Menyimpan…" : `Simpan semua · ${fmt(drafts.reduce((a, d) => a + d.amount, 0))}`}
              </button>
            </div>
          </div>
        )}
      </section>

      <section ref={formRef} aria-labelledby="manual-title" className="rounded-2xl border border-slate-200 bg-surface p-4 sm:p-5 scroll-mt-20">
        <h2 id="manual-title" className="font-semibold text-slate-800 mb-3">Isi manual</h2>
        <div role="radiogroup" aria-label="Jenis transaksi" className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 mb-4">
          {([
            ["expense", "Pengeluaran", "text-red-600"],
            ["income", "Pemasukan", "text-green-600"],
          ] as const).map(([val, text, color]) => (
            <button
              key={val}
              role="radio"
              aria-checked={type === val}
              onClick={() => setType(val)}
              disabled={loading}
              className={`h-11 rounded-lg text-sm font-semibold transition-colors ${
                type === val ? `bg-surface dark:bg-slate-200 shadow-sm ${color}` : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {text}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="qa-amount" className={label}>Nominal</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">Rp</span>
              <input
                id="qa-amount"
                type="text"
                inputMode="numeric"
                pattern="[0-9.]*"
                value={amount === 0 ? "" : amount?.toLocaleString("id-ID") || ""}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^\d]/g, "");
                  setAmount(raw === "" ? 0 : Number(raw));
                }}
                placeholder="0"
                className={`${field} pl-11 text-xl font-semibold tabular-nums`}
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="qa-date" className={label}>Tanggal</label>
              <input
                id="qa-date"
                type="date"
                value={date.slice(0, 10)}
                onChange={(e) => setDate(`${e.target.value}T12:00:00`)}
                className={field}
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="qa-cat" className={label}>Kategori</label>
              <select
                id="qa-cat"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={field}
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
            <label htmlFor="qa-note" className={label}>
              Catatan <span className="font-normal text-slate-400">(opsional)</span>
            </label>
            <input
              id="qa-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: kopi pagi di kafe"
              className={field}
              disabled={loading}
            />
          </div>

          {details.length > 0 && (
            <div className="rounded-xl border border-slate-200">
              <div className="flex items-center justify-between pl-4 pr-1 py-1 border-b border-slate-100">
                <span className="text-sm font-medium text-slate-700">Rincian dari struk ({details.length})</span>
                <button
                  onClick={() => setDetails([])}
                  className="h-10 px-3 text-sm text-slate-500 hover:text-red-600"
                  disabled={loading}
                >
                  Hapus rincian
                </button>
              </div>
              <DetailList details={details} />
            </div>
          )}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={() => {
              setAmount(0);
              setNote("");
              setDetails([]);
            }}
            className="h-12 px-5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 active:bg-slate-100 transition-colors disabled:opacity-50"
            disabled={loading}
          >
            Reset
          </button>
          <button
            onClick={add}
            disabled={loading}
            className="flex-1 h-12 rounded-xl bg-[#11b981] text-white font-semibold hover:bg-[#0f9f73] active:bg-[#0d8a65] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Menyimpan…
              </>
            ) : (
              "Simpan"
            )}
          </button>
        </div>
      </section>
    </div>
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
    <div className="rounded-2xl border border-slate-200 bg-surface p-4 sm:p-6">
      <div className="text-sm text-slate-500 font-medium">{title}</div>
      <div className="text-lg sm:text-2xl font-bold mt-1 text-slate-800 tabular-nums">{value}</div>
      {subtitle && <div className="text-sm text-slate-500 mt-1">{subtitle}</div>}
    </div>
  );
}

// "Judul — deskripsi" (AI format) → judul; plain notes stay as-is
const titleOf = (t: Tx) => (t.note || "").split(" — ")[0];
const timeOf = (t: Tx) =>
  t.createdAt ? new Date(t.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "";

function TxRow({
  t,
  categories,
  onDelete,
  onOpen,
  onDateClick,
}: {
  t: Tx;
  categories: Category[];
  onDelete: (id: string) => void;
  onOpen: (t: Tx) => void;
  onDateClick?: (date: string) => void; // reports: filter by this date; home: show time instead
}) {
  const [deleting, setDeleting] = useState(false);
  const cat = categories.find((c) => c.id === t.categoryId) || t.category;
  const isExpense = t.type === "expense";
  const itemCount = parseDetails(t).length;

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

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(t)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen(t))}
      aria-label={`Detail ${titleOf(t) || cat?.name || "transaksi"}`}
      className="flex items-center justify-between gap-2 py-3 -mx-2 px-2 rounded-xl group cursor-pointer hover:bg-slate-50 active:bg-slate-100 transition-colors"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-xl flex-shrink-0" aria-hidden="true">
          {cat?.icon || "💰"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-slate-800 truncate">{titleOf(t) || cat?.name || "Tanpa Kategori"}</div>
          <div className="text-xs text-slate-500 truncate">
            {cat?.name || "Tanpa Kategori"} ·{" "}
            {onDateClick ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDateClick(ymd(new Date(t.date)));
                }}
                className="hover:text-emerald-600 hover:underline"
                title="Filter tanggal ini"
              >
                {new Date(t.date).toLocaleDateString("id-ID")}
              </button>
            ) : (
              timeOf(t) || new Date(t.date).toLocaleDateString("id-ID")
            )}
            {itemCount > 0 && ` · ${itemCount} barang`}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <div className={`font-semibold text-right tabular-nums ${isExpense ? "text-red-600" : "text-green-600"}`}>
          {isExpense ? "−" : "+"}
          {fmt(Number(t.amount))}
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-slate-400 hover:text-red-600 active:bg-red-50 rounded-lg transition-colors w-11 h-11 flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Hapus"
          aria-label="Hapus transaksi"
        >
          {deleting ? (
            <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Icon name="trash" className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}

function DetailList({ details }: { details: Detail[] }) {
  const total = details.reduce((a, d) => a + d.qty * d.price, 0);
  return (
    <ul className="divide-y divide-slate-100 text-sm">
      {details.map((d, i) => (
        <li key={i} className="flex items-start justify-between gap-3 px-4 py-2.5">
          <div className="min-w-0">
            <div className="text-slate-800 break-words">{d.name}</div>
            <div className="text-xs text-slate-500 tabular-nums">
              {d.qty} × {fmt(d.price)}
            </div>
          </div>
          <div className="font-medium text-slate-800 tabular-nums whitespace-nowrap">{fmt(d.qty * d.price)}</div>
        </li>
      ))}
      <li className="flex justify-between px-4 py-2.5 font-semibold text-slate-800">
        <span>Subtotal barang</span>
        <span className="tabular-nums">{fmt(total)}</span>
      </li>
    </ul>
  );
}

// Bottom sheet on phones, centered dialog on desktop
function TxDetail({
  t,
  categories,
  onClose,
  onDelete,
  onUpdate,
}: {
  t: Tx;
  categories: Category[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Tx>) => Promise<boolean>;
}) {
  const cat = categories.find((c) => c.id === t.categoryId) || t.category;
  const isExpense = t.type === "expense";
  const details = parseDetails(t);
  const [title, ...rest] = (t.note || "").split(" — ");
  const description = rest.join(" — ");
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    amount: Number(t.amount),
    type: t.type,
    categoryId: t.categoryId || "",
    date: ymd(new Date(t.date)),
    note: t.note || "",
  });
  const draftCats = categories.filter((c) => c.typeScope === "both" || c.typeScope === draft.type);

  const save = async () => {
    if (!draft.amount || draft.amount <= 0) return showToast("Nominal harus > 0", "error");
    setSaving(true);
    const patch: Partial<Tx> = { amount: draft.amount, type: draft.type, categoryId: draft.categoryId, note: draft.note };
    // Keep the original time-of-day unless the date itself changed
    if (draft.date !== ymd(new Date(t.date))) patch.date = new Date(`${draft.date}T12:00`).toISOString();
    const ok = await onUpdate(t.id, patch);
    setSaving(false);
    if (ok) setEditing(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, []);

  const del = async () => {
    if (!confirm("Hapus transaksi ini?")) return;
    setDeleting(true);
    try {
      await onDelete(t.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  const row = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-800 text-right">{value}</dd>
    </div>
  );

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="tx-detail-title">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full sm:max-w-md max-h-[88vh] overflow-y-auto bg-surface rounded-t-3xl sm:rounded-2xl shadow-xl pb-[env(safe-area-inset-bottom)]">
        <div className="sticky top-0 bg-surface/95 backdrop-blur flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-100">
          <span className="mx-auto sm:hidden absolute left-1/2 -translate-x-1/2 top-1.5 w-10 h-1 rounded-full bg-slate-300" aria-hidden="true" />
          <h2 id="tx-detail-title" className="font-semibold text-slate-800 pt-2">{editing ? "Edit transaksi" : "Detail transaksi"}</h2>
          <button onClick={onClose} aria-label="Tutup" className="grid place-items-center w-11 h-11 -mr-2 rounded-xl text-slate-500 hover:bg-slate-100">
            <Icon name="x" />
          </button>
        </div>

        {editing ? (
          <div className="px-5 pt-4 space-y-4">
            <div role="radiogroup" aria-label="Jenis transaksi" className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
              {([
                ["expense", "Pengeluaran", "text-red-600"],
                ["income", "Pemasukan", "text-green-600"],
              ] as const).map(([val, text, color]) => (
                <button
                  key={val}
                  role="radio"
                  aria-checked={draft.type === val}
                  onClick={() => {
                    const ok = categories.find((c) => c.id === draft.categoryId && (c.typeScope === "both" || c.typeScope === val));
                    const first = categories.find((c) => c.typeScope === "both" || c.typeScope === val);
                    setDraft({ ...draft, type: val, categoryId: ok ? draft.categoryId : first?.id || "" });
                  }}
                  className={`h-11 rounded-lg text-sm font-semibold transition-colors ${
                    draft.type === val ? `bg-surface dark:bg-slate-200 shadow-sm ${color}` : "text-slate-500"
                  }`}
                >
                  {text}
                </button>
              ))}
            </div>
            <div>
              <label htmlFor="ed-amount" className="block text-sm font-medium text-slate-600 mb-1.5">Nominal</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">Rp</span>
                <input
                  id="ed-amount"
                  inputMode="numeric"
                  value={draft.amount ? draft.amount.toLocaleString("id-ID") : ""}
                  onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value.replace(/[^\d]/g, "")) || 0 })}
                  className="w-full rounded-xl border border-slate-200 pl-11 pr-4 py-3 text-xl font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-[#11b981]/40"
                />
              </div>
            </div>
            <div>
              <label htmlFor="ed-cat" className="block text-sm font-medium text-slate-600 mb-1.5">Kategori</label>
              <select
                id="ed-cat"
                value={draft.categoryId}
                onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#11b981]/40"
              >
                {draftCats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ed-date" className="block text-sm font-medium text-slate-600 mb-1.5">Tanggal</label>
              <input id="ed-date" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="w-full" />
            </div>
            <div>
              <label htmlFor="ed-note" className="block text-sm font-medium text-slate-600 mb-1.5">Catatan</label>
              <textarea
                id="ed-note"
                rows={2}
                value={draft.note}
                onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base resize-none focus:outline-none focus:ring-2 focus:ring-[#11b981]/40"
              />
            </div>
          </div>
        ) : (
        <>
        <div className="px-5 pt-5 pb-2 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-100 grid place-items-center text-3xl" aria-hidden="true">
            {cat?.icon || "💰"}
          </div>
          <div className="mt-3 font-semibold text-slate-800 break-words">{title || cat?.name || "Transaksi"}</div>
          {description && <p className="mt-1 text-sm text-slate-500 break-words">{description}</p>}
          <div className={`mt-3 text-3xl font-bold tabular-nums ${isExpense ? "text-red-600" : "text-green-600"}`}>
            {isExpense ? "−" : "+"}
            {fmt(Number(t.amount))}
          </div>
        </div>

        <dl className="mx-5 my-3 divide-y divide-slate-100 text-sm border-y border-slate-100">
          {row("Jenis", isExpense ? "Pengeluaran" : "Pemasukan")}
          {row("Kategori", `${cat?.icon || ""} ${cat?.name || "Tanpa Kategori"}`)}
          {row("Tanggal", new Date(t.date).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }))}
          {t.createdAt &&
            row(
              "Dicatat",
              new Date(t.createdAt).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
            )}
        </dl>

        {details.length > 0 && (
          <div className="mx-5 mb-3 rounded-xl border border-slate-200">
            <div className="px-4 py-2.5 border-b border-slate-100 text-sm font-semibold text-slate-700">
              Rincian belanja ({details.length} barang)
            </div>
            <DetailList details={details} />
          </div>
        )}
        </>
        )}

        <div className="px-5 pt-4 pb-5 flex gap-2">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} disabled={saving} className="h-12 px-5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 disabled:opacity-50">
                Batal
              </button>
              <button onClick={save} disabled={saving} className="flex-1 h-12 rounded-xl bg-[#11b981] text-white font-semibold hover:bg-[#0f9f73] disabled:opacity-50">
                {saving ? "Menyimpan…" : "Simpan perubahan"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={del}
                disabled={deleting}
                aria-label="Hapus transaksi"
                className="h-12 px-4 rounded-xl border border-red-200 text-red-600 font-medium hover:bg-red-50 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Icon name="trash" className="w-4 h-4" />
                {deleting ? "Menghapus…" : "Hapus"}
              </button>
              <button
                onClick={() => setEditing(true)}
                className="flex-1 h-12 rounded-xl bg-[#11b981] text-white font-semibold hover:bg-[#0f9f73] flex items-center justify-center gap-2"
              >
                <Icon name="pencil" className="w-4 h-4" />
                Edit
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const PIE_COLORS = [
  "#11b981", "#f59e0b", "#ef4444", "#8b5cf6", "#3b82f6",
  "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#84cc16",
];

// Spending change badge: up = red (spent more), down = green
function Delta({ now, prev }: { now: number; prev: number }) {
  if (!prev && !now) return null;
  if (!prev) return <span className="text-[11px] font-semibold text-slate-500">baru</span>;
  const pct = Math.round(((now - prev) / prev) * 100);
  if (pct === 0) return <span className="text-[11px] font-semibold text-slate-500">±0%</span>;
  const up = pct > 0;
  return (
    <span className={`text-[11px] font-semibold tabular-nums ${up ? "text-red-600" : "text-green-600"}`}>
      <span aria-hidden="true">{up ? "▲" : "▼"}</span>
      <span className="sr-only">{up ? "naik" : "turun"} </span>
      {Math.abs(pct)}%
    </span>
  );
}

function PieChart({
  transactions,
  categories,
  from,
  to,
  cutoffDay,
}: {
  transactions: Tx[];
  categories: Category[];
  from: Date;
  to: Date;
  cutoffDay: number;
}) {
  // Previous cut-off period = the period containing the day before `from`
  const prevRange = useMemo(() => {
    const d = new Date(from);
    d.setDate(d.getDate() - 1);
    return getCustomMonthRange(d, cutoffDay);
  }, [from.getTime(), cutoffDay]);
  const prevMap = useMemo(
    () => spentByCategory(transactions, prevRange.from, prevRange.to),
    [transactions, prevRange],
  );
  const prevTotal = Object.values(prevMap).reduce((a, b) => a + b, 0);
  const prevLabel = `${prevRange.from.toLocaleDateString("id-ID", { day: "numeric", month: "short" })} — ${prevRange.to.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`;
  const label = `${from.toLocaleDateString("id-ID", { day: "numeric", month: "short" })} — ${to.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`;

  const [hovered, setHovered] = useState<string | null>(null);

  const data = useMemo(() => {
    const map = spentByCategory(transactions, from, to);
    const total = Object.values(map).reduce((a, b) => a + b, 0);
    return Object.entries(map)
      .map(([catId, amount]) => {
        const cat = categories.find((c) => c.id === catId);
        return { catId, amount, pct: total > 0 ? (amount / total) * 100 : 0, cat };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [transactions, categories, from.getTime(), to.getTime()]);

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

  // Biggest increase vs previous period (only categories that existed before)
  const mover = data
    .filter((d) => prevMap[d.catId])
    .map((d) => ({ ...d, change: ((d.amount - prevMap[d.catId]) / prevMap[d.catId]) * 100 }))
    .sort((a, b) => b.change - a.change)[0];
  const totalChange = prevTotal ? Math.round(((total - prevTotal) / prevTotal) * 100) : null;

  return (
    <Card>
      <h3 className="font-semibold text-slate-700 mb-1">Pengeluaran per Kategori</h3>
      <p className="text-xs text-slate-500 mb-4">{label}</p>
      <div className="mb-5 rounded-xl bg-slate-50 p-3 text-sm">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-slate-500">Total periode ini</span>
          <span className="font-bold text-slate-800 tabular-nums">{fmt(total)}</span>
        </div>
        <div className="flex items-baseline justify-between gap-2 mt-1">
          <span className="text-slate-500">Periode lalu ({prevLabel})</span>
          <span className="text-slate-600 tabular-nums">{fmt(prevTotal)}</span>
        </div>
        {totalChange !== null && (
          <p className="mt-2 text-slate-700">
            Pengeluaran{" "}
            <span className={`font-semibold ${totalChange > 0 ? "text-red-600" : "text-green-600"}`}>
              {totalChange > 0 ? "naik" : totalChange < 0 ? "turun" : "sama"} {totalChange !== 0 && `${Math.abs(totalChange)}%`}
            </span>{" "}
            dari periode lalu.
            {mover && mover.change >= 10 && (
              <>
                {" "}
                Kenaikan terbesar: {mover.cat?.icon} <span className="font-semibold">{mover.cat?.name || "Tanpa Kategori"}</span>{" "}
                <span className="font-semibold text-red-600">+{Math.round(mover.change)}%</span>.
              </>
            )}
          </p>
        )}
      </div>
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
              <span className="text-xs font-medium text-slate-700 flex-shrink-0 tabular-nums">{fmt(s.amount)}</span>
              <span className="w-10 text-right flex-shrink-0">
                <Delta now={s.amount} prev={prevMap[s.catId] || 0} />
              </span>
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
  onOpen,
}: {
  categories: Category[];
  transactions: Tx[];
  userSettings: UserSettings;
  onDelete: (id: string) => void;
  onOpen: (t: Tx) => void;
}) {
  const [listFrom, setListFrom] = useState(() => ymd(getCustomMonthRange(new Date(), userSettings.monthlyCutoffDay).from));
  const [listTo, setListTo] = useState(() => ymd(getCustomMonthRange(new Date(), userSettings.monthlyCutoffDay).to));
  const [searchQuery, setSearchQuery] = useState("");

  // Jump to the previous/next cut-off period (e.g. 25 Okt–24 Nov ↔ 25 Nov–24 Des)
  const shiftPeriod = (dir: -1 | 1) => {
    const d = new Date(`${dir < 0 ? listFrom : listTo}T12:00`);
    d.setDate(d.getDate() + dir);
    const r = getCustomMonthRange(d, Number(userSettings.monthlyCutoffDay) || 1);
    setListFrom(ymd(r.from));
    setListTo(ymd(r.to));
  };

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
    return txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || byNewest(a, b));
  }, [transactions, listFrom, listTo, searchQuery, categories]);

  const totalExpense = filteredTxs.filter((t) => t.type === "expense").reduce((a, b) => a + Number(b.amount), 0);
  const totalIncome = filteredTxs.filter((t) => t.type === "income").reduce((a, b) => a + Number(b.amount), 0);

  const handleDateClick = (clickedDate: string) => {
    setListFrom(clickedDate);
    setListTo(clickedDate);
  };

  return (
    <section className="py-6 space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => shiftPeriod(-1)} className="grid place-items-center w-11 h-11 rounded-xl border border-slate-200 bg-surface text-slate-600 hover:bg-slate-50" aria-label="Periode sebelumnya">
          <Icon name="chevronLeft" />
        </button>
        <span className="text-sm font-semibold text-slate-800 tabular-nums">
          {new Date(`${listFrom}T12:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} — {new Date(`${listTo}T12:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
        </span>
        <button onClick={() => shiftPeriod(1)} className="grid place-items-center w-11 h-11 rounded-xl border border-slate-200 bg-surface text-slate-600 hover:bg-slate-50" aria-label="Periode berikutnya">
          <Icon name="chevronRight" />
        </button>
      </div>
      <PieChart transactions={transactions} categories={categories} from={startOfDay(new Date(`${listFrom}T12:00`))} to={endOfDay(new Date(`${listTo}T12:00`))} cutoffDay={Number(userSettings.monthlyCutoffDay) || 1} />
      <Card>
        <h3 className="font-semibold text-slate-700 mb-3">Log Transaksi</h3>
        <div className="grid gap-2 mb-3 sm:grid-cols-[1fr_1fr_12rem]">
          <div className="grid grid-cols-2 gap-2 sm:contents">
            <input
              type="date"
              aria-label="Dari tanggal"
              value={listFrom}
              onChange={(e) => setListFrom(e.target.value)}
              className="w-full min-w-0 rounded-xl border border-slate-200 bg-surface px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#11b981]/40"
            />
            <input
              type="date"
              aria-label="Sampai tanggal"
              value={listTo}
              onChange={(e) => setListTo(e.target.value)}
              className="w-full min-w-0 rounded-xl border border-slate-200 bg-surface px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#11b981]/40"
            />
          </div>
          <div className="relative">
            <input
              type="search"
              aria-label="Cari transaksi"
              placeholder="Cari catatan, kategori, nominal"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 bg-surface text-base sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#11b981]/40"
            />
            <Icon name="search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} aria-label="Hapus pencarian" className="absolute right-0 top-0 grid place-items-center w-10 h-full text-slate-400 hover:text-slate-600">
                <Icon name="x" className="w-4 h-4" />
              </button>
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
            <TxRow key={t.id} t={t} categories={categories} onDelete={onDelete} onOpen={onOpen} onDateClick={handleDateClick} />
          ))}
        </div>
      </Card>
    </section>
  );
}

// Next-period budget suggestions from the last (up to) 3 completed cut-off periods.
// Deterministic math; AI only adds a written analysis on request.
const BUFFER = 1.05;
// Compact rupiah for tight rows: 700000 → "700rb", 1250000 → "1,3jt"
const fmtShort = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, "").replace(".", ",")}jt` : n >= 1000 ? `${Math.round(n / 1000)}rb` : `${Math.round(n)}`;
const roundUp5k = (n: number) => Math.ceil(n / 5000) * 5000;
const shortRange = (r: { from: Date; to: Date }) =>
  `${r.from.toLocaleDateString("id-ID", { day: "numeric", month: "short" })} – ${r.to.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`;

function BudgetAdvisor({
  categories,
  budgets,
  transactions,
  cutoffDay,
  onUpdate,
}: {
  categories: Category[];
  budgets: Budget[];
  transactions: Tx[];
  cutoffDay: number;
  onUpdate: (cid: string, amt: number) => void | Promise<void>;
}) {
  const [applying, setApplying] = useState(false);
  const [ai, setAi] = useState<{ summary: string; tips: string[] } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const plan = useMemo(() => {
    const shift = (d: Date, days: number) => {
      const x = new Date(d);
      x.setDate(x.getDate() + days);
      return x;
    };
    const current = getCustomMonthRange(new Date(), cutoffDay);
    const next = getCustomMonthRange(shift(current.to, 1), cutoffDay);
    // Last 3 completed periods, oldest → newest
    const past: { from: Date; to: Date }[] = [];
    let cursor = current.from;
    for (let i = 0; i < 3; i++) {
      const r = getCustomMonthRange(shift(cursor, -1), cutoffDay);
      past.unshift(r);
      cursor = r.from;
    }
    const periods = past
      .map((r) => {
        const byCat = spentByCategory(transactions, r.from, r.to);
        return { ...r, byCat, total: Object.values(byCat).reduce((a, b) => a + b, 0) };
      })
      .filter((p) => p.total > 0); // skip months with nothing logged
    const last = periods[periods.length - 1];

    const rows = categories
      .filter((c) => c.typeScope !== "income")
      .map((c) => {
        const avg = periods.length ? periods.reduce((a, p) => a + (p.byCat[c.id] || 0), 0) / periods.length : 0;
        const limit = Number(budgets.find((b) => b.categoryId === c.id)?.amount || 0);
        return { cat: c, last: last?.byCat[c.id] || 0, avg, suggested: roundUp5k(avg * BUFFER), limit };
      })
      .filter((r) => r.suggested > 0)
      .sort((a, b) => b.suggested - a.suggested);

    const currentSpent = spentByCategory(transactions, current.from, current.to);
    return { next, periods, last, rows, current, currentSpent };
  }, [categories, budgets, transactions, cutoffDay]);

  const pending = plan.rows.filter((r) => r.limit !== r.suggested);
  const totalSuggested = plan.rows.reduce((a, r) => a + r.suggested, 0);

  const applyAll = async () => {
    setApplying(true);
    try {
      for (const r of pending) await onUpdate(r.cat.id, r.suggested);
    } finally {
      setApplying(false);
    }
  };

  const analyze = async () => {
    setAiLoading(true);
    try {
      const name = (id: string) => categories.find((c) => c.id === id)?.name || "Tanpa Kategori";
      const toNamed = (m: Record<string, number>) => Object.fromEntries(Object.entries(m).map(([id, v]) => [name(id), v]));
      setAi(
        await apiClient.insightAi({
          periods: plan.periods.map((p) => ({ periode: shortRange(p), total: p.total, perKategori: toNamed(p.byCat) })),
          periodeBerjalan: { periode: shortRange(plan.current), sejauhIni: toNamed(plan.currentSpent) },
          saranAnggaranPeriodeDepan: Object.fromEntries(plan.rows.map((r) => [r.cat.name, r.suggested])),
          anggaranSaatIni: Object.fromEntries(plan.rows.filter((r) => r.limit).map((r) => [r.cat.name, r.limit])),
        }),
      );
    } catch (error: any) {
      showToast(error.message || "Analisa AI gagal", "error");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <section aria-labelledby="advisor-title" className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-surface p-4 sm:p-5">
      <div className="flex items-start gap-2 mb-1">
        <span className="grid place-items-center w-8 h-8 rounded-lg bg-[#11b981] text-white flex-shrink-0">
          <Icon name="chart" className="w-4 h-4" />
        </span>
        <div>
          <h2 id="advisor-title" className="font-semibold text-slate-800 leading-tight">Saran anggaran periode depan</h2>
          <p className="text-xs text-slate-500">{shortRange(plan.next)} {plan.next.to.getFullYear()}</p>
        </div>
      </div>

      {plan.rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">
          Belum cukup data. Saran muncul setelah ada pengeluaran tercatat di 3 periode gajian terakhir.
        </p>
      ) : (
        <>
          <p className="mt-2 text-xs text-slate-500">
            Dari rata-rata {plan.periods.length} periode terakhir ({plan.periods.map(shortRange).join(", ")}) + cadangan 5%.
          </p>
          <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-surface">
            {plan.rows.map((r) => {
              const applied = r.limit === r.suggested;
              return (
                <li key={r.cat.id} className="flex items-center gap-3 pl-3 pr-2 py-2.5">
                  <span className="text-xl" aria-hidden="true">{r.cat.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">{r.cat.name}</div>
                    <div className="text-xs text-slate-500 tabular-nums">
                      Lalu {fmtShort(r.last)} · rata² {fmtShort(r.avg)}
                      {r.limit > 0 && !applied && ` · kini ${fmtShort(r.limit)}`}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-slate-800 tabular-nums">{fmt(r.suggested)}</div>
                  <button
                    onClick={() => onUpdate(r.cat.id, r.suggested)}
                    disabled={applied || applying}
                    aria-label={applied ? `Saran ${r.cat.name} sudah dipakai` : `Pakai saran ${r.cat.name}`}
                    className={`h-9 min-w-[64px] px-3 rounded-lg text-xs font-semibold transition-colors ${
                      applied ? "text-emerald-600 bg-emerald-100" : "bg-[#11b981] text-white hover:bg-[#0f9f73]"
                    } disabled:cursor-default`}
                  >
                    {applied ? "✓ Dipakai" : "Pakai"}
                  </button>
                </li>
              );
            })}
            <li className="flex justify-between px-3 py-2.5 text-sm font-semibold text-slate-800">
              <span>Total saran</span>
              <span className="tabular-nums">{fmt(totalSuggested)}</span>
            </li>
          </ul>

          <div className="mt-3 flex gap-2">
            <button
              onClick={analyze}
              disabled={aiLoading}
              className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-slate-200 bg-surface text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {aiLoading ? (
                <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Icon name="sparkles" className="w-4 h-4" />
              )}
              Analisa AI
            </button>
            <button
              onClick={applyAll}
              disabled={applying || pending.length === 0}
              className="flex-1 h-11 rounded-xl bg-[#11b981] text-white text-sm font-semibold hover:bg-[#0f9f73] disabled:opacity-50"
            >
              {applying ? "Menyimpan…" : pending.length ? `Pakai semua (${pending.length})` : "Semua saran dipakai"}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Limit yang dipakai langsung berlaku sebagai anggaran bulanan kategori itu.</p>

          {ai && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-surface p-4" aria-live="polite">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-2">
                <Icon name="sparkles" className="w-4 h-4 text-emerald-600" />
                Analisa AI
              </div>
              <p className="text-sm text-slate-700">{ai.summary}</p>
              {ai.tips.length > 0 && (
                <ul className="mt-2 space-y-1.5 text-sm text-slate-700 list-disc pl-5">
                  {ai.tips.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
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
      <BudgetAdvisor
        categories={categories}
        budgets={budgets}
        transactions={transactions}
        cutoffDay={Number(userSettings?.monthlyCutoffDay) || 1}
        onUpdate={onUpdate}
      />
      <div className="text-sm text-gray-500">
        Periode berjalan:{" "}
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
                        warn ? "bg-red-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <label htmlFor={`limit-${c.id}`} className="block text-sm font-medium text-slate-600 mb-1.5">Limit bulanan</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">Rp</span>
                  <input
                    id={`limit-${c.id}`}
                    type="number"
                    inputMode="numeric"
                    className="w-full rounded-xl border border-slate-200 bg-surface pl-10 pr-3 py-2.5 text-base tabular-nums focus:outline-none focus:ring-2 focus:ring-[#11b981]/40"
                    key={limit} // refresh when a suggestion is applied
                    defaultValue={limit || ""}
                    onBlur={(e) => {
                      const v = Number(e.target.value || 0);
                      if (v !== limit) onUpdate(c.id, v); // skip no-op writes
                    }}
                    placeholder="0"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-400">Tersimpan otomatis saat kamu selesai mengetik.</p>
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
                className="w-full rounded-xl border border-gray-200 px-3 py-3 bg-surface focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            className="w-full rounded-xl bg-[#11b981] text-white py-3 hover:opacity-90 active:opacity-80 min-h-[48px] font-medium transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            className="w-full rounded-xl border border-gray-200 px-3 py-3 bg-surface focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          className="px-4 py-3 bg-[#11b981] text-white rounded-xl hover:opacity-90 active:opacity-80 min-h-[48px] font-medium transition-colors shadow-lg"
        >
          📤 Export CSV
        </button>

        <label className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:opacity-90 active:opacity-80 min-h-[48px] font-medium transition-colors shadow-lg cursor-pointer flex items-center justify-center">
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
        className="w-full py-3 text-white bg-red-500 rounded-xl hover:opacity-90 active:opacity-80 min-h-[48px] font-medium transition-colors"
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
        className="w-full bg-blue-600 text-white py-3 rounded-xl hover:opacity-90 active:opacity-80 min-h-[48px] font-medium transition-colors shadow-lg disabled:opacity-50"
      >
        {loading ? "Mengubah..." : "Ubah Password"}
      </button>
    </form>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-surface p-4 sm:p-6">
      {children}
    </div>
  );
}
