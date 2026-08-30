"use client";

import {
  Barcode,
  Boxes,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  LogOut,
  MapPin,
  Package,
  Search,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Store,
  UserRoundCheck,
  Users,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { AppProfile, ViewId } from "@/app/feature-views";

type SidebarItem = {
  id: ViewId;
  label: string;
  description: string;
  icon: LucideIcon;
  roles: AppProfile["role"][];
};

type SidebarGroup = {
  id: string;
  label: string;
  eyebrow: string;
  icon: LucideIcon;
  items: SidebarItem[];
};

const allRoles: AppProfile["role"][] = ["owner", "admin", "cashier", "warehouse"];
const managementRoles: AppProfile["role"][] = ["owner", "admin"];

const sidebarGroups: SidebarGroup[] = [
  {
    id: "overview",
    label: "Ringkasan",
    eyebrow: "Pusat operasional",
    icon: LayoutDashboard,
    items: [
      { id: "dashboard", label: "Ringkasan toko", description: "Pantauan usaha terkini", icon: LayoutDashboard, roles: allRoles },
    ],
  },
  {
    id: "sales",
    label: "Penjualan",
    eyebrow: "Retail & grosir",
    icon: ShoppingCart,
    items: [
      { id: "pos", label: "POS / Kasir", description: "Transaksi baru", icon: ShoppingCart, roles: ["owner", "admin", "cashier"] },
      { id: "customers", label: "Member / Reseller", description: "Customer dan tipe harga", icon: UserRoundCheck, roles: ["owner", "admin", "cashier"] },
      { id: "transactions", label: "Riwayat transaksi", description: "Penjualan tersinkron", icon: FileText, roles: ["owner", "admin", "cashier"] },
      { id: "orders", label: "Pesanan online", description: "Konfirmasi pesanan", icon: ShoppingBag, roles: ["owner", "admin", "cashier"] },
      { id: "shifts", label: "Shift kasir", description: "Buka dan tutup kas", icon: WalletCards, roles: ["owner", "admin", "cashier"] },
    ],
  },
  {
    id: "inventory",
    label: "Persediaan",
    eyebrow: "Produk & stok",
    icon: Boxes,
    items: [
      { id: "products", label: "Produk & harga", description: "Katalog dan satuan", icon: Package, roles: allRoles },
      { id: "inventory", label: "Stok & pembelian", description: "Persediaan cabang", icon: Boxes, roles: ["owner", "admin", "warehouse"] },
      { id: "racks", label: "Rak & penempatan", description: "Lokasi produk", icon: MapPin, roles: ["owner", "admin", "warehouse"] },
      { id: "stockOpname", label: "Stock opname", description: "Hitung dan rekonsiliasi", icon: ClipboardCheck, roles: ["owner", "admin", "warehouse"] },
    ],
  },
  {
    id: "management",
    label: "Manajemen",
    eyebrow: "Administrasi toko",
    icon: Store,
    items: [
      { id: "dataTools", label: "Data & dokumen", description: "Import, label, dan invoice", icon: Barcode, roles: ["owner", "admin", "warehouse"] },
      { id: "branches", label: "Cabang", description: "Lokasi operasional", icon: Building2, roles: managementRoles },
      { id: "team", label: "Pegawai", description: "Akun dan peran", icon: Users, roles: managementRoles },
      { id: "reports", label: "Laporan", description: "Kinerja usaha", icon: FileText, roles: allRoles },
      { id: "settings", label: "Pengaturan", description: "Aturan dan identitas", icon: Settings, roles: ["owner", "admin", "warehouse"] },
    ],
  },
];

const roleLabel: Record<AppProfile["role"], string> = {
  owner: "Owner",
  admin: "Admin",
  warehouse: "Gudang",
  cashier: "Kasir",
};

function BrandGlyph({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`${compact ? "size-8 text-[10px]" : "size-10 text-xs"} grid shrink-0 place-items-center rounded-xl bg-blue-600 font-bold tracking-[0.16em] text-white shadow-sm shadow-blue-600/25`}>
      AL
    </span>
  );
}

export function AppSidebar({
  current,
  onChange,
  profile,
  onLogout,
  mobileOpen,
  onMobileClose,
}: {
  current: ViewId;
  onChange: (id: ViewId) => void;
  profile: AppProfile;
  onLogout: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const allowedGroups = useMemo(
    () => sidebarGroups
      .map((group) => ({ ...group, items: group.items.filter((item) => item.roles.includes(profile.role)) }))
      .filter((group) => group.items.length > 0),
    [profile.role],
  );
  const currentGroup = allowedGroups.find((group) => group.items.some((item) => item.id === current)) ?? allowedGroups[0];
  const [activeGroupId, setActiveGroupId] = useState(currentGroup?.id ?? "overview");
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!currentGroup) return;
    const timer = window.setTimeout(() => setActiveGroupId(currentGroup.id), 0);
    return () => window.clearTimeout(timer);
  }, [currentGroup]);

  const activeGroup = allowedGroups.find((group) => group.id === activeGroupId) ?? currentGroup;
  const filteredItems = activeGroup?.items.filter((item) =>
    `${item.label} ${item.description}`.toLowerCase().includes(query.trim().toLowerCase()),
  ) ?? [];
  const canAccessSettings = sidebarGroups.some((group) => group.items.some((item) => item.id === "settings" && item.roles.includes(profile.role)));
  const initials = profile.full_name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  const navigate = (id: ViewId) => {
    onChange(id);
    onMobileClose();
  };

  return (
    <>
      {mobileOpen && <button type="button" className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm lg:hidden" onClick={onMobileClose} aria-label="Tutup navigasi" />}
      <aside
        aria-label="Navigasi utama"
        className={`fixed inset-y-0 left-0 z-50 flex max-w-full overflow-hidden border-r border-slate-200 bg-white text-slate-900 shadow-2xl transition-transform duration-300 lg:relative lg:inset-auto lg:z-auto lg:h-dvh lg:shrink-0 lg:translate-x-0 lg:shadow-none ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex w-16 shrink-0 flex-col items-center gap-2 border-r border-slate-200 bg-slate-50 px-3 py-4">
          <div className="mb-2 grid size-10 place-items-center"><BrandGlyph compact /></div>
          {allowedGroups.map((group) => {
            const Icon = group.icon;
            const active = activeGroup?.id === group.id;
            return (
              <button
                type="button"
                key={group.id}
                title={group.label}
                aria-label={group.label}
                aria-pressed={active}
                onClick={() => { setActiveGroupId(group.id); setQuery(""); setCollapsed(false); }}
                className={`grid size-10 place-items-center rounded-xl transition-colors ${active ? "bg-blue-600 text-white shadow-sm shadow-blue-600/25" : "text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm"}`}
              >
                <Icon size={19} strokeWidth={1.8} />
              </button>
            );
          })}
          <div className="flex-1" />
          {canAccessSettings && <button type="button" onClick={() => navigate("settings")} className={`grid size-10 place-items-center rounded-xl transition-colors ${current === "settings" ? "bg-blue-600 text-white shadow-sm shadow-blue-600/25" : "text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm"}`} aria-label="Pengaturan" title="Pengaturan">
            <Settings size={19} strokeWidth={1.8} />
          </button>}
          <div className="grid size-9 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white" title={profile.full_name}>{initials}</div>
        </div>

        <div className={`flex min-w-0 flex-col bg-white transition-[width] duration-300 ${collapsed ? "w-16" : "w-[min(17rem,calc(100vw-4rem))]"}`}>
          {collapsed ? (
            <button type="button" onClick={() => setCollapsed(false)} className="mx-auto mt-4 grid size-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Perluas sidebar">
              <ChevronRight size={19} />
            </button>
          ) : (
            <>
              <div className="flex items-center gap-3 px-5 pb-4 pt-5">
                <BrandGlyph />
                <div className="min-w-0 flex-1">
                  <strong className="block truncate text-[15px] font-semibold text-slate-950">Agung Lestari</strong>
                  <span className="block truncate text-xs text-slate-500">Pusat operasional</span>
                </div>
                <button type="button" onClick={onMobileClose} className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden" aria-label="Tutup sidebar"><X size={18} /></button>
              </div>

              <div className="flex items-center justify-between px-5 py-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">{activeGroup?.eyebrow}</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">{activeGroup?.label}</h2>
                </div>
                <button type="button" onClick={() => setCollapsed(true)} className="hidden size-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:grid" aria-label="Ringkaskan sidebar">
                  <ChevronLeft size={19} />
                </button>
              </div>

              <label className="relative mx-5 mt-4 block">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari menu..." className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10" />
              </label>

              <nav className="mt-5 flex-1 overflow-y-auto px-3 pb-4">
                <p className="px-3 pb-2 text-xs font-medium text-slate-400">Menu {activeGroup?.label}</p>
                <div className="space-y-1">
                  {filteredItems.map((item) => {
                    const Icon = item.icon;
                    const active = current === item.id;
                    return (
                      <button type="button" key={item.id} onClick={() => navigate(item.id)} aria-current={active ? "page" : undefined} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}>
                        <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${active ? "bg-blue-100" : "bg-slate-100 group-hover:bg-white"}`}><Icon size={18} strokeWidth={1.8} /></span>
                        <span className="min-w-0 flex-1"><strong className="block truncate text-sm font-semibold">{item.label}</strong><small className={`block truncate text-[11px] ${active ? "text-blue-500" : "text-slate-400"}`}>{item.description}</small></span>
                        <ChevronRight size={16} className={active ? "text-blue-400" : "text-slate-300 group-hover:text-slate-500"} />
                      </button>
                    );
                  })}
                  {!filteredItems.length && <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Menu tidak ditemukan.</div>}
                </div>
              </nav>

              <div className="border-t border-slate-200 p-3">
                <div className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-slate-50">
                  <div className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">{initials}</div>
                  <div className="min-w-0 flex-1"><strong className="block truncate text-sm font-semibold text-slate-900">{profile.full_name}</strong><span className="block text-xs text-slate-500">{roleLabel[profile.role]}</span></div>
                  <button type="button" onClick={onLogout} className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Keluar" title="Keluar"><LogOut size={17} /></button>
                </div>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

export default AppSidebar;
