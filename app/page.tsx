"use client";

import {
  Boxes, Building2, ChevronDown, FileText, LayoutDashboard, LoaderCircle,
  LogOut, Menu, Package, Settings, ShoppingBag, ShoppingCart, Store, Users,
  WalletCards, X,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import {
  AdminDataProvider, BranchesView, DashboardView, InventoryView, NotificationButton,
  NotificationPanel, OrdersView, ProductsView, ReportsView, SettingsView, ShiftsView,
  TeamView, TransactionsView, useAdminData, type AppProfile, type ViewId,
} from "./feature-views";

type IconType = typeof LayoutDashboard;
const primaryNavigation: { id: ViewId; label: string; icon: IconType }[] = [
  { id: "dashboard", label: "Ringkasan", icon: LayoutDashboard },
  { id: "products", label: "Produk", icon: Package },
  { id: "inventory", label: "Stok & pembelian", icon: Boxes },
  { id: "transactions", label: "Transaksi", icon: ShoppingCart },
  { id: "orders", label: "Pesanan online", icon: ShoppingBag },
  { id: "shifts", label: "Shift kasir", icon: WalletCards },
];
const managementNavigation: { id: ViewId; label: string; icon: IconType }[] = [
  { id: "branches", label: "Cabang", icon: Building2 },
  { id: "team", label: "Pegawai", icon: Users },
  { id: "reports", label: "Laporan", icon: FileText },
  { id: "settings", label: "Pengaturan", icon: Settings },
];
const navTitle: Record<ViewId, { title: string; eyebrow: string }> = {
  dashboard: { title: "Ringkasan toko", eyebrow: "Pantauan operasional terkini" },
  products: { title: "Produk & harga", eyebrow: "Katalog, satuan, modal, dan harga jual" },
  inventory: { title: "Stok & pembelian", eyebrow: "Persediaan dan riwayat pergerakan" },
  transactions: { title: "Riwayat transaksi", eyebrow: "Penjualan tersinkron dari kasir" },
  orders: { title: "Pesanan online", eyebrow: "Konfirmasi dan reservasi persediaan" },
  shifts: { title: "Shift kasir", eyebrow: "Buka, tutup, dan rekonsiliasi kas" },
  branches: { title: "Cabang toko", eyebrow: "Lokasi dan operasional setiap outlet" },
  team: { title: "Pegawai", eyebrow: "Akun, peran, cabang, dan persetujuan" },
  reports: { title: "Laporan usaha", eyebrow: "Penjualan, laba, produk, dan kasir" },
  settings: { title: "Pengaturan", eyebrow: "Aturan operasional dan identitas toko" },
};

function BrandMark() { return <div className="brand-mark" aria-hidden="true"><span>AL</span></div>; }

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

  return <main className="login-shell"><section className="login-brand-panel"><div className="login-brand"><BrandMark/><span><strong>Agung Lestari</strong><small>Pusat operasional toko</small></span></div><div className="login-copy"><p>ADMIN TOKO</p><h1>Kelola seluruh cabang dari satu tempat.</h1><span>Produk, persediaan, transaksi, dan pegawai tersimpan aman di database pusat.</span></div></section><section className="login-form-panel"><form className="login-form" onSubmit={submitAuth}><div><p>{mode === "login" ? "SELAMAT DATANG" : "PENDAFTARAN AKUN"}</p><h2>{mode === "login" ? "Masuk ke akun admin" : "Buat akun"}</h2><span>{mode === "login" ? "Gunakan email dan kata sandi yang sudah terdaftar." : "Akun pegawai baru menunggu persetujuan admin."}</span></div>{mode === "register" && <><label>Nama lengkap<input value={fullName} onChange={event => setFullName(event.target.value)} autoComplete="name" required/></label><div className="login-two-columns"><label>Nomor HP<input value={phone} onChange={event => setPhone(event.target.value)} autoComplete="tel"/></label><label>Alamat<input value={address} onChange={event => setAddress(event.target.value)}/></label></div></>}<label>Email<input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="nama@tokolestari.com" autoComplete="email" required/></label><label>Kata sandi<input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} required/></label>{mode === "register" && <label>Ulangi kata sandi<input type="password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} autoComplete="new-password" required/></label>}{error && <div className="login-message error">{error}</div>}{notice && <div className="login-message success">{notice}</div>}<button className="button primary login-submit" disabled={loading}>{loading ? <><LoaderCircle className="spin" size={17}/> Memproses...</> : mode === "login" ? "Masuk" : "Daftar akun"}</button>{mode === "login" && <button type="button" className="forgot-button" onClick={resetPassword} disabled={loading}>Lupa kata sandi?</button>}{unconfirmed && <button type="button" className="forgot-button" onClick={resendConfirmation} disabled={loading}>Kirim ulang konfirmasi email</button>}<div className="auth-switch"><span>{mode === "login" ? "Belum mempunyai akun?" : "Sudah mempunyai akun?"}</span><button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setNotice(""); setUnconfirmed(false); }}>{mode === "login" ? "Daftar" : "Masuk"}</button></div></form></section></main>;
}

function AccountState({ profile, onLogout }: { profile: AppProfile; onLogout: () => void }) {
  const copy = profile.status === "pending" ? ["Akun menunggu persetujuan", "Admin toko perlu menyetujui akun ini sebelum dashboard dapat digunakan."] : profile.status === "rejected" ? ["Pendaftaran akun ditolak", "Hubungi admin toko jika status ini perlu diperiksa kembali."] : ["Akun dinonaktifkan", "Hubungi owner atau admin toko untuk mengaktifkan kembali akun ini."];
  return <main className="account-state"><BrandMark/><h1>{copy[0]}</h1><p>{copy[1]}</p><span>{profile.full_name}</span><button className="button secondary" onClick={onLogout}><LogOut size={16}/> Keluar</button></main>;
}

function Sidebar({ current, onChange, open, onClose, profile, onLogout }: { current: ViewId; onChange: (id: ViewId) => void; open: boolean; onClose: () => void; profile: AppProfile; onLogout: () => void }) {
  const go = (id: ViewId) => { onChange(id); onClose(); };
  return <>{open && <button className="sidebar-scrim" onClick={onClose} aria-label="Tutup navigasi"/>}<aside className={`sidebar ${open ? "open" : ""}`}><div className="sidebar-top"><div className="brand-lockup"><BrandMark/><div><strong>Agung Lestari</strong><span>Pusat operasional</span></div></div><button className="icon-button mobile-only" onClick={onClose}><X size={19}/></button></div><nav aria-label="Navigasi utama"><p className="nav-caption">OPERASIONAL</p>{primaryNavigation.map(item => { const Icon = item.icon; return <button key={item.id} className={`nav-item ${current === item.id ? "active" : ""}`} onClick={() => go(item.id)}><Icon size={19} strokeWidth={1.8}/><span>{item.label}</span></button>; })}<p className="nav-caption second">MANAJEMEN</p>{managementNavigation.map(item => { const Icon = item.icon; return <button key={item.id} className={`nav-item ${current === item.id ? "active" : ""}`} onClick={() => go(item.id)}><Icon size={19} strokeWidth={1.8}/><span>{item.label}</span></button>; })}</nav><div className="sidebar-foot"><div className="user-card"><div className="avatar">{profile.full_name.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase()}</div><div><strong>{profile.full_name}</strong><span>{profile.role === "owner" ? "Owner" : profile.role === "admin" ? "Admin" : "Kasir"}</span></div><button className="icon-button logout-button" onClick={onLogout} aria-label="Keluar"><LogOut size={16}/></button></div></div></aside></>;
}

function Topbar({ current, onMenu, onNotify, notificationsOpen }: { current: ViewId; onMenu: () => void; onNotify: () => void; notificationsOpen: boolean }) {
  const copy = navTitle[current]; const { branches, activeBranchId, activeBranch, setActiveBranchId } = useAdminData();
  return <header className="topbar"><div className="page-heading"><button className="icon-button menu-trigger" onClick={onMenu}><Menu size={20}/></button><div><p>{copy.eyebrow}</p><h1>{copy.title}</h1></div></div><div className="topbar-actions"><label className="branch-picker"><Store size={17}/><span><small>Cabang aktif</small><strong>{activeBranch?.name ?? "Pilih cabang"}</strong></span><ChevronDown size={16}/><select aria-label="Pilih cabang" value={activeBranchId} onChange={event => setActiveBranchId(event.target.value)}>{branches.filter(branch => branch.is_active).map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label><NotificationButton open={notificationsOpen} onClick={onNotify}/></div></header>;
}

function AdminContent({ view, onChange }: { view: ViewId; onChange: (id: ViewId) => void }) {
  if (view === "dashboard") return <DashboardView goTo={onChange}/>;
  if (view === "products") return <ProductsView/>;
  if (view === "inventory") return <InventoryView/>;
  if (view === "transactions") return <TransactionsView/>;
  if (view === "orders") return <OrdersView/>;
  if (view === "shifts") return <ShiftsView/>;
  if (view === "branches") return <BranchesView/>;
  if (view === "team") return <TeamView/>;
  if (view === "reports") return <ReportsView/>;
  return <SettingsView/>;
}

function AdminShell({ profile, onLogout }: { profile: AppProfile; onLogout: () => void }) {
  const [view, setView] = useState<ViewId>("dashboard"); const [menuOpen, setMenuOpen] = useState(false); const [notificationsOpen, setNotificationsOpen] = useState(false);
  return <AdminDataProvider profile={profile}><main className="admin-shell"><Sidebar current={view} onChange={setView} open={menuOpen} onClose={() => setMenuOpen(false)} profile={profile} onLogout={onLogout}/><section className="workspace"><Topbar current={view} onMenu={() => setMenuOpen(true)} onNotify={() => setNotificationsOpen(open => !open)} notificationsOpen={notificationsOpen}/><NotificationPanel open={notificationsOpen} onClose={() => setNotificationsOpen(false)} goTo={setView}/><div className="page-content"><AdminContent view={view} onChange={setView}/></div></section></main></AdminDataProvider>;
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null); const [profile, setProfile] = useState<AppProfile | null>(null); const [authLoading, setAuthLoading] = useState(true);
  useEffect(() => { let mounted = true; supabase.auth.getSession().then(({ data }) => { if (mounted) { setSession(data.session); if (!data.session) setAuthLoading(false); } }); const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => { if (nextSession) setAuthLoading(true); setSession(nextSession); if (!nextSession) { setProfile(null); setAuthLoading(false); } }); return () => { mounted = false; listener.subscription.unsubscribe(); }; }, []);
  useEffect(() => { if (!session?.user.id) return; supabase.from("profiles").select("id,full_name,role,status,organization_id").eq("id", session.user.id).single().then(({ data, error }) => { if (!error && data) setProfile(data as AppProfile); setAuthLoading(false); }); }, [session?.user.id]);
  const logout = async () => { await supabase.auth.signOut(); setProfile(null); };
  if (authLoading) return <main className="app-loading"><BrandMark/><LoaderCircle className="spin" size={22}/><span>Memuat pusat operasional...</span></main>;
  if (!session) return <LoginScreen/>;
  if (!profile) return <main className="account-state"><BrandMark/><h1>Profil belum tersedia</h1><p>Silakan keluar lalu masuk kembali.</p><button className="button secondary" onClick={logout}>Keluar</button></main>;
  if (profile.status !== "active") return <AccountState profile={profile} onLogout={logout}/>;
  return <AdminShell profile={profile} onLogout={logout}/>;
}
