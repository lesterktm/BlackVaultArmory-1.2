"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { VaultButton, VaultInput, vaultLabelClass } from "@/components/shared/ui-primitives";
import { formatCurrency, formatNumber, stockStatus } from "@/lib/utils";
import { Flame, Plus, Loader2, AlertCircle, Pencil, Trash2, TrendingDown, Search } from "lucide-react";

interface Powder {
  id: string;
  manufacturer: string;
  productName: string;
  powderType: string;
  burnRateCategory: string | null;
  quantityOnHandGrains: number;
  quantityOnHandLbs: number | null;
  lotNumber: string | null;
  storageLocation: string | null;
  purchasePrice: number | null;
  costPerPound: number | null;
  reorderThreshold: number | null;
  notes: string | null;
}

const STATUS_DOT: Record<string, string> = {
  ok: "bg-[#00C853]", low: "bg-[#F5A623]", critical: "bg-[#E53935] animate-pulse", empty: "bg-[#E53935]",
};
const STATUS_TEXT: Record<string, string> = {
  ok: "text-[#00C853]", low: "text-[#F5A623]", critical: "text-[#E53935]", empty: "text-[#E53935]",
};

function AddStockModal({ powder, onClose, onSuccess }: { powder: Powder; onClose: () => void; onSuccess: (id: string, newQty: number) => void }) {
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number.parseFloat(qty);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Enter a valid quantity in grains.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/reloading/powder/${powder.id}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "PURCHASE", quantity: parsed, note: note || undefined,
        purchasePrice: totalCost ? Number(totalCost) : undefined,
        pricePerUnit: pricePerUnit ? Number(pricePerUnit) : undefined,
      }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "Failed"); setSubmitting(false); }
    else { onSuccess(powder.id, json.powder.quantityOnHandGrains); onClose(); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-vault-bg/80 backdrop-blur-sm">
      <div className="bg-vault-surface border border-vault-border rounded-lg p-6 w-full max-w-md">
        <h3 className="text-sm font-semibold text-vault-text mb-1">Add Powder Stock</h3>
        <p className="text-xs text-vault-text-muted mb-4">{powder.manufacturer} {powder.productName} · Current: {formatNumber(powder.quantityOnHandGrains)} gr</p>
        {error && <div className="flex items-center gap-2 bg-[#E53935]/10 border border-[#E53935]/30 rounded px-3 py-2 mb-4"><AlertCircle className="w-4 h-4 text-[#E53935] shrink-0" /><p className="text-xs text-[#E53935]">{error}</p></div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={vaultLabelClass}>Quantity to Add (grains) <span className="text-[#E53935]">*</span></label>
            <VaultInput type="number" min={0} step="0.1" required value={qty} onChange={(e) => setQty(e.target.value)} placeholder="e.g. 7000 (1 lb)" />
            <p className="text-xs text-vault-text-faint mt-1">Tip: 1 lb = 7000 gr</p>
          </div>
          <div><label className={vaultLabelClass}>Note</label><VaultInput type="text" value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={vaultLabelClass}>Total Cost ($)</label><VaultInput type="number" min={0} step="0.01" value={totalCost} onChange={(e) => setTotalCost(e.target.value)} /></div>
            <div><label className={vaultLabelClass}>Price/lb ($)</label><VaultInput type="number" min={0} step="0.01" value={pricePerUnit} onChange={(e) => setPricePerUnit(e.target.value)} /></div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <VaultButton type="button" onClick={onClose} variant="ghost">Cancel</VaultButton>
            <VaultButton type="submit" disabled={submitting} variant="success">{submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}Add</VaultButton>
          </div>
        </form>
      </div>
    </div>
  );
}

function LogUseModal({ powder, onClose, onSuccess }: { powder: Powder; onClose: () => void; onSuccess: (id: string, newQty: number) => void }) {
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number.parseFloat(qty);
    if (!Number.isFinite(parsed) || parsed <= 0) { setError("Enter a valid quantity in grains."); return; }
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/reloading/powder/${powder.id}/transactions`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "CONSUMED", quantity: parsed, note: note || undefined }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "Failed"); setSubmitting(false); }
    else { onSuccess(powder.id, json.powder.quantityOnHandGrains); onClose(); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-vault-bg/80 backdrop-blur-sm">
      <div className="bg-vault-surface border border-vault-border rounded-lg p-6 w-full max-w-md">
        <h3 className="text-sm font-semibold text-vault-text mb-1">Log Manual Use</h3>
        <p className="text-xs text-vault-text-muted mb-4">{powder.manufacturer} {powder.productName} · Current: {formatNumber(powder.quantityOnHandGrains)} gr</p>
        {error && <div className="flex items-center gap-2 bg-[#E53935]/10 border border-[#E53935]/30 rounded px-3 py-2 mb-4"><AlertCircle className="w-4 h-4 text-[#E53935] shrink-0" /><p className="text-xs text-[#E53935]">{error}</p></div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className={vaultLabelClass}>Quantity Used (grains) <span className="text-[#E53935]">*</span></label><VaultInput type="number" min={0} step="0.1" required value={qty} onChange={(e) => setQty(e.target.value)} /></div>
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

function EditPowderModal({ powder, onClose, onSuccess }: { powder: Powder; onClose: () => void; onSuccess: (updated: Powder) => void }) {
  const [manufacturer, setManufacturer] = useState(powder.manufacturer);
  const [productName, setProductName] = useState(powder.productName);
  const [powderType, setPowderType] = useState(powder.powderType);
  const [burnRateCategory, setBurnRateCategory] = useState(powder.burnRateCategory ?? "");
  const [lotNumber, setLotNumber] = useState(powder.lotNumber ?? "");
  const [storageLocation, setStorageLocation] = useState(powder.storageLocation ?? "");
  const [reorderThreshold, setReorderThreshold] = useState(powder.reorderThreshold?.toString() ?? "");
  const [notes, setNotes] = useState(powder.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manufacturer.trim() || !productName.trim() || !powderType.trim()) {
      setError("Manufacturer, product name, and powder type are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/reloading/powder/${powder.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        manufacturer: manufacturer.trim(),
        productName: productName.trim(),
        powderType: powderType.trim(),
        burnRateCategory: burnRateCategory.trim() || null,
        lotNumber: lotNumber.trim() || null,
        storageLocation: storageLocation.trim() || null,
        reorderThreshold: reorderThreshold ? Number(reorderThreshold) : null,
        notes: notes.trim() || null,
      }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "Failed to update"); setSubmitting(false); }
    else onSuccess(json as Powder);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-vault-bg/80 backdrop-blur-sm">
      <div className="bg-vault-surface border border-vault-border rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-sm font-semibold text-vault-text mb-4">Edit Powder</h3>
        {error && <div className="flex items-center gap-2 bg-[#E53935]/10 border border-[#E53935]/30 rounded px-3 py-2 mb-4"><AlertCircle className="w-4 h-4 text-[#E53935] shrink-0" /><p className="text-xs text-[#E53935]">{error}</p></div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={vaultLabelClass}>Manufacturer <span className="text-[#E53935]">*</span></label><VaultInput type="text" required value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} /></div>
            <div><label className={vaultLabelClass}>Product Name <span className="text-[#E53935]">*</span></label><VaultInput type="text" required value={productName} onChange={(e) => setProductName(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={vaultLabelClass}>Powder Type <span className="text-[#E53935]">*</span></label><VaultInput type="text" required value={powderType} onChange={(e) => setPowderType(e.target.value)} /></div>
            <div><label className={vaultLabelClass}>Burn Rate Category</label><VaultInput type="text" value={burnRateCategory} onChange={(e) => setBurnRateCategory(e.target.value)} /></div>
          </div>
          <div><label className={vaultLabelClass}>Lot Number</label><VaultInput type="text" value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} /></div>
          <div><label className={vaultLabelClass}>Storage Location</label><VaultInput type="text" value={storageLocation} onChange={(e) => setStorageLocation(e.target.value)} /></div>
          <div><label className={vaultLabelClass}>Reorder Threshold (gr)</label><VaultInput type="number" min={0} value={reorderThreshold} onChange={(e) => setReorderThreshold(e.target.value)} /></div>
          <div>
            <label className={vaultLabelClass}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full bg-vault-surface border border-vault-border text-vault-text rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#00C2FF] resize-none" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <VaultButton type="button" onClick={onClose} variant="ghost">Cancel</VaultButton>
            <VaultButton type="submit" disabled={submitting}>{submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Pencil className="w-3 h-3" />}Save</VaultButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PowderInventoryPage() {
  const [powders, setPowders] = useState<Powder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addModal, setAddModal] = useState<Powder | null>(null);
  const [logModal, setLogModal] = useState<Powder | null>(null);
  const [editModal, setEditModal] = useState<Powder | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Powder | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    void fetch("/api/reloading/powder").then((r) => r.json()).then((data) => {
      if (isMounted) setPowders(Array.isArray(data.powders) ? data.powders : []);
    }).finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, []);

  function updateQty(id: string, newQty: number) {
    setPowders((prev) => prev.map((p) => (p.id === id ? { ...p, quantityOnHandGrains: newQty } : p)));
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    setDeleting(true);
    const res = await fetch(`/api/reloading/powder/${deleteConfirm.id}`, { method: "DELETE" });
    if (res.ok) {
      setPowders((prev) => prev.filter((p) => p.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    }
    setDeleting(false);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return powders;
    return powders.filter((p) => `${p.manufacturer} ${p.productName} ${p.powderType}`.toLowerCase().includes(q));
  }, [powders, search]);

  return (
    <div className="min-h-full">
      <PageHeader
        title="POWDER INVENTORY"
        subtitle="Smokeless and black powder stock, tracked in grains"
        actions={
          <Link href="/reloading/powder/new" className="flex items-center gap-2 bg-[#00C2FF]/10 border border-[#00C2FF]/30 text-[#00C2FF] hover:bg-[#00C2FF]/20 px-3 py-1.5 rounded text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" />Add Powder
          </Link>
        }
      />
      <div className="p-4 sm:p-6">
        <div className="relative mb-4 max-w-sm">
          <Search className="w-4 h-4 text-vault-text-faint absolute left-3 top-1/2 -translate-y-1/2" />
          <VaultInput type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search manufacturer, product, type..." className="pl-9" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 text-[#00C2FF] animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-[#F5A623]/10 border border-[#F5A623]/20 flex items-center justify-center mb-4"><Flame className="w-8 h-8 text-[#F5A623]" /></div>
            <h3 className="text-lg font-semibold text-vault-text mb-2">No powder tracked yet</h3>
            <Link href="/reloading/powder/new" className="flex items-center gap-2 bg-[#00C2FF]/10 border border-[#00C2FF]/30 text-[#00C2FF] hover:bg-[#00C2FF]/20 px-4 py-2 rounded text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" />Add First Powder
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((powder) => {
              const st = stockStatus(powder.quantityOnHandGrains, powder.reorderThreshold);
              return (
                <div key={powder.id} className="bg-vault-surface border border-vault-border rounded-lg p-4 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[st]}`} />
                        <p className="text-sm font-semibold text-vault-text truncate">{powder.manufacturer} {powder.productName}</p>
                      </div>
                      <p className="text-[10px] text-vault-text-faint mt-0.5">{powder.powderType}{powder.burnRateCategory ? ` · ${powder.burnRateCategory}` : ""}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-base font-bold font-mono ${STATUS_TEXT[st]}`}>{formatNumber(powder.quantityOnHandGrains)}</p>
                      <p className="text-[10px] text-vault-text-faint">gr{powder.quantityOnHandLbs != null ? ` (${powder.quantityOnHandLbs.toFixed(2)} lb)` : ""}</p>
                    </div>
                  </div>
                  {powder.lotNumber && <p className="text-[10px] text-vault-text-faint">Lot: {powder.lotNumber}</p>}
                  {powder.storageLocation && <p className="text-[10px] text-vault-text-faint">{powder.storageLocation}</p>}
                  {powder.costPerPound != null && <p className="text-[10px] text-[#00C2FF] font-mono">{formatCurrency(powder.costPerPound)}/lb</p>}
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <button onClick={() => setEditModal(powder)} className="flex items-center gap-1 text-[10px] bg-vault-surface border border-vault-border text-vault-text-muted hover:text-[#00C2FF] hover:border-[#00C2FF]/40 px-2 py-1 rounded transition-colors"><Pencil className="w-2.5 h-2.5" />Edit</button>
                    <button onClick={() => setAddModal(powder)} className="flex items-center gap-1 text-[10px] bg-[#00C853]/10 border border-[#00C853]/30 text-[#00C853] hover:bg-[#00C853]/20 px-2 py-1 rounded transition-colors"><Plus className="w-2.5 h-2.5" />Add</button>
                    <button onClick={() => setLogModal(powder)} className="flex items-center gap-1 text-[10px] bg-[#F5A623]/10 border border-[#F5A623]/30 text-[#F5A623] hover:bg-[#F5A623]/20 px-2 py-1 rounded transition-colors"><TrendingDown className="w-2.5 h-2.5" />Use</button>
                    <button onClick={() => setDeleteConfirm(powder)} className="p-1.5 rounded text-vault-text-faint hover:text-[#E53935] hover:bg-[#E53935]/10 transition-colors ml-auto"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {addModal && <AddStockModal powder={addModal} onClose={() => setAddModal(null)} onSuccess={updateQty} />}
      {logModal && <LogUseModal powder={logModal} onClose={() => setLogModal(null)} onSuccess={updateQty} />}
      {editModal && (
        <EditPowderModal
          powder={editModal}
          onClose={() => setEditModal(null)}
          onSuccess={(updated) => {
            setPowders((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            setEditModal(null);
          }}
        />
      )}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-vault-bg/80 backdrop-blur-sm">
          <div className="bg-vault-surface border border-vault-border rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-sm font-semibold text-vault-text mb-2">Delete Powder Entry?</h3>
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
