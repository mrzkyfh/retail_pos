"use client";

import {
  ArrowUpRight,
  Bell,
  Boxes,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  CloudOff,
  Download,
  FileText,
  History,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Store,
  Truck,
  UserCheck,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { Dialog } from "@base-ui/react/dialog";
import { Menu as BaseMenu } from "@base-ui/react/menu";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type ViewId =
  | "dashboard"
  | "products"
  | "inventory"
  | "transactions"
  | "orders"
  | "shifts"
  | "branches"
  | "team"
  | "reports"
  | "settings";

type IconType = typeof LayoutDashboard;

type AppProfile = {
  id: string;
  full_name: string;
  role: "owner" | "admin" | "cashier";
  status: "pending" | "active" | "rejected" | "disabled";
  organization_id: string | null;
};

type ProductRow = {
  id: string;
  name: string;
  code: string;
  category: string;
  stock: string;
  stockValue: number;
  base: string;
  price: string;
  priceValue: number;
  status: string;
  active: boolean;
};

const primaryNavigation: { id: ViewId; label: string; icon: IconType; badge?: string }[] = [
  { id: "dashboard", label: "Ringkasan", icon: LayoutDashboard },
  { id: "products", label: "Produk", icon: Package },
  { id: "inventory", label: "Stok & pembelian", icon: Boxes, badge: "8" },
  { id: "transactions", label: "Transaksi", icon: ShoppingCart },
  { id: "orders", label: "Pesanan online", icon: ShoppingBag, badge: "3" },
  { id: "shifts", label: "Shift kasir", icon: WalletCards },
];

const managementNavigation: { id: ViewId; label: string; icon: IconType }[] = [
  { id: "branches", label: "Cabang", icon: Building2 },
  { id: "team", label: "Pegawai", icon: Users },
  { id: "reports", label: "Laporan", icon: FileText },
  { id: "settings", label: "Pengaturan", icon: Settings },
];

const transactions = [
  { id: "TRX-020826-1048", time: "10:48", cashier: "Siti Rahma", items: "5 barang", method: "Tunai", total: "Rp184.500" },
  { id: "TRX-020826-1047", time: "10:41", cashier: "Dedi Irawan", items: "3 barang", method: "QRIS", total: "Rp96.000" },
  { id: "TRX-020826-1046", time: "10:34", cashier: "Siti Rahma", items: "8 barang", method: "Campuran", total: "Rp427.500" },
  { id: "TRX-020826-1045", time: "10:25", cashier: "Dedi Irawan", items: "2 barang", method: "Tempo", total: "Rp71.000" },
  { id: "TRX-020826-1044", time: "10:12", cashier: "Siti Rahma", items: "4 barang", method: "Transfer", total: "Rp156.000" },
];

const orders = [
  { id: "ORD-0826-031", customer: "Bu Ratna", detail: "7 produk · Ambil di toko", time: "5 menit lalu", total: "Rp328.500", status: "Perlu konfirmasi" },
  { id: "ORD-0826-030", customer: "Pak Hendra", detail: "3 produk · Cabang Antapani", time: "18 menit lalu", total: "Rp143.000", status: "Disiapkan" },
  { id: "ORD-0826-029", customer: "Warung Ibu Yani", detail: "12 produk · Pesanan grosir", time: "32 menit lalu", total: "Rp1.284.000", status: "Perlu konfirmasi" },
];

const navTitle: Record<ViewId, { title: string; eyebrow: string }> = {
  dashboard: { title: "Ringkasan toko", eyebrow: "Minggu, 2 Agustus 2026" },
  products: { title: "Produk & harga", eyebrow: "Kelola katalog dan satuan produk" },
  inventory: { title: "Stok & pembelian", eyebrow: "Pantau persediaan setiap cabang" },
  transactions: { title: "Riwayat transaksi", eyebrow: "Semua transaksi penjualan" },
  orders: { title: "Pesanan online", eyebrow: "Konfirmasi sebelum stok direservasi" },
  shifts: { title: "Shift kasir", eyebrow: "Buka, tutup, dan rekonsiliasi kas" },
  branches: { title: "Cabang toko", eyebrow: "Kinerja dan operasional setiap lokasi" },
  team: { title: "Pegawai", eyebrow: "Akun, peran, dan persetujuan akses" },
  reports: { title: "Laporan usaha", eyebrow: "Penjualan, laba, dan arus stok" },
  settings: { title: "Pengaturan", eyebrow: "Sesuaikan cara toko beroperasi" },
};

function BrandMark() {
  return (
    <div className="brand-mark" aria-hidden="true">
      <span>AL</span>
    </div>
  );
}

function StatusPill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "good" | "warn" | "danger" | "info" | "neutral" }) {
  return <span className={`status-pill ${tone}`}>{children}</span>;
}

function SortableHeader({ label, column }: { label: string; column: { getCanSort: () => boolean; getIsSorted: () => false | "asc" | "desc"; getToggleSortingHandler: () => ((event: unknown) => void) | undefined } }) {
  if (!column.getCanSort()) return <span>{label}</span>;
  const direction = column.getIsSorted();
  return (
    <button className={`table-sort ${direction ? "sorted" : ""}`} onClick={column.getToggleSortingHandler()}>
      {label}
      <span aria-hidden="true">{direction === "asc" ? "↑" : direction === "desc" ? "↓" : "↕"}</span>
    </button>
  );
}

function ProductActions({ product }: { product: ProductRow }) {
  const copy = (value: string) => void navigator.clipboard?.writeText(value);
  return (
    <BaseMenu.Root>
      <BaseMenu.Trigger className="icon-button" aria-label={`Aksi untuk ${product.name}`}><MoreHorizontal size={18} /></BaseMenu.Trigger>
      <BaseMenu.Portal>
        <BaseMenu.Positioner sideOffset={6} align="end" className="menu-positioner">
          <BaseMenu.Popup className="action-menu">
            <BaseMenu.Item className="action-menu-item" onClick={() => copy(product.code)}>Salin kode produk</BaseMenu.Item>
            <BaseMenu.Item className="action-menu-item" onClick={() => copy(product.name)}>Salin nama produk</BaseMenu.Item>
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  );
}

function LoginScreen() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const submitAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    if (mode === "register") {
      if (password !== confirmPassword) {
        setError("Konfirmasi kata sandi tidak sama.");
        setLoading(false);
        return;
      }
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim(), phone: phone.trim(), address: address.trim() } },
      });
      if (signUpError) setError(signUpError.message);
      else if (!data.session) setNotice("Pendaftaran berhasil. Periksa email untuk mengonfirmasi akun, lalu masuk kembali.");
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) setError("Email atau kata sandi tidak sesuai.");
    }
    setLoading(false);
  };

  const resetPassword = async () => {
    if (!email.trim()) {
      setError("Isi email terlebih dahulu untuk mengatur ulang kata sandi.");
      return;
    }
    setLoading(true);
    setError("");
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
    if (resetError) setError(resetError.message);
    else setNotice("Tautan pengaturan ulang kata sandi sudah dikirim ke email.");
    setLoading(false);
  };

  return (
    <main className="login-shell">
      <section className="login-brand-panel">
        <div className="login-brand"><BrandMark /><span><strong>Agung Lestari</strong><small>Pusat operasional toko</small></span></div>
        <div className="login-copy"><p>ADMIN TOKO</p><h1>Kelola seluruh cabang dari satu tempat.</h1><span>Produk, persediaan, transaksi, dan pegawai tersimpan aman di database pusat.</span></div>
        <div className="login-status"><span className="live-dot" /><span><strong>Backend aktif</strong><small>Terhubung dengan Supabase</small></span></div>
      </section>
      <section className="login-form-panel">
        <form className="login-form" onSubmit={submitAuth}>
          <div><p>{mode === "login" ? "SELAMAT DATANG" : "PENDAFTARAN AKUN"}</p><h2>{mode === "login" ? "Masuk ke akun admin" : "Buat akun pertama"}</h2><span>{mode === "login" ? "Gunakan akun yang sudah dibuat di Supabase." : "Akun pertama otomatis menjadi owner. Akun berikutnya menunggu persetujuan."}</span></div>
          {mode === "register" && <><label>Nama lengkap<input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Nama lengkap" autoComplete="name" required /></label><div className="login-two-columns"><label>Nomor HP<input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="08xxxxxxxxxx" autoComplete="tel" /></label><label>Alamat<input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Alamat tempat tinggal" /></label></div></>}
          <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@tokolestari.com" autoComplete="email" required /></label>
          <label>Kata sandi<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Masukkan kata sandi" autoComplete="current-password" required /></label>
          {mode === "register" && <label>Ulangi kata sandi<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Ulangi kata sandi" autoComplete="new-password" required /></label>}
          {error && <div className="login-message error">{error}</div>}
          {notice && <div className="login-message success">{notice}</div>}
          <button className="button primary login-submit" disabled={loading}>{loading ? <><LoaderCircle className="spin" size={17}/> Memproses...</> : mode === "login" ? "Masuk" : "Daftar akun"}</button>
          {mode === "login" && <button type="button" className="forgot-button" onClick={resetPassword} disabled={loading}>Lupa kata sandi?</button>}
          <div className="auth-switch"><span>{mode === "login" ? "Belum mempunyai akun?" : "Sudah mempunyai akun?"}</span><button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setNotice(""); }}>{mode === "login" ? "Daftar" : "Masuk"}</button></div>
        </form>
      </section>
    </main>
  );
}

function AccountState({ profile, onLogout }: { profile: AppProfile; onLogout: () => void }) {
  const copy = profile.status === "pending"
    ? ["Akun menunggu persetujuan", "Admin toko perlu menyetujui akun ini sebelum dashboard dapat digunakan."]
    : profile.status === "rejected"
      ? ["Pendaftaran akun ditolak", "Hubungi admin toko jika status ini perlu diperiksa kembali."]
      : ["Akun dinonaktifkan", "Hubungi owner atau admin toko untuk mengaktifkan kembali akun ini."];
  return <main className="account-state"><BrandMark /><h1>{copy[0]}</h1><p>{copy[1]}</p><span>{profile.full_name}</span><button className="button secondary" onClick={onLogout}><LogOut size={16}/> Keluar</button></main>;
}

function Sidebar({ current, onChange, open, onClose, profile, onLogout }: { current: ViewId; onChange: (id: ViewId) => void; open: boolean; onClose: () => void; profile: AppProfile; onLogout: () => void }) {
  const go = (id: ViewId) => {
    onChange(id);
    onClose();
  };
  return (
    <>
      {open && <button className="sidebar-scrim" onClick={onClose} aria-label="Tutup navigasi" />}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-top">
          <div className="brand-lockup">
            <BrandMark />
            <div><strong>Agung Lestari</strong><span>Pusat operasional</span></div>
          </div>
          <button className="icon-button mobile-only" onClick={onClose} aria-label="Tutup menu"><X size={19} /></button>
        </div>

        <nav aria-label="Navigasi utama">
          <p className="nav-caption">OPERASIONAL</p>
          {primaryNavigation.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={`nav-item ${current === item.id ? "active" : ""}`} onClick={() => go(item.id)}>
                <Icon size={19} strokeWidth={1.8} />
                <span>{item.label}</span>
                {item.badge && <b>{item.badge}</b>}
              </button>
            );
          })}
          <p className="nav-caption second">MANAJEMEN</p>
          {managementNavigation.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={`nav-item ${current === item.id ? "active" : ""}`} onClick={() => go(item.id)}>
                <Icon size={19} strokeWidth={1.8} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-foot">
          <div className="sync-card">
            <div className="sync-icon"><Check size={15} strokeWidth={2.5} /></div>
            <div><strong>Backend terhubung</strong><span>Supabase aktif</span></div>
          </div>
          <div className="user-card">
            <div className="avatar">{profile.full_name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</div>
            <div><strong>{profile.full_name}</strong><span>{profile.role === "owner" ? "Owner" : profile.role === "admin" ? "Admin" : "Kasir"}</span></div>
            <button className="icon-button logout-button" onClick={onLogout} aria-label="Keluar dari akun"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>
    </>
  );
}

function Topbar({ current, onMenu, onNotify, notificationsOpen }: { current: ViewId; onMenu: () => void; onNotify: () => void; notificationsOpen: boolean }) {
  const copy = navTitle[current];
  return (
    <header className="topbar">
      <div className="page-heading">
        <button className="icon-button menu-trigger" onClick={onMenu} aria-label="Buka navigasi"><Menu size={20} /></button>
        <div><p>{copy.eyebrow}</p><h1>{copy.title}</h1></div>
      </div>
      <div className="topbar-actions">
        <label className="branch-picker">
          <Store size={17} />
          <span><small>Cabang aktif</small><strong>Antapani</strong></span>
          <ChevronDown size={16} />
          <select aria-label="Pilih cabang" defaultValue="antapani">
            <option value="all">Semua cabang</option>
            <option value="antapani">Antapani</option>
            <option value="cicaheum">Cicaheum</option>
            <option value="ujungberung">Ujung Berung</option>
          </select>
        </label>
        <button className={`notification-button ${notificationsOpen ? "active" : ""}`} onClick={onNotify} aria-label="Notifikasi">
          <Bell size={20} /><i>3</i>
        </button>
      </div>
    </header>
  );
}

function NotificationPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="notification-panel">
      <div className="panel-heading"><div><p>NOTIFIKASI</p><h3>Perlu perhatian</h3></div><button className="icon-button" onClick={onClose}><X size={18} /></button></div>
      <button className="notification-row"><span className="notice-symbol order"><Check size={17} /></span><span><strong>Backend Supabase terhubung</strong><small>Autentikasi dan database siap digunakan</small></span></button>
      <button className="notification-row"><span className="notice-symbol stock"><Package size={17} /></span><span><strong>Pantau stok minimum</strong><small>Produk baru akan muncul otomatis di persediaan</small></span></button>
      <button className="notification-row"><span className="notice-symbol user"><UserCheck size={17} /></span><span><strong>Persetujuan pegawai aktif</strong><small>Akun setelah owner akan berstatus menunggu</small></span></button>
      <button className="text-action">Lihat semua notifikasi <ChevronRight size={15} /></button>
    </div>
  );
}

function Dashboard({ goTo }: { goTo: (id: ViewId) => void }) {
  const [period, setPeriod] = useState("Hari ini");
  const [summary, setSummary] = useState({ grossSales: 0, netSales: 0, grossProfit: 0, transactions: 0, cancelled: 0, pendingOrders: 0 });
  const [hourlySales, setHourlySales] = useState<number[]>(Array(9).fill(0));
  const [recentSales, setRecentSales] = useState<Array<{ id: string; time: string; method: string; total: string }>>([]);

  useEffect(() => {
    const loadDashboard = async () => {
      const { data: branches } = await supabase.from("branches").select("id").eq("is_active", true).order("created_at").limit(1);
      const branchId = branches?.[0]?.id;
      if (!branchId) return;
      const now = new Date();
      const dateParts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
      const part = (type: string) => dateParts.find((item) => item.type === type)?.value ?? "";
      const date = `${part("year")}-${part("month")}-${part("day")}`;
      const start = `${date}T00:00:00+07:00`;
      const nextDay = new Date(`${date}T00:00:00+07:00`);
      nextDay.setDate(nextDay.getDate() + 1);
      const end = nextDay.toISOString();
      const [summaryResult, salesResult, orderResult] = await Promise.all([
        supabase.from("dashboard_daily_summary").select("transaction_count,gross_sales,gross_profit,cancelled_amount").eq("branch_id", branchId).eq("sale_date", date).maybeSingle(),
        supabase.from("sales").select("transaction_number,occurred_at,total_amount,status,payments(method)").eq("branch_id", branchId).gte("occurred_at", start).lt("occurred_at", end).order("occurred_at", { ascending: false }),
        supabase.from("online_orders").select("id", { count: "exact", head: true }).eq("branch_id", branchId).eq("status", "pending"),
      ]);
      const summaryRow = summaryResult.data;
      const grossSales = Number(summaryRow?.gross_sales ?? 0);
      const cancelled = Number(summaryRow?.cancelled_amount ?? 0);
      setSummary({
        grossSales,
        netSales: Math.max(grossSales - cancelled, 0),
        grossProfit: Number(summaryRow?.gross_profit ?? 0),
        transactions: Number(summaryRow?.transaction_count ?? 0),
        cancelled,
        pendingOrders: orderResult.count ?? 0,
      });
      const buckets = Array(9).fill(0) as number[];
      const sales = (salesResult.data ?? []) as unknown as Array<{ transaction_number: string; occurred_at: string; total_amount: number; status: string; payments: Array<{ method: string }> }>;
      sales.filter((sale) => sale.status === "completed").forEach((sale) => {
        const hour = Number(new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", hour12: false }).format(new Date(sale.occurred_at)));
        if (hour >= 8 && hour <= 16) buckets[hour - 8] += Number(sale.total_amount);
      });
      setHourlySales(buckets);
      setRecentSales(sales.slice(0, 4).map((sale) => ({
        id: sale.transaction_number,
        time: new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" }).format(new Date(sale.occurred_at)),
        method: sale.payments?.[0]?.method?.toUpperCase() ?? "—",
        total: new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(sale.total_amount)),
      })));
    };
    void loadDashboard();
  }, []);

  const rupiah = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
  const maxHourly = Math.max(...hourlySales, 1);
  return (
    <div className="view-stack">
      <section className="dashboard-controls">
        <div className="control-field"><span>Outlet</span><button><Store size={16} /> Antapani <ChevronDown size={15} /></button></div>
        <div className="control-field"><span>Periode laporan</span><button><CalendarDays size={16} /> 2 Agustus 2026 <ChevronDown size={15} /></button></div>
        <div className="control-field"><span>Dibandingkan dengan</span><button>Minggu lalu <ChevronDown size={15} /></button></div>
        <div className="control-actions"><button className="button secondary" onClick={() => goTo("reports")}><Download size={16} /> Ekspor laporan</button></div>
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <p>Penjualan kotor</p><h3>{rupiah(summary.grossSales)}</h3><span>Data transaksi hari ini</span>
        </article>
        <article className="metric-card">
          <p>Penjualan bersih</p><h3>{rupiah(summary.netSales)}</h3><span>Setelah retur dan pembatalan</span>
        </article>
        <article className="metric-card">
          <p>Laba kotor</p><h3>{rupiah(summary.grossProfit)}</h3><span>Snapshot harga modal</span>
        </article>
        <article className="metric-card">
          <p>Total transaksi</p><h3>{summary.transactions}</h3><span>Transaksi selesai</span>
        </article>
        <article className="metric-card">
          <p>Retur & pembatalan</p><h3>{rupiah(summary.cancelled)}</h3><span>Hari ini</span>
        </article>
        <article className="metric-card">
          <p>Pesanan online</p><h3>{summary.pendingOrders}</h3><span className="metric-change warning">Menunggu konfirmasi</span>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="surface sales-chart">
          <div className="surface-heading">
            <div><h3>Penjualan menurut waktu</h3><p className="heading-note">Jumlah penjualan kotor per jam</p></div>
            <div className="period-tabs">{["Hari ini", "7 hari", "30 hari"].map((item) => <button key={item} onClick={() => setPeriod(item)} className={period === item ? "active" : ""}>{item}</button>)}</div>
          </div>
          <div className="chart-summary"><strong>{rupiah(summary.grossSales)}</strong><span>Data langsung dari transaksi tersinkron</span></div>
          <div className="bar-chart" aria-label="Grafik penjualan per jam">
            {hourlySales.map((value, index) => <div className="bar-column" key={index}><div style={{ height: `${Math.max((value / maxHourly) * 92, value > 0 ? 8 : 1)}%` }} className={value === maxHourly && value > 0 ? "peak" : ""}><i /></div><span>{["08", "09", "10", "11", "12", "13", "14", "15", "16"][index]}</span></div>)}
            <div className="average-line"><span>rata-rata</span></div>
          </div>
        </article>

        <article className="surface branch-performance">
          <div className="surface-heading"><div><h3>Penjualan per outlet</h3><p className="heading-note">Hari ini, pukul 10:51 WIB</p></div><button className="icon-button"><MoreHorizontal size={19} /></button></div>
          <div className="branch-list">
            <div className="branch-row"><span className="rank first">1</span><div><strong>Antapani</strong><small>{summary.transactions} transaksi</small></div><span><strong>{rupiah(summary.grossSales)}</strong><small className="positive">Aktif</small></span></div>
          </div>
          <button className="text-action" onClick={() => goTo("branches")}>Bandingkan cabang <ChevronRight size={15} /></button>
        </article>
      </section>

      <section className="dashboard-grid lower">
        <article className="surface recent-transactions">
          <div className="surface-heading"><div><h3>Transaksi terbaru</h3><p className="heading-note">Cabang Antapani</p></div><button className="text-action" onClick={() => goTo("transactions")}>Lihat semua <ChevronRight size={15} /></button></div>
          <div className="compact-table">
            {recentSales.map((sale) => <div className="transaction-row" key={sale.id}><span className="transaction-icon"><ShoppingCart size={17} /></span><div><strong>{sale.id}</strong><small>{sale.time} · tersinkron</small></div><StatusPill tone={sale.method === "QRIS" ? "info" : "neutral"}>{sale.method}</StatusPill><strong className="amount">{sale.total}</strong></div>)}
            {recentSales.length === 0 && <div className="compact-empty">Belum ada transaksi hari ini.</div>}
          </div>
        </article>
        <article className="surface attention-card">
          <div className="surface-heading"><div><h3>Perlu ditindaklanjuti</h3><p className="heading-note">Data operasional</p></div></div>
          <button className="attention-row" onClick={() => goTo("orders")}><span className="notice-symbol order"><ShoppingBag size={17} /></span><span><strong>{summary.pendingOrders} pesanan menunggu</strong><small>Konfirmasi sebelum stok direservasi</small></span><ChevronRight size={17} /></button>
          <button className="attention-row" onClick={() => goTo("inventory")}><span className="notice-symbol stock"><Package size={17} /></span><span><strong>Periksa persediaan</strong><small>Stok minimum dihitung per produk</small></span><ChevronRight size={17} /></button>
          <button className="attention-row" onClick={() => goTo("team")}><span className="notice-symbol user"><UserCheck size={17} /></span><span><strong>Kelola akses pegawai</strong><small>Akun baru memerlukan persetujuan admin</small></span><ChevronRight size={17} /></button>
        </article>
      </section>
    </div>
  );
}

function ProductsView() {
  const [query, setQuery] = useState("");
  const [activeView, setActiveView] = useState("Semua");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [liveProducts, setLiveProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [lookups, setLookups] = useState<{ branches: Array<{ id: string; name: string }>; categories: Array<{ id: string; name: string }>; units: Array<{ id: string; name: string }> }>({ branches: [], categories: [], units: [] });
  const [form, setForm] = useState({ name: "", code: "", branchId: "", categoryId: "", unitId: "", sellingPrice: "", initialStock: "0", minimumStock: "0" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const loadProducts = async () => {
    setLoading(true);
    setLoadError("");
    const { data, error } = await supabase
      .from("products")
      .select("id, name, code, minimum_stock, is_active, categories(name), units!products_base_unit_id_fkey(name), product_units(selling_price,is_default_sale_unit), branch_products(stock_base_qty)")
      .order("name");
    if (error) {
      setLoadError("Produk belum dapat dimuat dari database.");
      setLiveProducts([]);
    } else {
      const mapped = ((data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => {
        const category = row.categories as { name?: string } | null;
        const unit = row.units as { name?: string } | null;
        const unitPrices = (row.product_units as Array<{ selling_price: number; is_default_sale_unit: boolean }> | null) ?? [];
        const stocks = (row.branch_products as Array<{ stock_base_qty: number }> | null) ?? [];
        const stock = Number(stocks[0]?.stock_base_qty ?? 0);
        const minimum = Number(row.minimum_stock ?? 0);
        const price = Number(unitPrices.find((item) => item.is_default_sale_unit)?.selling_price ?? unitPrices[0]?.selling_price ?? 0);
        return {
          id: String(row.id),
          name: String(row.name),
          code: String(row.code),
          category: category?.name ?? "Tanpa kategori",
          stock: `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 3 }).format(stock)} ${unit?.name ?? "unit"}`,
          stockValue: stock,
          base: unit?.name ?? "—",
          price: new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(price),
          priceValue: price,
          status: stock <= 0 ? "Kritis" : stock <= minimum ? "Menipis" : "Tersedia",
          active: Boolean(row.is_active),
        };
      });
      setLiveProducts(mapped);
    }
    setLoading(false);
  };

  useEffect(() => { void loadProducts(); }, []);

  const openCreate = async () => {
    setCreateOpen(true);
    setFormError("");
    const [branchResult, categoryResult, unitResult] = await Promise.all([
      supabase.from("branches").select("id,name").eq("is_active", true).order("name"),
      supabase.from("categories").select("id,name").eq("is_active", true).order("name"),
      supabase.from("units").select("id,name").order("name"),
    ]);
    const nextLookups = {
      branches: (branchResult.data ?? []) as Array<{ id: string; name: string }>,
      categories: (categoryResult.data ?? []) as Array<{ id: string; name: string }>,
      units: (unitResult.data ?? []) as Array<{ id: string; name: string }>,
    };
    setLookups(nextLookups);
    setForm((current) => ({
      ...current,
      branchId: current.branchId || nextLookups.branches[0]?.id || "",
      categoryId: current.categoryId || nextLookups.categories[0]?.id || "",
      unitId: current.unitId || nextLookups.units[0]?.id || "",
    }));
  };

  const createProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    const { error } = await supabase.rpc("admin_create_product", {
      p_branch_id: form.branchId,
      p_name: form.name.trim(),
      p_code: form.code.trim(),
      p_category_id: form.categoryId || null,
      p_base_unit_id: form.unitId,
      p_selling_price: Number(form.sellingPrice || 0),
      p_initial_stock: Number(form.initialStock || 0),
      p_minimum_stock: Number(form.minimumStock || 0),
    });
    if (error) {
      setFormError(error.message.includes("products_organization_id_code_key") ? "Kode produk sudah digunakan." : error.message);
    } else {
      setCreateOpen(false);
      setForm({ name: "", code: "", branchId: form.branchId, categoryId: form.categoryId, unitId: form.unitId, sellingPrice: "", initialStock: "0", minimumStock: "0" });
      await loadProducts();
    }
    setSaving(false);
  };

  const filtered = useMemo(() => liveProducts.filter((product) => {
    const matchesQuery = `${product.name} ${product.code} ${product.category}`.toLowerCase().includes(query.toLowerCase());
    const matchesView = activeView === "Semua"
      || (activeView === "Aktif" && product.active)
      || (activeView === "Stok menipis" && product.status === "Menipis")
      || (activeView === "Habis" && product.stockValue <= 0)
      || (activeView === "Draf" && !product.active);
    return matchesQuery && matchesView;
  }), [activeView, liveProducts, query]);

  const columns = useMemo<ColumnDef<ProductRow>[]>(() => [
    {
      id: "select",
      enableSorting: false,
      header: ({ table }) => <input type="checkbox" aria-label="Pilih semua produk" checked={table.getIsAllRowsSelected()} ref={(node) => { if (node) node.indeterminate = table.getIsSomeRowsSelected(); }} onChange={table.getToggleAllRowsSelectedHandler()} />,
      cell: ({ row }) => <input type="checkbox" aria-label={`Pilih ${row.original.name}`} checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} />,
    },
    { accessorKey: "name", header: "Produk", cell: ({ row }) => <span className="product-cell"><span><strong>{row.original.name}</strong><small>{row.original.code}</small></span></span> },
    { accessorKey: "category", header: "Kategori" },
    { accessorKey: "stockValue", id: "stock", header: "Stok Antapani", cell: ({ row }) => <strong>{row.original.stock}</strong> },
    { accessorKey: "base", header: "Satuan dasar" },
    { accessorKey: "priceValue", id: "price", header: "Harga jual", cell: ({ row }) => <strong>{row.original.price}</strong> },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusPill tone={row.original.status === "Tersedia" ? "good" : row.original.status === "Kritis" ? "danger" : "warn"}>{row.original.status}</StatusPill> },
    { id: "actions", enableSorting: false, cell: ({ row }) => <ProductActions product={row.original} /> },
  ], []);

  // TanStack Table intentionally exposes stateful functions that React Compiler does not memoize.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filtered,
    columns,
    state: { rowSelection, sorting },
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  const selectedCount = Object.keys(rowSelection).length;
  return (
    <div className="view-stack">
      <div className="action-strip product-actions"><div><p className="helper-copy">{liveProducts.length} produk tersimpan di Supabase</p></div><button className="button secondary"><Download size={17} /> Impor / ekspor</button><button className="button primary" onClick={openCreate}><Plus size={18} /> Tambah produk</button></div>
      <section className="surface data-surface">
        <div className="saved-views">{["Semua", "Aktif", "Stok menipis", "Habis", "Draf"].map((view) => <button key={view} className={activeView === view ? "active" : ""} onClick={() => { setActiveView(view); setRowSelection({}); }}>{view}{view === "Stok menipis" && <b>{liveProducts.filter((product) => product.status === "Menipis").length}</b>}</button>)}</div>
        <div className="table-toolbar"><div className="search-field"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari produk" /></div><div className="toolbar-hint">Klik judul kolom untuk mengurutkan</div></div>
        {selectedCount > 0 && <div className="bulk-bar"><strong>{selectedCount} produk dipilih</strong><button>Ubah status</button><button>Atur kategori</button><button>Ekspor</button><button className="danger-action">Arsipkan</button></div>}
        <div className="data-table product-table">
          {table.getHeaderGroups().map((headerGroup) => <div className="table-head" key={headerGroup.id}>{headerGroup.headers.map((header) => <span key={header.id}>{header.isPlaceholder ? null : typeof header.column.columnDef.header === "string" ? <SortableHeader label={header.column.columnDef.header} column={header.column} /> : flexRender(header.column.columnDef.header, header.getContext())}</span>)}</div>)}
          {table.getRowModel().rows.map((row) => <div className={`table-row ${row.getIsSelected() ? "selected" : ""}`} key={row.id}>{row.getVisibleCells().map((cell) => <span key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</span>)}</div>)}
          {loading && <div className="empty-state"><LoaderCircle className="spin" size={27} /><strong>Memuat produk...</strong></div>}
          {!loading && loadError && <div className="empty-state"><CloudOff size={27} /><strong>{loadError}</strong><button className="button secondary compact" onClick={loadProducts}>Coba lagi</button></div>}
          {!loading && !loadError && filtered.length === 0 && <div className="empty-state"><Package size={30} /><strong>{query ? "Produk tidak ditemukan" : "Belum ada produk"}</strong><span>{query ? "Coba gunakan nama atau kode yang berbeda." : "Tambahkan produk pertama untuk mulai mengelola stok."}</span>{!query && <button className="button primary compact" onClick={openCreate}><Plus size={16}/> Tambah produk</button>}</div>}
        </div>
        <div className="table-footer"><span>Menampilkan {filtered.length} dari {liveProducts.length} produk</span><div><button disabled><ChevronDown size={16} /></button><b>1</b><button disabled><ChevronRight size={16} /></button></div></div>
      </section>
      <Dialog.Root open={createOpen} onOpenChange={(open) => { if (!saving) setCreateOpen(open); }} disablePointerDismissal={saving}>
        <Dialog.Portal>
          <Dialog.Backdrop className="modal-scrim" />
          <Dialog.Viewport className="dialog-viewport">
            <Dialog.Popup className="product-modal">
              <form onSubmit={createProduct}>
                <div className="modal-head"><div><Dialog.Title>Tambah produk</Dialog.Title><Dialog.Description>Produk akan langsung tersimpan di Supabase.</Dialog.Description></div><Dialog.Close className="icon-button" disabled={saving} aria-label="Tutup"><X size={18}/></Dialog.Close></div>
                <div className="product-form-grid"><label className="span-two">Nama produk<input value={form.name} onChange={(event) => setForm({...form, name: event.target.value})} placeholder="Contoh: Minyakita 1 Liter" required /></label><label>Kode produk<input value={form.code} onChange={(event) => setForm({...form, code: event.target.value})} placeholder="PRD-0001" required /></label><label>Cabang awal<select value={form.branchId} onChange={(event) => setForm({...form, branchId: event.target.value})} required>{lookups.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label><label>Kategori<select value={form.categoryId} onChange={(event) => setForm({...form, categoryId: event.target.value})}>{lookups.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Satuan dasar<select value={form.unitId} onChange={(event) => setForm({...form, unitId: event.target.value})} required>{lookups.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label><label>Harga jual<input type="number" min="0" value={form.sellingPrice} onChange={(event) => setForm({...form, sellingPrice: event.target.value})} placeholder="0" required /></label><label>Stok awal<input type="number" step="0.001" value={form.initialStock} onChange={(event) => setForm({...form, initialStock: event.target.value})} /></label><label>Stok minimum<input type="number" min="0" step="0.001" value={form.minimumStock} onChange={(event) => setForm({...form, minimumStock: event.target.value})} /></label></div>
                {formError && <div className="login-message error">{formError}</div>}
                <div className="modal-actions"><Dialog.Close className="button secondary" disabled={saving}>Batal</Dialog.Close><button className="button primary" disabled={saving}>{saving ? <><LoaderCircle className="spin" size={16}/> Menyimpan...</> : "Simpan produk"}</button></div>
              </form>
            </Dialog.Popup>
          </Dialog.Viewport>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function InventoryView() {
  const [inventoryTab, setInventoryTab] = useState("Persediaan");
  const [adjusting, setAdjusting] = useState<{ id: string; name: string; branchId: string } | null>(null);
  const [rows, setRows] = useState<Array<{ id: string; name: string; stock: number; minimum: number; unit: string; branchId: string }>>([]);
  const [branchName, setBranchName] = useState("Cabang");
  const [loading, setLoading] = useState(true);
  const [adjustForm, setAdjustForm] = useState({ delta: "1", movementType: "adjustment", notes: "" });
  const [adjustError, setAdjustError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadInventory = async () => {
    setLoading(true);
    const { data: branches } = await supabase.from("branches").select("id,name").eq("is_active", true).order("created_at").limit(1);
    const branch = branches?.[0] as { id: string; name: string } | undefined;
    if (!branch) {
      setRows([]);
      setLoading(false);
      return;
    }
    setBranchName(branch.name);
    const { data } = await supabase
      .from("products")
      .select("id,name,minimum_stock,units!products_base_unit_id_fkey(name),branch_products!inner(branch_id,stock_base_qty)")
      .eq("branch_products.branch_id", branch.id)
      .order("name");
    const mapped = ((data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => {
      const unit = row.units as { name?: string } | null;
      const branchStocks = (row.branch_products as Array<{ stock_base_qty: number }> | null) ?? [];
      return { id: String(row.id), name: String(row.name), stock: Number(branchStocks[0]?.stock_base_qty ?? 0), minimum: Number(row.minimum_stock ?? 0), unit: unit?.name ?? "unit", branchId: branch.id };
    });
    setRows(mapped);
    setLoading(false);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadInventory(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const saveAdjustment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!adjusting) return;
    setSaving(true);
    setAdjustError("");
    const { error } = await supabase.rpc("admin_adjust_stock", {
      p_branch_id: adjusting.branchId,
      p_product_id: adjusting.id,
      p_quantity_delta: Number(adjustForm.delta),
      p_movement_type: adjustForm.movementType,
      p_notes: adjustForm.notes || null,
    });
    if (error) setAdjustError(error.message);
    else {
      setAdjusting(null);
      setAdjustForm({ delta: "1", movementType: "adjustment", notes: "" });
      await loadInventory();
    }
    setSaving(false);
  };

  const lowStockCount = rows.filter((row) => row.stock <= row.minimum).length;
  return (
    <div className="view-stack">
      <div className="module-tabs">{["Persediaan", "Pesanan pembelian", "Penerimaan", "Transfer", "Stock opname"].map((tab) => <button key={tab} className={inventoryTab === tab ? "active" : ""} onClick={() => setInventoryTab(tab)}>{tab}</button>)}</div>
      <div className="action-strip align-end"><p className="helper-copy">Cabang {branchName} · Data langsung dari Supabase</p><button className="button secondary"><History size={17} /> Riwayat penyesuaian</button><button className="button primary"><Truck size={18} /> Terima barang</button></div>
      <section className="workflow-strip"><div><span className="step done"><Check size={14}/></span><p><strong>Pesanan dibuat</strong><small>PO-0826-018 · kemarin</small></p></div><ChevronRight size={16}/><div><span className="step current">2</span><p><strong>Dalam pengiriman</strong><small>Supplier Sumber Makmur</small></p></div><ChevronRight size={16}/><div><span className="step">3</span><p><strong>Menunggu penerimaan</strong><small>Estimasi hari ini</small></p></div><button className="button secondary compact">Buka pesanan</button></section>
      <section className="surface data-surface">
        <div className="surface-heading inventory-title"><div><h3>Persediaan outlet</h3><p className="heading-note">{lowStockCount} produk berada di bawah batas minimum</p></div><div className="search-field small"><Search size={17} /><input placeholder="Cari produk" /></div></div>
        <div className="data-table stock-table">
          <div className="table-head"><span>Produk</span><span>Stok sekarang</span><span>Minimum</span><span>Penjualan 7 hari</span><span>Estimasi habis</span><span>Tindakan</span></div>
          {rows.map((row) => <div className="table-row" key={row.id}><span className="product-cell"><strong>{row.name}</strong></span><span><strong>{new Intl.NumberFormat("id-ID", { maximumFractionDigits: 3 }).format(row.stock)} {row.unit}</strong></span><span>{new Intl.NumberFormat("id-ID", { maximumFractionDigits: 3 }).format(row.minimum)} {row.unit}</span><span>Belum ada transaksi</span><span><StatusPill tone={row.stock <= 0 ? "danger" : row.stock <= row.minimum ? "warn" : "good"}>{row.stock <= 0 ? "Habis" : row.stock <= row.minimum ? "Perlu restok" : "Aman"}</StatusPill></span><button className="text-button" onClick={() => setAdjusting({ id: row.id, name: row.name, branchId: row.branchId })}>Sesuaikan stok</button></div>)}
          {loading && <div className="empty-state"><LoaderCircle className="spin" size={26}/><strong>Memuat persediaan...</strong></div>}
          {!loading && rows.length === 0 && <div className="empty-state"><Boxes size={28}/><strong>Belum ada persediaan</strong><span>Tambahkan produk terlebih dahulu dari menu Produk.</span></div>}
        </div>
      </section>
      <Dialog.Root open={Boolean(adjusting)} onOpenChange={(open) => { if (!open && !saving) setAdjusting(null); }} disablePointerDismissal={saving}>
        <Dialog.Portal>
          <Dialog.Backdrop className="modal-scrim" />
          <Dialog.Viewport className="dialog-viewport">
            <Dialog.Popup className="stock-modal">
              {adjusting && <form onSubmit={saveAdjustment}>
                <div className="modal-head"><div><Dialog.Title className="dialog-title">Sesuaikan stok</Dialog.Title><Dialog.Description className="dialog-description">{adjusting.name} · Cabang {branchName}</Dialog.Description></div><Dialog.Close className="icon-button" disabled={saving} aria-label="Tutup"><X size={18}/></Dialog.Close></div>
                <label>Alasan penyesuaian<select value={adjustForm.movementType} onChange={(event) => setAdjustForm({...adjustForm, movementType: event.target.value})}><option value="purchase">Stok diterima / pembelian</option><option value="adjustment">Hasil hitung ulang</option><option value="damaged">Barang rusak / hilang</option><option value="sale_return">Retur pelanggan</option><option value="purchase_return">Retur ke supplier</option></select></label>
                <label>Perubahan jumlah<input type="number" step="0.001" value={adjustForm.delta} onChange={(event) => setAdjustForm({...adjustForm, delta: event.target.value})} required /><small>Gunakan angka negatif untuk mengurangi stok, misalnya −2.</small></label>
                <label>Catatan<textarea value={adjustForm.notes} onChange={(event) => setAdjustForm({...adjustForm, notes: event.target.value})} placeholder="Tambahkan catatan untuk riwayat stok" /></label>
                {adjustError && <div className="login-message error">{adjustError}</div>}
                <div className="modal-actions"><Dialog.Close className="button secondary" disabled={saving}>Batal</Dialog.Close><button className="button primary" disabled={saving}>{saving ? <><LoaderCircle className="spin" size={16}/> Menyimpan...</> : "Simpan penyesuaian"}</button></div>
              </form>}
            </Dialog.Popup>
          </Dialog.Viewport>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function TransactionsView() {
  return (
    <div className="view-stack">
      <div className="action-strip"><div className="search-field"><Search size={18} /><input placeholder="Cari nomor transaksi atau nama kasir..." /></div><button className="button secondary"><CalendarDays size={17} /> 2 Agustus 2026</button><button className="button secondary"><Download size={17} /> Ekspor</button></div>
      <section className="mini-metrics"><div><span>Total transaksi</span><strong>142</strong><small>+18 dari Minggu lalu</small></div><div><span>Nilai penjualan</span><strong>Rp8,46 jt</strong><small>Rata-rata Rp59.595</small></div><div><span>Dibatalkan</span><strong>2</strong><small>Rp84.500 dikembalikan</small></div><div><span>Belum tersinkron</span><strong className="warn-text">3</strong><small>Dari perangkat Kasir 02</small></div></section>
      <section className="surface data-surface"><div className="table-toolbar"><div className="filter-chips"><button className="active">Semua</button><button>Tunai</button><button>QRIS</button><button>Transfer</button><button>Tempo</button></div><button className="button compact secondary"><SlidersHorizontal size={16} /> Filter</button></div><div className="data-table transaction-table"><div className="table-head"><span>Nomor transaksi</span><span>Waktu</span><span>Kasir</span><span>Isi</span><span>Pembayaran</span><span>Total</span><span /></div>{transactions.map((transaction) => <div className="table-row" key={transaction.id}><span><strong>{transaction.id}</strong><small>Tersinkron</small></span><span>{transaction.time} WIB</span><span>{transaction.cashier}</span><span>{transaction.items}</span><span><StatusPill tone={transaction.method === "Tempo" ? "warn" : transaction.method === "QRIS" ? "info" : "neutral"}>{transaction.method}</StatusPill></span><span><strong>{transaction.total}</strong></span><button className="icon-button"><MoreHorizontal size={18} /></button></div>)}</div></section>
    </div>
  );
}

function OrdersView() {
  const [accepted, setAccepted] = useState<string[]>([]);
  return (
    <div className="view-stack">
      <div className="order-summary"><div><span className="big-number">3</span><span><strong>Pesanan menunggu</strong><small>Konfirmasi agar stok dapat direservasi</small></span></div><div><span className="big-number muted">7</span><span><strong>Sedang disiapkan</strong><small>2 pesanan mendekati batas waktu</small></span></div><div><span className="big-number muted">18</span><span><strong>Selesai hari ini</strong><small>Nilai Rp3.640.500</small></span></div></div>
      <section className="orders-layout"><div className="orders-list"><div className="list-heading"><div><p className="section-kicker">ANTREAN PESANAN</p><h3>Terbaru</h3></div><button className="button compact secondary"><SlidersHorizontal size={16} /> Filter</button></div>{orders.map((order, index) => { const done = accepted.includes(order.id); return <article className={`order-card ${index === 0 ? "selected" : ""}`} key={order.id}><div className="order-top"><span><strong>{order.customer}</strong><small>{order.id} · {order.time}</small></span><StatusPill tone={done ? "good" : order.status === "Disiapkan" ? "info" : "warn"}>{done ? "Diterima" : order.status}</StatusPill></div><p>{order.detail}</p><div><strong>{order.total}</strong><button className="text-button">Lihat rincian <ChevronRight size={15} /></button></div></article>; })}</div><aside className="order-detail"><div className="detail-head"><p className="section-kicker">RINCIAN PESANAN</p><h3>ORD-0826-031</h3><span>Dipesan 5 menit lalu dari website</span></div><div className="customer-line"><div className="avatar warm">BR</div><div><strong>Bu Ratna</strong><span>0812 3456 7890 · Ambil di toko</span></div></div><div className="order-items">{[["Minyakita 1 Liter", "2 botol", "Rp35.000"], ["Indomie Goreng", "1 dus", "Rp129.000"], ["Gula Rose Brand", "3 kg", "Rp54.000"], ["Rokok Surya 12", "3 bungkus", "Rp108.000"]].map((item) => <div key={item[0]}><span><strong>{item[0]}</strong><small>{item[1]}</small></span><strong>{item[2]}</strong></div>)}</div><div className="order-total"><span>Total pesanan</span><strong>Rp328.500</strong></div><div className="stock-check"><Check size={16} /><span><strong>Semua stok tersedia</strong><small>Data stok tersinkron 2 menit lalu</small></span></div><div className="detail-actions"><button className="button secondary">Tolak</button><button className="button primary" onClick={() => setAccepted((prev) => [...new Set([...prev, "ORD-0826-031"])])}><Check size={17} /> Terima & reservasi stok</button></div></aside></section>
    </div>
  );
}

function ShiftsView() {
  return (
    <div className="view-stack"><div className="action-strip align-end"><div className="sync-note"><span className="live-dot" /> 2 shift sedang berjalan</div><button className="button secondary"><CalendarDays size={17} /> Hari ini</button><button className="button primary"><Plus size={18} /> Buka shift manual</button></div><section className="shift-grid"><article className="shift-card active-shift"><div className="shift-head"><span className="avatar">SR</span><div><strong>Siti Rahma</strong><small>Kasir 01 · Mulai 07:02</small></div><StatusPill tone="good">Berjalan</StatusPill></div><div className="shift-numbers"><span><small>Penjualan tunai</small><strong>Rp3.240.500</strong></span><span><small>Transaksi</small><strong>74</strong></span><span><small>Durasi</small><strong>3j 51m</strong></span></div><div className="shift-foot"><span><i className="live-dot" /> Perangkat online</span><button className="text-button">Lihat shift</button></div></article><article className="shift-card active-shift"><div className="shift-head"><span className="avatar blue-avatar">DI</span><div><strong>Dedi Irawan</strong><small>Kasir 02 · Mulai 07:18</small></div><StatusPill tone="good">Berjalan</StatusPill></div><div className="shift-numbers"><span><small>Penjualan tunai</small><strong>Rp2.118.000</strong></span><span><small>Transaksi</small><strong>68</strong></span><span><small>Durasi</small><strong>3j 35m</strong></span></div><div className="shift-foot"><span className="offline"><CloudOff size={14} /> 3 transaksi belum sinkron</span><button className="text-button">Lihat shift</button></div></article></section><section className="surface data-surface"><div className="surface-heading inventory-title"><div><p className="section-kicker">RIWAYAT TUTUP KAS</p><h3>Shift terakhir</h3></div><button className="text-action">Lihat seluruh riwayat <ChevronRight size={15} /></button></div><div className="data-table shift-table"><div className="table-head"><span>Kasir</span><span>Waktu tutup</span><span>Kas seharusnya</span><span>Kas aktual</span><span>Selisih</span><span>Status</span></div>{[["Siti Rahma", "Kemarin, 21:08", "Rp4.284.500", "Rp4.284.500", "Rp0", "Sesuai"], ["Dedi Irawan", "Kemarin, 20:54", "Rp3.716.000", "Rp3.711.000", "−Rp5.000", "Kurang"], ["Nina Marlina", "1 Agu, 14:12", "Rp2.845.500", "Rp2.847.500", "+Rp2.000", "Lebih"]].map((row) => <div className="table-row" key={row[0]}>{row.map((cell, i) => <span key={i} className={i === 4 && cell !== "Rp0" ? "warn-text" : ""}>{i === 0 || i === 2 || i === 3 ? <strong>{cell}</strong> : i === 5 ? <StatusPill tone={cell === "Sesuai" ? "good" : "warn"}>{cell}</StatusPill> : cell}</span>)}</div>)}</div></section></div>
  );
}

function BranchesView() {
  const [branches, setBranches] = useState<Array<{ id: string; name: string; code: string; address: string | null; is_active: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("branches").select("id,name,code,address,is_active").order("created_at").then(({ data }) => {
      setBranches((data ?? []) as Array<{ id: string; name: string; code: string; address: string | null; is_active: boolean }>);
      setLoading(false);
    });
  }, []);
  return <div className="view-stack"><div className="action-strip align-end"><p className="helper-copy">{branches.length} cabang tersimpan di Supabase</p><button className="button primary"><Plus size={18} /> Tambah cabang</button></div>{loading ? <section className="surface empty-state"><LoaderCircle className="spin" size={26}/><strong>Memuat cabang...</strong></section> : <section className="branch-cards">{branches.map((branch, i) => <article className="branch-card" key={branch.id}><div className="branch-card-head"><span className={`branch-symbol b${i}`}><Store size={20} /></span><StatusPill tone={branch.is_active ? "good" : "neutral"}>{branch.is_active ? "Aktif" : "Nonaktif"}</StatusPill></div><h3>{branch.name}</h3><p>{branch.address || "Alamat belum diatur"}</p><div className="branch-kpi"><span><small>Kode cabang</small><strong>{branch.code}</strong></span></div><div className="branch-stats"><span><strong>0</strong><small>Transaksi hari ini</small></span><span><strong>0</strong><small>Produk aktif</small></span><span><strong>0</strong><small>Kasir aktif</small></span></div><button className="button secondary full">Kelola cabang <ChevronRight size={16} /></button></article>)}</section>}</div>;
}

function TeamView() {
  const [profiles, setProfiles] = useState<Array<{ id: string; full_name: string; phone: string | null; role: string; status: string; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState("");
  const loadProfiles = async () => {
    const { data } = await supabase.from("profiles").select("id,full_name,phone,role,status,created_at").order("created_at");
    setProfiles((data ?? []) as Array<{ id: string; full_name: string; phone: string | null; role: string; status: string; created_at: string }>);
    setLoading(false);
  };
  useEffect(() => {
    const timer = window.setTimeout(() => { void loadProfiles(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const approve = async (userId: string) => {
    setActionError("");
    const [{ data: authData }, { data: branches }] = await Promise.all([supabase.auth.getUser(), supabase.from("branches").select("id").eq("is_active", true).order("created_at").limit(1)]);
    const { error } = await supabase.from("profiles").update({ status: "active", role: "cashier", approved_by: authData.user?.id, approved_at: new Date().toISOString() }).eq("id", userId);
    if (!error && branches?.[0]?.id) await supabase.from("branch_members").upsert({ branch_id: branches[0].id, user_id: userId, is_default: true });
    if (error) setActionError(error.message);
    else await loadProfiles();
  };
  const pending = profiles.filter((profile) => profile.status === "pending");
  return <div className="view-stack">{pending.length > 0 && <section className="approval-banner"><span className="notice-symbol user"><UserCheck size={20} /></span><div><strong>{pending.length} pendaftaran menunggu persetujuan</strong><p>Akun yang disetujui akan menjadi kasir Cabang Antapani.</p></div><button className="button primary" onClick={() => approve(pending[0].id)}><Check size={17} /> Setujui {pending[0].full_name}</button></section>}{actionError && <div className="login-message error">{actionError}</div>}<section className="surface data-surface"><div className="table-toolbar"><div className="search-field"><Search size={18} /><input placeholder="Cari nama atau nomor HP pegawai..." /></div><span className="helper-copy">Pegawai mendaftar dari halaman login</span></div><div className="data-table team-table"><div className="table-head"><span>Pegawai</span><span>Peran</span><span>Cabang</span><span>Terdaftar</span><span>Status</span><span /></div>{profiles.map((profile, i) => <div className="table-row" key={profile.id}><span className="person-cell"><i className={`avatar ${i === 1 ? "blue-avatar" : ""}`}>{profile.full_name.split(" ").map((name) => name[0]).join("").slice(0,2)}</i><span><strong>{profile.full_name}</strong><small>{profile.phone || "Nomor HP belum diisi"}</small></span></span><span>{profile.role === "owner" ? "Owner" : profile.role === "admin" ? "Admin" : "Kasir"}</span><span>{profile.status === "active" ? "Antapani" : "Belum ditugaskan"}</span><span>{new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(profile.created_at))}</span><span><StatusPill tone={profile.status === "active" ? "good" : profile.status === "pending" ? "warn" : "neutral"}>{profile.status === "active" ? "Aktif" : profile.status === "pending" ? "Menunggu" : profile.status}</StatusPill></span>{profile.status === "pending" ? <button className="text-button" onClick={() => approve(profile.id)}>Setujui</button> : <button className="icon-button"><MoreHorizontal size={18} /></button>}</div>)}{loading && <div className="empty-state"><LoaderCircle className="spin" size={26}/><strong>Memuat pegawai...</strong></div>}</div></section></div>;
}

function ReportsView() {
  return <div className="view-stack"><div className="module-tabs">{["Ringkasan", "Penjualan", "Laba", "Produk", "Kasir", "Persediaan"].map((tab, index) => <button key={tab} className={index === 0 ? "active" : ""}>{tab}</button>)}</div><div className="action-strip align-end"><div className="control-field compact-control"><span>Outlet</span><button>Semua outlet <ChevronDown size={15}/></button></div><div className="control-field compact-control"><span>Periode</span><button><CalendarDays size={15}/> 27 Jul – 2 Agu</button></div><button className="button primary"><Download size={17} /> Ekspor laporan</button></div><section className="metric-grid report-metrics"><article className="metric-card"><p>Penjualan kotor</p><h3>Rp54.720.500</h3><span className="metric-change positive"><ArrowUpRight size={13}/> 9,8%</span></article><article className="metric-card"><p>Penjualan bersih</p><h3>Rp53.886.000</h3><span>Setelah retur dan diskon</span></article><article className="metric-card"><p>Laba kotor</p><h3>Rp10.888.400</h3><span>Margin 20,2%</span></article><article className="metric-card"><p>Total transaksi</p><h3>954</h3><span>Rata-rata Rp57.359</span></article></section><section className="dashboard-grid"><article className="surface sales-chart"><div className="surface-heading"><div><h3>Penjualan per hari</h3><p className="heading-note">Semua outlet</p></div><StatusPill tone="good"><ArrowUpRight size={13} /> 9,8%</StatusPill></div><div className="weekly-bars">{[["Sen", 66], ["Sel", 74], ["Rab", 59], ["Kam", 82], ["Jum", 72], ["Sab", 94], ["Min", 86]].map((bar, i) => <div key={bar[0]}><span>Rp{[6.4,7.2,5.8,8.1,7.0,9.4,8.5][i]}jt</span><i style={{height: `${bar[1]}%`}} className={i === 5 ? "peak" : ""} /><small>{bar[0]}</small></div>)}</div></article><article className="surface top-products-surface"><div className="surface-heading"><div><h3>Produk terlaris</h3><p className="heading-note">Diurutkan berdasarkan omzet</p></div></div><div className="top-products">{[["Rokok Surya 12", "Rp8,42 jt", "96%"], ["Minyakita 1 Liter", "Rp6,18 jt", "72%"], ["Beras Ramos 5kg", "Rp4,92 jt", "58%"], ["Indomie Goreng", "Rp3,81 jt", "44%"]].map((row, i) => <div key={row[0]}><span className="rank">{i + 1}</span><span><strong>{row[0]}</strong><i><b style={{width: row[2]}} /></i></span><strong>{row[1]}</strong></div>)}</div></article></section></div>;
}

const settingGroups = [
  { title: "Operasional kasir", description: "Atur fitur yang muncul pada aplikasi kasir.", items: [["Shift dan tutup kas", "Kasir wajib membuka shift sebelum bertransaksi", true], ["Persetujuan tutup shift", "Admin memeriksa selisih kas sebelum shift selesai", true], ["Kasir dapat membatalkan transaksi", "Berlaku untuk transaksi pada shift yang sama", false], ["Pembayaran campuran", "Satu transaksi dapat memakai beberapa metode pembayaran", true]] },
  { title: "Penjualan", description: "Sesuaikan aturan transaksi di seluruh cabang.", items: [["Diskon transaksi", "Izinkan diskon nominal dan persentase", true], ["Penjualan tempo", "Aktifkan piutang dan pembayaran bertahap", false], ["Izinkan stok minus", "Transaksi dapat dilanjutkan ketika stok tidak cukup", false], ["Pesanan dari website", "Kirim pesanan ke kasir untuk dikonfirmasi", true]] },
];

function SettingsView() {
  const initial = Object.fromEntries(settingGroups.flatMap((group) => group.items.map((item) => [item[0], item[2]])));
  const [toggles, setToggles] = useState<Record<string, boolean>>(initial as Record<string, boolean>);
  return <div className="settings-layout"><aside className="settings-nav"><button className="active"><Store size={18} /> Profil toko</button><button><SlidersHorizontal size={18} /> Fitur & transaksi</button><button><Building2 size={18} /> Cabang</button><button><Users size={18} /> Peran & izin</button><button><CircleDollarSign size={18} /> Harga modal</button><button><Bell size={18} /> Notifikasi</button></aside><div className="settings-content"><section className="surface settings-section"><div className="settings-title"><div><p className="section-kicker">PENGATURAN FITUR</p><h3>Cara toko beroperasi</h3><span>Perubahan berlaku untuk semua cabang kecuali ditentukan lain.</span></div><button className="button primary">Simpan perubahan</button></div>{settingGroups.map((group) => <div className="setting-group" key={group.title}><div><h4>{group.title}</h4><p>{group.description}</p></div><div>{group.items.map((item) => <div className="setting-row" key={item[0] as string}><span><strong>{item[0]}</strong><small>{item[1]}</small></span><button className={`toggle ${toggles[item[0] as string] ? "on" : ""}`} onClick={() => setToggles((prev) => ({...prev, [item[0] as string]: !prev[item[0] as string]}))} aria-label={`${item[0]} ${toggles[item[0] as string] ? "aktif" : "nonaktif"}`}><i /></button></div>)}</div></div>)}</section></div></div>;
}

function AdminContent({ view, onChange }: { view: ViewId; onChange: (id: ViewId) => void }) {
  if (view === "dashboard") return <Dashboard goTo={onChange} />;
  if (view === "products") return <ProductsView />;
  if (view === "inventory") return <InventoryView />;
  if (view === "transactions") return <TransactionsView />;
  if (view === "orders") return <OrdersView />;
  if (view === "shifts") return <ShiftsView />;
  if (view === "branches") return <BranchesView />;
  if (view === "team") return <TeamView />;
  if (view === "reports") return <ReportsView />;
  return <SettingsView />;
}

export default function Home() {
  const [view, setView] = useState<ViewId>("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        if (!data.session) setAuthLoading(false);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (nextSession) setAuthLoading(true);
      setSession(nextSession);
      if (!nextSession) {
        setProfile(null);
        setAuthLoading(false);
      }
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user.id) return;
    supabase.from("profiles").select("id, full_name, role, status, organization_id").eq("id", session.user.id).single()
      .then(({ data, error }) => {
        if (!error && data) setProfile(data as AppProfile);
        setAuthLoading(false);
      });
  }, [session?.user.id]);

  const logout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setView("dashboard");
  };

  if (authLoading) return <main className="app-loading"><BrandMark /><LoaderCircle className="spin" size={22}/><span>Memuat pusat operasional...</span></main>;
  if (!session) return <LoginScreen />;
  if (!profile) return <main className="account-state"><BrandMark /><h1>Profil belum tersedia</h1><p>Silakan keluar lalu masuk kembali. Jika masalah berlanjut, periksa data profil di Supabase.</p><button className="button secondary" onClick={logout}>Keluar</button></main>;
  if (profile.status !== "active") return <AccountState profile={profile} onLogout={logout} />;

  return (
    <main className="admin-shell">
      <Sidebar current={view} onChange={setView} open={menuOpen} onClose={() => setMenuOpen(false)} profile={profile} onLogout={logout} />
      <section className="workspace">
        <Topbar current={view} onMenu={() => setMenuOpen(true)} onNotify={() => setNotificationsOpen((open) => !open)} notificationsOpen={notificationsOpen} />
        <NotificationPanel open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
        <div className="page-content"><AdminContent view={view} onChange={setView} /></div>
      </section>
    </main>
  );
}
