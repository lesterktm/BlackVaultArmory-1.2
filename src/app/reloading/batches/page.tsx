"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { VaultButton, VaultInput, VaultSelect, VaultTextArea, vaultLabelClass } from "@/components/shared/ui-primitives";
import { formatCurrency, formatDate, formatDateInput, formatNumber } from "@/lib/utils";
import { ClipboardList, Plus, Loader2, AlertCircle, Trash2, Package } from "lucide-react";

interface RecipeOption {
  id: string;
  recipeName: string;
  caliberCartridge: string;
}

interface Batch {
  id: string;
  batchDate: string;
  quantityProduced: number;
  reusedBrass: boolean;
  totalCost: number | null;
  costPerRound: number | null;
  notes: string | null;
  recipe: { id: string; recipeName: string; caliberCartridge: string };
  ammoStock: { id: string; brand: string; caliber: string } | null;
}

function LogBatchModal({
  recipes,
  onClose,
  onSuccess,
}: {
  recipes: RecipeOption[];
  onClose: () => void;
  onSuccess: (batch: Batch) => void;
}) {
  const [recipeId, setRecipeId] = useState(recipes[0]?.id ?? "");
  const [batchDate, setBatchDate] = useState(formatDateInput(new Date()));
  const [quantityProduced, setQuantityProduced] = useState("");
  const [reusedBrass, setReusedBrass] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qty = Number.parseInt(quantityProduced, 10);
    if (!recipeId) {
      setError("Select a recipe.");
      return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      setError("Enter a valid quantity produced.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/reloading/batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipeId,
        batchDate,
        quantityProduced: qty,
        reusedBrass,
        notes: notes || undefined,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to log batch");
      setSubmitting(false);
    } else {
      onSuccess(json);
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-vault-bg/80 backdrop-blur-sm">
      <div className="bg-vault-surface border border-vault-border rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-sm font-semibold text-vault-text mb-4">Log Reloading Batch</h3>
        {error && (
          <div className="flex items-center gap-2 bg-[#E53935]/10 border border-[#E53935]/30 rounded px-3 py-2 mb-4">
            <AlertCircle className="w-4 h-4 text-[#E53935] shrink-0" />
            <p className="text-xs text-[#E53935]">{error}</p>
          </div>
        )}
        {recipes.length === 0 ? (
          <p className="text-sm text-vault-text-muted">
            No recipes yet. <Link href="/reloading/recipes/new" className="text-[#00C2FF] hover:underline">Create one first</Link>.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={vaultLabelClass}>
                Recipe <span className="text-[#E53935]">*</span>
              </label>
              <VaultSelect value={recipeId} onChange={(e) => setRecipeId(e.target.value)}>
                {recipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.recipeName} ({r.caliberCartridge})
                  </option>
                ))}
              </VaultSelect>
            </div>
            <div>
              <label className={vaultLabelClass}>
                Batch Date <span className="text-[#E53935]">*</span>
              </label>
              <VaultInput type="date" required value={batchDate} onChange={(e) => setBatchDate(e.target.value)} />
            </div>
            <div>
              <label className={vaultLabelClass}>
                Quantity Produced <span className="text-[#E53935]">*</span>
              </label>
              <VaultInput
                type="number"
                min={1}
                required
                value={quantityProduced}
                onChange={(e) => setQuantityProduced(e.target.value)}
                placeholder="e.g. 200"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-vault-text-muted">
              <input type="checkbox" checked={reusedBrass} onChange={(e) => setReusedBrass(e.target.checked)} className="accent-[#00C2FF]" />
              Reused existing brass (skip brass consumption)
            </label>
            <div>
              <label className={vaultLabelClass}>Notes</label>
              <VaultTextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <VaultButton type="button" onClick={onClose} variant="ghost">Cancel</VaultButton>
              <VaultButton type="submit" disabled={submitting} variant="success">
                {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                Log Batch
              </VaultButton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ReloadingBatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [recipes, setRecipes] = useState<RecipeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Batch | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    void Promise.all([
      fetch("/api/reloading/batches").then((res) => res.json()),
      fetch("/api/reloading/recipes").then((res) => res.json()),
    ]).then(([batchData, recipeData]) => {
      if (!isMounted) return;
      setBatches(Array.isArray(batchData.batches) ? batchData.batches : []);
      setRecipes(Array.isArray(recipeData.recipes) ? recipeData.recipes : []);
      setLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  async function confirmDelete() {
    if (!deleteConfirm) return;
    setDeleting(true);
    const res = await fetch(`/api/reloading/batches/${deleteConfirm.id}`, { method: "DELETE" });
    if (res.ok) {
      setBatches((prev) => prev.filter((b) => b.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    }
    setDeleting(false);
  }

  const totalProduced = batches.reduce((sum, b) => sum + b.quantityProduced, 0);

  return (
    <div className="min-h-full">
      <PageHeader
        title="BATCH LOG"
        subtitle="Reloading sessions — consumes components, produces rounds into Ammo stock"
        actions={
          <button
            onClick={() => setLogModalOpen(true)}
            className="flex items-center gap-2 bg-[#00C2FF]/10 border border-[#00C2FF]/30 text-[#00C2FF] hover:bg-[#00C2FF]/20 px-3 py-1.5 rounded text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Log New Batch
          </button>
        }
      />

      <div className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 mb-6 bg-vault-surface border border-vault-border rounded-lg px-4 sm:px-5 py-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-vault-text-faint mb-0.5">Batches Logged</p>
            <p className="text-lg font-bold font-mono text-vault-text">{batches.length}</p>
          </div>
          <div className="w-px h-8 bg-vault-border" />
          <div>
            <p className="text-[10px] uppercase tracking-widest text-vault-text-faint mb-0.5">Total Rounds Produced</p>
            <p className="text-lg font-bold font-mono text-[#F5A623]">{formatNumber(totalProduced)}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-[#00C2FF] animate-spin" />
          </div>
        ) : batches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-[#F5A623]/10 border border-[#F5A623]/20 flex items-center justify-center mb-4">
              <ClipboardList className="w-8 h-8 text-[#F5A623]" />
            </div>
            <h3 className="text-lg font-semibold text-vault-text mb-2">No batches logged</h3>
            <p className="text-sm text-vault-text-muted mb-6 max-w-sm">
              Log a reloading batch to consume components and add finished rounds to your Ammo inventory.
            </p>
            <button
              onClick={() => setLogModalOpen(true)}
              className="flex items-center gap-2 bg-[#00C2FF]/10 border border-[#00C2FF]/30 text-[#00C2FF] hover:bg-[#00C2FF]/20 px-4 py-2 rounded text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Log First Batch
            </button>
          </div>
        ) : (
          <div className="bg-vault-surface border border-vault-border rounded-lg divide-y divide-vault-border overflow-hidden">
            {batches.map((batch) => (
              <div key={batch.id} className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-vault-text">{batch.recipe.recipeName}</p>
                    <span className="text-[10px] font-mono text-vault-text-faint border border-vault-border px-1.5 py-0.5 rounded">{batch.recipe.caliberCartridge}</span>
                    {batch.reusedBrass && (
                      <span className="text-[10px] text-vault-text-faint">reused brass</span>
                    )}
                  </div>
                  <p className="text-xs text-vault-text-faint mt-0.5">{formatDate(batch.batchDate)}</p>
                  {batch.notes && <p className="text-xs text-vault-text-muted mt-0.5">{batch.notes}</p>}
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className="text-base font-bold font-mono text-[#00C853]">{formatNumber(batch.quantityProduced)}</p>
                    <p className="text-[10px] text-vault-text-faint">rounds</p>
                  </div>
                  {batch.costPerRound != null && (
                    <div className="text-right">
                      <p className="text-sm font-mono text-[#00C2FF]">${batch.costPerRound.toFixed(3)}/rd</p>
                      {batch.totalCost != null && <p className="text-[10px] text-vault-text-faint">{formatCurrency(batch.totalCost)} total</p>}
                    </div>
                  )}
                  {batch.ammoStock && (
                    <div className="flex items-center gap-1 text-[10px] text-vault-text-faint">
                      <Package className="w-3 h-3" />
                      <span>in Ammo</span>
                    </div>
                  )}
                  <button
                    onClick={() => setDeleteConfirm(batch)}
                    className="p-1.5 rounded text-vault-text-faint hover:text-[#E53935] hover:bg-[#E53935]/10 transition-colors"
                    title="Delete log entry"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {logModalOpen && (
        <LogBatchModal
          recipes={recipes}
          onClose={() => setLogModalOpen(false)}
          onSuccess={(batch) => setBatches((prev) => [batch, ...prev])}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-vault-bg/80 backdrop-blur-sm">
          <div className="bg-vault-surface border border-vault-border rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-sm font-semibold text-vault-text mb-2">Delete Batch Log?</h3>
            <p className="text-xs text-vault-text-muted mb-1">
              <span className="text-vault-text font-medium">{deleteConfirm.recipe.recipeName} · {formatDate(deleteConfirm.batchDate)}</span>
            </p>
            <p className="text-xs text-vault-text-muted mb-4">
              This removes the log entry only — it will <span className="text-vault-text">not</span> restore consumed
              components or remove the produced rounds already added to Ammo stock.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-3 py-1.5 text-xs rounded border border-vault-border text-vault-text-muted hover:text-vault-text transition-colors"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="px-3 py-1.5 text-xs rounded bg-[#E53935]/10 border border-[#E53935]/30 text-[#E53935] hover:bg-[#E53935]/20 transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
