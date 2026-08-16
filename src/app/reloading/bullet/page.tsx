"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { VaultButton, VaultInput, vaultLabelClass } from "@/components/shared/ui-primitives";
import { formatCurrency, formatNumber, stockStatus } from "@/lib/utils";
import { Crosshair, Plus, Loader2, AlertCircle, Pencil, Trash2, TrendingDown, Search } from "lucide-react";

interface Bullet {
  id: string;
  manufacturer: string;
  productLine: string | null;
  productName: string;
  caliberDiameterIn: number;
  caliberLabel: string | null;
  weightGrains: number;
  bulletType: string;
  quantityOnHand: number;
  lotNumber: string | null;
  storageLocation: string | null;
  costPerHundred: number | null;
  sectionalDensity: number | null;
  reorderThreshold: number | null;
  notes: string | null;
}

const STATUS_DOT: Record<string, string> = { ok: "bg-[#00C853]", low: "bg-[#F5A623]", critical: "bg-[#E53935] animate-pulse", empty: "bg-[#E53935]" };
const STATUS_TEXT: Record<string, string> = { ok: "text-[#00C853]", low: "text-[#F5A623]", critical: "text-[#E53935]", empty: "text-[#E53935]" };

function AddStockModal({ bullet, onClose, onSuccess }: { bullet: Bullet; onClose: () => void; onSuccess: (id: string, newQty: number) => void }) {
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number.parseInt(qty, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) { setError("Enter a valid quantity."); return; }
    setSubmitting(true); setError(null);
    const res = await fetch(`/api/reloading/bullet/${bullet.id}/transactions`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "PURCHASE", quantity: parsed, note: note || undefined, purchasePrice: totalCost ? Number(totalCost) : undefined }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "Failed"); setSubmitting(false); }
    else { onSuccess(bullet.id, json.bullet.quantityOnHand); onClose(); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-vault-bg/80 backdrop-blur-sm">
      <div className="bg-vault-surface border border-vault-border rounded-lg p-6 w-full max-w-md">
        <h3 className="text-sm font-semibold text-vault-text mb-1">Add Bullet Stock</h3>
        <p className="text-xs text-vault-text-muted mb-4">{bullet.manufacturer} {bullet.productName} · Current: {formatNumber(bullet.quantityOnHand)}</p>
        {error && <div className="flex items-center gap-2 bg-[#E53935]/10 border border-[#E53935]/30 rounded px-3 py-2 mb-4"><AlertCircle className="w-4 h-4 text-[#E53935] shrink-0" /><p className="text-xs text-[#E53935]">{error}</p></div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className={vaultLabelClass}>Quantity to Add <span className="text-[#E53935]">*</span></label><VaultInput type="number" min={1} required value={qty} onChange={(e) => setQty(e.target.value)} /></div>
          <div><label className={vaultLabelClass}>Note</label><VaultInput type="text" value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <div><label className={vaultLabelClass}>Total Cost ($)</label><VaultInput type="number" min={0} step="0.01" value={totalCost} onChange={(e) => setTotalCost(e.target.value)} /></div>
          <div className="flex gap-2 justify-end pt-2">
            <VaultButton type="button" onClick={onClose} variant="ghost">Cancel</VaultButton>
            <VaultButton type="submit" disabled={submitting} variant="success">{submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}Add</VaultButton>
          </div>
        </form>
      </div>
    </div>
  );
}

function LogUseModal({ bullet, onClose, onSuccess }: { bullet: Bullet; onClose: () => void; onSuccess: (id: string, newQty: number) => void }) {
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number.parseInt(qty, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) { setError("Enter a valid quantity."); return; }
    setSubmitting(true); setError(null);
    const res = await fetch(`/api/reloading/bullet/${bullet.id}/transactions`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "CONSUMED", quantity: parsed, note: note || undefined }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "Failed"); setSubmitting(false); }
    else { onSuccess(bullet.id, json.bullet.quantityOnHand); onClose(); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-vault-bg/80 backdrop-blur-sm">
      <div className="bg-vault-surface border border-vault-border rounded-lg p-6 w-full max-w-md">
        <h3 className="text-sm font-semibold text-vault-text mb-1">Log Manual Use</h3>
        <p className="text-xs text-vault-text-muted mb-4">{bullet.manufacturer} {bullet.productName} · Current: {formatNumber(bullet.quantityOnHand)}</p>
        {error && <div className="flex items-center gap-2 bg-[#E53935]/10 border border-[#E53935]/30 rounded px-3 py-2 mb-4"><AlertCircle className="w-4 h-4 text-[#E53935] shrink-0" /><p className="text-xs text-[#E53935]">{error}</p></div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className={vaultLabelClass}>Quantity Used <span className="text-[#E53935]">*</span></label><VaultInput type="number" min={1} required value={qty} onChange={(e) => setQty(e.target.value)} /></div>
          <div><label className={vaultLabelClass}>Note</label><VaultInput type="text" value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <div className="flex gap-2 justify-end pt-2">
            <VaultButton type="button" onClick={onClose} variant="ghost">Cancel</VaultButton>
            <VaultButton type="submit" disabled={submitting} variant="warning">{submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <TrendingDown className="w-3 h-3" />}Log Use</VaultButton>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditBulletModal({ bullet, onClose, onSuccess }: { bullet: Bullet; onClose: () => void; onSuccess: (updated: Bullet) => void }) {
  const [productName, setProductName] = useState(bullet.productName);
  const [lotNumber, setLotNumber] = useState(bullet.lotNumber ?? "");
  const [storageLocation, setStorageLocation] = useState(bullet.storageLocation ?? "");
  const [reorderThreshold, setReorderThreshold] = useState(bullet.reorderThreshold?.toString() ?? "");
  const [notes, setNotes] = useState(bullet.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productName.trim()) { setError("Product name is required."); return; }
    setSubmitting(true); setError(null);
    const res = await fetch(`/api/reloading/bullet/${bullet.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productName: productName.trim(), lotNumber: lotNumber.trim() || null,
        storageLocation: storageLocation.trim() || null, reorderThreshold: reorderThreshold ? Number(reorderThreshold) : null,
        notes: notes.trim() || null,
      }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "Failed to update"); setSubmitting(false); }
    else onSuccess(json as Bullet);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-vault-bg/80 backdrop-blur-sm">
      <div className="bg-vault-surface border border-vault-border rounded-lg p-6 w-full max-w-md">
        <h3 className="text-sm font-semibold text-vault-text mb-4">Edit Bullet</h3>
        {error && <div className="flex items-center gap-2 bg-[#E53935]/10 border border-[#E53935]/30 rounded px-3 py-2 mb-4"><AlertCircle className="w-4 h-4 text-[#E53935] shrink-0" /><p className="text-xs text-[#E53935]">{error}</p></div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div><label className={vaultLabelClass}>Product Name <span className="text-[#E53935]">*</span></label><VaultInput required value={productName} onChange={(e) => setProductName(e.target.value)} /></div>
          <div><label className={vaultLabelClass}>Lot Number</label><VaultInput value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} /></div>
          <div><label className={vaultLabelClass}>Storage Location</label><VaultInput value={storageLocation} onChange={(e) => setStorageLocation(e.target.value)} /></div>
          <div><label className={vaultLabelClass}>Reorder Threshold</label><VaultInput type="number" min={0} value={reorderThreshold} onChange={(e) => setReorderThreshold(e.target.value)} /></div>
          <div><label className={vaultLabelClass}>Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full bg-vault-surface border border-vault-border text-vault-text rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#00C2FF] resize-none" /></div>
          <div className="flex gap-2 justify-end pt-2">
            <VaultButton type="button" onClick={onClose} variant="ghost">Cancel</VaultButton>
            <VaultButton type="submit" disabled={submitting}>{submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Pencil className="w-3 h-3" />}Save</VaultButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BulletInventoryPage() {
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addModal, setAddModal] = useState<Bullet | null>(null);
  const [logModal, setLogModal] = useState<Bullet | null>(null);
  const [editModal, setEditModal] = useState<Bullet | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Bullet | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    void fetch("/api/reloading/bullet").then((r) => r.json()).then((data) => {
      if (isMounted) setBullets(Array.isArray(data.bullets) ? data.bullets : []);
    }).finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, []);

  function updateQty(id: string, newQty: number) {
    setBullets((prev) => prev.map((b) => (b.id === id ? { ...b, quantityOnHand: newQty } : b)));
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    setDeleting(true);
    const res = await fetch(`/api/reloading/bullet/${deleteConfirm.id}`, { method: "DELETE" });
    if (res.ok) { setBullets((prev) => prev.filter((b) => b.id !== deleteConfirm.id)); setDeleteConfirm(null); }
    setDeleting(false);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bullets;
    return bullets.filter((b) => `${b.manufacturer} ${b.productName} ${b.caliberLabel ?? ""}`.toLowerCase().includes(q));
  }, [bullets, search]);

  return (
    <div className="min-h-full">
      <PageHeader title="BULLET / PROJECTILE INVENTORY" subtitle="Projectile stock by caliber and weight" actions={
        <Link href="/reloading/bullet/new" className="flex items-center gap-2 bg-[#00C2FF]/10 border border-[#00C2FF]/30 text-[#00C2FF] hover:bg-[#00C2FF]/20 px-3 py-1.5 rounded text-sm font-medium transition-colors"><Plus className="w-4 h-4" />Add Bullet</Link>
      } />
      <div className="p-4 sm:p-6">
        <div className="relative mb-4 max-w-sm">
          <Search className="w-4 h-4 text-vault-text-faint absolute left-3 top-1/2 -translate-y-1/2" />
          <VaultInput type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search manufacturer, product, caliber..." className="pl-9" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 text-[#00C2FF] animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-[#F5A623]/10 border border-[#F5A623]/20 flex items-center justify-center mb-4"><Crosshair className="w-8 h-8 text-[#F5A623]" /></div>
            <h3 className="text-lg font-semibold text-vault-text mb-2">No bullets tracked yet</h3>
            <Link href="/reloading/bullet/new" className="flex items-center gap-2 bg-[#00C2FF]/10 border border-[#00C2FF]/30 text-[#00C2FF] hover:bg-[#00C2FF]/20 px-4 py-2 rounded text-sm font-medium transition-colors"><Plus className="w-4 h-4" />Add First Bullet</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((bullet) => {
              const st = stockStatus(bullet.quantityOnHand, bullet.reorderThreshold);
              return (
                <div key={bullet.id} className="bg-vault-surface border border-vault-border rounded-lg p-4 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[st]}`} />
                        <p className="text-sm font-semibold text-vault-text truncate">{bullet.manufacturer} {bullet.productName}</p>
                      </div>
                      <p className="text-[10px] text-vault-text-faint mt-0.5">{bullet.weightGrains}gr · {bullet.caliberDiameterIn}&quot; · {bullet.bulletType}{bullet.caliberLabel ? ` · ${bullet.caliberLabel}` : ""}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-base font-bold font-mono ${STATUS_TEXT[st]}`}>{formatNumber(bullet.quantityOnHand)}</p>
                      <p className="text-[10px] text-vault-text-faint">ea</p>
                    </div>
                  </div>
                  {bullet.lotNumber && <p className="text-[10px] text-vault-text-faint">Lot: {bullet.lotNumber}</p>}
                  {bullet.storageLocation && <p className="text-[10px] text-vault-text-faint">{bullet.storageLocation}</p>}
                  <div className="flex items-center gap-3">
                    {bullet.costPerHundred != null && <p className="text-[10px] text-[#00C2FF] font-mono">{formatCurrency(bullet.costPerHundred)}/100</p>}
                    {bullet.sectionalDensity != null && <p className="text-[10px] text-vault-text-faint font-mono">SD {bullet.sectionalDensity.toFixed(3)}</p>}
                  </div>
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <button onClick={() => setEditModal(bullet)} className="flex items-center gap-1 text-[10px] bg-vault-surface border border-vault-border text-vault-text-muted hover:text-[#00C2FF] hover:border-[#00C2FF]/40 px-2 py-1 rounded transition-colors"><Pencil className="w-2.5 h-2.5" />Edit</button>
                    <button onClick={() => setAddModal(bullet)} className="flex items-center gap-1 text-[10px] bg-[#00C853]/10 border border-[#00C853]/30 text-[#00C853] hover:bg-[#00C853]/20 px-2 py-1 rounded transition-colors"><Plus className="w-2.5 h-2.5" />Add</button>
                    <button onClick={() => setLogModal(bullet)} className="flex items-center gap-1 text-[10px] bg-[#F5A623]/10 border border-[#F5A623]/30 text-[#F5A623] hover:bg-[#F5A623]/20 px-2 py-1 rounded transition-colors"><TrendingDown className="w-2.5 h-2.5" />Use</button>
                    <button onClick={() => setDeleteConfirm(bullet)} className="p-1.5 rounded text-vault-text-faint hover:text-[#E53935] hover:bg-[#E53935]/10 transition-colors ml-auto"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {addModal && <AddStockModal bullet={addModal} onClose={() => setAddModal(null)} onSuccess={updateQty} />}
      {logModal && <LogUseModal bullet={logModal} onClose={() => setLogModal(null)} onSuccess={updateQty} />}
      {editModal && (
        <EditBulletModal bullet={editModal} onClose={() => setEditModal(null)} onSuccess={(updated) => {
          setBullets((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
          setEditModal(null);
        }} />
      )}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-vault-bg/80 backdrop-blur-sm">
          <div className="bg-vault-surface border border-vault-border rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-sm font-semibold text-vault-text mb-2">Delete Bullet Entry?</h3>
            <p className="text-xs text-vault-text-muted mb-4">{deleteConfirm.manufacturer} {deleteConfirm.productName}</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteConfirm(null)} disabled={deleting} className="px-3 py-1.5 text-xs rounded border border-vault-border text-vault-text-muted hover:text-vault-text transition-colors">Cancel</button>
              <button onClick={confirmDelete} disabled={deleting} className="px-3 py-1.5 text-xs rounded bg-[#E53935]/10 border border-[#E53935]/30 text-[#E53935] hover:bg-[#E53935]/20 transition-colors disabled:opacity-50">{deleting ? "Deleting..." : "Delete"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
