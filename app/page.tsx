"use client";

import {
  Bell, LoaderCircle, Menu, RefreshCw, Store,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import {
  AdminDataProvider, BranchesView, DashboardView, InventoryView,
  NotificationPanel, OrdersView, ProductsView, ReportsView, SettingsView, ShiftsView,
  TeamView, TransactionsView, useAdminData, type AppProfile, type ViewId,
} from "./feature-views";
import { DataToolsView, MembersView, PosView, RacksView, StockOpnameView } from "./retail-wholesale-views";
import { AppSidebar } from "@/components/ui/sidebar-component";

const navTitle: Record<ViewId, { title: string; eyebrow: string }> = {
  dashboard: { title: "Ringkasan toko", eyebrow: "Pantauan operasional terkini" },
  pos: { title: "POS / Kasir", eyebrow: "Transaksi retail dan reseller" },
  products: { title: "Produk & harga", eyebrow: "Katalog, satuan, modal, dan harga jual" },
  customers: { title: "Member & reseller", eyebrow: "Customer, tipe harga, dan riwayat transaksi" },
  inventory: { title: "Stok & pembelian", eyebrow: "Persediaan dan riwayat pergerakan" },
  racks: { title: "Rak & penempatan", eyebrow: "Lokasi produk dan planogram awal" },
  stockOpname: { title: "Stock opname", eyebrow: "Hitung fisik, rekonsiliasi, dan approval" },
  transactions: { title: "Riwayat transaksi", eyebrow: "Penjualan tersinkron dari kasir" },
  orders: { title: "Pesanan online", eyebrow: "Konfirmasi dan reservasi persediaan" },
  shifts: { title: "Shift kasir", eyebrow: "Buka, tutup, dan rekonsiliasi kas" },
  dataTools: { title: "Data, label & dokumen", eyebrow: "Excel, barcode, nota, dan invoice" },
  branches: { title: "Cabang toko", eyebrow: "Lokasi dan operasional setiap outlet" },
  team: { title: "Pegawai", eyebrow: "Akun, peran, cabang, dan persetujuan" },
  reports: { title: "Laporan usaha", eyebrow: "Penjualan, laba, produk, dan kasir" },
  settings: { title: "Pengaturan", eyebrow: "Aturan operasional dan identitas toko" },
};

function ModernTopbar({ current, onMenu, onNotify, notificationsOpen }: { current: ViewId; onMenu: () => void; onNotify: () => void; notificationsOpen: boolean }) {
  const copy = navTitle[current];
  const { branches, activeBranchId, branchesLoading, setActiveBranchId } = useAdminData();

  return (
    <header className="app-topbar flex items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
        <button type="button" onClick={onMenu} className="grid size-10 shrink-0 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Buka navigasi"><Menu size={20} /></button>
        <div>
          <p className="hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600 sm:block">{copy.eyebrow}</p>
          <h1 className="truncate text-lg font-bold tracking-tight text-slate-950 sm:text-xl">{copy.title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {branches.length > 0 && (
          <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 sm:flex">
            <Store size={17} className="text-blue-600" />
            <select
              aria-label="Pilih cabang"
              value={activeBranchId}
              disabled={branchesLoading || branches.length === 0}
              onChange={event => setActiveBranchId(event.target.value)}
              className="h-10 min-w-32 border-0 bg-transparent text-sm font-semibold text-slate-800 outline-none"
            >
              <option value="" disabled>{branchesLoading ? "Memuat cabang..." : "Pilih cabang"}</option>
              {branches.filter(branch => branch.is_active).map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </div>
        )}
        <button
          onClick={onNotify}
          className={`grid size-10 place-items-center rounded-xl border transition-colors ${
            notificationsOpen ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900"
          }`}
          aria-label="Notifikasi"
        >
          <Bell size={20} />
        </button>
      </div>
    </header>
  );
}

function AdminContent({ view, onChange }: { view: ViewId; onChange: (id: ViewId) => void }) {
  const { branches, activeBranchId, branchesLoading, branchesError, refreshBranches } = useAdminData();
  if (branchesLoading) return <section className="flex items-center justify-center h-96 gap-3" role="status"><LoaderCircle className="animate-spin" size={24} /><div><strong>Menyiapkan data cabang</strong><span>Mohon tunggu sebentar.</span></div></section>;
  if (branchesError) return <section className="p-8 rounded-lg border border-red-200 bg-red-50" role="alert"><div><strong className="text-red-900">Data cabang belum tersedia</strong><span className="text-red-700">{branchesError}</span></div><button type="button" className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700" onClick={() => void refreshBranches()}><RefreshCw size={16} /> Coba lagi</button></section>;
  if (!activeBranchId && !["branches", "settings"].includes(view)) return <section className="p-8 rounded-lg border border-amber-200 bg-amber-50"><div><strong className="text-amber-900">Belum ada cabang aktif</strong><span className="text-amber-700">{branches.length ? "Aktifkan salah satu cabang agar fitur operasional dapat digunakan." : "Buat cabang pertama agar fitur operasional dapat digunakan."}</span></div><button type="button" className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700" onClick={() => onChange("branches")}><Store size={16} /> Kelola cabang</button></section>;
  if (view === "dashboard") return <DashboardView goTo={onChange} />;
  if (view === "pos") return <PosView />;
  if (view === "products") return <ProductsView />;
  if (view === "customers") return <MembersView />;
  if (view === "inventory") return <InventoryView />;
  if (view === "racks") return <RacksView />;
  if (view === "stockOpname") return <StockOpnameView />;
  if (view === "transactions") return <TransactionsView />;
  if (view === "orders") return <OrdersView />;
  if (view === "shifts") return <ShiftsView />;
  if (view === "dataTools") return <DataToolsView />;
  if (view === "branches") return <BranchesView />;
  if (view === "team") return <TeamView />;
  if (view === "reports") return <ReportsView />;
  if (view === "settings") return <SettingsView />;
  return <div className="p-8 text-center text-gray-500">Tampilan tidak ditemukan</div>;
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
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            address: address.trim(),
          },
        },
      });
      if (signUpError) setError(signUpError.message);
      else if (!data.session) {
        setNotice("Pendaftaran berhasil. Klik tautan konfirmasi yang dikirim ke email Anda.");
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        if (signInError.code === "email_not_confirmed" || signInError.message.toLowerCase().includes("not confirmed")) {
          setError("Email belum dikonfirmasi. Periksa kotak masuk atau kirim ulang tautannya.");
        } else if (signInError.code === "invalid_credentials") {
          setError("Email atau kata sandi tidak sesuai.");
        } else {
          setError(`Login belum berhasil: ${signInError.message}`);
        }
      }
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen flex bg-gray-50">
      {/* Left Panel - Brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-blue-700 text-white p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center font-bold">AL</div>
            <div>
              <p className="font-bold text-lg">Agung Lestari</p>
              <p className="text-sm text-blue-100">Sistem retail & grosir</p>
            </div>
          </div>
          <h2 className="text-4xl font-bold mb-4">Satu stok, dua cara berjualan.</h2>
          <p className="text-blue-100 text-lg">POS, member reseller, rak, stock opname, barcode, invoice, dan laporan tersambung dalam satu pusat operasional.</p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <form className="w-full max-w-sm space-y-6" onSubmit={submitAuth}>
          <div>
            <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-2">{mode === "login" ? "SELAMAT DATANG" : "PENDAFTARAN AKUN"}</p>
            <h2 className="text-3xl font-bold text-gray-900">{mode === "login" ? "Masuk ke pusat operasional" : "Buat akun"}</h2>
            <p className="text-gray-600 mt-2">{mode === "login" ? "Gunakan email dan kata sandi yang sudah terdaftar." : "Akun baru menunggu persetujuan Owner atau Admin."}</p>
          </div>

          {mode === "register" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Nama lengkap</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={event => setFullName(event.target.value)}
                  autoComplete="name"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Nomor HP</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={event => setPhone(event.target.value)}
                    autoComplete="tel"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Alamat</label>
                  <input
                    type="text"
                    value={address}
                    onChange={event => setAddress(event.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="nama@tokolestari.com"
              autoComplete="email"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Kata sandi</label>
            <input
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {mode === "register" && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Ulangi kata sandi</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={event => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {error && <div className="p-4 rounded-lg bg-red-50 text-red-800 text-sm">{error}</div>}
          {notice && <div className="p-4 rounded-lg bg-green-50 text-green-800 text-sm">{notice}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Memproses..." : mode === "login" ? "Masuk" : "Daftar"}
          </button>

          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="w-full text-center text-sm text-gray-600 hover:text-gray-900 font-medium"
          >
            {mode === "login" ? "Belum punya akun? Daftar sekarang" : "Sudah punya akun? Masuk"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [view, setView] = useState<ViewId>("dashboard");
  const [loading, setLoading] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);

      if (data.session) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.session.user.id)
          .single();

        if (profileData) {
          setProfile(profileData as AppProfile);
        }
      }
      setLoading(false);
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <LoaderCircle className="animate-spin text-blue-600" size={24} />
          <span className="text-gray-600">Memuat...</span>
        </div>
      </div>
    );
  }

  if (!session || !profile) {
    return <LoginScreen />;
  }

  return (
    <AdminDataProvider profile={profile}>
      <div className="app-shell flex h-screen bg-slate-50">
        <AppSidebar current={view} onChange={setView} profile={profile} onLogout={handleLogout} mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
        <div className="app-workspace flex min-w-0 flex-1 flex-col overflow-hidden">
          <ModernTopbar current={view} onMenu={() => setMobileMenuOpen(true)} onNotify={() => setNotificationsOpen(!notificationsOpen)} notificationsOpen={notificationsOpen} />
          <div className="app-content-scroll flex-1 overflow-auto">
            <div className="app-content p-4 sm:p-6">
              <AdminContent view={view} onChange={setView} />
            </div>
            {notificationsOpen && (
              <div className="fixed bottom-6 right-6 z-30 w-[min(24rem,calc(100vw-3rem))] rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
                <NotificationPanel open={notificationsOpen} onClose={() => setNotificationsOpen(false)} goTo={setView} />
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminDataProvider>
  );
}
