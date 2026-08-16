"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { COMMON_CALIBERS } from "@/lib/types";
import { VaultInput, VaultSelect, VaultTextArea, vaultLabelClass } from "@/components/shared/ui-primitives";
import { ArrowLeft, Plus, Loader2, AlertCircle } from "lucide-react";

const POWDER_TYPES = ["Smokeless - Single Base", "Smokeless - Double Base", "Black Powder", "Black Powder Substitute"];
const BURN_RATE_CATEGORIES = ["Fast", "Medium-Fast", "Medium", "Medium-Slow", "Slow", "Very Slow"];
const GRANULE_SHAPES = ["Ball/Spherical", "Extruded/Stick", "Flake"];
const CONTAINER_SIZES = ["1 lb", "4 lb", "8 lb", "Other"];
const CONDITIONS = ["New/Sealed", "Open - Good", "Open - Degraded", "Unknown"];

export default function NewPowderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCost, setTotalCost] = useState("");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [quantityValue, setQuantityValue] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const data = new FormData(e.currentTarget);

    const payload = {
      manufacturer: data.get("manufacturer") as string,
      productName: data.get("productName") as string,
      powderType: data.get("powderType") as string,
      burnRateCategory: (data.get("burnRateCategory") as string) || null,
      burnRateNumber: data.get("burnRateNumber") ? Number(data.get("burnRateNumber")) : null,
      granuleShape: (data.get("granuleShape") as string) || null,
      color: (data.get("color") as string) || null,
      quantityOnHandGrains: Number(quantityValue) || 0,
      numberOfContainers: data.get("numberOfContainers") ? Number(data.get("numberOfContainers")) : null,
      containerSizeLbs: (data.get("containerSizeLbs") as string) || null,
      lotNumber: (data.get("lotNumber") as string) || null,
      dateAcquired: (data.get("dateAcquired") as string) || null,
      storageLocation: (data.get("storageLocation") as string) || null,
      condition: (data.get("condition") as string) || null,
      purchasePrice: totalCost ? Number(totalCost) : null,
      hazmatFeePaid: data.get("hazmatFeePaid") === "on",
      vendor: (data.get("vendor") as string) || null,
      intendedCalibersOrApplications: (data.get("intendedCalibersOrApplications") as string) || null,
      compatibleBulletWeightMin: data.get("compatibleBulletWeightMin") ? Number(data.get("compatibleBulletWeightMin")) : null,
      compatibleBulletWeightMax: data.get("compatibleBulletWeightMax") ? Number(data.get("compatibleBulletWeightMax")) : null,
      typicalChargeMin: data.get("typicalChargeMin") ? Number(data.get("typicalChargeMin")) : null,
      typicalChargeMax: data.get("typicalChargeMax") ? Number(data.get("typicalChargeMax")) : null,
      loadDataReference: (data.get("loadDataReference") as string) || null,
      notes: (data.get("notes") as string) || null,
      maxStorageQuantityLbs: data.get("maxStorageQuantityLbs") ? Number(data.get("maxStorageQuantityLbs")) : null,
      hazardClassification: (data.get("hazardClassification") as string) || null,
      reorderThreshold: data.get("reorderThreshold") ? Number(data.get("reorderThreshold")) : null,
    };

    if (!payload.manufacturer?.trim() || !payload.productName?.trim() || !payload.powderType) {
      setError("Manufacturer, product name, and powder type are required.");
      setLoading(false);
      return;
    }
    if (payload.typicalChargeMin != null && payload.typicalChargeMax != null && payload.typicalChargeMin > payload.typicalChargeMax) {
      setError("Typical charge min must be <= max.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/reloading/powder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to create"); setLoading(false); return; }
      router.push("/reloading/powder");
    } catch {
      setError("Failed to create powder entry");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full">
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 px-4 sm:px-6 py-4 border-b border-vault-border">
        <Link href="/reloading/powder" className="flex items-center gap-1.5 text-vault-text-muted hover:text-vault-text text-sm transition-colors"><ArrowLeft className="w-4 h-4" />Back to Powder</Link>
        <span className="text-vault-border">/</span>
        <h1 className="text-sm font-semibold text-vault-text tracking-wide uppercase">Add Powder</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-8"><h2 className="text-xl font-bold text-vault-text mb-1">New Powder</h2><p className="text-sm text-vault-text-muted">Track a powder lot in your reloading inventory.</p></div>
        {error && <div className="flex items-center gap-3 bg-[#E53935]/10 border border-[#E53935]/30 rounded-lg px-4 py-3 mb-6"><AlertCircle className="w-4 h-4 text-[#E53935] shrink-0" /><p className="text-sm text-[#E53935]">{error}</p></div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <fieldset className="bg-vault-surface border border-vault-border rounded-lg p-5 space-y-4">
            <legend className="text-xs font-mono uppercase tracking-widest text-[#F5A623] px-1 -ml-1">Identity &amp; Classification</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={vaultLabelClass}>Manufacturer <span className="text-[#E53935]">*</span></label><VaultInput name="manufacturer" required placeholder="e.g. Hodgdon" /></div>
              <div><label className={vaultLabelClass}>Product Name <span className="text-[#E53935]">*</span></label><VaultInput name="productName" required placeholder="e.g. H4350" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={vaultLabelClass}>Powder Type <span className="text-[#E53935]">*</span></label>
                <VaultSelect name="powderType" required defaultValue="">
                  <option value="" disabled>Select type...</option>
                  {POWDER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </VaultSelect>
              </div>
              <div>
                <label className={vaultLabelClass}>Burn Rate Category</label>
                <VaultSelect name="burnRateCategory" defaultValue="">
                  <option value="">Not set</option>
                  {BURN_RATE_CATEGORIES.map((t) => <option key={t} value={t}>{t}</option>)}
                </VaultSelect>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div><label className={vaultLabelClass}>Burn Rate Number</label><VaultInput name="burnRateNumber" type="number" min={1} /></div>
              <div>
                <label className={vaultLabelClass}>Granule Shape</label>
                <VaultSelect name="granuleShape" defaultValue="">
                  <option value="">Not set</option>
                  {GRANULE_SHAPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </VaultSelect>
              </div>
              <div><label className={vaultLabelClass}>Color</label><VaultInput name="color" placeholder="e.g. gray" /></div>
            </div>
          </fieldset>

          <fieldset className="bg-vault-surface border border-vault-border rounded-lg p-5 space-y-4">
            <legend className="text-xs font-mono uppercase tracking-widest text-[#F5A623] px-1 -ml-1">Inventory &amp; Storage</legend>
            <div>
              <label className={vaultLabelClass}>Quantity On Hand (grains)</label>
              <VaultInput type="number" min={0} step="0.1" value={quantityValue} onChange={(e) => {
                const val = e.target.value; setQuantityValue(val);
                const q = Number.parseFloat(val);
                if (Number.isFinite(q) && q > 0 && pricePerUnit) setTotalCost(((Number(pricePerUnit) / 7000) * q).toFixed(2));
              }} placeholder="e.g. 7000 (1 lb)" />
              <p className="text-xs text-vault-text-faint mt-1">Tip: 1 lb = 7000 gr</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={vaultLabelClass}>Number of Containers</label><VaultInput name="numberOfContainers" type="number" min={0} /></div>
              <div>
                <label className={vaultLabelClass}>Container Size</label>
                <VaultSelect name="containerSizeLbs" defaultValue="">
                  <option value="">Not set</option>
                  {CONTAINER_SIZES.map((t) => <option key={t} value={t}>{t}</option>)}
                </VaultSelect>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={vaultLabelClass}>Lot Number</label><VaultInput name="lotNumber" /></div>
              <div><label className={vaultLabelClass}>Date Acquired</label><VaultInput name="dateAcquired" type="date" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={vaultLabelClass}>Storage Location</label><VaultInput name="storageLocation" /></div>
              <div>
                <label className={vaultLabelClass}>Condition</label>
                <VaultSelect name="condition" defaultValue="">
                  <option value="">Not set</option>
                  {CONDITIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </VaultSelect>
              </div>
            </div>
          </fieldset>

          <fieldset className="bg-vault-surface border border-vault-border rounded-lg p-5 space-y-4">
            <legend className="text-xs font-mono uppercase tracking-widest text-[#F5A623] px-1 -ml-1">Cost &amp; Procurement</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={vaultLabelClass}>Total Cost ($)</label>
                <VaultInput type="number" min={0} step="0.01" value={totalCost} onChange={(e) => {
                  const val = e.target.value; setTotalCost(val);
                  const q = Number.parseFloat(quantityValue);
                  if (Number.isFinite(q) && q > 0 && val) setPricePerUnit(((Number(val) / q) * 7000).toFixed(2));
                }} />
              </div>
              <div>
                <label className={vaultLabelClass}>Price / lb ($)</label>
                <VaultInput type="number" min={0} step="0.01" value={pricePerUnit} onChange={(e) => {
                  const val = e.target.value; setPricePerUnit(val);
                  const q = Number.parseFloat(quantityValue);
                  if (Number.isFinite(q) && q > 0 && val) setTotalCost(((Number(val) / 7000) * q).toFixed(2));
                }} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs text-vault-text-muted"><input type="checkbox" name="hazmatFeePaid" className="accent-[#00C2FF]" />Hazmat fee paid (included in total cost)</label>
            <div><label className={vaultLabelClass}>Vendor</label><VaultInput name="vendor" /></div>
          </fieldset>

          <fieldset className="bg-vault-surface border border-vault-border rounded-lg p-5 space-y-4">
            <legend className="text-xs font-mono uppercase tracking-widest text-[#F5A623] px-1 -ml-1">Usage Reference</legend>
            <div>
              <label className={vaultLabelClass}>Intended Calibers / Applications</label>
              <VaultInput name="intendedCalibersOrApplications" list="powder-caliber-options" placeholder="comma-separated, e.g. .308 Win, 9mm" />
              <datalist id="powder-caliber-options">{COMMON_CALIBERS.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={vaultLabelClass}>Compatible Bullet Weight Min (gr)</label><VaultInput name="compatibleBulletWeightMin" type="number" min={0} step="0.1" /></div>
              <div><label className={vaultLabelClass}>Compatible Bullet Weight Max (gr)</label><VaultInput name="compatibleBulletWeightMax" type="number" min={0} step="0.1" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={vaultLabelClass}>Typical Charge Min (gr)</label><VaultInput name="typicalChargeMin" type="number" min={0} step="0.1" /></div>
              <div><label className={vaultLabelClass}>Typical Charge Max (gr)</label><VaultInput name="typicalChargeMax" type="number" min={0} step="0.1" /></div>
            </div>
            <div><label className={vaultLabelClass}>Load Data Reference</label><VaultInput name="loadDataReference" placeholder='e.g. "Lyman 50th Edition p.212"' /></div>
            <div><label className={vaultLabelClass}>Notes</label><VaultTextArea name="notes" rows={3} /></div>
          </fieldset>

          <fieldset className="bg-vault-surface border border-vault-border rounded-lg p-5 space-y-4">
            <legend className="text-xs font-mono uppercase tracking-widest text-[#F5A623] px-1 -ml-1">Safety &amp; Regulatory</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={vaultLabelClass}>Max Storage Quantity (lb)</label><VaultInput name="maxStorageQuantityLbs" type="number" min={0} step="0.1" /></div>
              <div><label className={vaultLabelClass}>Hazard Classification</label><VaultInput name="hazardClassification" placeholder='e.g. "Division 1.3C"' /></div>
            </div>
            <div><label className={vaultLabelClass}>Reorder Alert (grains)</label><VaultInput name="reorderThreshold" type="number" min={0} placeholder="e.g. 1000" /></div>
          </fieldset>

          <div className="flex gap-3 justify-end">
            <Link href="/reloading/powder" className="px-4 py-2 rounded-md text-sm border border-vault-border text-vault-text-muted hover:text-vault-text transition-colors">Cancel</Link>
            <button type="submit" disabled={loading} className="flex items-center gap-2 bg-[#00C2FF]/10 border border-[#00C2FF]/30 text-[#00C2FF] hover:bg-[#00C2FF]/20 px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Create Powder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
