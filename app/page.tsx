"use client";

import {
  Barcode, Boxes, Building2, ChevronDown, ClipboardCheck, Download, FileText, LayoutDashboard,
  LoaderCircle, LogOut, MapPin, Menu, Package, ReceiptText, RefreshCw, Settings,
  ShoppingBag, ShoppingCart, Smartphone, Store, UserRoundCheck, Users, WalletCards, X,
  Home, Inbox, Calendar, Search, Bell,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import {
  AdminDataProvider, BranchesView, DashboardView, InventoryView, NotificationButton,
  NotificationPanel, OrdersView, ProductsView, ReportsView, SettingsView, ShiftsView,
  TeamView, TransactionsView, useAdminData, type AppProfile, type ViewId,
} from "./feature-views";
import { DataToolsView, MembersView, PosView, RacksView, StockOpnameView } from "./retail-wholesale-views";
import {
  Sidebar,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

type IconType = typeof LayoutDashboard;
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const primaryNavigation: { id: ViewId; label: string; icon: IconType }[] = [
  { id: "dashboard", label: "Ringkasan", icon: LayoutDashboard },
  { id: "pos", label: "POS / Kasir", icon: ShoppingCart },
  { id: "products", label: "Produk", icon: Package },
  { id: "customers", label: "Member / Reseller", icon: UserRoundCheck },
  { id: "inventory", label: "Stok & pembelian", icon: Boxes },
  { id: "racks", label: "Rak & penempatan", icon: MapPin },
  { id: "stockOpname", label: "Stock opname", icon: ClipboardCheck },
  { id: "transactions", label: "Transaksi", icon: ShoppingCart },
  { id: "orders", label: "Pesanan online", icon: ShoppingBag },
  { id: "shifts", label: "Shift kasir", icon: WalletCards },
];

const managementNavigation: { id: ViewId; label: string; icon: IconType }[] = [
  { id: "dataTools", label: "Data, label & dokumen", icon: Barcode },
  { id: "branches", label: "Cabang", icon: Building2 },
  { id: "team", label: "Pegawai", icon: Users },
  { id: "reports", label: "Laporan", icon: FileText },
  { id: "settings", label: "Pengaturan", icon: Settings },
];

const roleAccess: Record<AppProfile["role"], ViewId[]> = {
  owner: [...primaryNavigation, ...managementNavigation].map(item => item.id),
  admin: [...primaryNavigation, ...managementNavigation].map(item => item.id),
  cashier: ["dashboard", "pos", "products", "customers", "transactions", "orders", "shifts", "reports"],
  warehouse: ["dashboard", "products", "inventory", "racks", "stockOpname", "dataTools", "reports", "settings"],
};

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

function BrandMark() {
  return <div className="brand-mark" aria-hidden="true"><span>AL</span><i /><i /><i /><i /><i /></div>;
}

function ModernSidebar({ current, onChange, profile, onLogout }: { current: ViewId; onChange: (id: ViewId) => void; profile: AppProfile; onLogout: () => void }) {
  const allowed = roleAccess[profile.role];

  return (
    <Sidebar className="border-r border-gray-200 bg-white">
      <div className="flex flex-col h-full">
        {/* Sidebar Header */}
        <div className="flex flex-col gap-3 p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
              AL
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">Agung Lestari</p>
              <p className="text-xs text-gray-600">Retail & grosir</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
          {/* Operational Section */}
          <p className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Operasional
          </p>
          <SidebarMenu>
            {primaryNavigation.filter(item => allowed.includes(item.id)).map(item => {
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onChange(item.id)}
                    isActive={current === item.id}
                    className={`w-full justify-start ${
                      current === item.id
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Icon size={18} className="mr-3 shrink-0" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>

          {/* Management Section */}
          <p className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mt-6">
            Manajemen
          </p>
          <SidebarMenu>
            {managementNavigation.filter(item => allowed.includes(item.id)).map(item => {
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onChange(item.id)}
                    isActive={current === item.id}
                    className={`w-full justify-start ${
                      current === item.id
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Icon size={18} className="mr-3 shrink-0" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </nav>

        {/* Sidebar Footer - User Card */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer group">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center text-gray-700 font-semibold text-sm flex-shrink-0">
              {profile.full_name.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 truncate">{profile.full_name}</p>
              <p className="text-xs text-gray-600">
                {profile.role === "owner" ? "Owner" : profile.role === "admin" ? "Admin" : profile.role === "warehouse" ? "Gudang" : "Kasir"}
              </p>
            </div>
            <button
              onClick={onLogout}
              className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-200 rounded"
              aria-label="Keluar"
            >
              <LogOut size={16} className="text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    </Sidebar>
  );
}

function ModernTopbar({ current, onMenu, onNotify, notificationsOpen }: { current: ViewId; onMenu: () => void; onNotify: () => void; notificationsOpen: boolean }) {
  const copy = navTitle[current];
  const { branches, activeBranchId, activeBranch, branchesLoading, setActiveBranchId } = useAdminData();

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
      <div className="flex items-center gap-4 flex-1">
        <SidebarTrigger className="p-2 hover:bg-gray-100 rounded-lg" />
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{copy.eyebrow}</p>
          <h1 className="text-2xl font-bold text-gray-900">{copy.title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {branches.length > 0 && (
          <div className="flex items-center gap-2">
            <Store size={18} className="text-gray-600" />
            <select
              aria-label="Pilih cabang"
              value={activeBranchId}
              disabled={branchesLoading || branches.length === 0}
              onChange={event => setActiveBranchId(event.target.value)}
              className="text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50"
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
          className={`p-2 rounded-lg transition-colors ${
            notificationsOpen ? "bg-gray-100 text-gray-900" : "hover:bg-gray-100 text-gray-600"
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
  if (view === "branches") return <BranchesView goTo={onChange} />;
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
  const [unconfirmed, setUnconfirmed] = useState(false);

  const submitAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    setUnconfirmed(false);

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
        setUnconfirmed(true);
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        if (signInError.code === "email_not_confirmed" || signInError.message.toLowerCase().includes("not confirmed")) {
          setError("Email belum dikonfirmasi. Periksa kotak masuk atau kirim ulang tautannya.");
          setUnconfirmed(true);
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
    <AdminDataProvider>
      <SidebarProvider>
        <div className="flex h-screen bg-gray-50">
          <ModernSidebar current={view} onChange={setView} profile={profile} onLogout={handleLogout} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <ModernTopbar current={view} onMenu={() => { }} onNotify={() => setNotificationsOpen(!notificationsOpen)} notificationsOpen={notificationsOpen} />
            <div className="flex-1 overflow-auto">
              <div className="p-6">
                <AdminContent view={view} onChange={setView} />
              </div>
              {notificationsOpen && (
                <div className="fixed bottom-6 right-6 w-96 bg-white rounded-lg shadow-lg p-4 border border-gray-200">
                  <NotificationPanel />
                </div>
              )}
            </div>
          </div>
        </div>
      </SidebarProvider>
    </AdminDataProvider>
  );
}
