"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { COMMON_CALIBERS } from "@/lib/types";
import { VaultInput, VaultSelect, VaultTextArea, vaultLabelClass } from "@/components/shared/ui-primitives";
import { ArrowLeft, Plus, Loader2, AlertCircle } from "lucide-react";

const PRIMER_TYPES = ["Large Rifle", "Small Rifle", "Large Pistol", "Small Pistol", "Shotshell (209)", "Rimfire (informational only)"];
const PRIMER_SYSTEMS = ["Boxer", "Berdan"];
const SENSITIVITY_RATINGS = ["Standard", "Hard / Military"];
const COUNT_PER_CONTAINER = ["100", "500", "1000", "Other"];
const CONDITIONS = ["New/Sealed", "Open - Good", "Open - Degraded", "Unknown"];

export default function NewPrimerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [primerSystem, setPrimerSystem] = useState("Boxer");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const data = new FormData(e.currentTarget);

    const payload = {
      manufacturer: data.get("manufacturer") as string,
      productName: data.get("productName") as string,
      primerType: data.get("primerType") as string,
      isMagnum: data.get("isMagnum") === "on",
      isMatch: data.get("isMatch") === "on",
      primerSystem,
      sensitivityRating: (data.get("sensitivityRating") as string) || null,
      quantityOnHand: data.get("quantityOnHand") ? Number(data.get("quantityOnHand")) : 0,
      numberOfBoxes: data.get("numberOfBoxes") ? Number(data.get("numberOfBoxes")) : null,
      numberOfSleeves: data.get("numberOfSleeves") ? Number(data.get("numberOfSleeves")) : null,
      numberOfBricks: data.get("numberOfBricks") ? Number(data.get("numberOfBricks")) : null,
      countPerContainer: (data.get("countPerContainer") as string) || null,
      lotNumber: (data.get("lotNumber") as string) || null,
      dateAcquired: (data.get("dateAcquired") as string) || null,
      storageLocation: (data.get("storageLocation") as string) || null,
      condition: (data.get("condition") as string) || null,
      purchasePrice: data.get("purchasePrice") ? Number(data.get("purchasePrice")) : null,
      hazmatFeePaid: data.get("hazmatFeePaid") === "on",
      vendor: (data.get("vendor") as string) || null,
      intendedCalibersOrApplications: (data.get("intendedCalibersOrApplications") as string) || null,
      compatiblePowderTypes: (data.get("compatiblePowderTypes") as string) || null,
      seatingDepthNotes: (data.get("seatingDepthNotes") as string) || null,
      loadDataReference: (data.get("loadDataReference") as string) || null,
      notes: (data.get("notes") as string) || null,
      maxStorageQuantityCount: data.get("maxStorageQuantityCount") ? Number(data.get("maxStorageQuantityCount")) : null,
      hazardClassification: (data.get("hazardClassification") as string) || null,
      reorderThreshold: data.get("reorderThreshold") ? Number(data.get("reorderThreshold")) : null,
    };

    if (!payload.manufacturer?.trim() || !payload.productName?.trim() || !payload.primerType) {
      setError("Manufacturer, product name, and primer type are required.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/reloading/primer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to create"); setLoading(false); return; }
      router.push("/reloading/primer");
    } catch {
      setError("Failed to create primer entry");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full">
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 px-4 sm:px-6 py-4 border-b border-vault-border">
        <Link href="/reloading/primer" className="flex items-center gap-1.5 text-vault-text-muted hover:text-vault-text text-sm transition-colors"><ArrowLeft className="w-4 h-4" />Back to Primers</Link>
        <span className="text-vault-border">/</span>
        <h1 className="text-sm font-semibold text-vault-text tracking-wide uppercase">Add Primer</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-8"><h2 className="text-xl font-bold text-vault-text mb-1">New Primer</h2><p className="text-sm text-vault-text-muted">Track a primer lot in your reloading inventory.</p></div>
        {error && <div className="flex items-center gap-3 bg-[#E53935]/10 border border-[#E53935]/30 rounded-lg px-4 py-3 mb-6"><AlertCircle className="w-4 h-4 text-[#E53935] shrink-0" /><p className="text-sm text-[#E53935]">{error}</p></div>}
        {primerSystem === "Berdan" && (
          <div className="flex items-center gap-3 bg-[#F5A623]/10 border border-[#F5A623]/30 rounded-lg px-4 py-3 mb-6">
            <AlertCircle className="w-4 h-4 text-[#F5A623] shrink-0" />
            <p className="text-sm text-[#F5A623]">Berdan-primed cases are generally not reloadable with standard dies.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <fieldset className="bg-vault-surface border border-vault-border rounded-lg p-5 space-y-4">
            <legend className="text-xs font-mono uppercase tracking-widest text-[#F5A623] px-1 -ml-1">Identity &amp; Classification</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={vaultLabelClass}>Manufacturer <span className="text-[#E53935]">*</span></label><VaultInput name="manufacturer" required placeholder="e.g. CCI" /></div>
              <div><label className={vaultLabelClass}>Product Name <span className="text-[#E53935]">*</span></label><VaultInput name="productName" required placeholder="e.g. CCI 500" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={vaultLabelClass}>Primer Type <span className="text-[#E53935]">*</span></label>
                <VaultSelect name="primerType" required defaultValue=""><option value="" disabled>Select type...</option>{PRIMER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</VaultSelect>
              </div>
              <div>
                <label className={vaultLabelClass}>Primer System</label>
                <VaultSelect value={primerSystem} onChange={(e) => setPrimerSystem(e.target.value)}>{PRIMER_SYSTEMS.map((t) => <option key={t} value={t}>{t}</option>)}</VaultSelect>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="flex items-center gap-2 text-xs text-vault-text-muted"><input type="checkbox" name="isMagnum" className="accent-[#00C2FF]" />Magnum</label>
              <label className="flex items-center gap-2 text-xs text-vault-text-muted"><input type="checkbox" name="isMatch" className="accent-[#00C2FF]" />Match / Benchrest</label>
              <div>
                <label className={vaultLabelClass}>Sensitivity</label>
                <VaultSelect name="sensitivityRating" defaultValue=""><option value="">Not set</option>{SENSITIVITY_RATINGS.map((t) => <option key={t} value={t}>{t}</option>)}</VaultSelect>
              </div>
            </div>
          </fieldset>

          <fieldset className="bg-vault-surface border border-vault-border rounded-lg p-5 space-y-4">
            <legend className="text-xs font-mono uppercase tracking-widest text-[#F5A623] px-1 -ml-1">Inventory &amp; Storage</legend>
            <div><label className={vaultLabelClass}>Quantity On Hand</label><VaultInput name="quantityOnHand" type="number" min={0} placeholder="e.g. 1000" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div><label className={vaultLabelClass}>Boxes (100ct)</label><VaultInput name="numberOfBoxes" type="number" min={0} /></div>
              <div><label className={vaultLabelClass}>Sleeves (500ct)</label><VaultInput name="numberOfSleeves" type="number" min={0} /></div>
              <div><label className={vaultLabelClass}>Bricks (1000ct)</label><VaultInput name="numberOfBricks" type="number" min={0} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={vaultLabelClass}>Count / Container</label>
                <VaultSelect name="countPerContainer" defaultValue=""><option value="">Not set</option>{COUNT_PER_CONTAINER.map((t) => <option key={t} value={t}>{t}</option>)}</VaultSelect>
              </div>
              <div><label className={vaultLabelClass}>Lot Number</label><VaultInput name="lotNumber" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={vaultLabelClass}>Date Acquired</label><VaultInput name="dateAcquired" type="date" /></div>
              <div><label className={vaultLabelClass}>Storage Location</label><VaultInput name="storageLocation" /></div>
            </div>
            <div>
              <label className={vaultLabelClass}>Condition</label>
              <VaultSelect name="condition" defaultValue=""><option value="">Not set</option>{CONDITIONS.map((t) => <option key={t} value={t}>{t}</option>)}</VaultSelect>
            </div>
          </fieldset>

          <fieldset className="bg-vault-surface border border-vault-border rounded-lg p-5 space-y-4">
            <legend className="text-xs font-mono uppercase tracking-widest text-[#F5A623] px-1 -ml-1">Cost &amp; Procurement</legend>
            <div><label className={vaultLabelClass}>Total Cost ($)</label><VaultInput name="purchasePrice" type="number" min={0} step="0.01" /></div>
            <label className="flex items-center gap-2 text-xs text-vault-text-muted"><input type="checkbox" name="hazmatFeePaid" className="accent-[#00C2FF]" />Hazmat fee paid (included in total cost)</label>
            <div><label className={vaultLabelClass}>Vendor</label><VaultInput name="vendor" /></div>
          </fieldset>

          <fieldset className="bg-vault-surface border border-vault-border rounded-lg p-5 space-y-4">
            <legend className="text-xs font-mono uppercase tracking-widest text-[#F5A623] px-1 -ml-1">Usage Reference</legend>
            <div>
              <label className={vaultLabelClass}>Intended Calibers / Applications</label>
              <VaultInput name="intendedCalibersOrApplications" list="primer-caliber-options" placeholder="comma-separated" />
              <datalist id="primer-caliber-options">{COMMON_CALIBERS.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
            <div><label className={vaultLabelClass}>Compatible Powder Types</label><VaultInput name="compatiblePowderTypes" placeholder="comma-separated" /></div>
            <div><label className={vaultLabelClass}>Seating Depth Notes</label><VaultInput name="seatingDepthNotes" /></div>
            <div><label className={vaultLabelClass}>Load Data Reference</label><VaultInput name="loadDataReference" /></div>
            <div><label className={vaultLabelClass}>Notes</label><VaultTextArea name="notes" rows={3} /></div>
          </fieldset>

          <fieldset className="bg-vault-surface border border-vault-border rounded-lg p-5 space-y-4">
            <legend className="text-xs font-mono uppercase tracking-widest text-[#F5A623] px-1 -ml-1">Safety &amp; Regulatory</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={vaultLabelClass}>Max Storage Quantity</label><VaultInput name="maxStorageQuantityCount" type="number" min={0} /></div>
              <div><label className={vaultLabelClass}>Hazard Classification</label><VaultInput name="hazardClassification" placeholder='e.g. "Division 1.4S"' /></div>
            </div>
            <div><label className={vaultLabelClass}>Reorder Alert</label><VaultInput name="reorderThreshold" type="number" min={0} placeholder="e.g. 200" /></div>
          </fieldset>

          <div className="flex gap-3 justify-end">
            <Link href="/reloading/primer" className="px-4 py-2 rounded-md text-sm border border-vault-border text-vault-text-muted hover:text-vault-text transition-colors">Cancel</Link>
            <button type="submit" disabled={loading} className="flex items-center gap-2 bg-[#00C2FF]/10 border border-[#00C2FF]/30 text-[#00C2FF] hover:bg-[#00C2FF]/20 px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Create Primer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
