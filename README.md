# PengeluaranKu — Next.js + Supabase + PWA (Vercel-ready)

Expense tracker modern–minimal dengan:
- Autentikasi Supabase (Google + email magic link)
- Kategori CRUD (tambah/edit/hapus)
- Transaksi & Anggaran
- PWA (manifest + service worker) → Add to Home Screen
- Siap deploy ke **Vercel**

## Setup Cepat

1) **Install deps**
```bash
npm i
```

2) **Supabase**
- Buat project di https://supabase.com
- Copy `Project URL` & `anon public key`
- Jalankan SQL schema & RLS dari file `supabase_schema.sql` (lihat di repo).

3) **Env**
- Duplikat `.env.example` menjadi `.env.local` lalu isi:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

4) **Dev**
```bash
npm run dev
```

5) **Deploy ke Vercel**
- Import repo di Vercel
- Isi var env: `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Build → deploy

## PWA
- `public/manifest.webmanifest`
- `public/sw.js` (service worker) akan diregister otomatis.

## Catatan
- Data dibatasi 500 transaksi terakhir di fetch awal (lihat `page.tsx`).
- Semua akses data diproteksi Row Level Security (RLS) di Supabase policy.
