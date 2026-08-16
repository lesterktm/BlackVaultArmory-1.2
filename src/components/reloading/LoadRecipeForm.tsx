"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { COMMON_CALIBERS } from "@/lib/types";
import { VaultInput, VaultSelect, VaultTextArea, vaultLabelClass } from "@/components/shared/ui-primitives";
import { ArrowLeft, Save, Plus, Loader2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

interface InventoryOption {
  id: string;
  label: string;
}

export interface RecipeFormValues {
  id?: string;
  recipeName: string;
  caliberCartridge: string;
  status: string;
  intendedUse: string[];
  isFavorite: boolean;
  notes: string;
  bulletId: string | null;
  powderId: string | null;
  chargeWeightGrains: number | null;
  primerId: string | null;
  brassId: string | null;
  brassFireCount: number | null;
  coalIn: number | null;
  cbtoIn: number | null;
  jumpToLandsIn: number | null;
  crimpType: string;
  crimpAmountIn: number | null;
  publishedChargeMinGrains: number | null;
  publishedChargeMaxGrains: number | null;
  publishedVelocityFps: number | null;
  expectedVelocityFps: number | null;
  publishedPressurePsi: number | null;
  publishedPressureCup: number | null;
  publishedBarrelLengthIn: number | null;
  loadDataSource: string;
  primerAppearance: string;
  ejectorMarks: string;
  extractionDifficulty: string;
  caseHeadExpansionIn: number | null;
  pressureAssessment: string;
  pressureNotes: string;
}

export const EMPTY_RECIPE_VALUES: RecipeFormValues = {
  recipeName: "", caliberCartridge: "", status: "Development", intendedUse: [], isFavorite: false, notes: "",
  bulletId: null, powderId: null, chargeWeightGrains: null, primerId: null, brassId: null, brassFireCount: null,
  coalIn: null, cbtoIn: null, jumpToLandsIn: null, crimpType: "", crimpAmountIn: null,
  publishedChargeMinGrains: null, publishedChargeMaxGrains: null, publishedVelocityFps: null, expectedVelocityFps: null,
  publishedPressurePsi: null, publishedPressureCup: null, publishedBarrelLengthIn: null, loadDataSource: "",
  primerAppearance: "", ejectorMarks: "", extractionDifficulty: "", caseHeadExpansionIn: null,
  pressureAssessment: "", pressureNotes: "",
};

const STATUSES = ["Development", "Working / Proven", "Retired"];
const INTENDED_USES = ["Target / Match", "Hunting", "Self-Defense", "Plinking", "Long Range", "Varmint"];
const CRIMP_TYPES = ["None", "Taper Crimp", "Roll Crimp"];
const PRIMER_APPEARANCES = ["Normal", "Slight Cratering", "Cratered", "Flattened", "Pierced"];
const EJECTOR_MARKS = ["None", "Light", "Moderate", "Heavy"];
const EXTRACTION_DIFFICULTIES = ["Normal", "Slightly Stiff", "Very Stiff", "Stuck"];
const PRESSURE_ASSESSMENTS = ["Safe - Mild", "Safe - Moderate", "Safe - Near Max", "UNSAFE - Over Max"];

export function LoadRecipeForm({ mode, initial }: { mode: "create" | "edit"; initial?: RecipeFormValues }) {
  const router = useRouter();
  const [values, setValues] = useState<RecipeFormValues>(initial ?? EMPTY_RECIPE_VALUES);
  const [bullets, setBullets] = useState<InventoryOption[]>([]);
  const [powders, setPowders] = useState<InventoryOption[]>([]);
  const [primers, setPrimers] = useState<InventoryOption[]>([]);
  const [brassLots, setBrassLots] = useState<InventoryOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [overrideMaxCharge, setOverrideMaxCharge] = useState(false);
  const [needsOverride, setNeedsOverride] = useState(false);

  useEffect(() => {
    let isMounted = true;
    void Promise.all([
      fetch("/api/reloading/bullet").then((r) => r.json()),
      fetch("/api/reloading/powder").then((r) => r.json()),
      fetch("/api/reloading/primer").then((r) => r.json()),
      fetch("/api/reloading/brass").then((r) => r.json()),
    ]).then(([b, p, pr, br]) => {
      if (!isMounted) return;
      setBullets((b.bullets ?? []).map((x: { id: string; manufacturer: string; productName: string }) => ({ id: x.id, label: `${x.manufacturer} ${x.productName}` })));
      setPowders((p.powders ?? []).map((x: { id: string; manufacturer: string; productName: string }) => ({ id: x.id, label: `${x.manufacturer} ${x.productName}` })));
      setPrimers((pr.primers ?? []).map((x: { id: string; manufacturer: string; productName: string }) => ({ id: x.id, label: `${x.manufacturer} ${x.productName}` })));
      setBrassLots((br.brass ?? []).map((x: { id: string; caliber: string; manufacturer: string | null; headstamp: string | null }) => ({ id: x.id, label: `${x.caliber} — ${x.manufacturer ?? x.headstamp ?? "unknown"}` })));
    });
    return () => { isMounted = false; };
  }, []);

  function set<K extends keyof RecipeFormValues>(key: K, val: RecipeFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  function toggleUse(use: string) {
    setValues((prev) => ({ ...prev, intendedUse: prev.intendedUse.includes(use) ? prev.intendedUse.filter((u) => u !== use) : [...prev.intendedUse, use] }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const fieldErrors: Record<string, string> = {};
    if (!values.recipeName.trim()) fieldErrors.recipeName = "Name is required";
    if (!values.caliberCartridge.trim()) fieldErrors.caliberCartridge = "Caliber/cartridge is required";
    if (values.chargeWeightGrains == null || values.chargeWeightGrains <= 0) fieldErrors.chargeWeightGrains = "Charge weight is required";
    if (values.coalIn == null || values.coalIn <= 0) fieldErrors.coalIn = "COAL is required";
    if (Object.keys(fieldErrors).length > 0) { setFormErrors(fieldErrors); return; }
    setFormErrors({});
    setLoading(true);

    const url = mode === "create" ? "/api/reloading/recipes" : `/api/reloading/recipes/${values.id}`;
    const method = mode === "create" ? "POST" : "PUT";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, intendedUse: values.intendedUse.length ? values.intendedUse.join(",") : null, overrideMaxCharge }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.requiresOverride) {
          setNeedsOverride(true);
          setError(json.error ?? "Charge weight exceeds published max — confirm the override to proceed.");
        } else {
          setError(json.error ?? "Failed to save recipe");
        }
        setLoading(false);
        return;
      }
      router.push("/reloading/recipes");
    } catch {
      setError("Failed to save recipe");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full">
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 px-4 sm:px-6 py-4 border-b border-vault-border">
        <Link href="/reloading/recipes" className="flex items-center gap-1.5 text-vault-text-muted hover:text-vault-text text-sm transition-colors"><ArrowLeft className="w-4 h-4" />Back to Recipes</Link>
        <span className="text-vault-border">/</span>
        <h1 className="text-sm font-semibold text-vault-text tracking-wide uppercase">{mode === "create" ? "New Recipe" : "Edit Recipe"}</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-vault-text mb-1">{mode === "create" ? "New Load Recipe" : "Edit Load Recipe"}</h2>
          <p className="text-sm text-vault-text-muted">Link inventory components for automatic consumption tracking, or leave slots unlinked for reference-only recipes.</p>
        </div>

        {error && (
          <div className="flex items-start gap-3 bg-[#E53935]/10 border border-[#E53935]/30 rounded-lg px-4 py-3 mb-6">
            <AlertCircle className="w-4 h-4 text-[#E53935] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-[#E53935]">{error}</p>
              {needsOverride && (
                <label className="flex items-center gap-2 text-xs text-[#E53935] mt-2">
                  <input type="checkbox" checked={overrideMaxCharge} onChange={(e) => setOverrideMaxCharge(e.target.checked)} className="accent-[#E53935]" />
                  I acknowledge this charge exceeds the published max and want to proceed anyway
                </label>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <fieldset className="bg-vault-surface border border-vault-border rounded-lg p-5 space-y-4">
            <legend className="text-xs font-mono uppercase tracking-widest text-[#F5A623] px-1 -ml-1">Identity &amp; Status</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={vaultLabelClass}>Recipe Name <span className="text-[#E53935]">*</span></label>
                <VaultInput value={values.recipeName} onChange={(e) => set("recipeName", e.target.value)} placeholder='e.g. "6.5CM 140gr Berger VLD Match - H4350"' />
                {formErrors.recipeName && <p className="text-xs mt-1" style={{ color: "#E53935" }}>{formErrors.recipeName}</p>}
              </div>
              <div>
                <label className={vaultLabelClass}>Caliber / Cartridge <span className="text-[#E53935]">*</span></label>
                <VaultInput value={values.caliberCartridge} onChange={(e) => set("caliberCartridge", e.target.value)} list="recipe-caliber-options" placeholder="e.g. 6.5 Creedmoor" />
                <datalist id="recipe-caliber-options">{COMMON_CALIBERS.map((c) => <option key={c} value={c} />)}</datalist>
                {formErrors.caliberCartridge && <p className="text-xs mt-1" style={{ color: "#E53935" }}>{formErrors.caliberCartridge}</p>}
              </div>
            </div>
            <div>
              <label className={vaultLabelClass}>Status</label>
              <VaultSelect value={values.status} onChange={(e) => set("status", e.target.value)}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</VaultSelect>
            </div>
            <div>
              <label className={vaultLabelClass}>Intended Use</label>
              <div className="flex flex-wrap gap-2">
                {INTENDED_USES.map((u) => (
                  <button key={u} type="button" onClick={() => toggleUse(u)} className={`text-[10px] px-2 py-1 rounded border transition-colors ${values.intendedUse.includes(u) ? "bg-[#00C2FF]/10 border-[#00C2FF]/40 text-[#00C2FF]" : "border-vault-border text-vault-text-muted hover:text-vault-text"}`}>{u}</button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs text-vault-text-muted"><input type="checkbox" checked={values.isFavorite} onChange={(e) => set("isFavorite", e.target.checked)} className="accent-[#00C2FF]" />Favorite</label>
            <div><label className={vaultLabelClass}>Notes</label><VaultTextArea rows={2} value={values.notes} onChange={(e) => set("notes", e.target.value)} /></div>
          </fieldset>

          <fieldset className="bg-vault-surface border border-vault-border rounded-lg p-5 space-y-4">
            <legend className="text-xs font-mono uppercase tracking-widest text-[#F5A623] px-1 -ml-1">Components</legend>
            <div>
              <label className={vaultLabelClass}>Bullet</label>
              <VaultSelect value={values.bulletId ?? ""} onChange={(e) => set("bulletId", e.target.value || null)}>
                <option value="">Not linked</option>
                {bullets.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </VaultSelect>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={vaultLabelClass}>Powder</label>
                <VaultSelect value={values.powderId ?? ""} onChange={(e) => set("powderId", e.target.value || null)}>
                  <option value="">Not linked</option>
                  {powders.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </VaultSelect>
              </div>
              <div>
                <label className={vaultLabelClass}>Charge Weight (gr) <span className="text-[#E53935]">*</span></label>
                <VaultInput type="number" min={0} step="0.1" value={values.chargeWeightGrains ?? ""} onChange={(e) => set("chargeWeightGrains", e.target.value ? Number(e.target.value) : null)} />
                {formErrors.chargeWeightGrains && <p className="text-xs mt-1" style={{ color: "#E53935" }}>{formErrors.chargeWeightGrains}</p>}
              </div>
            </div>
            <div>
              <label className={vaultLabelClass}>Primer</label>
              <VaultSelect value={values.primerId ?? ""} onChange={(e) => set("primerId", e.target.value || null)}>
                <option value="">Not linked</option>
                {primers.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </VaultSelect>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={vaultLabelClass}>Brass Lot</label>
                <VaultSelect value={values.brassId ?? ""} onChange={(e) => set("brassId", e.target.value || null)}>
                  <option value="">Not linked</option>
                  {brassLots.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </VaultSelect>
              </div>
              <div><label className={vaultLabelClass}>Brass Fire Count (at dev time)</label><VaultInput type="number" min={0} value={values.brassFireCount ?? ""} onChange={(e) => set("brassFireCount", e.target.value ? Number(e.target.value) : null)} /></div>
            </div>
          </fieldset>

          <div className="bg-vault-surface border border-vault-border rounded-lg overflow-hidden">
            <button type="button" onClick={() => setAdvancedOpen((o) => !o)} className="w-full flex items-center justify-between px-5 py-3 text-left">
              <span className="text-xs font-mono uppercase tracking-widest text-[#F5A623]">Advanced / Precision — Cartridge Dims, Published Data &amp; Pressure Signs</span>
              {advancedOpen ? <ChevronUp className="w-4 h-4 text-vault-text-faint" /> : <ChevronDown className="w-4 h-4 text-vault-text-faint" />}
            </button>
            {advancedOpen && (
              <div className="px-5 pb-5 space-y-6 border-t border-vault-border pt-4">
                <div className="space-y-3">
                  <p className="text-[10px] uppercase tracking-widest text-vault-text-faint">Cartridge Dimensions</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={vaultLabelClass}>COAL (in) <span className="text-[#E53935]">*</span></label>
                      <VaultInput type="number" min={0} step="0.001" value={values.coalIn ?? ""} onChange={(e) => set("coalIn", e.target.value ? Number(e.target.value) : null)} />
                      {formErrors.coalIn && <p className="text-xs mt-1" style={{ color: "#E53935" }}>{formErrors.coalIn}</p>}
                    </div>
                    <div><label className={vaultLabelClass}>CBTO (in)</label><VaultInput type="number" min={0} step="0.001" value={values.cbtoIn ?? ""} onChange={(e) => set("cbtoIn", e.target.value ? Number(e.target.value) : null)} /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className={vaultLabelClass}>Jump to Lands (in)</label><VaultInput type="number" step="0.001" value={values.jumpToLandsIn ?? ""} onChange={(e) => set("jumpToLandsIn", e.target.value ? Number(e.target.value) : null)} /></div>
                    <div><label className={vaultLabelClass}>Crimp Type</label><VaultSelect value={values.crimpType} onChange={(e) => set("crimpType", e.target.value)}><option value="">Not set</option>{CRIMP_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}</VaultSelect></div>
                  </div>
                  {values.crimpType && values.crimpType !== "None" && (
                    <div><label className={vaultLabelClass}>Crimp Amount (in)</label><VaultInput type="number" min={0} step="0.001" value={values.crimpAmountIn ?? ""} onChange={(e) => set("crimpAmountIn", e.target.value ? Number(e.target.value) : null)} /></div>
                  )}
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] uppercase tracking-widest text-vault-text-faint">Published / Reference Load Data</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className={vaultLabelClass}>Published Charge Min (gr)</label><VaultInput type="number" min={0} step="0.1" value={values.publishedChargeMinGrains ?? ""} onChange={(e) => set("publishedChargeMinGrains", e.target.value ? Number(e.target.value) : null)} /></div>
                    <div><label className={vaultLabelClass}>Published Charge Max (gr)</label><VaultInput type="number" min={0} step="0.1" value={values.publishedChargeMaxGrains ?? ""} onChange={(e) => set("publishedChargeMaxGrains", e.target.value ? Number(e.target.value) : null)} /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className={vaultLabelClass}>Published Velocity (fps)</label><VaultInput type="number" min={0} value={values.publishedVelocityFps ?? ""} onChange={(e) => set("publishedVelocityFps", e.target.value ? Number(e.target.value) : null)} /></div>
                    <div><label className={vaultLabelClass}>Expected Velocity (fps)</label><VaultInput type="number" min={0} value={values.expectedVelocityFps ?? ""} onChange={(e) => set("expectedVelocityFps", e.target.value ? Number(e.target.value) : null)} /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className={vaultLabelClass}>Published Pressure (PSI)</label><VaultInput type="number" min={0} value={values.publishedPressurePsi ?? ""} onChange={(e) => set("publishedPressurePsi", e.target.value ? Number(e.target.value) : null)} /></div>
                    <div><label className={vaultLabelClass}>Published Pressure (CUP)</label><VaultInput type="number" min={0} value={values.publishedPressureCup ?? ""} onChange={(e) => set("publishedPressureCup", e.target.value ? Number(e.target.value) : null)} /></div>
                  </div>
                  <div><label className={vaultLabelClass}>Published Barrel Length (in)</label><VaultInput type="number" min={0} step="0.1" value={values.publishedBarrelLengthIn ?? ""} onChange={(e) => set("publishedBarrelLengthIn", e.target.value ? Number(e.target.value) : null)} /></div>
                  <div><label className={vaultLabelClass}>Load Data Source</label><VaultInput value={values.loadDataSource} onChange={(e) => set("loadDataSource", e.target.value)} placeholder='e.g. "Hornady 10th Edition p.388"' /></div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] uppercase tracking-widest text-vault-text-faint">Pressure Indicators</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className={vaultLabelClass}>Primer Appearance</label><VaultSelect value={values.primerAppearance} onChange={(e) => set("primerAppearance", e.target.value)}><option value="">Not set</option>{PRIMER_APPEARANCES.map((p) => <option key={p} value={p}>{p}</option>)}</VaultSelect></div>
                    <div><label className={vaultLabelClass}>Ejector Marks</label><VaultSelect value={values.ejectorMarks} onChange={(e) => set("ejectorMarks", e.target.value)}><option value="">Not set</option>{EJECTOR_MARKS.map((p) => <option key={p} value={p}>{p}</option>)}</VaultSelect></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className={vaultLabelClass}>Extraction Difficulty</label><VaultSelect value={values.extractionDifficulty} onChange={(e) => set("extractionDifficulty", e.target.value)}><option value="">Not set</option>{EXTRACTION_DIFFICULTIES.map((p) => <option key={p} value={p}>{p}</option>)}</VaultSelect></div>
                    <div><label className={vaultLabelClass}>Case Head Expansion (in)</label><VaultInput type="number" min={0} step="0.0001" value={values.caseHeadExpansionIn ?? ""} onChange={(e) => set("caseHeadExpansionIn", e.target.value ? Number(e.target.value) : null)} /></div>
                  </div>
                  <div>
                    <label className={vaultLabelClass}>Pressure Assessment</label>
                    <VaultSelect value={values.pressureAssessment} onChange={(e) => set("pressureAssessment", e.target.value)}>
                      <option value="">Not set</option>
                      {PRESSURE_ASSESSMENTS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </VaultSelect>
                    {values.pressureAssessment === "UNSAFE - Over Max" && (
                      <p className="text-xs text-[#E53935] mt-1">This blocks the recipe from being set to &quot;Working / Proven&quot;.</p>
                    )}
                  </div>
                  <div><label className={vaultLabelClass}>Pressure Notes</label><VaultTextArea rows={2} value={values.pressureNotes} onChange={(e) => set("pressureNotes", e.target.value)} /></div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <Link href="/reloading/recipes" className="px-4 py-2 rounded-md text-sm border border-vault-border text-vault-text-muted hover:text-vault-text transition-colors">Cancel</Link>
            <button type="submit" disabled={loading} className="flex items-center gap-2 bg-[#00C2FF]/10 border border-[#00C2FF]/30 text-[#00C2FF] hover:bg-[#00C2FF]/20 px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === "create" ? <Plus className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {mode === "create" ? "Create Recipe" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
