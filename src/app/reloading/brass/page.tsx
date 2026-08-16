"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { VaultButton, VaultInput, VaultSelect, vaultLabelClass } from "@/components/shared/ui-primitives";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Layers, Plus, Loader2, AlertCircle, Pencil, Trash2, TrendingDown, Search } from "lucide-react";

interface Brass {
  id: string;
  caliber: string;
  headstamp: string | null;
  manufacturer: string | null;
  caseMaterial: string;
  primerSystem: string;
  isMilitaryBrass: boolean;
  firingCount: number;
  maxFiringCount: number | null;
  preparationStatus: string | null;
  quantityOnHand: number;
  quantityReadyToLoad: number;
  quantityInProcess: number;
  quantityRetired: number;
  lotIdentifier: string | null;
  storageLocation: string | null;
  costPerCase: number | null;
  notes: string | null;
}

const PREP_STATUSES = ["Raw/As-Received", "Decapped", "Cleaned", "Sized & Decapped", "Trimmed", "Primer Pocket Prepped", "Ready to Load"];

function AddStockModal({ brass, onClose, onSuccess }: { brass: Brass; onClose: () => void; onSuccess: (id: string, newQty: number) => void }) {
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
    const res = await fetch(`/api/reloading/brass/${brass.id}/transactions`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "PURCHASE", quantity: parsed, note: note || undefined, purchasePrice: totalCost ? Number(totalCost) : undefined }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "Failed"); setSubmitting(false); }
    else { onSuccess(brass.id, json.brass.quantityOnHand); onClose(); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-vault-bg/80 backdrop-blur-sm">
      <div className="bg-vault-surface border border-vault-border rounded-lg p-6 w-full max-w-md">
        <h3 className="text-sm font-semibold text-vault-text mb-1">Add Brass Stock</h3>
        <p className="text-xs text-vault-text-muted mb-4">{brass.caliber} · Current: {formatNumber(brass.quantityOnHand)}</p>
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

function LogRetireModal({ brass, onClose, onSuccess }: { brass: Brass; onClose: () => void; onSuccess: (id: string, newQty: number) => void }) {
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number.parseInt(qty, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) { setError("Enter a valid quantity."); return; }
    setSubmitting(true); setError(null);
    const res = await fetch(`/api/reloading/brass/${brass.id}/transactions`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "CONSUMED", quantity: parsed, note: note || undefined }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "Failed"); setSubmitting(false); }
    else { onSuccess(brass.id, json.brass.quantityOnHand); onClose(); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-vault-bg/80 backdrop-blur-sm">
      <div className="bg-vault-surface border border-vault-border rounded-lg p-6 w-full max-w-md">
        <h3 className="text-sm font-semibold text-vault-text mb-1">Remove From Inventory</h3>
        <p className="text-xs text-vault-text-muted mb-4">{brass.caliber} · Current: {formatNumber(brass.quantityOnHand)}</p>
        {error && <div className="flex items-center gap-2 bg-[#E53935]/10 border border-[#E53935]/30 rounded px-3 py-2 mb-4"><AlertCircle className="w-4 h-4 text-[#E53935] shrink-0" /><p className="text-xs text-[#E53935]">{error}</p></div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className={vaultLabelClass}>Quantity <span className="text-[#E53935]">*</span></label><VaultInput type="number" min={1} required value={qty} onChange={(e) => setQty(e.target.value)} /></div>
          <div><label className={vaultLabelClass}>Note</label><VaultInput type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Lost, split necks" /></div>
          <div className="flex gap-2 justify-end pt-2">
            <VaultButton type="button" onClick={onClose} variant="ghost">Cancel</VaultButton>
            <VaultButton type="submit" disabled={submitting} variant="warning">{submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <TrendingDown className="w-3 h-3" />}Remove</VaultButton>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditBrassModal({ brass, onClose, onSuccess }: { brass: Brass; onClose: () => void; onSuccess: (updated: Brass) => void }) {
  const [preparationStatus, setPreparationStatus] = useState(brass.preparationStatus ?? "");
  const [quantityReadyToLoad, setQuantityReadyToLoad] = useState(brass.quantityReadyToLoad.toString());
  const [quantityInProcess, setQuantityInProcess] = useState(brass.quantityInProcess.toString());
  const [quantityRetired, setQuantityRetired] = useState(brass.quantityRetired.toString());
  const [firingCount, setFiringCount] = useState(brass.firingCount.toString());
  const [maxFiringCount, setMaxFiringCount] = useState(brass.maxFiringCount?.toString() ?? "");
  const [storageLocation, setStorageLocation] = useState(brass.storageLocation ?? "");
  const [lotIdentifier, setLotIdentifier] = useState(brass.lotIdentifier ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ready = Number(quantityReadyToLoad) || 0;
    const inProc = Number(quantityInProcess) || 0;
    if (ready + inProc > brass.quantityOnHand) {
      setError("Ready to Load + In Process cannot exceed Quantity On Hand.");
      return;
    }
    setSubmitting(true); setError(null);
    const res = await fetch(`/api/reloading/brass/${brass.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preparationStatus: preparationStatus || null,
        quantityReadyToLoad: ready,
        quantityInProcess: inProc,
        quantityRetired: Number(quantityRetired) || 0,
        firingCount: Number(firingCount) || 0,
        maxFiringCount: maxFiringCount ? Number(maxFiringCount) : null,
        storageLocation: storageLocation.trim() || null,
        lotIdentifier: lotIdentifier.trim() || null,
      }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "Failed to update"); setSubmitting(false); }
    else onSuccess(json as Brass);
  }

  const retireWarning = brass.maxFiringCount != null && brass.firingCount >= brass.maxFiringCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-vault-bg/80 backdrop-blur-sm">
      <div className="bg-vault-surface border border-vault-border rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-sm font-semibold text-vault-text mb-1">Edit Brass Lot</h3>
        <p className="text-xs text-vault-text-muted mb-4">{brass.caliber} · On hand: {formatNumber(brass.quantityOnHand)}</p>
        {retireWarning && (
          <div className="flex items-center gap-2 bg-[#F5A623]/10 border border-[#F5A623]/30 rounded px-3 py-2 mb-4">
            <AlertCircle className="w-4 h-4 text-[#F5A623] shrink-0" />
            <p className="text-xs text-[#F5A623]">Firing count has reached the retirement threshold — review for case head separation risk.</p>
          </div>
        )}
        {error && <div className="flex items-center gap-2 bg-[#E53935]/10 border border-[#E53935]/30 rounded px-3 py-2 mb-4"><AlertCircle className="w-4 h-4 text-[#E53935] shrink-0" /><p className="text-xs text-[#E53935]">{error}</p></div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className={vaultLabelClass}>Preparation Status</label>
            <VaultSelect value={preparationStatus} onChange={(e) => setPreparationStatus(e.target.value)}>
              <option value="">Not set</option>
              {PREP_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </VaultSelect>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={vaultLabelClass}>Ready</label><VaultInput type="number" min={0} value={quantityReadyToLoad} onChange={(e) => setQuantityReadyToLoad(e.target.value)} /></div>
            <div><label className={vaultLabelClass}>In Process</label><VaultInput type="number" min={0} value={quantityInProcess} onChange={(e) => setQuantityInProcess(e.target.value)} /></div>
            <div><label className={vaultLabelClass}>Retired</label><VaultInput type="number" min={0} value={quantityRetired} onChange={(e) => setQuantityRetired(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={vaultLabelClass}>Firing Count</label><VaultInput type="number" min={0} value={firingCount} onChange={(e) => setFiringCount(e.target.value)} /></div>
            <div><label className={vaultLabelClass}>Max Firing Count</label><VaultInput type="number" min={0} value={maxFiringCount} onChange={(e) => setMaxFiringCount(e.target.value)} /></div>
          </div>
          <div><label className={vaultLabelClass}>Lot Identifier</label><VaultInput value={lotIdentifier} onChange={(e) => setLotIdentifier(e.target.value)} /></div>
          <div><label className={vaultLabelClass}>Storage Location</label><VaultInput value={storageLocation} onChange={(e) => setStorageLocation(e.target.value)} /></div>
          <div className="flex gap-2 justify-end pt-2">
            <VaultButton type="button" onClick={onClose} variant="ghost">Cancel</VaultButton>
            <VaultButton type="submit" disabled={submitting}>{submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Pencil className="w-3 h-3" />}Save</VaultButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BrassInventoryPage() {
  const [brassLots, setBrassLots] = useState<Brass[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addModal, setAddModal] = useState<Brass | null>(null);
  const [logModal, setLogModal] = useState<Brass | null>(null);
  const [editModal, setEditModal] = useState<Brass | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Brass | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    void fetch("/api/reloading/brass").then((r) => r.json()).then((data) => {
      if (isMounted) setBrassLots(Array.isArray(data.brass) ? data.brass : []);
    }).finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, []);

  function updateQty(id: string, newQty: number) {
    setBrassLots((prev) => prev.map((b) => (b.id === id ? { ...b, quantityOnHand: newQty } : b)));
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    setDeleting(true);
    const res = await fetch(`/api/reloading/brass/${deleteConfirm.id}`, { method: "DELETE" });
    if (res.ok) { setBrassLots((prev) => prev.filter((b) => b.id !== deleteConfirm.id)); setDeleteConfirm(null); }
    setDeleting(false);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return brassLots;
    return brassLots.filter((b) => `${b.caliber} ${b.manufacturer ?? ""} ${b.headstamp ?? ""}`.toLowerCase().includes(q));
  }, [brassLots, search]);

  return (
    <div className="min-h-full">
      <PageHeader title="BRASS / CASE INVENTORY" subtitle="Case lots by caliber, firing count, and prep status" actions={
        <Link href="/reloading/brass/new" className="flex items-center gap-2 bg-[#00C2FF]/10 border border-[#00C2FF]/30 text-[#00C2FF] hover:bg-[#00C2FF]/20 px-3 py-1.5 rounded text-sm font-medium transition-colors"><Plus className="w-4 h-4" />Add Brass</Link>
      } />
      <div className="p-4 sm:p-6">
        <div className="relative mb-4 max-w-sm">
          <Search className="w-4 h-4 text-vault-text-faint absolute left-3 top-1/2 -translate-y-1/2" />
          <VaultInput type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search caliber, manufacturer, headstamp..." className="pl-9" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 text-[#00C2FF] animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-[#F5A623]/10 border border-[#F5A623]/20 flex items-center justify-center mb-4"><Layers className="w-8 h-8 text-[#F5A623]" /></div>
            <h3 className="text-lg font-semibold text-vault-text mb-2">No brass tracked yet</h3>
            <Link href="/reloading/brass/new" className="flex items-center gap-2 bg-[#00C2FF]/10 border border-[#00C2FF]/30 text-[#00C2FF] hover:bg-[#00C2FF]/20 px-4 py-2 rounded text-sm font-medium transition-colors"><Plus className="w-4 h-4" />Add First Brass Lot</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((brass) => {
              const notReloadable = brass.caseMaterial === "Steel" || brass.caseMaterial === "Aluminum" || brass.primerSystem === "Berdan";
              const retireDue = brass.maxFiringCount != null && brass.firingCount >= brass.maxFiringCount;
              return (
                <div key={brass.id} className={`bg-vault-surface border rounded-lg p-4 flex flex-col gap-2 ${notReloadable ? "border-[#E53935]/40" : "border-vault-border"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-vault-text truncate">{brass.caliber}</p>
                      <p className="text-[10px] text-vault-text-faint mt-0.5">{brass.manufacturer ?? brass.headstamp ?? "Unknown headstamp"} · {brass.caseMaterial}{brass.primerSystem === "Berdan" ? " · Berdan" : ""}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-bold font-mono text-vault-text">{formatNumber(brass.quantityOnHand)}</p>
                      <p className="text-[10px] text-vault-text-faint">on hand</p>
                    </div>
                  </div>
                  {notReloadable && (
                    <p className="text-[10px] text-[#E53935] flex items-center gap-1"><AlertCircle className="w-3 h-3" />Not reloadable{brass.primerSystem === "Berdan" ? " (Berdan primed)" : " (case material)"}</p>
                  )}
                  {retireDue && <p className="text-[10px] text-[#F5A623] flex items-center gap-1"><AlertCircle className="w-3 h-3" />Retirement review due ({brass.firingCount}/{brass.maxFiringCount} firings)</p>}
                  <div className="grid grid-cols-3 gap-2 text-center py-1">
                    <div><p className="text-xs font-mono text-[#00C853]">{formatNumber(brass.quantityReadyToLoad)}</p><p className="text-[9px] text-vault-text-faint">ready</p></div>
                    <div><p className="text-xs font-mono text-[#F5A623]">{formatNumber(brass.quantityInProcess)}</p><p className="text-[9px] text-vault-text-faint">in process</p></div>
                    <div><p className="text-xs font-mono text-vault-text-faint">{formatNumber(brass.quantityRetired)}</p><p className="text-[9px] text-vault-text-faint">retired</p></div>
                  </div>
                  {brass.preparationStatus && <p className="text-[10px] text-vault-text-faint">Status: {brass.preparationStatus}</p>}
                  {brass.lotIdentifier && <p className="text-[10px] text-vault-text-faint">Lot: {brass.lotIdentifier}</p>}
                  {brass.costPerCase != null && <p className="text-[10px] text-[#00C2FF] font-mono">{formatCurrency(brass.costPerCase)}/case</p>}
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <button onClick={() => setEditModal(brass)} className="flex items-center gap-1 text-[10px] bg-vault-surface border border-vault-border text-vault-text-muted hover:text-[#00C2FF] hover:border-[#00C2FF]/40 px-2 py-1 rounded transition-colors"><Pencil className="w-2.5 h-2.5" />Edit</button>
                    <button onClick={() => setAddModal(brass)} className="flex items-center gap-1 text-[10px] bg-[#00C853]/10 border border-[#00C853]/30 text-[#00C853] hover:bg-[#00C853]/20 px-2 py-1 rounded transition-colors"><Plus className="w-2.5 h-2.5" />Add</button>
                    <button onClick={() => setLogModal(brass)} className="flex items-center gap-1 text-[10px] bg-[#F5A623]/10 border border-[#F5A623]/30 text-[#F5A623] hover:bg-[#F5A623]/20 px-2 py-1 rounded transition-colors"><TrendingDown className="w-2.5 h-2.5" />Remove</button>
                    <button onClick={() => setDeleteConfirm(brass)} className="p-1.5 rounded text-vault-text-faint hover:text-[#E53935] hover:bg-[#E53935]/10 transition-colors ml-auto"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {addModal && <AddStockModal brass={addModal} onClose={() => setAddModal(null)} onSuccess={updateQty} />}
      {logModal && <LogRetireModal brass={logModal} onClose={() => setLogModal(null)} onSuccess={updateQty} />}
      {editModal && (
        <EditBrassModal brass={editModal} onClose={() => setEditModal(null)} onSuccess={(updated) => {
          setBrassLots((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
          setEditModal(null);
        }} />
      )}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-vault-bg/80 backdrop-blur-sm">
          <div className="bg-vault-surface border border-vault-border rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-sm font-semibold text-vault-text mb-2">Delete Brass Lot?</h3>
            <p className="text-xs text-vault-text-muted mb-4">{deleteConfirm.caliber}</p>
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
