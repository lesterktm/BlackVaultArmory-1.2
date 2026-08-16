"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { VaultButton, VaultInput, vaultLabelClass } from "@/components/shared/ui-primitives";
import { formatCurrency, formatNumber, stockStatus } from "@/lib/utils";
import { Zap, Plus, Loader2, AlertCircle, Pencil, Trash2, TrendingDown, Search } from "lucide-react";

interface Primer {
  id: string;
  manufacturer: string;
  productName: string;
  primerType: string;
  isMagnum: boolean;
  isMatch: boolean;
  primerSystem: string;
  quantityOnHand: number;
  lotNumber: string | null;
  storageLocation: string | null;
  costPerThousand: number | null;
  reorderThreshold: number | null;
  notes: string | null;
}

const STATUS_DOT: Record<string, string> = { ok: "bg-[#00C853]", low: "bg-[#F5A623]", critical: "bg-[#E53935] animate-pulse", empty: "bg-[#E53935]" };
const STATUS_TEXT: Record<string, string> = { ok: "text-[#00C853]", low: "text-[#F5A623]", critical: "text-[#E53935]", empty: "text-[#E53935]" };

function AddStockModal({ primer, onClose, onSuccess }: { primer: Primer; onClose: () => void; onSuccess: (id: string, newQty: number) => void }) {
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
    const res = await fetch(`/api/reloading/primer/${primer.id}/transactions`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "PURCHASE", quantity: parsed, note: note || undefined, purchasePrice: totalCost ? Number(totalCost) : undefined }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "Failed"); setSubmitting(false); }
    else { onSuccess(primer.id, json.primer.quantityOnHand); onClose(); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-vault-bg/80 backdrop-blur-sm">
      <div className="bg-vault-surface border border-vault-border rounded-lg p-6 w-full max-w-md">
        <h3 className="text-sm font-semibold text-vault-text mb-1">Add Primer Stock</h3>
        <p className="text-xs text-vault-text-muted mb-4">{primer.manufacturer} {primer.productName} · Current: {formatNumber(primer.quantityOnHand)}</p>
        {error && <div className="flex items-center gap-2 bg-[#E53935]/10 border border-[#E53935]/30 rounded px-3 py-2 mb-4"><AlertCircle className="w-4 h-4 text-[#E53935] shrink-0" /><p className="text-xs text-[#E53935]">{error}</p></div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className={vaultLabelClass}>Quantity to Add <span className="text-[#E53935]">*</span></label><VaultInput type="number" min={1} required value={qty} onChange={(e) => setQty(e.target.value)} placeholder="e.g. 1000" /></div>
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

function LogUseModal({ primer, onClose, onSuccess }: { primer: Primer; onClose: () => void; onSuccess: (id: string, newQty: number) => void }) {
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number.parseInt(qty, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) { setError("Enter a valid quantity."); return; }
    setSubmitting(true); setError(null);
    const res = await fetch(`/api/reloading/primer/${primer.id}/transactions`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "CONSUMED", quantity: parsed, note: note || undefined }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "Failed"); setSubmitting(false); }
    else { onSuccess(primer.id, json.primer.quantityOnHand); onClose(); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-vault-bg/80 backdrop-blur-sm">
      <div className="bg-vault-surface border border-vault-border rounded-lg p-6 w-full max-w-md">
        <h3 className="text-sm font-semibold text-vault-text mb-1">Log Manual Use</h3>
        <p className="text-xs text-vault-text-muted mb-4">{primer.manufacturer} {primer.productName} · Current: {formatNumber(primer.quantityOnHand)}</p>
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

function EditPrimerModal({ primer, onClose, onSuccess }: { primer: Primer; onClose: () => void; onSuccess: (updated: Primer) => void }) {
  const [manufacturer, setManufacturer] = useState(primer.manufacturer);
  const [productName, setProductName] = useState(primer.productName);
  const [primerType, setPrimerType] = useState(primer.primerType);
  const [lotNumber, setLotNumber] = useState(primer.lotNumber ?? "");
  const [storageLocation, setStorageLocation] = useState(primer.storageLocation ?? "");
  const [reorderThreshold, setReorderThreshold] = useState(primer.reorderThreshold?.toString() ?? "");
  const [notes, setNotes] = useState(primer.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manufacturer.trim() || !productName.trim() || !primerType.trim()) { setError("Manufacturer, product name, and primer type are required."); return; }
    setSubmitting(true); setError(null);
    const res = await fetch(`/api/reloading/primer/${primer.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        manufacturer: manufacturer.trim(), productName: productName.trim(), primerType: primerType.trim(),
        lotNumber: lotNumber.trim() || null, storageLocation: storageLocation.trim() || null,
        reorderThreshold: reorderThreshold ? Number(reorderThreshold) : null, notes: notes.trim() || null,
      }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "Failed to update"); setSubmitting(false); }
    else onSuccess(json as Primer);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-vault-bg/80 backdrop-blur-sm">
      <div className="bg-vault-surface border border-vault-border rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-sm font-semibold text-vault-text mb-4">Edit Primer</h3>
        {error && <div className="flex items-center gap-2 bg-[#E53935]/10 border border-[#E53935]/30 rounded px-3 py-2 mb-4"><AlertCircle className="w-4 h-4 text-[#E53935] shrink-0" /><p className="text-xs text-[#E53935]">{error}</p></div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={vaultLabelClass}>Manufacturer <span className="text-[#E53935]">*</span></label><VaultInput required value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} /></div>
            <div><label className={vaultLabelClass}>Product Name <span className="text-[#E53935]">*</span></label><VaultInput required value={productName} onChange={(e) => setProductName(e.target.value)} /></div>
          </div>
          <div><label className={vaultLabelClass}>Primer Type <span className="text-[#E53935]">*</span></label><VaultInput required value={primerType} onChange={(e) => setPrimerType(e.target.value)} /></div>
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

export default function PrimerInventoryPage() {
  const [primers, setPrimers] = useState<Primer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addModal, setAddModal] = useState<Primer | null>(null);
  const [logModal, setLogModal] = useState<Primer | null>(null);
  const [editModal, setEditModal] = useState<Primer | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Primer | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    void fetch("/api/reloading/primer").then((r) => r.json()).then((data) => {
      if (isMounted) setPrimers(Array.isArray(data.primers) ? data.primers : []);
    }).finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, []);

  function updateQty(id: string, newQty: number) {
    setPrimers((prev) => prev.map((p) => (p.id === id ? { ...p, quantityOnHand: newQty } : p)));
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    setDeleting(true);
    const res = await fetch(`/api/reloading/primer/${deleteConfirm.id}`, { method: "DELETE" });
    if (res.ok) { setPrimers((prev) => prev.filter((p) => p.id !== deleteConfirm.id)); setDeleteConfirm(null); }
    setDeleting(false);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return primers;
    return primers.filter((p) => `${p.manufacturer} ${p.productName} ${p.primerType}`.toLowerCase().includes(q));
  }, [primers, search]);

  return (
    <div className="min-h-full">
      <PageHeader title="PRIMER INVENTORY" subtitle="Boxer and Berdan primer stock by type" actions={
        <Link href="/reloading/primer/new" className="flex items-center gap-2 bg-[#00C2FF]/10 border border-[#00C2FF]/30 text-[#00C2FF] hover:bg-[#00C2FF]/20 px-3 py-1.5 rounded text-sm font-medium transition-colors"><Plus className="w-4 h-4" />Add Primer</Link>
      } />
      <div className="p-4 sm:p-6">
        <div className="relative mb-4 max-w-sm">
          <Search className="w-4 h-4 text-vault-text-faint absolute left-3 top-1/2 -translate-y-1/2" />
          <VaultInput type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search manufacturer, product, type..." className="pl-9" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 text-[#00C2FF] animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-[#F5A623]/10 border border-[#F5A623]/20 flex items-center justify-center mb-4"><Zap className="w-8 h-8 text-[#F5A623]" /></div>
            <h3 className="text-lg font-semibold text-vault-text mb-2">No primers tracked yet</h3>
            <Link href="/reloading/primer/new" className="flex items-center gap-2 bg-[#00C2FF]/10 border border-[#00C2FF]/30 text-[#00C2FF] hover:bg-[#00C2FF]/20 px-4 py-2 rounded text-sm font-medium transition-colors"><Plus className="w-4 h-4" />Add First Primer</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((primer) => {
              const st = stockStatus(primer.quantityOnHand, primer.reorderThreshold);
              return (
                <div key={primer.id} className="bg-vault-surface border border-vault-border rounded-lg p-4 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[st]}`} />
                        <p className="text-sm font-semibold text-vault-text truncate">{primer.manufacturer} {primer.productName}</p>
                        {primer.isMagnum && <span className="text-[9px] font-mono text-[#F5A623] border border-[#F5A623]/30 px-1 py-0.5 rounded">MAG</span>}
                        {primer.isMatch && <span className="text-[9px] font-mono text-[#00C2FF] border border-[#00C2FF]/30 px-1 py-0.5 rounded">MATCH</span>}
                      </div>
                      <p className="text-[10px] text-vault-text-faint mt-0.5">{primer.primerType}{primer.primerSystem === "Berdan" ? " · Berdan (not reloadable with standard dies)" : ""}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-base font-bold font-mono ${STATUS_TEXT[st]}`}>{formatNumber(primer.quantityOnHand)}</p>
                      <p className="text-[10px] text-vault-text-faint">ea</p>
                    </div>
                  </div>
                  {primer.lotNumber && <p className="text-[10px] text-vault-text-faint">Lot: {primer.lotNumber}</p>}
                  {primer.storageLocation && <p className="text-[10px] text-vault-text-faint">{primer.storageLocation}</p>}
                  {primer.costPerThousand != null && <p className="text-[10px] text-[#00C2FF] font-mono">{formatCurrency(primer.costPerThousand)}/1000</p>}
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <button onClick={() => setEditModal(primer)} className="flex items-center gap-1 text-[10px] bg-vault-surface border border-vault-border text-vault-text-muted hover:text-[#00C2FF] hover:border-[#00C2FF]/40 px-2 py-1 rounded transition-colors"><Pencil className="w-2.5 h-2.5" />Edit</button>
                    <button onClick={() => setAddModal(primer)} className="flex items-center gap-1 text-[10px] bg-[#00C853]/10 border border-[#00C853]/30 text-[#00C853] hover:bg-[#00C853]/20 px-2 py-1 rounded transition-colors"><Plus className="w-2.5 h-2.5" />Add</button>
                    <button onClick={() => setLogModal(primer)} className="flex items-center gap-1 text-[10px] bg-[#F5A623]/10 border border-[#F5A623]/30 text-[#F5A623] hover:bg-[#F5A623]/20 px-2 py-1 rounded transition-colors"><TrendingDown className="w-2.5 h-2.5" />Use</button>
                    <button onClick={() => setDeleteConfirm(primer)} className="p-1.5 rounded text-vault-text-faint hover:text-[#E53935] hover:bg-[#E53935]/10 transition-colors ml-auto"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {addModal && <AddStockModal primer={addModal} onClose={() => setAddModal(null)} onSuccess={updateQty} />}
      {logModal && <LogUseModal primer={logModal} onClose={() => setLogModal(null)} onSuccess={updateQty} />}
      {editModal && (
        <EditPrimerModal primer={editModal} onClose={() => setEditModal(null)} onSuccess={(updated) => {
          setPrimers((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          setEditModal(null);
        }} />
      )}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-vault-bg/80 backdrop-blur-sm">
          <div className="bg-vault-surface border border-vault-border rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-sm font-semibold text-vault-text mb-2">Delete Primer Entry?</h3>
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
