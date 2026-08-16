"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { COMMON_CALIBERS } from "@/lib/types";
import { VaultInput, VaultSelect, VaultTextArea, vaultLabelClass } from "@/components/shared/ui-primitives";
import { ArrowLeft, Plus, Loader2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

const BULLET_TYPES = ["FMJ", "JHP", "JSP", "BTHP", "Solid Copper / Monolithic", "Cast Lead", "Plated", "Frangible", "Wadcutter", "Semi-Wadcutter", "Polymer Tip"];
const BASE_STYLES = ["Flat Base", "Boat Tail"];
const NOSE_STYLES = ["Round Nose", "Flat Point", "Soft Point", "Hollow Point", "Polymer Tip", "Open Tip Match (OTM)", "Wadcutter"];
const INTENDED_USES = ["Target / Match", "Hunting", "Self-Defense / Home Defense", "Plinking / Practice", "Varmint", "Long Range"];
const CORE_CONSTRUCTIONS = ["Bonded Lead", "Non-Bonded Lead", "Lead-Free (solid copper, brass, or zinc)", "Partitioned", "Dual-Core"];
const JACKET_MATERIALS = ["Gilding Metal (copper alloy)", "Copper", "Polymer Coat", "None (cast or solid)"];
const COUNT_PER_BOX = ["50", "100", "250", "500", "1000", "Other"];
const CONDITIONS = ["New", "Open - Good", "Damaged / Cosmetic Defects"];

export default function NewBulletPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [intendedUse, setIntendedUse] = useState<string[]>([]);

  function toggleUse(use: string) {
    setIntendedUse((prev) => (prev.includes(use) ? prev.filter((u) => u !== use) : [...prev, use]));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const data = new FormData(e.currentTarget);

    const bulletLengthIn = data.get("bulletLengthIn") ? Number(data.get("bulletLengthIn")) : null;
    const baseToOgiveIn = data.get("baseToOgiveIn") ? Number(data.get("baseToOgiveIn")) : null;
    const bcG1 = data.get("bcG1") ? Number(data.get("bcG1")) : null;
    const bcG7 = data.get("bcG7") ? Number(data.get("bcG7")) : null;

    const payload = {
      manufacturer: data.get("manufacturer") as string,
      productLine: (data.get("productLine") as string) || null,
      productName: data.get("productName") as string,
      caliberDiameterIn: data.get("caliberDiameterIn") ? Number(data.get("caliberDiameterIn")) : null,
      caliberLabel: (data.get("caliberLabel") as string) || null,
      weightGrains: data.get("weightGrains") ? Number(data.get("weightGrains")) : null,
      bulletType: data.get("bulletType") as string,
      baseStyle: (data.get("baseStyle") as string) || null,
      noseStyle: (data.get("noseStyle") as string) || null,
      intendedUse: intendedUse.length ? intendedUse.join(",") : null,
      coreConstruction: (data.get("coreConstruction") as string) || null,
      jacketMaterial: (data.get("jacketMaterial") as string) || null,
      isLeadFree: data.get("isLeadFree") === "on",
      hasCannelure: data.get("hasCannelure") === "on",
      hasBoattailGasCheck: data.get("hasBoattailGasCheck") === "on",
      bcG1, bcG7, bulletLengthIn, baseToOgiveIn,
      twistRateMin: (data.get("twistRateMin") as string) || null,
      twistRateRecommended: (data.get("twistRateRecommended") as string) || null,
      quantityOnHand: data.get("quantityOnHand") ? Number(data.get("quantityOnHand")) : 0,
      numberOfBoxes: data.get("numberOfBoxes") ? Number(data.get("numberOfBoxes")) : null,
      countPerBox: (data.get("countPerBox") as string) || null,
      lotNumber: (data.get("lotNumber") as string) || null,
      dateAcquired: (data.get("dateAcquired") as string) || null,
      storageLocation: (data.get("storageLocation") as string) || null,
      condition: (data.get("condition") as string) || null,
      purchasePrice: data.get("purchasePrice") ? Number(data.get("purchasePrice")) : null,
      vendor: (data.get("vendor") as string) || null,
      intendedCalibersOrCartridges: (data.get("intendedCalibersOrCartridges") as string) || null,
      recommendedCoalIn: data.get("recommendedCoalIn") ? Number(data.get("recommendedCoalIn")) : null,
      recommendedHundredthsJump: data.get("recommendedHundredthsJump") ? Number(data.get("recommendedHundredthsJump")) : null,
      compatiblePowders: (data.get("compatiblePowders") as string) || null,
      loadDataReference: (data.get("loadDataReference") as string) || null,
      notes: (data.get("notes") as string) || null,
      reorderThreshold: data.get("reorderThreshold") ? Number(data.get("reorderThreshold")) : null,
    };

    if (!payload.manufacturer?.trim() || !payload.productName?.trim() || !payload.bulletType || payload.caliberDiameterIn == null || payload.weightGrains == null) {
      setError("Manufacturer, product name, bullet type, caliber diameter, and weight are required.");
      setLoading(false);
      return;
    }
    if (bcG1 != null && (bcG1 < 0.05 || bcG1 > 1.2)) { setError("BC (G1) must be between 0.050 and 1.200."); setLoading(false); return; }
    if (bcG7 != null && (bcG7 < 0.05 || bcG7 > 1.2)) { setError("BC (G7) must be between 0.050 and 1.200."); setLoading(false); return; }
    if (baseToOgiveIn != null && bulletLengthIn != null && baseToOgiveIn >= bulletLengthIn) { setError("Base-to-ogive must be less than bullet length."); setLoading(false); return; }

    try {
      const res = await fetch("/api/reloading/bullet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to create"); setLoading(false); return; }
      router.push("/reloading/bullet");
    } catch {
      setError("Failed to create bullet entry");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full">
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 px-4 sm:px-6 py-4 border-b border-vault-border">
        <Link href="/reloading/bullet" className="flex items-center gap-1.5 text-vault-text-muted hover:text-vault-text text-sm transition-colors"><ArrowLeft className="w-4 h-4" />Back to Bullets</Link>
        <span className="text-vault-border">/</span>
        <h1 className="text-sm font-semibold text-vault-text tracking-wide uppercase">Add Bullet</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-8"><h2 className="text-xl font-bold text-vault-text mb-1">New Bullet</h2><p className="text-sm text-vault-text-muted">Track a bullet/projectile lot in your reloading inventory.</p></div>
        {error && <div className="flex items-center gap-3 bg-[#E53935]/10 border border-[#E53935]/30 rounded-lg px-4 py-3 mb-6"><AlertCircle className="w-4 h-4 text-[#E53935] shrink-0" /><p className="text-sm text-[#E53935]">{error}</p></div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <fieldset className="bg-vault-surface border border-vault-border rounded-lg p-5 space-y-4">
            <legend className="text-xs font-mono uppercase tracking-widest text-[#F5A623] px-1 -ml-1">Identity &amp; Classification</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={vaultLabelClass}>Manufacturer <span className="text-[#E53935]">*</span></label><VaultInput name="manufacturer" required placeholder="e.g. Hornady" /></div>
              <div><label className={vaultLabelClass}>Product Line</label><VaultInput name="productLine" placeholder="e.g. ELD-M" /></div>
            </div>
            <div><label className={vaultLabelClass}>Product Name <span className="text-[#E53935]">*</span></label><VaultInput name="productName" required placeholder="e.g. Hornady 168gr ELD-M .308" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div><label className={vaultLabelClass}>Diameter (in) <span className="text-[#E53935]">*</span></label><VaultInput name="caliberDiameterIn" type="number" required min={0} step="0.0001" placeholder="e.g. 0.308" /></div>
              <div><label className={vaultLabelClass}>Caliber Label</label><VaultInput name="caliberLabel" list="bullet-caliber-options" placeholder="e.g. .308" /><datalist id="bullet-caliber-options">{COMMON_CALIBERS.map((c) => <option key={c} value={c} />)}</datalist></div>
              <div><label className={vaultLabelClass}>Weight (gr) <span className="text-[#E53935]">*</span></label><VaultInput name="weightGrains" type="number" required min={0} step="0.1" placeholder="e.g. 168" /></div>
            </div>
            <div>
              <label className={vaultLabelClass}>Bullet Type <span className="text-[#E53935]">*</span></label>
              <VaultSelect name="bulletType" required defaultValue=""><option value="" disabled>Select type...</option>{BULLET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</VaultSelect>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={vaultLabelClass}>Base Style</label><VaultSelect name="baseStyle" defaultValue=""><option value="">Not set</option>{BASE_STYLES.map((t) => <option key={t} value={t}>{t}</option>)}</VaultSelect></div>
              <div><label className={vaultLabelClass}>Nose Style</label><VaultSelect name="noseStyle" defaultValue=""><option value="">Not set</option>{NOSE_STYLES.map((t) => <option key={t} value={t}>{t}</option>)}</VaultSelect></div>
            </div>
            <div>
              <label className={vaultLabelClass}>Intended Use</label>
              <div className="flex flex-wrap gap-2">
                {INTENDED_USES.map((u) => (
                  <button key={u} type="button" onClick={() => toggleUse(u)} className={`text-[10px] px-2 py-1 rounded border transition-colors ${intendedUse.includes(u) ? "bg-[#00C2FF]/10 border-[#00C2FF]/40 text-[#00C2FF]" : "border-vault-border text-vault-text-muted hover:text-vault-text"}`}>{u}</button>
                ))}
              </div>
            </div>
          </fieldset>

          <fieldset className="bg-vault-surface border border-vault-border rounded-lg p-5 space-y-4">
            <legend className="text-xs font-mono uppercase tracking-widest text-[#F5A623] px-1 -ml-1">Construction Details</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={vaultLabelClass}>Core Construction</label><VaultSelect name="coreConstruction" defaultValue=""><option value="">Not set</option>{CORE_CONSTRUCTIONS.map((t) => <option key={t} value={t}>{t}</option>)}</VaultSelect></div>
              <div><label className={vaultLabelClass}>Jacket Material</label><VaultSelect name="jacketMaterial" defaultValue=""><option value="">Not set</option>{JACKET_MATERIALS.map((t) => <option key={t} value={t}>{t}</option>)}</VaultSelect></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <label className="flex items-center gap-2 text-xs text-vault-text-muted"><input type="checkbox" name="isLeadFree" className="accent-[#00C2FF]" />Lead-free</label>
              <label className="flex items-center gap-2 text-xs text-vault-text-muted"><input type="checkbox" name="hasCannelure" className="accent-[#00C2FF]" />Cannelure</label>
              <label className="flex items-center gap-2 text-xs text-vault-text-muted"><input type="checkbox" name="hasBoattailGasCheck" className="accent-[#00C2FF]" />Gas check</label>
            </div>
          </fieldset>

          <div className="bg-vault-surface border border-vault-border rounded-lg overflow-hidden">
            <button type="button" onClick={() => setAdvancedOpen((o) => !o)} className="w-full flex items-center justify-between px-5 py-3 text-left">
              <span className="text-xs font-mono uppercase tracking-widest text-[#F5A623]">Advanced / Precision — Ballistic Data</span>
              {advancedOpen ? <ChevronUp className="w-4 h-4 text-vault-text-faint" /> : <ChevronDown className="w-4 h-4 text-vault-text-faint" />}
            </button>
            {advancedOpen && (
              <div className="px-5 pb-5 space-y-4 border-t border-vault-border pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className={vaultLabelClass}>BC (G1)</label><VaultInput name="bcG1" type="number" min={0.05} max={1.2} step="0.001" /></div>
                  <div><label className={vaultLabelClass}>BC (G7)</label><VaultInput name="bcG7" type="number" min={0.05} max={1.2} step="0.001" /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className={vaultLabelClass}>Bullet Length (in)</label><VaultInput name="bulletLengthIn" type="number" min={0} step="0.001" /></div>
                  <div><label className={vaultLabelClass}>Base-to-Ogive (in)</label><VaultInput name="baseToOgiveIn" type="number" min={0} step="0.001" /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className={vaultLabelClass}>Min Twist Rate</label><VaultInput name="twistRateMin" placeholder='e.g. "1:10"' /></div>
                  <div><label className={vaultLabelClass}>Recommended Twist Rate</label><VaultInput name="twistRateRecommended" placeholder='e.g. "1:8"' /></div>
                </div>
              </div>
            )}
          </div>

          <fieldset className="bg-vault-surface border border-vault-border rounded-lg p-5 space-y-4">
            <legend className="text-xs font-mono uppercase tracking-widest text-[#F5A623] px-1 -ml-1">Inventory &amp; Storage</legend>
            <div><label className={vaultLabelClass}>Quantity On Hand</label><VaultInput name="quantityOnHand" type="number" min={0} placeholder="e.g. 500" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={vaultLabelClass}>Number of Boxes</label><VaultInput name="numberOfBoxes" type="number" min={0} /></div>
              <div><label className={vaultLabelClass}>Count / Box</label><VaultSelect name="countPerBox" defaultValue=""><option value="">Not set</option>{COUNT_PER_BOX.map((t) => <option key={t} value={t}>{t}</option>)}</VaultSelect></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={vaultLabelClass}>Lot Number</label><VaultInput name="lotNumber" /></div>
              <div><label className={vaultLabelClass}>Date Acquired</label><VaultInput name="dateAcquired" type="date" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={vaultLabelClass}>Storage Location</label><VaultInput name="storageLocation" /></div>
              <div><label className={vaultLabelClass}>Condition</label><VaultSelect name="condition" defaultValue=""><option value="">Not set</option>{CONDITIONS.map((t) => <option key={t} value={t}>{t}</option>)}</VaultSelect></div>
            </div>
          </fieldset>

          <fieldset className="bg-vault-surface border border-vault-border rounded-lg p-5 space-y-4">
            <legend className="text-xs font-mono uppercase tracking-widest text-[#F5A623] px-1 -ml-1">Cost &amp; Procurement</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={vaultLabelClass}>Total Cost ($)</label><VaultInput name="purchasePrice" type="number" min={0} step="0.01" /></div>
              <div><label className={vaultLabelClass}>Vendor</label><VaultInput name="vendor" /></div>
            </div>
          </fieldset>

          <fieldset className="bg-vault-surface border border-vault-border rounded-lg p-5 space-y-4">
            <legend className="text-xs font-mono uppercase tracking-widest text-[#F5A623] px-1 -ml-1">Usage &amp; Load Reference</legend>
            <div>
              <label className={vaultLabelClass}>Intended Calibers / Cartridges</label>
              <VaultInput name="intendedCalibersOrCartridges" list="bullet-usage-caliber-options" placeholder="comma-separated" />
              <datalist id="bullet-usage-caliber-options">{COMMON_CALIBERS.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={vaultLabelClass}>Recommended COAL (in)</label><VaultInput name="recommendedCoalIn" type="number" min={0} step="0.001" /></div>
              <div><label className={vaultLabelClass}>Recommended Jump (in)</label><VaultInput name="recommendedHundredthsJump" type="number" min={0} step="0.001" /></div>
            </div>
            <div><label className={vaultLabelClass}>Compatible Powders</label><VaultInput name="compatiblePowders" placeholder="comma-separated" /></div>
            <div><label className={vaultLabelClass}>Load Data Reference</label><VaultInput name="loadDataReference" /></div>
            <div><label className={vaultLabelClass}>Notes</label><VaultTextArea name="notes" rows={3} /></div>
            <div><label className={vaultLabelClass}>Reorder Alert</label><VaultInput name="reorderThreshold" type="number" min={0} placeholder="e.g. 100" /></div>
          </fieldset>

          <div className="flex gap-3 justify-end">
            <Link href="/reloading/bullet" className="px-4 py-2 rounded-md text-sm border border-vault-border text-vault-text-muted hover:text-vault-text transition-colors">Cancel</Link>
            <button type="submit" disabled={loading} className="flex items-center gap-2 bg-[#00C2FF]/10 border border-[#00C2FF]/30 text-[#00C2FF] hover:bg-[#00C2FF]/20 px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Create Bullet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
