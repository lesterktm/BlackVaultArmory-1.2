"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { COMMON_CALIBERS } from "@/lib/types";
import { VaultInput, VaultSelect, VaultTextArea, vaultLabelClass } from "@/components/shared/ui-primitives";
import { ArrowLeft, Plus, Loader2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

const CASE_MATERIALS = ["Brass", "Nickel-Plated Brass", "Steel", "Aluminum"];
const PRIMER_SYSTEMS = ["Boxer", "Berdan"];
const CASE_ORIGINS = ["New/Unprimed", "Commercial Once-Fired", "Military Surplus", "Range Pickup", "Pulled/Disassembled"];
const PREP_STATUSES = ["Raw/As-Received", "Decapped", "Cleaned", "Sized & Decapped", "Trimmed", "Primer Pocket Prepped", "Ready to Load"];
const SOURCES = ["Purchased New", "Purchased Once-Fired", "Range Pickup (Free)", "Traded", "Pulled from Loaded Ammo"];

export default function NewBrassPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caseMaterial, setCaseMaterial] = useState("Brass");
  const [primerSystem, setPrimerSystem] = useState("Boxer");
  const [isMilitaryBrass, setIsMilitaryBrass] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const data = new FormData(e.currentTarget);

    const onHand = data.get("quantityOnHand") ? Number(data.get("quantityOnHand")) : 0;
    const ready = data.get("quantityReadyToLoad") ? Number(data.get("quantityReadyToLoad")) : 0;
    const inProcess = data.get("quantityInProcess") ? Number(data.get("quantityInProcess")) : 0;

    const payload = {
      caliber: data.get("caliber") as string,
      headstamp: (data.get("headstamp") as string) || null,
      manufacturer: (data.get("manufacturer") as string) || null,
      caseMaterial,
      primerSystem,
      caseOrigin: (data.get("caseOrigin") as string) || null,
      isMilitaryBrass,
      isMixedHeadstamp: data.get("isMixedHeadstamp") === "on",
      firingCount: data.get("firingCount") ? Number(data.get("firingCount")) : 0,
      maxFiringCount: data.get("maxFiringCount") ? Number(data.get("maxFiringCount")) : null,
      preparationStatus: (data.get("preparationStatus") as string) || null,
      isAnnealed: data.get("isAnnealed") === "on",
      annealingCount: data.get("annealingCount") ? Number(data.get("annealingCount")) : 0,
      isNeckTurned: data.get("isNeckTurned") === "on",
      isFlashHoleDeburred: data.get("isFlashHoleDeburred") === "on",
      isPrimerPocketUniformed: data.get("isPrimerPocketUniformed") === "on",
      isPrimerPocketSwaged: data.get("isPrimerPocketSwaged") === "on",
      quantityOnHand: onHand,
      quantityReadyToLoad: ready,
      quantityInProcess: inProcess,
      quantityRetired: data.get("quantityRetired") ? Number(data.get("quantityRetired")) : 0,
      lotIdentifier: (data.get("lotIdentifier") as string) || null,
      dateAcquired: (data.get("dateAcquired") as string) || null,
      storageLocation: (data.get("storageLocation") as string) || null,
      trimToLengthIn: data.get("trimToLengthIn") ? Number(data.get("trimToLengthIn")) : null,
      maxCaseLengthIn: data.get("maxCaseLengthIn") ? Number(data.get("maxCaseLengthIn")) : null,
      currentAvgLengthIn: data.get("currentAvgLengthIn") ? Number(data.get("currentAvgLengthIn")) : null,
      headDiameterIn: data.get("headDiameterIn") ? Number(data.get("headDiameterIn")) : null,
      neckWallThicknessIn: data.get("neckWallThicknessIn") ? Number(data.get("neckWallThicknessIn")) : null,
      dimensionalNotes: (data.get("dimensionalNotes") as string) || null,
      purchasePrice: data.get("purchasePrice") ? Number(data.get("purchasePrice")) : null,
      vendor: (data.get("vendor") as string) || null,
      source: (data.get("source") as string) || null,
      intendedLoad: (data.get("intendedLoad") as string) || null,
      compatibleDies: (data.get("compatibleDies") as string) || null,
      loadDataReference: (data.get("loadDataReference") as string) || null,
      notes: (data.get("notes") as string) || null,
    };

    if (!payload.caliber?.trim()) { setError("Caliber is required."); setLoading(false); return; }
    if (ready + inProcess > onHand) { setError("Ready to Load + In Process cannot exceed Quantity On Hand."); setLoading(false); return; }

    try {
      const res = await fetch("/api/reloading/brass", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to create"); setLoading(false); return; }
      router.push("/reloading/brass");
    } catch {
      setError("Failed to create brass entry");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full">
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 px-4 sm:px-6 py-4 border-b border-vault-border">
        <Link href="/reloading/brass" className="flex items-center gap-1.5 text-vault-text-muted hover:text-vault-text text-sm transition-colors"><ArrowLeft className="w-4 h-4" />Back to Brass</Link>
        <span className="text-vault-border">/</span>
        <h1 className="text-sm font-semibold text-vault-text tracking-wide uppercase">Add Brass</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-8"><h2 className="text-xl font-bold text-vault-text mb-1">New Brass Lot</h2><p className="text-sm text-vault-text-muted">Track a case lot in your reloading inventory.</p></div>
        {error && <div className="flex items-center gap-3 bg-[#E53935]/10 border border-[#E53935]/30 rounded-lg px-4 py-3 mb-6"><AlertCircle className="w-4 h-4 text-[#E53935] shrink-0" /><p className="text-sm text-[#E53935]">{error}</p></div>}
        {(caseMaterial === "Steel" || caseMaterial === "Aluminum") && (
          <div className="flex items-center gap-3 bg-[#E53935]/10 border border-[#E53935]/30 rounded-lg px-4 py-3 mb-6"><AlertCircle className="w-4 h-4 text-[#E53935] shrink-0" /><p className="text-sm text-[#E53935]">Not reloadable — {caseMaterial.toLowerCase()} cases.</p></div>
        )}
        {primerSystem === "Berdan" && (
          <div className="flex items-center gap-3 bg-[#F5A623]/10 border border-[#F5A623]/30 rounded-lg px-4 py-3 mb-6"><AlertCircle className="w-4 h-4 text-[#F5A623] shrink-0" /><p className="text-sm text-[#F5A623]">Berdan-primed cases are generally not reloadable with standard dies.</p></div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <fieldset className="bg-vault-surface border border-vault-border rounded-lg p-5 space-y-4">
            <legend className="text-xs font-mono uppercase tracking-widest text-[#F5A623] px-1 -ml-1">Identity &amp; Classification</legend>
            <div>
              <label className={vaultLabelClass}>Caliber <span className="text-[#E53935]">*</span></label>
              <VaultInput name="caliber" required list="brass-caliber-options" placeholder="e.g. .308 Win" />
              <datalist id="brass-caliber-options">{COMMON_CALIBERS.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={vaultLabelClass}>Manufacturer</label><VaultInput name="manufacturer" placeholder="e.g. Lapua" /></div>
              <div><label className={vaultLabelClass}>Headstamp</label><VaultInput name="headstamp" placeholder="e.g. LC" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={vaultLabelClass}>Case Material</label>
                <VaultSelect value={caseMaterial} onChange={(e) => setCaseMaterial(e.target.value)}>{CASE_MATERIALS.map((t) => <option key={t} value={t}>{t}</option>)}</VaultSelect>
              </div>
              <div>
                <label className={vaultLabelClass}>Primer System</label>
                <VaultSelect value={primerSystem} onChange={(e) => setPrimerSystem(e.target.value)}>{PRIMER_SYSTEMS.map((t) => <option key={t} value={t}>{t}</option>)}</VaultSelect>
              </div>
            </div>
            <div>
              <label className={vaultLabelClass}>Case Origin</label>
              <VaultSelect name="caseOrigin" defaultValue=""><option value="">Not set</option>{CASE_ORIGINS.map((t) => <option key={t} value={t}>{t}</option>)}</VaultSelect>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2 text-xs text-vault-text-muted"><input type="checkbox" checked={isMilitaryBrass} onChange={(e) => setIsMilitaryBrass(e.target.checked)} className="accent-[#00C2FF]" />Military brass</label>
              <label className="flex items-center gap-2 text-xs text-vault-text-muted"><input type="checkbox" name="isMixedHeadstamp" className="accent-[#00C2FF]" />Mixed headstamp</label>
            </div>
          </fieldset>

          <fieldset className="bg-vault-surface border border-vault-border rounded-lg p-5 space-y-4">
            <legend className="text-xs font-mono uppercase tracking-widest text-[#F5A623] px-1 -ml-1">Condition &amp; Preparation</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={vaultLabelClass}>Firing Count</label><VaultInput name="firingCount" type="number" min={0} defaultValue={0} /></div>
              <div><label className={vaultLabelClass}>Max Firing Count</label><VaultInput name="maxFiringCount" type="number" min={0} placeholder="e.g. 5" /></div>
            </div>
            <div>
              <label className={vaultLabelClass}>Preparation Status</label>
              <VaultSelect name="preparationStatus" defaultValue=""><option value="">Not set</option>{PREP_STATUSES.map((t) => <option key={t} value={t}>{t}</option>)}</VaultSelect>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 text-xs text-vault-text-muted"><input type="checkbox" name="isAnnealed" className="accent-[#00C2FF]" />Annealed</label>
              <div><label className={vaultLabelClass}>Annealing Count</label><VaultInput name="annealingCount" type="number" min={0} defaultValue={0} /></div>
              <label className="flex items-center gap-2 text-xs text-vault-text-muted"><input type="checkbox" name="isNeckTurned" className="accent-[#00C2FF]" />Neck turned</label>
              <label className="flex items-center gap-2 text-xs text-vault-text-muted"><input type="checkbox" name="isFlashHoleDeburred" className="accent-[#00C2FF]" />Flash hole deburred</label>
              <label className="flex items-center gap-2 text-xs text-vault-text-muted"><input type="checkbox" name="isPrimerPocketUniformed" className="accent-[#00C2FF]" />Primer pocket uniformed</label>
              {isMilitaryBrass && <label className="flex items-center gap-2 text-xs text-vault-text-muted"><input type="checkbox" name="isPrimerPocketSwaged" className="accent-[#00C2FF]" />Primer pocket swaged</label>}
            </div>
          </fieldset>

          <fieldset className="bg-vault-surface border border-vault-border rounded-lg p-5 space-y-4">
            <legend className="text-xs font-mono uppercase tracking-widest text-[#F5A623] px-1 -ml-1">Inventory &amp; Quantities</legend>
            <div><label className={vaultLabelClass}>Quantity On Hand</label><VaultInput name="quantityOnHand" type="number" min={0} placeholder="e.g. 500" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={vaultLabelClass}>Ready to Load</label><VaultInput name="quantityReadyToLoad" type="number" min={0} defaultValue={0} /></div>
              <div><label className={vaultLabelClass}>In Process</label><VaultInput name="quantityInProcess" type="number" min={0} defaultValue={0} /></div>
            </div>
            <div><label className={vaultLabelClass}>Retired</label><VaultInput name="quantityRetired" type="number" min={0} defaultValue={0} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={vaultLabelClass}>Lot Identifier</label><VaultInput name="lotIdentifier" placeholder='e.g. "Lapua 6.5CM Lot A"' /></div>
              <div><label className={vaultLabelClass}>Date Acquired</label><VaultInput name="dateAcquired" type="date" /></div>
            </div>
            <div><label className={vaultLabelClass}>Storage Location</label><VaultInput name="storageLocation" /></div>
          </fieldset>

          <fieldset className="bg-vault-surface border border-vault-border rounded-lg p-5 space-y-4">
            <legend className="text-xs font-mono uppercase tracking-widest text-[#F5A623] px-1 -ml-1">Cost &amp; Procurement</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={vaultLabelClass}>Total Cost ($)</label><VaultInput name="purchasePrice" type="number" min={0} step="0.01" /></div>
              <div><label className={vaultLabelClass}>Vendor</label><VaultInput name="vendor" /></div>
            </div>
            <div>
              <label className={vaultLabelClass}>Source</label>
              <VaultSelect name="source" defaultValue=""><option value="">Not set</option>{SOURCES.map((t) => <option key={t} value={t}>{t}</option>)}</VaultSelect>
            </div>
          </fieldset>

          <div className="bg-vault-surface border border-vault-border rounded-lg overflow-hidden">
            <button type="button" onClick={() => setAdvancedOpen((o) => !o)} className="w-full flex items-center justify-between px-5 py-3 text-left">
              <span className="text-xs font-mono uppercase tracking-widest text-[#F5A623]">Advanced / Precision — Dimensional Reference</span>
              {advancedOpen ? <ChevronUp className="w-4 h-4 text-vault-text-faint" /> : <ChevronDown className="w-4 h-4 text-vault-text-faint" />}
            </button>
            {advancedOpen && (
              <div className="px-5 pb-5 space-y-4 border-t border-vault-border pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className={vaultLabelClass}>Trim-to Length (in)</label><VaultInput name="trimToLengthIn" type="number" min={0} step="0.001" /></div>
                  <div><label className={vaultLabelClass}>Max Case Length (in)</label><VaultInput name="maxCaseLengthIn" type="number" min={0} step="0.001" /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className={vaultLabelClass}>Current Avg Length (in)</label><VaultInput name="currentAvgLengthIn" type="number" min={0} step="0.001" /></div>
                  <div><label className={vaultLabelClass}>Head Diameter (in)</label><VaultInput name="headDiameterIn" type="number" min={0} step="0.001" /></div>
                </div>
                <div><label className={vaultLabelClass}>Neck Wall Thickness (in)</label><VaultInput name="neckWallThicknessIn" type="number" min={0} step="0.0001" /></div>
                <div><label className={vaultLabelClass}>Dimensional Notes</label><VaultTextArea name="dimensionalNotes" rows={2} /></div>
              </div>
            )}
          </div>

          <fieldset className="bg-vault-surface border border-vault-border rounded-lg p-5 space-y-4">
            <legend className="text-xs font-mono uppercase tracking-widest text-[#F5A623] px-1 -ml-1">Usage Reference</legend>
            <div><label className={vaultLabelClass}>Intended Load</label><VaultInput name="intendedLoad" /></div>
            <div><label className={vaultLabelClass}>Compatible Dies</label><VaultInput name="compatibleDies" placeholder='comma-separated, e.g. "Redding Type S .308"' /></div>
            <div><label className={vaultLabelClass}>Load Data Reference</label><VaultInput name="loadDataReference" /></div>
            <div><label className={vaultLabelClass}>Notes</label><VaultTextArea name="notes" rows={3} /></div>
          </fieldset>

          <div className="flex gap-3 justify-end">
            <Link href="/reloading/brass" className="px-4 py-2 rounded-md text-sm border border-vault-border text-vault-text-muted hover:text-vault-text transition-colors">Cancel</Link>
            <button type="submit" disabled={loading} className="flex items-center gap-2 bg-[#00C2FF]/10 border border-[#00C2FF]/30 text-[#00C2FF] hover:bg-[#00C2FF]/20 px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Create Brass Lot
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
