"use client";

import {
  ArrowRight, Barcode, Check, ClipboardCheck, Download, FileSpreadsheet,
  MapPin, Minus, Package, Plus, Printer, ReceiptText, ScanLine, Search,
  ShoppingCart, Trash2, Upload, UserRoundCheck, Wifi, WifiOff,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { StatusPill, useAdminData } from "./feature-views";

const idr = (value: number) => new Intl.NumberFormat("id-ID", {
  style: "currency", currency: "IDR", maximumFractionDigits: 0,
}).format(value);

const downloadCsv = (filename: string, rows: Array<Array<string | number>>) => {
  const csv = rows.map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
};

type PosProduct = { id: string; unitId: string; name: string; code: string; barcode: string; unit: string; conversion: number; retail: number; reseller: number; stock: number; rack: string };
type CartItem = PosProduct & { qty: number };
type Customer = { id: string; code: string; name: string; phone: string; address: string; type: "retail" | "reseller"; status: string; current_debt: number };
type ImportCatalog = { id: string; name: string };
type ProductImportRow = {
  row: number; code: string; barcode: string; name: string; category: string; unit: string;
  retail: number; reseller: number; stock: number; minimum: number; rack: string;
  categoryId: string | null; unitId: string | null; errors: string[]; warnings: string[];
};
type CheckoutPayload = {
  p_branch_id: string; p_customer_id: string | null; p_customer_type: string;
  p_items: Array<{ product_unit_id: string; quantity: number }>;
  p_payment_method: string; p_paid_amount: number; p_notes: string | null; p_client_transaction_id: string;
};
type SaleDocument = {
  id: string; transaction_number: string; invoice_number: string | null; customer_type_snapshot: "retail" | "reseller";
  occurred_at: string; total_amount: number; paid_amount: number; change_amount: number; notes: string | null;
  customers: { name: string; phone: string | null; address: string | null; customer_code: string } | null;
  branches: { name: string; phone: string | null; address: string | null } | null;
  profiles: { full_name: string } | null; payments: Array<{ method: string; amount: number }>;
  sale_items: Array<{ id: string; product_name_snapshot: string; unit_name_snapshot: string; quantity: number; unit_price: number; subtotal: number }>;
};

const checkoutQueueKey = "agung-pos-checkout-queue-v1";
const readCheckoutQueue = (): CheckoutPayload[] => {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(checkoutQueueKey) ?? "[]") as CheckoutPayload[]; } catch { return []; }
};
const writeCheckoutQueue = (queue: CheckoutPayload[]) => window.localStorage.setItem(checkoutQueueKey, JSON.stringify(queue));

function BarcodeCanvas({ value, compact = false }: { value: string; compact?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current || !value) return;
    let cancelled = false;
    void import("@bwip-js/browser").then(({ toCanvas }) => { if (!cancelled && ref.current) try { toCanvas(ref.current, { bcid: "code128", text: value, scale: compact ? 2 : 3, height: compact ? 8 : 11, includetext: false, padding: 0, backgroundcolor: "FFFFFF" }); } catch { /* Human-readable fallback remains visible. */ } });
    return () => { cancelled = true; };
  }, [value, compact]);
  return <canvas ref={ref} className="barcode-canvas" aria-label={`Barcode ${value}`}/>;
}

async function loadOperationalProducts(branchId: string, includeAllUnits = false): Promise<PosProduct[]> {
  const enhanced = await supabase.from("branch_products").select("product_id,stock_base_qty,products!inner(id,name,code,barcode,rack_location,is_active,product_units(id,selling_price,reseller_price,conversion_to_base,is_default_sale_unit,is_active,units(name)))").eq("branch_id", branchId);
  let data = enhanced.data as unknown as Array<Record<string, unknown>> | null;
  if (enhanced.error) {
    const fallback = await supabase.from("branch_products").select("product_id,stock_base_qty,products!inner(id,name,code,is_active,product_units(id,selling_price,conversion_to_base,is_default_sale_unit,is_active,units(name)))").eq("branch_id", branchId);
    data = fallback.data as unknown as Array<Record<string, unknown>> | null;
  }
  return (data ?? []).flatMap(row => {
    const product = row.products as Record<string, unknown>;
    if (!product?.is_active) return [];
    const units = (product.product_units as Array<Record<string, unknown>>) ?? [];
    const availableUnits = units.filter(item => item.is_active !== false);
    const chosenUnits = includeAllUnits ? availableUnits : [availableUnits.find(item => item.is_default_sale_unit) ?? availableUnits[0]].filter(Boolean);
    return chosenUnits.map(unit => { const retail = Number(unit?.selling_price ?? 0); const conversion = Number(unit?.conversion_to_base ?? 1); return {
      id: String(product.id), unitId: String(unit?.id ?? ""), name: String(product.name), code: String(product.code),
      barcode: String(product.barcode ?? product.code), rack: String(product.rack_location ?? "Belum ditempatkan"),
      unit: String((unit?.units as { name?: string })?.name ?? "unit"), conversion, retail,
      reseller: Number(unit?.reseller_price ?? Math.round(retail * .9)), stock: Math.floor(Number(row.stock_base_qty ?? 0) / conversion),
    }; });
  });
}

async function loadCustomers(): Promise<Customer[]> {
  const enhanced = await supabase.from("customers").select("id,customer_code,name,phone,address,customer_type,status,current_debt").order("name");
  let data = enhanced.data as unknown as Array<Record<string, unknown>> | null;
  if (enhanced.error) {
    const fallback = await supabase.from("customers").select("id,name,phone,address,current_debt").order("name");
    data = fallback.data as unknown as Array<Record<string, unknown>> | null;
  }
  return (data ?? []).map((row, index) => ({
    id: String(row.id), code: String(row.customer_code ?? `CUS-${String(index + 1).padStart(4, "0")}`),
    name: String(row.name), phone: String(row.phone ?? ""), address: String(row.address ?? ""),
    type: row.customer_type === "reseller" ? "reseller" : "retail", status: String(row.status ?? "active"),
    current_debt: Number(row.current_debt ?? 0),
  }));
}

export function PosView() {
  const { activeBranchId, activeBranch, toast } = useAdminData();
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [mode, setMode] = useState<"retail" | "reseller">("retail");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [payment, setPayment] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [note, setNote] = useState("");
  const [working, setWorking] = useState(false);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [queueCount, setQueueCount] = useState(() => typeof window === "undefined" ? 0 : readCheckoutQueue().length);
  const toastRef = useRef(toast);
  useEffect(() => { toastRef.current = toast; }, [toast]);
  useEffect(() => { if (!activeBranchId) return; void Promise.all([loadOperationalProducts(activeBranchId, true), loadCustomers()]).then(([p, c]) => { setProducts(p); setCustomers(c); }); }, [activeBranchId]);
  useEffect(() => {
    const syncQueue = async () => {
      setOnline(navigator.onLine);
      if (!navigator.onLine) return;
      const queue = readCheckoutQueue();
      const remaining: CheckoutPayload[] = [];
      for (const payload of queue) {
        const { error } = await supabase.rpc("pos_checkout_retail_wholesale", payload);
        if (error) remaining.push(payload);
      }
      writeCheckoutQueue(remaining); setQueueCount(remaining.length);
      if (queue.length > remaining.length) {
        toastRef.current(`${queue.length - remaining.length} transaksi offline berhasil disinkronkan.`);
        if (activeBranchId) setProducts(await loadOperationalProducts(activeBranchId, true));
      }
    };
    const onOnline = () => void syncQueue();
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline); window.addEventListener("offline", onOffline);
    const timer = window.setTimeout(() => void syncQueue(), 0);
    return () => { window.clearTimeout(timer); window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, [activeBranchId]);
  const filtered = products.filter(product => `${product.name} ${product.code} ${product.barcode}`.toLowerCase().includes(query.toLowerCase()));
  const total = cart.reduce((sum, item) => sum + (mode === "reseller" ? item.reseller : item.retail) * item.qty, 0);
  const cashPayment = paymentMethod === "cash";
  const enteredPayment = Number(payment || 0);
  const paid = cashPayment ? enteredPayment : total;
  const change = cashPayment ? Math.max(0, paid - total) : 0;
  const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const shortfall = Math.max(0, total - paid);
  const add = (product: PosProduct) => {
    if (product.stock <= 0) { toast(`${product.name} sedang habis.`, "error"); return; }
    setCart(current => current.some(item => item.unitId === product.unitId)
      ? current.map(item => item.unitId === product.unitId ? { ...item, qty: Math.min(item.stock, item.qty + 1) } : item)
      : [...current, { ...product, qty: 1 }]);
  };
  const quantity = (unitId: string, delta: number) => setCart(current => current.map(item => item.unitId === unitId ? { ...item, qty: Math.min(item.stock, Math.max(1, item.qty + delta)) } : item));
  const selectedCustomer = customers.find(item => item.id === customerId);
  const complete = async () => {
    if (!activeBranchId || !cart.length || paid < total) return;
    setWorking(true);
    const payload: CheckoutPayload = {
      p_branch_id: activeBranchId,
      p_customer_id: customerId || null,
      p_customer_type: mode,
      p_items: cart.map(item => ({ product_unit_id: item.unitId, quantity: item.qty })),
      p_payment_method: paymentMethod,
      p_paid_amount: paid,
      p_notes: note || null,
      p_client_transaction_id: crypto.randomUUID(),
    };
    if (!navigator.onLine) {
      const queue = [...readCheckoutQueue(), payload]; writeCheckoutQueue(queue); setQueueCount(queue.length);
      toast("Transaksi disimpan di antrean offline dan akan disinkronkan otomatis.");
      setCart([]); setPayment(""); setNote(""); setCustomerId(""); setMode("retail"); setWorking(false); return;
    }
    const { data, error } = await supabase.rpc("pos_checkout_retail_wholesale", payload);
    if (error && (error.message.toLowerCase().includes("fetch") || !navigator.onLine)) {
      const queue = [...readCheckoutQueue(), payload]; writeCheckoutQueue(queue); setQueueCount(queue.length); setOnline(false);
      toast("Koneksi terputus. Transaksi diamankan di antrean offline.");
      setCart([]); setPayment(""); setNote(""); setCustomerId(""); setMode("retail");
    } else if (error) toast(error.message, "error");
    else {
      const receipt = data as { transaction_number?: string; invoice_number?: string } | null;
      toast(`${receipt?.invoice_number ?? receipt?.transaction_number ?? "Transaksi"} berhasil disimpan.`);
      setCart([]); setPayment(""); setNote(""); setCustomerId(""); setMode("retail");
      setProducts(await loadOperationalProducts(activeBranchId, true));
    }
    setWorking(false);
  };
  return <div className="view-stack retail-view">
    <section className="retail-context-bar"><div>{online ? <><span className="live-dot"/> Kasir online</> : <><WifiOff size={15}/> Mode offline</>}</div><div>{queueCount ? <WifiOff size={15}/> : <Wifi size={15}/>} Antrean offline: {queueCount}</div><strong>{activeBranch?.name}</strong></section>
    <section className="pos-workspace">
      <div className="pos-catalog surface">
        <div className="pos-toolbar"><label className="retail-search"><ScanLine size={20}/><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Scan barcode, SKU, atau cari produk"/></label><span>{filtered.length} produk</span></div>
        <div className="pos-product-grid">{filtered.map(product => <button key={product.unitId} className="pos-product-card" disabled={product.stock <= 0} onClick={() => add(product)}><span className="product-glyph"><Barcode size={21}/></span><strong>{product.name}</strong><small>{product.code} · {product.unit} · Rak {product.rack}</small><b>{idr(mode === "reseller" ? product.reseller : product.retail)}</b><em>{product.stock > 0 ? `${product.stock} ${product.unit}` : "Habis"}</em></button>)}{!filtered.length && <div className="retail-empty"><Package size={28}/><strong>Produk tidak ditemukan</strong><span>Coba SKU, barcode, atau nama lain.</span></div>}</div>
      </div>
      <aside className="pos-receipt">
        <div className="receipt-head"><div><p>TRANSAKSI BARU</p><h2>Keranjang kasir</h2></div><span>{itemCount} item</span></div>
        <label className="receipt-field"><span>Customer</span><select value={customerId} onChange={event => { const nextId = event.target.value; setCustomerId(nextId); const customer = customers.find(item => item.id === nextId); setMode(customer?.type === "reseller" ? "reseller" : "retail"); }}><option value="">Customer umum</option>{customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name} · {customer.type}</option>)}</select></label>
        <div className="price-mode"><button className={mode === "retail" ? "active" : ""} onClick={() => { setCustomerId(""); setMode("retail"); }}>Retail</button><button className={mode === "reseller" ? "active" : ""} disabled={selectedCustomer?.type !== "reseller"}>Reseller</button></div>
        {mode === "reseller" && <div className="reseller-notice"><UserRoundCheck size={16}/><span>Harga reseller aktif otomatis, tanpa minimum kuantitas.</span></div>}
        <div className="receipt-items">{cart.map(item => <div className="receipt-line" key={item.unitId}><div><strong>{item.name}</strong><small>{idr(mode === "reseller" ? item.reseller : item.retail)} / {item.unit} · stok {item.stock}</small><span><button aria-label={`Kurangi ${item.name}`} onClick={() => quantity(item.unitId, -1)}><Minus size={13}/></button><b>{item.qty}</b><button aria-label={`Tambah ${item.name}`} disabled={item.qty >= item.stock} onClick={() => quantity(item.unitId, 1)}><Plus size={13}/></button></span></div><strong>{idr((mode === "reseller" ? item.reseller : item.retail) * item.qty)}</strong><button className="remove-item" aria-label={`Hapus ${item.name}`} onClick={() => setCart(current => current.filter(row => row.unitId !== item.unitId))}><Trash2 size={15}/></button></div>)}{!cart.length && <div className="empty-receipt"><ShoppingCart size={28}/><strong>Keranjang masih kosong</strong><span>Scan barcode atau pilih produk untuk memulai.</span></div>}</div>
        <div className="receipt-checkout">
          <label className="receipt-field"><span>Catatan transaksi</span><input value={note} onChange={event => setNote(event.target.value)} placeholder="Opsional"/></label>
          <div className="receipt-total"><span>Total</span><strong>{idr(total)}</strong></div>
          <div className="receipt-payment-grid"><label className="receipt-field payment-field"><span>Metode</span><select value={paymentMethod} onChange={event => setPaymentMethod(event.target.value)}><option value="cash">Tunai</option><option value="qris">QRIS</option><option value="transfer">Transfer</option><option value="other">Lainnya</option></select></label><label className="receipt-field payment-field"><span>{cashPayment ? "Uang diterima" : "Nominal dibayar"}</span><input type="number" inputMode="numeric" min="0" disabled={!cashPayment} value={cashPayment ? payment : total || ""} onChange={event => setPayment(event.target.value)} placeholder="Rp 0"/></label></div>
          {cashPayment && total > 0 && <button className="exact-payment" type="button" onClick={() => setPayment(String(total))}>Gunakan uang pas</button>}
          <div className={`change-line ${shortfall ? "shortfall" : ""}`}><span>{shortfall ? "Kekurangan" : "Kembalian"}</span><strong>{idr(shortfall || change)}</strong></div>
          <button className="button primary pos-pay-button" disabled={!cart.length || shortfall > 0 || working} onClick={() => void complete()}><ReceiptText size={18}/> {working ? "Menyimpan transaksi..." : cashPayment ? "Bayar & simpan transaksi" : `Konfirmasi ${paymentMethod.toUpperCase()}`}</button>
        </div>
      </aside>
    </section>
  </div>;
}

type CustomerSale = { id: string; transaction_number: string; invoice_number: string | null; occurred_at: string; total_amount: number; status: string; customer_type_snapshot: string; sale_items: Array<{ product_name_snapshot: string; quantity: number }> };
export function MembersView() {
  const { profile, toast } = useAdminData();
  const [customers, setCustomers] = useState<Customer[]>([]); const [query, setQuery] = useState(""); const [type, setType] = useState("all");
  const [open, setOpen] = useState(false); const [saving, setSaving] = useState(false); const [editing, setEditing] = useState<Customer | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null); const [history, setHistory] = useState<CustomerSale[]>([]); const [historyLoading, setHistoryLoading] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "", type: "retail", status: "active" });
  const refresh = () => void loadCustomers().then(setCustomers);
  useEffect(refresh, []);
  const showForm = (customer?: Customer) => { setEditing(customer ?? null); setForm(customer ? { name: customer.name, phone: customer.phone, address: customer.address, type: customer.type, status: customer.status } : { name: "", phone: "", address: "", type: "retail", status: "active" }); setOpen(true); };
  const save = async (event: React.FormEvent) => { event.preventDefault(); if (!profile.organization_id) return; setSaving(true); const values = { name: form.name.trim(), phone: form.phone || null, address: form.address || null, customer_type: form.type, status: form.status }; const result = editing ? await supabase.from("customers").update(values).eq("id", editing.id) : await supabase.from("customers").insert({ ...values, organization_id: profile.organization_id, customer_code: `CUS-${Date.now().toString().slice(-6)}` }); if (result.error) toast(result.error.message, "error"); else { toast(editing ? "Data customer diperbarui." : "Customer berhasil ditambahkan."); setOpen(false); setEditing(null); refresh(); } setSaving(false); };
  const showHistory = async (customer: Customer) => { setHistoryCustomer(customer); setHistoryLoading(true); const { data, error } = await supabase.from("sales").select("id,transaction_number,invoice_number,occurred_at,total_amount,status,customer_type_snapshot,sale_items(product_name_snapshot,quantity)").eq("customer_id", customer.id).order("occurred_at", { ascending: false }).limit(100); if (error) toast(error.message, "error"); setHistory((data ?? []) as unknown as CustomerSale[]); setHistoryLoading(false); };
  const filtered = customers.filter(customer => `${customer.name} ${customer.phone} ${customer.code}`.toLowerCase().includes(query.toLowerCase()) && (type === "all" || customer.type === type));
  return <div className="view-stack retail-view"><section className="retail-summary-grid"><article><span>Semua customer</span><strong>{customers.length}</strong><small>Satu database customer</small></article><article><span>Reseller aktif</span><strong>{customers.filter(item => item.type === "reseller").length}</strong><small>Harga grosir otomatis</small></article><article><span>Customer retail</span><strong>{customers.filter(item => item.type === "retail").length}</strong><small>Harga normal</small></article><article><span>Total piutang</span><strong>{idr(customers.reduce((sum, item) => sum + item.current_debt, 0))}</strong><small>Transaksi tempo</small></article></section>
    <section className="surface data-surface"><div className="retail-table-toolbar"><label className="retail-search"><Search size={18}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari nama, nomor HP, atau kode member"/></label><div className="filter-chips">{[["all","Semua"],["retail","Retail"],["reseller","Reseller"]].map(([value,label]) => <button key={value} className={type === value ? "active" : ""} onClick={() => setType(value)}>{label}</button>)}</div><button className="button primary" onClick={() => showForm()}><Plus size={17}/> Tambah customer</button></div><div className="retail-data-table member-table"><div className="retail-table-head"><span>Customer</span><span>Kontak</span><span>Tipe</span><span>Status</span><span>Piutang</span><span>Tindakan</span></div>{filtered.map(customer => <div className="retail-table-row" key={customer.id}><span><i>{customer.name.split(" ").map(word => word[0]).join("").slice(0,2)}</i><span><strong>{customer.name}</strong><small>{customer.code}</small></span></span><span><strong>{customer.phone || "—"}</strong><small>{customer.address || "Alamat belum diisi"}</small></span><StatusPill tone={customer.type === "reseller" ? "info" : "neutral"}>{customer.type === "reseller" ? "Reseller" : "Retail"}</StatusPill><StatusPill tone={customer.status === "active" ? "good" : "neutral"}>{customer.status === "active" ? "Aktif" : "Nonaktif"}</StatusPill><strong>{idr(customer.current_debt)}</strong><span className="member-actions"><button className="text-button" onClick={() => void showHistory(customer)}>Riwayat</button><button className="text-button" onClick={() => showForm(customer)}>Edit</button></span></div>)}</div></section>
    {open && <div className="retail-modal-scrim" onMouseDown={() => setOpen(false)}><form className="retail-modal" onMouseDown={event => event.stopPropagation()} onSubmit={save}><div><p className="section-kicker">{editing ? "EDIT CUSTOMER" : "CUSTOMER BARU"}</p><h2>{editing ? editing.name : "Tambah retail atau reseller"}</h2><span>Jenis customer menentukan harga otomatis di POS.</span></div><label>Nama customer<input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} required/></label><div className="retail-form-grid"><label>Nomor HP / WhatsApp<input value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })}/></label><label>Tipe customer<select value={form.type} onChange={event => setForm({ ...form, type: event.target.value })}><option value="retail">Retail</option><option value="reseller">Reseller</option></select></label></div><label>Alamat<textarea value={form.address} onChange={event => setForm({ ...form, address: event.target.value })}/></label><label>Status<select value={form.status} onChange={event => setForm({ ...form, status: event.target.value })}><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select></label><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setOpen(false)}>Batal</button><button className="button primary" disabled={saving}>{saving ? "Menyimpan..." : "Simpan customer"}</button></div></form></div>}
    {historyCustomer && <div className="retail-modal-scrim" onMouseDown={() => setHistoryCustomer(null)}><section className="retail-modal customer-history-modal" onMouseDown={event => event.stopPropagation()}><div><p className="section-kicker">RIWAYAT TRANSAKSI</p><h2>{historyCustomer.name}</h2><span>{historyCustomer.code} · {historyCustomer.type === "reseller" ? "Reseller" : "Retail"}</span></div><div className="customer-history-summary"><span><small>Total transaksi</small><strong>{history.length}</strong></span><span><small>Total belanja</small><strong>{idr(history.filter(item => item.status === "completed").reduce((sum, item) => sum + Number(item.total_amount), 0))}</strong></span></div><div className="customer-history-list">{history.map(sale => <article key={sale.id}><span><strong>{sale.invoice_number ?? sale.transaction_number}</strong><small>{new Date(sale.occurred_at).toLocaleString("id-ID")} · {sale.sale_items.length} produk</small></span><span><strong>{idr(sale.total_amount)}</strong><StatusPill tone={sale.status === "completed" ? "good" : "warn"}>{sale.status}</StatusPill></span></article>)}{historyLoading && <div className="compact-empty">Memuat riwayat...</div>}{!historyLoading && !history.length && <div className="compact-empty">Belum ada transaksi untuk customer ini.</div>}</div><button className="button secondary" onClick={() => setHistoryCustomer(null)}>Tutup</button></section></div>}
  </div>;
}

type OpnameRow = PosProduct & { physical: number };
type OpnameHistory = { id: string; opname_number: string; status: string; counted_at: string | null; confirmed_at: string | null; created_at: string };
export function StockOpnameView() {
  const { activeBranchId, activeBranch, profile, toast } = useAdminData();
  const [rows, setRows] = useState<OpnameRow[]>([]);
  const [history, setHistory] = useState<OpnameHistory[]>([]);
  const [step, setStep] = useState(1);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [working, setWorking] = useState(false);
  const load = useCallback(async () => {
    if (!activeBranchId) return;
    const [items, sessions] = await Promise.all([
      loadOperationalProducts(activeBranchId),
      supabase.from("stock_opnames").select("id,opname_number,status,counted_at,confirmed_at,created_at").eq("branch_id", activeBranchId).order("created_at", { ascending: false }).limit(8),
    ]);
    setRows(items.map(item => ({ ...item, physical: item.stock })));
    if (!sessions.error) setHistory((sessions.data ?? []) as OpnameHistory[]);
  }, [activeBranchId]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  const changed = rows.filter(row => row.physical !== row.stock);
  const exportTemplate = () => { downloadCsv(`stock-opname-${activeBranch?.name ?? "cabang"}.csv`, [["SKU","Barcode","Produk","Rak","Stok Sistem","Stok Fisik","Catatan"], ...rows.map(row => [row.code,row.barcode,row.name,row.rack,row.stock,row.physical,""])]); setStep(Math.max(step, 2)); };
  const importFile = async (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; const lines = (await file.text()).split(/\r?\n/).slice(1).filter(Boolean); const values = new Map(lines.map(line => { const cells = line.split(",").map(cell => cell.replace(/^"|"$/g, "").trim()); return [cells[0], Number(cells[5])]; })); setRows(current => current.map(row => values.has(row.code) ? { ...row, physical: Number(values.get(row.code)) } : row)); setReviewId(null); setStep(4); };
  const submitReview = async () => {
    if (!activeBranchId || !rows.length) return;
    setWorking(true);
    const { data, error } = await supabase.rpc("create_stock_opname_review", {
      p_branch_id: activeBranchId,
      p_items: rows.map(row => ({ product_id: row.id, physical_stock: row.physical, notes: null })),
      p_notes: `Perhitungan fisik ${activeBranch?.name ?? "cabang"}`,
    });
    if (error) toast(error.message, "error");
    else { setReviewId(String(data)); setStep(5); toast("Hasil opname disimpan dan menunggu konfirmasi."); }
    setWorking(false);
  };
  const confirm = async () => {
    if (!reviewId) return;
    setWorking(true);
    const { data, error } = await supabase.rpc("confirm_stock_opname", { p_stock_opname_id: reviewId });
    if (error) toast(error.message, "error");
    else { toast(`${Number(data ?? 0)} selisih stok dikonfirmasi.`); setReviewId(null); setStep(6); await load(); }
    setWorking(false);
  };
  return <div className="view-stack retail-view"><section className="workflow-card"><div><p className="section-kicker">ALUR TERKENDALI</p><h2>Stock opname</h2><span>Stok baru diterapkan setelah selisih divalidasi dan dikonfirmasi.</span></div><div className="opname-steps">{["Export stok","Hitung fisik","Isi Excel","Import","Lihat selisih","Konfirmasi"].map((label, index) => <div className={step >= index + 1 ? "active" : ""} key={label}><i>{index + 1}</i><span>{label}</span></div>)}</div></section>
    <div className="action-strip"><button className="button secondary" onClick={exportTemplate}><Download size={17}/> Export template</button><input ref={fileRef} type="file" accept=".csv" hidden onChange={importFile}/><button className="button secondary" onClick={() => fileRef.current?.click()}><Upload size={17}/> Import hasil fisik</button><span className="helper-copy">Periode aktif · {activeBranch?.name}</span>{!reviewId?<button className="button primary" disabled={!rows.length || working} onClick={() => void submitReview()}><ClipboardCheck size={17}/> {working ? "Menyimpan..." : "Simpan untuk review"}</button>:profile.role === "owner" || profile.role === "admin"?<button className="button primary" disabled={working} onClick={() => void confirm()}><Check size={17}/> {working ? "Menerapkan..." : `Konfirmasi ${changed.length} selisih`}</button>:<button className="button secondary" disabled>Menunggu Owner / Admin</button>}</div>
    <section className="surface data-surface"><div className="opname-banner"><ClipboardCheck size={20}/><div><strong>Rekonsiliasi opname</strong><span>{changed.length} produk berbeda · total selisih {changed.reduce((sum, row) => sum + row.physical - row.stock, 0)} unit</span></div></div><div className="retail-data-table opname-table"><div className="retail-table-head"><span>Produk</span><span>Rak</span><span>Stok sistem</span><span>Stok fisik</span><span>Selisih</span><span>Status</span></div>{rows.map(row => { const diff = row.physical - row.stock; return <div className="retail-table-row" key={row.id}><span><strong>{row.name}</strong><small>{row.code}</small></span><strong>{row.rack}</strong><strong>{row.stock}</strong><input type="number" disabled={Boolean(reviewId)} value={row.physical} onChange={event => { setRows(current => current.map(item => item.id === row.id ? { ...item, physical: Number(event.target.value) } : item)); setReviewId(null); setStep(5); }}/><strong className={diff === 0 ? "" : diff > 0 ? "positive" : "danger-text"}>{diff > 0 ? `+${diff}` : diff}</strong><StatusPill tone={diff === 0 ? "good" : "warn"}>{diff === 0 ? "Sesuai" : reviewId ? "Menunggu approval" : "Perlu validasi"}</StatusPill></div>})}</div></section>
    <section className="surface opname-history"><div className="surface-heading"><div><p className="section-kicker">RIWAYAT OPNAME</p><h3>Sesi terakhir</h3></div></div>{history.map(item => <div className="opname-history-row" key={item.id}><span><strong>{item.opname_number}</strong><small>{new Date(item.counted_at ?? item.created_at).toLocaleString("id-ID")}</small></span><StatusPill tone={item.status === "confirmed" ? "good" : item.status === "review" ? "warn" : "neutral"}>{item.status === "confirmed" ? "Dikonfirmasi" : item.status === "review" ? "Menunggu review" : item.status}</StatusPill></div>)}{!history.length && <div className="compact-empty">Belum ada riwayat stock opname.</div>}</section>
  </div>;
}

type RackRow = { id: string; code: string; area_name: string; shelf_count: number; notes: string | null; is_active: boolean };
type RackPlacement = { product_id: string; rack_id: string; shelf_number: number; position_number: number; racks: { code: string } | null };
export function RacksView() {
  const { activeBranchId, profile, toast } = useAdminData(); const [products, setProducts] = useState<PosProduct[]>([]); const [racks, setRacks] = useState<RackRow[]>([]); const [placements, setPlacements] = useState<RackPlacement[]>([]); const [selectedId, setSelectedId] = useState(""); const [query, setQuery] = useState(""); const [shelf, setShelf] = useState(1); const [position, setPosition] = useState(1); const [newRack, setNewRack] = useState({ code: "", area: "Area Utama", shelves: 3 }); const [saving, setSaving] = useState(false);
  const refresh = useCallback(async () => { if (!activeBranchId) return; const [baseProducts, rackResult, placementResult] = await Promise.all([loadOperationalProducts(activeBranchId), supabase.from("racks").select("id,code,area_name,shelf_count,notes,is_active").eq("branch_id", activeBranchId).eq("is_active", true).order("code"), supabase.from("product_rack_placements").select("product_id,rack_id,shelf_number,position_number,racks(code)").eq("branch_id", activeBranchId)]); const nextRacks = (rackResult.data ?? []) as RackRow[]; const nextPlacements = (placementResult.data ?? []) as unknown as RackPlacement[]; const location = new Map(nextPlacements.map(item => [item.product_id, item.racks?.code ?? "Belum ditempatkan"])); setProducts(baseProducts.map(item => ({ ...item, rack: location.get(item.id) ?? item.rack }))); setRacks(nextRacks); setPlacements(nextPlacements); setSelectedId(current => nextRacks.some(item => item.id === current) ? current : nextRacks[0]?.id ?? ""); }, [activeBranchId]);
  useEffect(() => { const timer = window.setTimeout(() => void refresh(), 0); return () => window.clearTimeout(timer); }, [refresh]);
  const selectedRack = racks.find(item => item.id === selectedId);
  const move = async (productId: string) => { if (!activeBranchId || !selectedId) return; setSaving(true); const { error } = await supabase.rpc("set_product_rack_placement", { p_branch_id: activeBranchId, p_product_id: productId, p_rack_id: selectedId, p_shelf_number: shelf, p_position_number: position }); if (error) toast(error.message.includes("Could not find") ? "Jalankan migrasi penempatan rak terbaru." : error.message, "error"); else { toast(`Produk ditempatkan di ${selectedRack?.code}, tingkat ${shelf}, posisi ${position}.`); await refresh(); } setSaving(false); };
  const createRack = async (event: React.FormEvent) => { event.preventDefault(); if (!activeBranchId || !profile.organization_id) return; setSaving(true); const { error } = await supabase.from("racks").insert({ organization_id: profile.organization_id, branch_id: activeBranchId, code: newRack.code.trim().toUpperCase(), area_name: newRack.area.trim(), shelf_count: Number(newRack.shelves) }); if (error) toast(error.message, "error"); else { toast("Rak baru ditambahkan."); setNewRack({ code: "", area: "Area Utama", shelves: 3 }); await refresh(); } setSaving(false); };
  const bootstrapRacks = async () => { if (!activeBranchId || !profile.organization_id) return; setSaving(true); const values = ["A-01","A-02","A-03","B-01","B-02","B-03","C-01","C-02","C-03"].map(code => ({ organization_id: profile.organization_id, branch_id: activeBranchId, code, area_name: `Area ${code[0]}`, shelf_count: 3 })); const { error } = await supabase.from("racks").upsert(values, { onConflict: "branch_id,code" }); if (error) toast(error.message, "error"); else { toast("Sembilan rak awal dibuat."); await refresh(); } setSaving(false); };
  const filtered = products.filter(product => `${product.name} ${product.code} ${product.rack}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="racks-layout retail-view"><section className="surface rack-map"><div className="rack-heading"><div><p className="section-kicker">PLANOGRAM TERSIMPAN</p><h2>Area rak cabang</h2><span>Lokasi, tingkat, dan posisi produk disimpan per cabang.</span></div><StatusPill tone="info">{racks.length} rak aktif</StatusPill></div>{!racks.length && <div className="rack-empty"><MapPin size={25}/><strong>Belum ada struktur rak</strong><span>Buat struktur standar untuk memulai penempatan.</span><button className="button primary compact" disabled={saving || !["owner","admin"].includes(profile.role)} onClick={() => void bootstrapRacks()}>Buat 9 rak awal</button></div>}<div className="rack-grid">{racks.map(rack => { const count = placements.filter(item => item.rack_id === rack.id).length; return <button className={selectedId === rack.id ? "active" : ""} key={rack.id} onClick={() => { setSelectedId(rack.id); setShelf(1); }}><span><MapPin size={17}/>{rack.code}</span><strong>{count} produk · {rack.shelf_count} tingkat</strong><small>{rack.area_name}</small><i><b style={{ width: `${Math.min(100, count * 16)}%` }}/></i></button>; })}</div>{["owner","admin"].includes(profile.role) && <form className="rack-create-form" onSubmit={createRack}><input value={newRack.code} onChange={event => setNewRack({ ...newRack, code: event.target.value })} placeholder="Kode rak" required/><input value={newRack.area} onChange={event => setNewRack({ ...newRack, area: event.target.value })} placeholder="Nama area" required/><input type="number" min="1" value={newRack.shelves} onChange={event => setNewRack({ ...newRack, shelves: Number(event.target.value) })} aria-label="Jumlah tingkat"/><button className="button secondary compact" disabled={saving}><Plus size={15}/> Tambah rak</button></form>}</section><section className="surface rack-products"><div className="rack-product-head"><div><p className="section-kicker">LOKASI {selectedRack?.code ?? "—"}</p><h3>Penempatan produk</h3></div><label className="retail-search"><Search size={17}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari produk atau rak"/></label></div>{selectedRack && <div className="placement-controls"><label>Tingkat<select value={shelf} onChange={event => setShelf(Number(event.target.value))}>{Array.from({ length: selectedRack.shelf_count }, (_, index) => <option key={index + 1} value={index + 1}>Tingkat {index + 1}</option>)}</select></label><label>Posisi<input type="number" min="1" value={position} onChange={event => setPosition(Number(event.target.value))}/></label><span>Produk akan ditempatkan ke {selectedRack.code} · tingkat {shelf} · posisi {position}</span></div>}<div className="rack-product-list">{filtered.map(product => { const placement = placements.find(item => item.product_id === product.id); return <article key={product.id}><span className="product-glyph"><Package size={18}/></span><div><strong>{product.name}</strong><small>{product.code} · {product.rack}{placement ? ` · T${placement.shelf_number}/P${placement.position_number}` : ""}</small></div><span>{product.stock} {product.unit}</span><button className="button secondary compact" disabled={!selectedRack || saving} onClick={() => void move(product.id)}>Tempatkan</button></article>; })}</div></section></div>;
}

function ProductLabelCard({ product, storeName = "AGUNG LESTARI" }: { product: PosProduct; storeName?: string }) {
  return <article className="product-label"><strong>{storeName}</strong><span>{product.name}</span><b>{idr(product.retail)}</b><BarcodeCanvas value={product.barcode || product.code} compact/><small>{product.barcode || product.code}</small></article>;
}

function SaleDocumentView({ sale, mode }: { sale: SaleDocument; mode: "thermal" | "invoice" }) {
  const number = sale.invoice_number ?? sale.transaction_number;
  if (mode === "thermal") return <article className="thermal-receipt printable-document"><div><strong>AGUNG LESTARI</strong><span>{sale.branches?.name ?? "TOKO"} · NOTA 80 MM</span></div><p>{number}<br/>{new Date(sale.occurred_at).toLocaleString("id-ID")}</p><section>{sale.sale_items.map(item => <span className="receipt-print-row" key={item.id}><span>{item.product_name_snapshot}<small>{item.quantity} {item.unit_name_snapshot} × {idr(item.unit_price)}</small></span><strong>{idr(item.subtotal)}</strong></span>)}</section><footer><span>Total</span><strong>{idr(sale.total_amount)}</strong></footer><div className="receipt-payment-copy"><span>Bayar · {sale.payments.map(item => item.method.toUpperCase()).join(" + ") || "—"}</span><span>Kembali · {idr(sale.change_amount)}</span><small>Kasir: {sale.profiles?.full_name ?? "—"}</small><b>Terima kasih telah berbelanja.</b></div></article>;
  return <article className="surface invoice-preview printable-document"><div className="invoice-top"><div><p className="section-kicker">INVOICE GROSIR</p><h2>{number}</h2></div><StatusPill tone="good">Lunas</StatusPill></div><div className="invoice-parties"><span><small>DITAGIHKAN KEPADA</small><strong>{sale.customers?.name ?? "Customer umum"}</strong><p>{sale.customers?.address || "Alamat belum dicatat"}<br/>{sale.customers?.phone || ""}</p></span><span><small>TANGGAL</small><strong>{new Date(sale.occurred_at).toLocaleDateString("id-ID", { dateStyle: "long" })}</strong><small>{sale.branches?.name} · Reseller</small></span></div><div className="invoice-lines"><span>Produk</span><span>Qty</span><span>Harga</span><span>Subtotal</span>{sale.sale_items.map(item => <div className="invoice-line-data" key={item.id}><strong>{item.product_name_snapshot}</strong><span>{item.quantity} {item.unit_name_snapshot}</span><span>{idr(item.unit_price)}</span><strong>{idr(item.subtotal)}</strong></div>)}</div><div className="invoice-total"><span>Total invoice</span><strong>{idr(sale.total_amount)}</strong></div><div className="invoice-footer"><span>Pembayaran: {sale.payments.map(item => item.method.toUpperCase()).join(" + ") || "—"}</span><span>Kasir: {sale.profiles?.full_name ?? "—"}</span></div></article>;
}

export function DataToolsView() {
  const { activeBranchId, activeBranch, toast } = useAdminData();
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [categories, setCategories] = useState<ImportCatalog[]>([]);
  const [units, setUnits] = useState<ImportCatalog[]>([]);
  const [existingProducts, setExistingProducts] = useState<Array<{ code: string; barcode: string | null }>>([]);
  const [tab, setTab] = useState("Import & export");
  const [selected, setSelected] = useState<string[]>([]);
  const [labelQuery, setLabelQuery] = useState("");
  const [labelCopies, setLabelCopies] = useState(1);
  const [labelSize, setLabelSize] = useState<"40x30" | "50x30">("40x30");
  const [sales, setSales] = useState<SaleDocument[]>([]);
  const [selectedSaleId, setSelectedSaleId] = useState("");
  const [importRows, setImportRows] = useState<ProductImportRow[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const refreshImportReferences = useCallback(async () => {
    if (!activeBranchId) return;
    const [operational, categoryResult, unitResult, productResult] = await Promise.all([
      loadOperationalProducts(activeBranchId),
      supabase.from("categories").select("id,name").eq("is_active", true).order("name"),
      supabase.from("units").select("id,name").order("name"),
      supabase.from("products").select("code,barcode"),
    ]);
    setProducts(operational);
    if (!categoryResult.error) setCategories((categoryResult.data ?? []) as ImportCatalog[]);
    if (!unitResult.error) setUnits((unitResult.data ?? []) as ImportCatalog[]);
    if (!productResult.error) setExistingProducts((productResult.data ?? []) as Array<{ code: string; barcode: string | null }>);
  }, [activeBranchId]);
  useEffect(() => { const timer = window.setTimeout(() => void refreshImportReferences(), 0); return () => window.clearTimeout(timer); }, [refreshImportReferences]);
  useEffect(() => { if (!activeBranchId) return; const timer = window.setTimeout(async () => { const { data, error } = await supabase.from("sales").select("id,transaction_number,invoice_number,customer_type_snapshot,occurred_at,total_amount,paid_amount,change_amount,notes,customers(name,phone,address,customer_code),branches(name,phone,address),profiles!sales_cashier_profile_fkey(full_name),payments(method,amount),sale_items(id,product_name_snapshot,unit_name_snapshot,quantity,unit_price,subtotal)").eq("branch_id", activeBranchId).eq("status", "completed").order("occurred_at", { ascending: false }).limit(50); if (!error) { const next = (data ?? []) as unknown as SaleDocument[]; setSales(next); setSelectedSaleId(current => next.some(item => item.id === current) ? current : next[0]?.id ?? ""); } }, 0); return () => window.clearTimeout(timer); }, [activeBranchId]);
  const parseNumber = (value: unknown) => {
    if (typeof value === "number") return value;
    const raw = String(value ?? "").trim().replace(/\s|Rp/gi, "");
    if (!raw) return Number.NaN;
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(raw)) return Number(raw.replaceAll(".", "").replace(",", "."));
    if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(raw)) return Number(raw.replaceAll(",", ""));
    return Number(raw.replace(",", "."));
  };
  const parseImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const { read, utils } = await import("xlsx");
      const workbook = read(await file.arrayBuffer());
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) throw new Error("Workbook tidak memiliki sheet.");
      const rawRows = utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: true });
      const codeCounts = new Map<string, number>();
      const barcodeCounts = new Map<string, number>();
      rawRows.forEach(raw => {
        const code = String(raw.SKU ?? raw.Sku ?? raw.sku ?? "").trim().toUpperCase();
        const barcode = String(raw.Barcode ?? raw.barcode ?? "").trim();
        if (code) codeCounts.set(code, (codeCounts.get(code) ?? 0) + 1);
        if (barcode) barcodeCounts.set(barcode, (barcodeCounts.get(barcode) ?? 0) + 1);
      });
      const existingCodes = new Set(existingProducts.map(product => product.code.trim().toUpperCase()));
      const existingBarcodes = new Set(existingProducts.map(product => product.barcode?.trim()).filter(Boolean));
      const nextRows = rawRows.map((raw, index): ProductImportRow => {
        const code = String(raw.SKU ?? raw.Sku ?? raw.sku ?? "").trim().toUpperCase();
        const barcode = String(raw.Barcode ?? raw.barcode ?? "").trim();
        const name = String(raw.Nama ?? raw.nama ?? "").trim();
        const category = String(raw.Kategori ?? raw.kategori ?? "").trim();
        const unit = String(raw.Satuan ?? raw.satuan ?? "").trim();
        const rack = String(raw.Rak ?? raw.rak ?? "").trim().toUpperCase();
        const retail = parseNumber(raw["Harga Retail"] ?? raw.harga_retail);
        const reseller = parseNumber(raw["Harga Reseller"] ?? raw.harga_reseller);
        const stock = parseNumber(raw["Stok Awal"] ?? raw.stok_awal ?? 0);
        const minimum = parseNumber(raw["Stok Minimum"] ?? raw.stok_minimum ?? 0);
        const categoryMatch = categories.find(item => item.name.toLowerCase() === category.toLowerCase());
        const unitMatch = units.find(item => item.name.toLowerCase() === unit.toLowerCase());
        const errors: string[] = [];
        const warnings: string[] = [];
        if (!code) errors.push("SKU wajib diisi");
        else if (existingCodes.has(code)) errors.push(`SKU ${code} sudah digunakan`);
        else if ((codeCounts.get(code) ?? 0) > 1) errors.push(`SKU ${code} duplikat di file`);
        if (barcode && existingBarcodes.has(barcode)) errors.push(`Barcode ${barcode} sudah digunakan`);
        else if (barcode && (barcodeCounts.get(barcode) ?? 0) > 1) errors.push(`Barcode ${barcode} duplikat di file`);
        if (!name) errors.push("Nama produk wajib diisi");
        if (!unit) errors.push("Satuan wajib diisi");
        else if (!unitMatch) errors.push(`Satuan '${unit}' belum terdaftar`);
        if (!Number.isFinite(retail) || retail < 0) errors.push("Harga retail tidak valid");
        if (!Number.isFinite(reseller) || reseller < 0) errors.push("Harga reseller tidak valid");
        if (Number.isFinite(retail) && Number.isFinite(reseller) && reseller > retail) warnings.push("Harga reseller lebih tinggi dari retail");
        if (!Number.isFinite(stock) || stock < 0) errors.push("Stok awal tidak valid");
        if (!Number.isFinite(minimum) || minimum < 0) errors.push("Stok minimum tidak valid");
        if (category && !categoryMatch) warnings.push(`Kategori '${category}' belum dikenali; produk masuk tanpa kategori`);
        if (!rack) warnings.push("Lokasi rak belum diisi");
        return { row: index + 2, code, barcode, name, category, unit, rack, retail, reseller, stock, minimum, categoryId: categoryMatch?.id ?? null, unitId: unitMatch?.id ?? null, errors, warnings };
      });
      setImportRows(nextRows);
      setImportFileName(file.name);
      toast(`${nextRows.length} baris dibaca. Periksa hasil validasi sebelum impor.`);
    } catch (error) {
      setImportRows([]);
      setImportFileName("");
      toast(error instanceof Error ? error.message : "File tidak dapat dibaca.", "error");
    } finally {
      event.target.value = "";
    }
  };
  const downloadTemplate = async () => {
    const { utils, writeFileXLSX } = await import("xlsx");
    const sheet = utils.aoa_to_sheet([
      ["SKU","Barcode","Nama","Kategori","Satuan","Harga Retail","Harga Reseller","Stok Awal","Stok Minimum","Rak"],
      ["BRG-001","899000000001","Contoh Produk","Kebutuhan Rumah","Eceran",25000,22500,10,2,"A-01"],
    ]);
    sheet["!cols"] = [12,18,28,18,14,16,18,12,14,10].map(wch => ({ wch }));
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, sheet, "Master Produk");
    writeFileXLSX(workbook, "template-master-produk.xlsx");
  };
  const commitImport = async () => {
    if (!activeBranchId || !importRows.length) return;
    const errorCount = importRows.reduce((sum, row) => sum + row.errors.length, 0);
    if (errorCount) { toast("Perbaiki semua error sebelum mengimpor.", "error"); return; }
    setImporting(true);
    const { data, error } = await supabase.rpc("admin_import_products_retail_wholesale", {
      p_branch_id: activeBranchId,
      p_rows: importRows.map(row => ({
        code: row.code, barcode: row.barcode || null, name: row.name, category_id: row.categoryId,
        unit_id: row.unitId, retail_price: row.retail, reseller_price: row.reseller,
        initial_stock: row.stock, minimum_stock: row.minimum, rack_location: row.rack || null,
      })),
    });
    if (error) toast(error.message.includes("Could not find the function") ? "Jalankan migrasi operasional terbaru sebelum impor." : error.message, "error");
    else { toast(`${Number(data ?? importRows.length)} produk berhasil diimpor.`); setImportRows([]); setImportFileName(""); await refreshImportReferences(); }
    setImporting(false);
  };
  const exportProducts = () => downloadCsv("master-produk-retail-grosir.csv", [["SKU","Barcode","Nama","Rak","Harga Retail","Harga Reseller","Stok"], ...products.map(p => [p.code,p.barcode,p.name,p.rack,p.retail,p.reseller,p.stock])]);
  const validationIssues = importRows.flatMap(row => [...row.errors.map(issue => ({ row: row.row, issue, tone: "danger" as const })), ...row.warnings.map(issue => ({ row: row.row, issue, tone: "warn" as const }))]);
  const errorCount = importRows.reduce((sum, row) => sum + row.errors.length, 0);
  const warningCount = importRows.reduce((sum, row) => sum + row.warnings.length, 0);
  const selectedProducts = products.filter(product => selected.includes(product.id));
  const visibleLabelProducts = products.filter(product => `${product.name} ${product.code} ${product.barcode}`.toLowerCase().includes(labelQuery.toLowerCase()));
  const selectedSale = sales.find(sale => sale.id === selectedSaleId) ?? null;
  return <div className="view-stack retail-view"><div className="module-tabs">{["Import & export","Barcode & label","Invoice & nota"].map(value => <button key={value} className={tab === value ? "active" : ""} onClick={() => setTab(value)}>{value}</button>)}</div>
    {tab === "Import & export" && <><section className="import-flow">{["Download template","Isi Excel","Upload file","Validasi","Preview","Import"].map((label,index) => <div key={label}><i>{index + 1}</i><strong>{label}</strong>{index < 5 && <ArrowRight size={16}/>}</div>)}</section><section className="tools-grid"><article className="surface tool-card"><span className="tool-icon"><FileSpreadsheet size={24}/></span><h3>Master produk</h3><p>Import SKU, barcode, dua harga, stok awal, kategori, dan lokasi rak.</p><input ref={importRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={event => void parseImportFile(event)}/><div><button className="button secondary" onClick={() => void downloadTemplate()}><Download size={16}/> Template Excel</button><button className="button primary" onClick={() => importRef.current?.click()}><Upload size={16}/> Pilih file</button></div>{importFileName && <small className="import-file-name"><FileSpreadsheet size={14}/>{importFileName}</small>}</article><article className="surface tool-card"><span className="tool-icon dark"><Download size={24}/></span><h3>Export data aktif</h3><p>Unduh snapshot produk cabang {activeBranch?.name} untuk audit atau migrasi.</p><button className="button secondary" onClick={exportProducts}>Export {products.length} produk</button></article></section><section className="surface validation-card"><div className="validation-head"><div><p className="section-kicker">HASIL VALIDASI AKTUAL</p><h3>Preview sebelum commit</h3><span>{importRows.length ? `${importRows.length} produk · ${errorCount} error · ${warningCount} peringatan` : "Pilih Excel atau CSV untuk memulai validasi."}</span></div>{importRows.length > 0 && <button className="button primary" disabled={errorCount > 0 || importing} onClick={() => void commitImport()}><Upload size={16}/>{importing ? "Mengimpor..." : `Import ${importRows.length} produk`}</button>}</div>{validationIssues.map((issue, index) => <div className="validation-row" key={`${issue.row}-${index}`}><span>Baris {issue.row}</span><strong>{issue.issue}</strong><StatusPill tone={issue.tone}>{issue.tone === "danger" ? "Error" : "Peringatan"}</StatusPill></div>)}{importRows.length > 0 && validationIssues.length === 0 && <div className="validation-success"><Check size={18}/><span><strong>Semua baris siap diimpor</strong><small>Data belum mengubah master produk sampai tombol import ditekan.</small></span></div>}{importRows.length > 0 && <div className="import-preview-table"><div><strong>Baris</strong><strong>SKU / Produk</strong><strong>Satuan</strong><strong>Retail</strong><strong>Reseller</strong><strong>Stok / Rak</strong></div>{importRows.slice(0, 50).map(row => <div key={row.row}><span>{row.row}</span><span><strong>{row.code}</strong><small>{row.name}</small></span><span>{row.unit}</span><span>{idr(Number.isFinite(row.retail) ? row.retail : 0)}</span><span>{idr(Number.isFinite(row.reseller) ? row.reseller : 0)}</span><span>{Number.isFinite(row.stock) ? row.stock : "—"} · {row.rack || "—"}</span></div>)}</div>}</section></>}
    {tab === "Barcode & label" && <><section className="label-layout"><div className="surface label-products"><div className="retail-table-toolbar"><label className="retail-search"><Search size={18}/><input value={labelQuery} onChange={event => setLabelQuery(event.target.value)} placeholder="Cari SKU, barcode, atau nama produk"/></label><button className="button secondary compact" onClick={() => setSelected(selected.length === visibleLabelProducts.length ? [] : visibleLabelProducts.map(item => item.id))}>{selected.length === visibleLabelProducts.length && visibleLabelProducts.length ? "Batal pilih semua" : "Pilih semua"}</button></div><div className="label-print-controls"><label>Ukuran<select value={labelSize} onChange={event => setLabelSize(event.target.value as "40x30" | "50x30")}><option value="40x30">40 × 30 mm</option><option value="50x30">50 × 30 mm</option></select></label><label>Salinan / produk<input type="number" min="1" max="100" value={labelCopies} onChange={event => setLabelCopies(Math.max(1, Number(event.target.value)))}/></label><button className="button primary" disabled={!selected.length} onClick={() => window.print()}><Printer size={16}/> Cetak {selected.length * labelCopies} label</button></div>{visibleLabelProducts.map(product => <label className="label-product-row" key={product.id}><input type="checkbox" checked={selected.includes(product.id)} onChange={event => setSelected(current => event.target.checked ? [...current, product.id] : current.filter(id => id !== product.id))}/><span><strong>{product.name}</strong><small>{product.code} · {product.barcode}</small></span><strong>{idr(product.retail)}</strong></label>)}</div><aside className="surface label-preview"><p className="section-kicker">PREVIEW BARCODE ASLI</p>{selectedProducts[0] ? <ProductLabelCard product={selectedProducts[0]}/> : <div className="compact-empty">Pilih produk untuk melihat label.</div>}<p>Barcode Code 128 dapat dipindai. Pilih ukuran dan jumlah salinan sebelum mencetak.</p></aside></section><section className={`print-root label-print-sheet label-size-${labelSize}`}>{selectedProducts.flatMap(product => Array.from({ length: labelCopies }, (_, copy) => <ProductLabelCard key={`${product.id}-${copy}`} product={product}/>))}</section></>}
    {tab === "Invoice & nota" && <><section className="document-toolbar surface"><label>Transaksi<select value={selectedSaleId} onChange={event => setSelectedSaleId(event.target.value)}><option value="">Pilih transaksi</option>{sales.map(sale => <option key={sale.id} value={sale.id}>{sale.invoice_number ?? sale.transaction_number} · {sale.customers?.name ?? "Customer umum"} · {idr(sale.total_amount)}</option>)}</select></label>{selectedSale && <><StatusPill tone={selectedSale.customer_type_snapshot === "reseller" ? "info" : "neutral"}>{selectedSale.customer_type_snapshot === "reseller" ? "Invoice grosir" : "Nota retail"}</StatusPill><button className="button primary" onClick={() => window.print()}><Printer size={16}/> Cetak {selectedSale.customer_type_snapshot === "reseller" ? "invoice A4" : "nota 80 mm"}</button></>}</section>{selectedSale ? <section className="document-layout actual-document-layout"><aside className="surface document-sale-list"><p className="section-kicker">50 TRANSAKSI TERAKHIR</p>{sales.map(sale => <button className={sale.id === selectedSaleId ? "active" : ""} key={sale.id} onClick={() => setSelectedSaleId(sale.id)}><span><strong>{sale.invoice_number ?? sale.transaction_number}</strong><small>{new Date(sale.occurred_at).toLocaleString("id-ID")}</small></span><strong>{idr(sale.total_amount)}</strong></button>)}</aside><SaleDocumentView sale={selectedSale} mode={selectedSale.customer_type_snapshot === "reseller" ? "invoice" : "thermal"}/></section> : <div className="surface compact-empty">Belum ada transaksi selesai yang dapat dicetak.</div>}{selectedSale && <section className={`print-root document-print-root ${selectedSale.customer_type_snapshot === "reseller" ? "print-a4" : "print-thermal"}`}><SaleDocumentView sale={selectedSale} mode={selectedSale.customer_type_snapshot === "reseller" ? "invoice" : "thermal"}/></section>}</>}
  </div>;
}
