"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Boxes,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  CloudOff,
  Download,
  FileText,
  History,
  LayoutDashboard,
  Menu,
  Minus,
  MoreHorizontal,
  Package,
  PackageCheck,
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
import { useMemo, useState } from "react";

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

const products = [
  { name: "Rokok Surya 12", code: "PRD-00018", category: "Rokok", stock: "8 pak · 16 bungkus", base: "Bungkus", price: "Rp36.000", status: "Menipis" },
  { name: "Minyakita 1 Liter", code: "PRD-00031", category: "Sembako", stock: "12 dus · 8 botol", base: "Botol", price: "Rp17.500", status: "Tersedia" },
  { name: "Indomie Goreng", code: "PRD-00007", category: "Makanan", stock: "4 dus · 22 bungkus", base: "Bungkus", price: "Rp3.500", status: "Tersedia" },
  { name: "Gula Rose Brand", code: "PRD-00024", category: "Sembako", stock: "18 kg", base: "Gram", price: "Rp18.000", status: "Tersedia" },
  { name: "Kopi Kapal Api 65g", code: "PRD-00042", category: "Minuman", stock: "2 dus · 3 renteng", base: "Sachet", price: "Rp1.500", status: "Menipis" },
  { name: "Telur Ayam Negeri", code: "PRD-00012", category: "Segar", stock: "0 peti · 7 kg", base: "Gram", price: "Rp30.000", status: "Kritis" },
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
      <i />
    </div>
  );
}

function StatusPill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "good" | "warn" | "danger" | "info" | "neutral" }) {
  return <span className={`status-pill ${tone}`}>{children}</span>;
}

function Sidebar({ current, onChange, open, onClose }: { current: ViewId; onChange: (id: ViewId) => void; open: boolean; onClose: () => void }) {
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
            <div><strong>Data tersinkron</strong><span>Diperbarui 10:51 WIB</span></div>
          </div>
          <div className="user-card">
            <div className="avatar">MA</div>
            <div><strong>Muhammad Agung</strong><span>Owner</span></div>
            <MoreHorizontal size={18} />
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
      <button className="notification-row"><span className="notice-symbol order"><ShoppingBag size={17} /></span><span><strong>Pesanan baru dari Bu Ratna</strong><small>7 produk menunggu konfirmasi stok · 5 menit lalu</small></span></button>
      <button className="notification-row"><span className="notice-symbol stock"><Package size={17} /></span><span><strong>Stok Telur Ayam kritis</strong><small>Tersisa 7 kg di Cabang Antapani</small></span></button>
      <button className="notification-row"><span className="notice-symbol user"><UserCheck size={17} /></span><span><strong>Pendaftaran pegawai baru</strong><small>Rian Saputra menunggu persetujuan</small></span></button>
      <button className="text-action">Lihat semua notifikasi <ChevronRight size={15} /></button>
    </div>
  );
}

function Dashboard({ goTo }: { goTo: (id: ViewId) => void }) {
  const [period, setPeriod] = useState("Hari ini");
  return (
    <div className="view-stack">
      <section className="welcome-band">
        <div><p className="section-kicker">SELAMAT PAGI, PAK AGUNG</p><h2>Toko berjalan baik hari ini.</h2><span>Omzet sudah mencapai 68% dari rata-rata hari Minggu.</span></div>
        <div className="welcome-actions">
          <button className="button secondary" onClick={() => goTo("reports")}><Download size={17} /> Unduh laporan</button>
          <button className="button primary" onClick={() => goTo("products")}><Plus size={18} /> Tambah produk</button>
        </div>
      </section>

      <section className="metric-grid">
        <article className="metric-card featured">
          <div className="metric-head"><span className="metric-icon"><CircleDollarSign size={19} /></span><StatusPill tone="good"><ArrowUpRight size={13} /> 12,4%</StatusPill></div>
          <p>Omzet hari ini</p><h3>Rp8.462.500</h3><span>142 transaksi dari 2 kasir</span>
        </article>
        <article className="metric-card">
          <div className="metric-head"><span className="metric-icon amber"><WalletCards size={19} /></span><StatusPill tone="good"><ArrowUpRight size={13} /> 8,1%</StatusPill></div>
          <p>Laba kotor</p><h3>Rp1.684.200</h3><span>Margin rata-rata 19,9%</span>
        </article>
        <article className="metric-card">
          <div className="metric-head"><span className="metric-icon blue"><ShoppingBag size={19} /></span><StatusPill tone="info">3 baru</StatusPill></div>
          <p>Pesanan online</p><h3>12 pesanan</h3><span>3 perlu segera dikonfirmasi</span>
        </article>
        <article className="metric-card">
          <div className="metric-head"><span className="metric-icon red"><Package size={19} /></span><StatusPill tone="danger"><ArrowDownRight size={13} /> 8 item</StatusPill></div>
          <p>Stok perlu perhatian</p><h3>8 produk</h3><span>2 habis · 6 hampir habis</span>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="surface sales-chart">
          <div className="surface-heading">
            <div><p className="section-kicker">PENJUALAN</p><h3>Pergerakan omzet</h3></div>
            <div className="period-tabs">{["Hari ini", "7 hari", "30 hari"].map((item) => <button key={item} onClick={() => setPeriod(item)} className={period === item ? "active" : ""}>{item}</button>)}</div>
          </div>
          <div className="chart-summary"><strong>{period === "Hari ini" ? "Rp8,46 jt" : period === "7 hari" ? "Rp54,72 jt" : "Rp231,8 jt"}</strong><span><ArrowUpRight size={14} /> 12,4% dari periode sebelumnya</span></div>
          <div className="bar-chart" aria-label="Grafik penjualan per jam">
            {[42, 58, 48, 70, 64, 84, 76, 96, 72].map((height, index) => <div className="bar-column" key={index}><div style={{ height: `${height}%` }} className={index === 7 ? "peak" : ""}><i /></div><span>{["08", "09", "10", "11", "12", "13", "14", "15", "16"][index]}</span></div>)}
            <div className="average-line"><span>rata-rata</span></div>
          </div>
        </article>

        <article className="surface branch-performance">
          <div className="surface-heading"><div><p className="section-kicker">CABANG</p><h3>Performa hari ini</h3></div><button className="icon-button"><MoreHorizontal size={19} /></button></div>
          <div className="branch-list">
            <div className="branch-row"><span className="rank first">1</span><div><strong>Antapani</strong><small>142 transaksi</small></div><span><strong>Rp8,46 jt</strong><small className="positive">+12,4%</small></span></div>
            <div className="branch-row"><span className="rank">2</span><div><strong>Cicaheum</strong><small>118 transaksi</small></div><span><strong>Rp7,18 jt</strong><small className="positive">+6,8%</small></span></div>
            <div className="branch-row"><span className="rank">3</span><div><strong>Ujung Berung</strong><small>91 transaksi</small></div><span><strong>Rp5,92 jt</strong><small className="negative">−2,1%</small></span></div>
          </div>
          <button className="text-action" onClick={() => goTo("branches")}>Bandingkan cabang <ChevronRight size={15} /></button>
        </article>
      </section>

      <section className="dashboard-grid lower">
        <article className="surface recent-transactions">
          <div className="surface-heading"><div><p className="section-kicker">AKTIVITAS TERBARU</p><h3>Transaksi terakhir</h3></div><button className="text-action" onClick={() => goTo("transactions")}>Lihat semua <ChevronRight size={15} /></button></div>
          <div className="compact-table">
            {transactions.slice(0, 4).map((transaction) => <div className="transaction-row" key={transaction.id}><span className="transaction-icon"><ShoppingCart size={17} /></span><div><strong>{transaction.id}</strong><small>{transaction.time} · {transaction.cashier}</small></div><StatusPill tone={transaction.method === "Tempo" ? "warn" : transaction.method === "QRIS" ? "info" : "neutral"}>{transaction.method}</StatusPill><strong className="amount">{transaction.total}</strong></div>)}
          </div>
        </article>
        <article className="surface attention-card">
          <div className="surface-heading"><div><p className="section-kicker">PERLU TINDAKAN</p><h3>Hari ini</h3></div><span className="attention-count">5</span></div>
          <button className="attention-row" onClick={() => goTo("orders")}><span className="notice-symbol order"><ShoppingBag size={17} /></span><span><strong>3 pesanan menunggu</strong><small>Konfirmasi sebelum 11:30</small></span><ChevronRight size={17} /></button>
          <button className="attention-row" onClick={() => goTo("inventory")}><span className="notice-symbol stock"><Package size={17} /></span><span><strong>2 produk stok kritis</strong><small>Telur dan Kopi Kapal Api</small></span><ChevronRight size={17} /></button>
          <button className="attention-row" onClick={() => goTo("team")}><span className="notice-symbol user"><UserCheck size={17} /></span><span><strong>1 pegawai mendaftar</strong><small>Menunggu persetujuan akun</small></span><ChevronRight size={17} /></button>
        </article>
      </section>
    </div>
  );
}

function ProductsView() {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => products.filter((product) => `${product.name} ${product.code} ${product.category}`.toLowerCase().includes(query.toLowerCase())), [query]);
  return (
    <div className="view-stack">
      <div className="action-strip"><div className="search-field"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nama, kode, atau kategori produk..." /></div><button className="button secondary"><Download size={17} /> Impor Excel</button><button className="button primary"><Plus size={18} /> Produk baru</button></div>
      <section className="mini-metrics"><div><span>Total produk</span><strong>486</strong><small>472 aktif</small></div><div><span>Kategori</span><strong>18</strong><small>2 kategori kosong</small></div><div><span>Stok menipis</span><strong className="warn-text">6</strong><small>Perlu pembelian</small></div><div><span>Stok habis</span><strong className="danger-text">2</strong><small>Tidak dapat dijual</small></div></section>
      <section className="surface data-surface">
        <div className="table-toolbar"><div className="filter-chips"><button className="active">Semua produk</button><button>Tersedia</button><button>Stok menipis</button><button>Habis</button></div><button className="button compact secondary"><SlidersHorizontal size={16} /> Filter</button></div>
        <div className="data-table product-table">
          <div className="table-head"><span>Produk</span><span>Kategori</span><span>Stok Antapani</span><span>Satuan dasar</span><span>Harga eceran</span><span>Status</span><span /></div>
          {filtered.map((product, index) => <div className="table-row" key={product.code}><span className="product-cell"><i className={`product-thumb p${index % 4}`}>{product.name.slice(0, 1)}</i><span><strong>{product.name}</strong><small>{product.code}</small></span></span><span>{product.category}</span><span><strong>{product.stock}</strong></span><span>{product.base}</span><span><strong>{product.price}</strong></span><span><StatusPill tone={product.status === "Tersedia" ? "good" : product.status === "Kritis" ? "danger" : "warn"}>{product.status}</StatusPill></span><button className="icon-button"><MoreHorizontal size={18} /></button></div>)}
          {filtered.length === 0 && <div className="empty-state"><Search size={30} /><strong>Produk tidak ditemukan</strong><span>Coba gunakan nama atau kode yang berbeda.</span></div>}
        </div>
        <div className="table-footer"><span>Menampilkan {filtered.length} dari 486 produk</span><div><button disabled><ChevronDown size={16} /></button><b>1</b><button>2</button><button>3</button><button><ChevronRight size={16} /></button></div></div>
      </section>
    </div>
  );
}

function InventoryView() {
  return (
    <div className="view-stack">
      <div className="action-strip align-end"><div className="segmented"><button className="active">Persediaan</button><button>Barang masuk</button><button>Transfer cabang</button><button>Stock opname</button></div><button className="button secondary"><History size={17} /> Riwayat stok</button><button className="button primary"><Truck size={18} /> Catat barang masuk</button></div>
      <section className="inventory-alert"><span><PackageCheck size={21} /></span><div><strong>Jadwal pembelian berikutnya: Senin, 3 Agustus</strong><p>Ada 8 produk di bawah batas minimum. Siapkan daftar belanja untuk supplier.</p></div><button className="button light">Buat daftar belanja</button></section>
      <section className="surface data-surface">
        <div className="surface-heading inventory-title"><div><p className="section-kicker">STOK CABANG ANTAPANI</p><h3>Produk perlu perhatian</h3></div><div className="search-field small"><Search size={17} /><input placeholder="Cari produk..." /></div></div>
        <div className="data-table stock-table">
          <div className="table-head"><span>Produk</span><span>Stok sekarang</span><span>Minimum</span><span>Penjualan 7 hari</span><span>Estimasi habis</span><span>Tindakan</span></div>
          {[
            ["Telur Ayam Negeri", "7 kg", "12 kg", "34 kg", "Besok", "Kritis"],
            ["Kopi Kapal Api 65g", "23 sachet", "40 sachet", "116 sachet", "2 hari", "Menipis"],
            ["Rokok Surya 12", "96 bungkus", "120 bungkus", "284 bungkus", "3 hari", "Menipis"],
            ["Susu Kental Manis", "31 sachet", "36 sachet", "62 sachet", "4 hari", "Menipis"],
          ].map((row, i) => <div className="table-row" key={row[0]}><span className="product-cell"><i className={`product-thumb p${i}`}>{row[0][0]}</i><strong>{row[0]}</strong></span><span><strong>{row[1]}</strong></span><span>{row[2]}</span><span>{row[3]}</span><span><StatusPill tone={row[5] === "Kritis" ? "danger" : "warn"}>{row[4]}</StatusPill></span><button className="text-button">Tambah stok</button></div>)}
        </div>
      </section>
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
  return <div className="view-stack"><div className="action-strip align-end"><p className="helper-copy">3 cabang aktif · Data diperbarui pukul 10:51 WIB</p><button className="button primary"><Plus size={18} /> Tambah cabang</button></div><section className="branch-cards">{[["Antapani", "Jl. Terusan Jakarta No. 88", "Rp8.462.500", "142", "486", "12,4%"], ["Cicaheum", "Jl. A.H. Nasution No. 42", "Rp7.184.000", "118", "452", "6,8%"], ["Ujung Berung", "Jl. Raya Ujung Berung No. 19", "Rp5.921.500", "91", "438", "−2,1%"]].map((branch, i) => <article className="branch-card" key={branch[0]}><div className="branch-card-head"><span className={`branch-symbol b${i}`}><Store size={20} /></span><button className="icon-button"><MoreHorizontal size={18} /></button></div><h3>{branch[0]}</h3><p>{branch[1]}</p><div className="branch-kpi"><span><small>Omzet hari ini</small><strong>{branch[2]}</strong></span><StatusPill tone={branch[5].startsWith("−") ? "danger" : "good"}>{branch[5]}</StatusPill></div><div className="branch-stats"><span><strong>{branch[3]}</strong><small>Transaksi</small></span><span><strong>{branch[4]}</strong><small>Produk aktif</small></span><span><strong>{i === 0 ? "2" : "1"}</strong><small>Kasir aktif</small></span></div><button className="button secondary full">Buka cabang <ChevronRight size={16} /></button></article>)}</section></div>;
}

function TeamView() {
  const [approved, setApproved] = useState(false);
  return <div className="view-stack"><section className={`approval-banner ${approved ? "approved" : ""}`}><span className="notice-symbol user"><UserCheck size={20} /></span><div><strong>{approved ? "Akun Rian Saputra sudah disetujui" : "1 pendaftaran menunggu persetujuan"}</strong><p>{approved ? "Rian kini dapat masuk sebagai kasir Cabang Antapani." : "Rian Saputra mendaftar sebagai kasir Cabang Antapani 24 menit lalu."}</p></div>{!approved && <><button className="button light">Lihat data</button><button className="button primary" onClick={() => setApproved(true)}><Check size={17} /> Setujui</button></>}</section><section className="surface data-surface"><div className="table-toolbar"><div className="search-field"><Search size={18} /><input placeholder="Cari nama atau nomor HP pegawai..." /></div><button className="button primary"><Plus size={18} /> Tambah pegawai</button></div><div className="data-table team-table"><div className="table-head"><span>Pegawai</span><span>Peran</span><span>Cabang</span><span>Shift terakhir</span><span>Status</span><span /></div>{[["Siti Rahma", "0812 4421 8810", "Kasir", "Antapani", "Hari ini, 07:02", "Sedang bertugas"], ["Dedi Irawan", "0857 1930 2246", "Kasir", "Antapani", "Hari ini, 07:18", "Sedang bertugas"], ["Nina Marlina", "0813 7751 9028", "Admin cabang", "Cicaheum", "Kemarin, 20:42", "Aktif"], ["Wawan Setiawan", "0821 6634 1198", "Kasir", "Ujung Berung", "Kemarin, 21:01", "Aktif"]].map((row, i) => <div className="table-row" key={row[0]}><span className="person-cell"><i className={`avatar ${i === 1 ? "blue-avatar" : ""}`}>{row[0].split(" ").map(n => n[0]).join("").slice(0,2)}</i><span><strong>{row[0]}</strong><small>{row[1]}</small></span></span><span>{row[2]}</span><span>{row[3]}</span><span>{row[4]}</span><span><StatusPill tone={row[5] === "Sedang bertugas" ? "good" : "neutral"}>{row[5]}</StatusPill></span><button className="icon-button"><MoreHorizontal size={18} /></button></div>)}</div></section></div>;
}

function ReportsView() {
  return <div className="view-stack"><div className="action-strip align-end"><div className="segmented"><button className="active">Penjualan</button><button>Laba</button><button>Produk</button><button>Kasir</button><button>Stok</button></div><button className="button secondary"><CalendarDays size={17} /> 27 Jul – 2 Agu</button><button className="button primary"><Download size={17} /> Unduh Excel</button></div><section className="report-hero"><div><p className="section-kicker light-kicker">RINGKASAN MINGGU INI</p><h2>Rp54.720.500</h2><span>Total omzet dari 3 cabang</span></div><div className="report-breakdown"><span><small>Laba kotor</small><strong>Rp10.888.400</strong></span><span><small>Total transaksi</small><strong>954</strong></span><span><small>Rata-rata transaksi</small><strong>Rp57.359</strong></span></div></section><section className="dashboard-grid"><article className="surface sales-chart"><div className="surface-heading"><div><p className="section-kicker">TREN MINGGUAN</p><h3>Omzet per hari</h3></div><StatusPill tone="good"><ArrowUpRight size={13} /> 9,8%</StatusPill></div><div className="weekly-bars">{[["Sen", 66], ["Sel", 74], ["Rab", 59], ["Kam", 82], ["Jum", 72], ["Sab", 94], ["Min", 86]].map((bar, i) => <div key={bar[0]}><span>Rp{[6.4,7.2,5.8,8.1,7.0,9.4,8.5][i]}jt</span><i style={{height: `${bar[1]}%`}} className={i === 5 ? "peak" : ""} /><small>{bar[0]}</small></div>)}</div></article><article className="surface"><div className="surface-heading"><div><p className="section-kicker">PRODUK TERLARIS</p><h3>Berdasarkan omzet</h3></div></div><div className="top-products">{[["Rokok Surya 12", "Rp8,42 jt", "96%"], ["Minyakita 1 Liter", "Rp6,18 jt", "72%"], ["Beras Ramos 5kg", "Rp4,92 jt", "58%"], ["Indomie Goreng", "Rp3,81 jt", "44%"]].map((row, i) => <div key={row[0]}><span className="rank">{i + 1}</span><span><strong>{row[0]}</strong><i><b style={{width: row[2]}} /></i></span><strong>{row[1]}</strong></div>)}</div></article></section></div>;
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
  return (
    <main className="admin-shell">
      <Sidebar current={view} onChange={setView} open={menuOpen} onClose={() => setMenuOpen(false)} />
      <section className="workspace">
        <Topbar current={view} onMenu={() => setMenuOpen(true)} onNotify={() => setNotificationsOpen((open) => !open)} notificationsOpen={notificationsOpen} />
        <NotificationPanel open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
        <div className="page-content"><AdminContent view={view} onChange={setView} /></div>
      </section>
    </main>
  );
}
