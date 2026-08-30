import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the retail and wholesale application shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="id">/i);
  assert.match(html, /<title>Sistem Retail &amp; Grosir — Agung Lestari<\/title>/i);
  assert.match(html, /POS, member\/reseller, stok, rak, stock opname, barcode, invoice/i);
  assert.match(html, /class="app-loading"/);
  assert.match(html, /Memuat pusat operasional/);
  assert.match(html, /class="brand-mark"/);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/);
});

test("keeps the retail-wholesale modules and design system wired", async () => {
  const [page, layout, css, featureViews, retailViews, checkoutMigration, importMigration, rackMigration, manifest, serviceWorker, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/feature-views.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/retail-wholesale-views.tsx", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/20260809130000_operational_checkout_and_opname.sql", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/20260809140000_atomic_product_import.sql", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/20260809150000_rack_placements_and_security.sql", import.meta.url), "utf8"),
    readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"),
    readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  for (const label of ["POS / Kasir", "Member / Reseller", "Rak & penempatan", "Stock opname", "Data, label & dokumen"]) {
    assert.match(page, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(layout, /IBM_Plex_Mono, Inter, Sora/);
  assert.match(css, /--brand:\s*#c6202e/i);
  assert.match(css, /--ledger:\s*#151b24/i);
  assert.match(featureViews, /branch-card-modern/);
  assert.match(featureViews, /Penjualan hari ini/);
  assert.match(featureViews, /Rak tercatat/);
  assert.match(retailViews, /pos_checkout_retail_wholesale/);
  assert.match(retailViews, /create_stock_opname_review/);
  assert.match(retailViews, /admin_import_products_retail_wholesale/);
  assert.match(retailViews, /@bwip-js\/browser/);
  assert.match(retailViews, /agung-pos-checkout-queue-v1/);
  assert.match(retailViews, /BarcodeDetector/);
  assert.match(retailViews, /getUserMedia/);
  assert.match(retailViews, /receipt-checkout/);
  assert.match(retailViews, /Gunakan uang pas/);
  assert.match(retailViews, /Math\.min\(item\.stock/);
  assert.match(checkoutMigration, /Never trust a client-supplied price mode/);
  assert.match(importMigration, /complete JSON batch is committed or rolled back/i);
  assert.match(rackMigration, /set_product_rack_placement/);
  assert.equal(JSON.parse(manifest).display, "standalone");
  assert.match(serviceWorker, /agung-lestari-shell-v2/);
  assert.match(serviceWorker, /DEVELOPMENT_PREFIXES/);
  assert.match(page, /serviceWorker\.register\("\/sw\.js"\)/);
  assert.match(page, /setAuthLoading\(false\).*8000|8000.*setAuthLoading\(false\)/s);
  assert.match(packageJson, /xlsx-0\.20\.3\.tgz/);

  await assert.rejects(access(new URL("app/_sites-preview/SkeletonPreview.tsx", projectRoot)));
});
