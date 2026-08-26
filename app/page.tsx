"use client";

import {
  Barcode, Boxes, Building2, ChevronDown, ClipboardCheck, FileText, LayoutDashboard,
  LoaderCircle, LogOut, MapPin, Menu, Package, PanelLeftClose, PanelLeftOpen, RefreshCw, Settings,
  ShoppingBag, ShoppingCart, Store, UserRoundCheck, Users, WalletCards, X,
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

type IconType = typeof LayoutDashboard;
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

function BrandMark() { return <div className="brand-mark" aria-hidden="true"><span>AL</span><i/><i/><i/><i/><i/></div>; }

function LoginScreen() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState(""); const [phone, setPhone] = useState(""); const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [unconfirmed, setUnconfirmed] = useState(false);

  const submitAuth = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setError(""); setNotice(""); setUnconfirmed(false);
    if (mode === "register") {
      if (password !== confirmPassword) { setError("Konfirmasi kata sandi tidak sama."); setLoading(false); return; }
      const { data, error: signUpError } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: fullName.trim(), phone: phone.trim(), address: address.trim() } } });
      if (signUpError) setError(signUpError.message);
      else if (!data.session) { setNotice("Pendaftaran berhasil. Klik tautan konfirmasi yang dikirim ke email Anda."); setUnconfirmed(true); }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) {
        if (signInError.code === "email_not_confirmed" || signInError.message.toLowerCase().includes("not confirmed")) { setError("Email belum dikonfirmasi. Periksa kotak masuk atau kirim ulang tautannya."); setUnconfirmed(true); }
        else if (signInError.code === "invalid_credentials") setError("Email atau kata sandi tidak sesuai.");
        else setError(`Login belum berhasil: ${signInError.message}`);
      }
    }
    setLoading(false);
  };
  const resetPassword = async () => { if (!email.trim()) { setError("Isi email terlebih dahulu."); return; } setLoading(true); setError(""); const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin }); if (resetError) setError(resetError.message); else setNotice("Tautan pengaturan ulang kata sandi telah dikirim."); setLoading(false); };
  const resendConfirmation = async () => { if (!email.trim()) { setError("Isi email terlebih dahulu."); return; } setLoading(true); const { error: resendError } = await supabase.auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: window.location.origin } }); if (resendError) setError(resendError.message); else setNotice("Tautan konfirmasi baru telah dikirim."); setLoading(false); };

  return <main className="login-shell"><section className="login-brand-panel"><div className="login-brand"><BrandMark/><span><strong>Agung Lestari</strong><small>Sistem retail & grosir</small></span></div><div className="login-copy"><p>RETAIL · GROSIR · SATU SISTEM</p><h1>Satu stok, dua cara berjualan.</h1><span>POS, member reseller, rak, stock opname, barcode, invoice, dan laporan tersambung dalam satu pusat operasional.</span><div className="login-barcode" aria-hidden="true">|||| || | |||| | | ||| || ||||</div></div></section><section className="login-form-panel"><form className="login-form" onSubmit={submitAuth}><div><p>{mode === "login" ? "SELAMAT DATANG" : "PENDAFTARAN AKUN"}</p><h2>{mode === "login" ? "Masuk ke pusat operasional" : "Buat akun"}</h2><span>{mode === "login" ? "Gunakan email dan kata sandi yang sudah terdaftar." : "Akun baru menunggu persetujuan Owner atau Admin."}</span></div>{mode === "register" && <><label>Nama lengkap<input value={fullName} onChange={event => setFullName(event.target.value)} autoComplete="name" required/></label><div className="login-two-columns"><label>Nomor HP<input value={phone} onChange={event => setPhone(event.target.value)} autoComplete="tel"/></label><label>Alamat<input value={address} onChange={event => setAddress(event.target.value)}/></label></div></>}<label>Email<input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="nama@tokolestari.com" autoComplete="email" required/></label><label>Kata sandi<input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} required/></label>{mode === "register" && <label>Ulangi kata sandi<input type="password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} autoComplete="new-password" required/></label>}{error && <div className="login-message error">{error}</div>}{notice && <div className="login-message success">{notice}</div>}<button className="button primary login-submit" disabled={loading}>{loading ? <><LoaderCircle className="spin" size={17}/> Memproses...</> : mode === "login" ? "Masuk" : "Daftar akun"}</button>{mode === "login" && <button type="button" className="forgot-button" onClick={resetPassword} disabled={loading}>Lupa kata sandi?</button>}{unconfirmed && <button type="button" className="forgot-button" onClick={resendConfirmation} disabled={loading}>Kirim ulang konfirmasi email</button>}<div className="auth-switch"><span>{mode === "login" ? "Belum mempunyai akun?" : "Sudah mempunyai akun?"}</span><button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setNotice(""); setUnconfirmed(false); }}>{mode === "login" ? "Daftar" : "Masuk"}</button></div></form></section></main>;
}

function AccountState({ profile, onLogout }: { profile: AppProfile; onLogout: () => void }) {
  const copy = profile.status === "pending" ? ["Akun menunggu persetujuan", "Admin toko perlu menyetujui akun ini sebelum dashboard dapat digunakan."] : profile.status === "rejected" ? ["Pendaftaran akun ditolak", "Hubungi admin toko jika status ini perlu diperiksa kembali."] : ["Akun dinonaktifkan", "Hubungi owner atau admin toko untuk mengaktifkan kembali akun ini."];
  return <main className="account-state"><BrandMark/><h1>{copy[0]}</h1><p>{copy[1]}</p><span>{profile.full_name}</span><button className="button secondary" onClick={onLogout}><LogOut size={16}/> Keluar</button></main>;
}

function Sidebar({ current, onChange, open, onClose, profile, onLogout }: { current: ViewId; onChange: (id: ViewId) => void; open: boolean; onClose: () => void; profile: AppProfile; onLogout: () => void }) {
  const go = (id: ViewId) => { onChange(id); onClose(); };
  const allowed = roleAccess[profile.role];
  return <>{open && <button type="button" className="sidebar-scrim" onClick={onClose} aria-label="Tutup navigasi"/>}<aside className={`sidebar ${open ? "open" : ""}`}><div className="sidebar-top"><div className="brand-lockup"><BrandMark/><div><strong>Agung Lestari</strong><span>Retail & grosir</span></div></div><button type="button" className="icon-button mobile-only" onClick={onClose} aria-label="Tutup navigasi"><X size={19}/></button></div><nav aria-label="Navigasi utama"><p className="nav-caption">OPERASIONAL</p>{primaryNavigation.filter(item=>allowed.includes(item.id)).map(item => { const Icon = item.icon; return <button type="button" key={item.id} className={`nav-item ${current === item.id ? "active" : ""}`} aria-current={current === item.id ? "page" : undefined} onClick={() => go(item.id)}><Icon size={19} strokeWidth={1.8}/><span>{item.label}</span></button>; })}<p className="nav-caption second">MANAJEMEN</p>{managementNavigation.filter(item=>allowed.includes(item.id)).map(item => { const Icon = item.icon; return <button type="button" key={item.id} className={`nav-item ${current === item.id ? "active" : ""}`} aria-current={current === item.id ? "page" : undefined} onClick={() => go(item.id)}><Icon size={19} strokeWidth={1.8}/><span>{item.label}</span></button>; })}</nav><div className="sidebar-foot"><div className="user-card"><div className="avatar">{profile.full_name.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase()}</div><div><strong>{profile.full_name}</strong><span>{profile.role === "owner" ? "Owner" : profile.role === "admin" ? "Admin" : profile.role === "warehouse" ? "Gudang" : "Kasir"}</span></div><button type="button" className="icon-button logout-button" onClick={onLogout} aria-label="Keluar"><LogOut size={16}/></button></div></div></aside></>;
}

function Topbar({ current, onMenu, onNotify, notificationsOpen, sidebarCollapsed, mobile }: { current: ViewId; onMenu: () => void; onNotify: () => void; notificationsOpen: boolean; sidebarCollapsed: boolean; mobile: boolean }) {
  const copy = navTitle[current]; const { branches, activeBranchId, activeBranch, branchesLoading, setActiveBranchId } = useAdminData();
  const menuLabel = mobile ? "Buka navigasi" : sidebarCollapsed ? "Tampilkan sidebar" : "Sembunyikan sidebar";
  return <header className="topbar"><div className="page-heading"><button className="icon-button menu-trigger" type="button" onClick={onMenu} aria-label={menuLabel} title={menuLabel} aria-expanded={mobile ? undefined : !sidebarCollapsed}>{mobile ? <Menu size={20}/> : sidebarCollapsed ? <PanelLeftOpen size={20}/> : <PanelLeftClose size={20}/>}</button><div><p>{copy.eyebrow}</p><h1>{copy.title}</h1></div></div><div className="topbar-actions"><label className="branch-picker"><Store size={17}/><span><small>Cabang aktif</small><strong>{branchesLoading ? "Memuat..." : activeBranch?.name ?? "Belum ada cabang"}</strong></span><ChevronDown size={16}/><select aria-label="Pilih cabang" value={activeBranchId} disabled={branchesLoading || branches.length === 0} onChange={event => setActiveBranchId(event.target.value)}><option value="" disabled>{branchesLoading ? "Memuat cabang..." : "Pilih cabang"}</option>{branches.filter(branch => branch.is_active).map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label><NotificationButton open={notificationsOpen} onClick={onNotify}/></div></header>;
}

function AdminContent({ view, onChange }: { view: ViewId; onChange: (id: ViewId) => void }) {
  const { branches, activeBranchId, branchesLoading, branchesError, refreshBranches } = useAdminData();
  if (branchesLoading) return <section className="surface feature-gate" role="status"><LoaderCircle className="spin" size={24}/><div><strong>Menyiapkan data cabang</strong><span>Mohon tunggu sebentar.</span></div></section>;
  if (branchesError) return <section className="surface feature-gate" role="alert"><div><strong>Data cabang belum tersedia</strong><span>{branchesError}</span></div><button type="button" className="button primary compact" onClick={() => void refreshBranches()}><RefreshCw size={16}/> Coba lagi</button></section>;
  if (!activeBranchId && !["branches", "settings"].includes(view)) return <section className="surface feature-gate"><div><strong>Belum ada cabang aktif</strong><span>{branches.length ? "Aktifkan salah satu cabang agar fitur operasional dapat digunakan." : "Buat cabang pertama agar fitur operasional dapat digunakan."}</span></div><button type="button" className="button primary compact" onClick={() => onChange("branches")}><Store size={16}/> Kelola cabang</button></section>;
  if (view === "dashboard") return <DashboardView goTo={onChange}/>;
  if (view === "pos") return <PosView/>;
  if (view === "products") return <ProductsView/>;
  if (view === "customers") return <MembersView/>;
  if (view === "inventory") return <InventoryView/>;
  if (view === "racks") return <RacksView/>;
  if (view === "stockOpname") return <StockOpnameView/>;
  if (view === "transactions") return <TransactionsView/>;
  if (view === "orders") return <OrdersView/>;
  if (view === "shifts") return <ShiftsView/>;
  if (view === "dataTools") return <DataToolsView/>;
  if (view === "branches") return <BranchesView/>;
  if (view === "team") return <TeamView/>;
  if (view === "reports") return <ReportsView/>;
  return <SettingsView/>;
}

function AdminShell({ profile, onLogout }: { profile: AppProfile; onLogout: () => void }) {
  const [view, setView] = useState<ViewId>("dashboard"); const [menuOpen, setMenuOpen] = useState(false); const [notificationsOpen, setNotificationsOpen] = useState(false); const [sidebarCollapsed, setSidebarCollapsed] = useState(false); const [mobile, setMobile] = useState(false);
  const allowedViews = roleAccess[profile.role];
  useEffect(() => {
    const media = window.matchMedia("(max-width: 960px)");
    const syncViewport = () => setMobile(media.matches);
    syncViewport();
    media.addEventListener("change", syncViewport);
    return () => media.removeEventListener("change", syncViewport);
  }, []);
  useEffect(() => {
    const resolveView = () => {
      const hashView = window.location.hash.slice(1) as ViewId;
      const storedView = window.localStorage.getItem("agung-active-view") as ViewId | null;
      const nextView = allowedViews.includes(hashView) ? hashView : storedView && allowedViews.includes(storedView) ? storedView : allowedViews[0];
      setView(nextView);
      window.localStorage.setItem("agung-active-view", nextView);
      if (window.location.hash !== `#${nextView}`) window.history.replaceState(null, "", `#${nextView}`);
    };
    resolveView();
    window.addEventListener("popstate", resolveView);
    return () => window.removeEventListener("popstate", resolveView);
  }, [allowedViews]);
  const toggleSidebar = () => { if (mobile) setMenuOpen(true); else setSidebarCollapsed(collapsed => !collapsed); };
  const navigateTo = (nextView: ViewId) => {
    if (!allowedViews.includes(nextView)) return;
    setView(nextView);
    setNotificationsOpen(false);
    window.localStorage.setItem("agung-active-view", nextView);
    if (window.location.hash !== `#${nextView}`) window.history.pushState(null, "", `#${nextView}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return <AdminDataProvider profile={profile}><main className={`admin-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}><a className="skip-link" href="#main-content">Lewati ke konten utama</a><Sidebar current={view} onChange={navigateTo} open={menuOpen} onClose={() => setMenuOpen(false)} profile={profile} onLogout={onLogout}/><section className="workspace"><Topbar current={view} onMenu={toggleSidebar} onNotify={() => setNotificationsOpen(open => !open)} notificationsOpen={notificationsOpen} sidebarCollapsed={sidebarCollapsed} mobile={mobile}/><NotificationPanel open={notificationsOpen} onClose={() => setNotificationsOpen(false)} goTo={navigateTo}/><div className="page-content" id="main-content" tabIndex={-1}><AdminContent view={view} onChange={navigateTo}/></div></section></main></AdminDataProvider>;
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null); const [profile, setProfile] = useState<AppProfile | null>(null); const [authLoading, setAuthLoading] = useState(true);
  const authUserId = useRef<string | null>(null);
  useEffect(() => {
    let mounted = true;
    const loadingGuard = window.setTimeout(() => { if (mounted) setAuthLoading(false); }, 8000);
    supabase.auth.getSession()
      .then(({ data }) => { if (mounted) { authUserId.current = data.session?.user.id ?? null; setSession(data.session); if (!data.session) setAuthLoading(false); } })
      .catch(() => { if (mounted) setAuthLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      const nextUserId = nextSession?.user.id ?? null;
      const userChanged = nextUserId !== authUserId.current;
      authUserId.current = nextUserId;
      setSession(nextSession);
      if (!nextSession) { setProfile(null); setAuthLoading(false); }
      else if (userChanged) { setProfile(null); setAuthLoading(true); }
    });
    return () => { mounted = false; window.clearTimeout(loadingGuard); listener.subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker.getRegistrations().then(registrations => Promise.all(registrations.map(registration => registration.unregister())));
      if ("caches" in window) void caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("agung-lestari-")).map(key => caches.delete(key))));
      return;
    }
    const register = () => void navigator.serviceWorker.register("/sw.js");
    window.addEventListener("load", register);
    if (document.readyState === "complete") register();
    return () => window.removeEventListener("load", register);
  }, []);
  useEffect(() => {
    if (!session?.user.id) return;
    let mounted = true;
    const controller = new AbortController();
    const profileGuard = window.setTimeout(() => { controller.abort(); if (mounted) setAuthLoading(false); }, 8000);
    supabase.from("profiles").select("id,full_name,role,status,organization_id").eq("id", session.user.id).single().abortSignal(controller.signal)
      .then(({ data, error }) => { if (mounted) { if (!error && data) setProfile(data as AppProfile); setAuthLoading(false); } })
      .catch(() => { if (mounted) setAuthLoading(false); });
    return () => { mounted = false; window.clearTimeout(profileGuard); controller.abort(); };
  }, [session?.user.id]);
  const logout = async () => { await supabase.auth.signOut(); setProfile(null); };
  if (authLoading) return <main className="app-loading"><BrandMark/><LoaderCircle className="spin" size={22}/><span>Memuat pusat operasional...</span></main>;
  if (!session) return <LoginScreen/>;
  if (!profile) return <main className="account-state"><BrandMark/><h1>Profil belum tersedia</h1><p>Silakan keluar lalu masuk kembali.</p><button className="button secondary" onClick={logout}>Keluar</button></main>;
  if (profile.status !== "active") return <AccountState profile={profile} onLogout={logout}/>;
  return <AdminShell profile={profile} onLogout={logout}/>;
}
