"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatNumber } from "@/lib/utils";
import { BookOpen, Plus, Loader2, Pencil, Trash2, Crosshair, Copy, Timer, Star, AlertTriangle } from "lucide-react";

interface RecipeComponentRef { id: string; name?: string; productName?: string; manufacturer?: string }

interface Recipe {
  id: string;
  recipeName: string;
  caliberCartridge: string;
  status: string;
  isFavorite: boolean;
  bullet: RecipeComponentRef | null;
  bulletWeightGrains: number | null;
  powder: RecipeComponentRef | null;
  chargeWeightGrains: number;
  primer: RecipeComponentRef | null;
  brass: RecipeComponentRef | null;
  coalIn: number;
  pressureAssessment: string | null;
  isAtOrNearMaxCharge: boolean | null;
  _count: { batches: number; chronographSessions: number };
}

const STATUS_STYLES: Record<string, string> = {
  Development: "text-vault-text-muted border-vault-border",
  "Working / Proven": "text-[#00C853] border-[#00C853]/30 bg-[#00C853]/10",
  Retired: "text-vault-text-faint border-vault-border",
};

function componentLabel(c: RecipeComponentRef | null): string {
  if (!c) return "—";
  return c.productName ? `${c.manufacturer ?? ""} ${c.productName}`.trim() : "linked";
}

export default function ReloadingRecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<Recipe | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [cloning, setCloning] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    void fetch("/api/reloading/recipes").then((r) => r.json()).then((data) => {
      if (isMounted) setRecipes(Array.isArray(data.recipes) ? data.recipes : []);
    }).finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, []);

  async function confirmDelete() {
    if (!deleteConfirm) return;
    setDeleting(true);
    const res = await fetch(`/api/reloading/recipes/${deleteConfirm.id}`, { method: "DELETE" });
    if (res.ok) { setRecipes((prev) => prev.filter((r) => r.id !== deleteConfirm.id)); setDeleteConfirm(null); }
    setDeleting(false);
  }

  async function cloneRecipe(recipe: Recipe) {
    setCloning(recipe.id);
    const full = await fetch(`/api/reloading/recipes/${recipe.id}`).then((r) => r.json());
    const clonePayload = {
      ...full,
      recipeName: `${full.recipeName} (Copy)`,
      status: "Development",
      isFavorite: false,
    };
    delete clonePayload.id;
    delete clonePayload.createdAt;
    delete clonePayload.updatedAt;
    delete clonePayload._count;
    delete clonePayload.bullet;
    delete clonePayload.powder;
    delete clonePayload.primer;
    delete clonePayload.brass;
    delete clonePayload.isAtOrNearMaxCharge;

    const res = await fetch("/api/reloading/recipes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(clonePayload) });
    const json = await res.json();
    if (res.ok) setRecipes((prev) => [...prev, json]);
    setCloning(null);
  }

  return (
    <div className="min-h-full">
      <PageHeader title="LOAD RECIPES" subtitle="Formulas linking your component inventory to a finished round" actions={
        <Link href="/reloading/recipes/new" className="flex items-center gap-2 bg-[#00C2FF]/10 border border-[#00C2FF]/30 text-[#00C2FF] hover:bg-[#00C2FF]/20 px-3 py-1.5 rounded text-sm font-medium transition-colors"><Plus className="w-4 h-4" />New Recipe</Link>
      } />

      <div className="p-4 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 text-[#00C2FF] animate-spin" /></div>
        ) : recipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-[#F5A623]/10 border border-[#F5A623]/20 flex items-center justify-center mb-4"><BookOpen className="w-8 h-8 text-[#F5A623]" /></div>
            <h3 className="text-lg font-semibold text-vault-text mb-2">No recipes yet</h3>
            <p className="text-sm text-vault-text-muted mb-6 max-w-sm">Create a load recipe to start logging batches and chronograph sessions.</p>
            <Link href="/reloading/recipes/new" className="flex items-center gap-2 bg-[#00C2FF]/10 border border-[#00C2FF]/30 text-[#00C2FF] hover:bg-[#00C2FF]/20 px-4 py-2 rounded text-sm font-medium transition-colors"><Plus className="w-4 h-4" />Create First Recipe</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {recipes.map((recipe) => (
              <div key={recipe.id} className="bg-vault-surface border border-vault-border rounded-lg p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      {recipe.isFavorite && <Star className="w-3 h-3 text-[#F5A623] fill-[#F5A623] shrink-0" />}
                      <p className="text-sm font-bold text-vault-text truncate">{recipe.recipeName}</p>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5"><Crosshair className="w-3 h-3 text-vault-text-faint" /><p className="text-xs text-vault-text-faint font-mono">{recipe.caliberCartridge}</p></div>
                  </div>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${STATUS_STYLES[recipe.status] ?? STATUS_STYLES.Development}`}>{recipe.status}</span>
                </div>

                {(recipe.isAtOrNearMaxCharge || recipe.pressureAssessment === "UNSAFE - Over Max") && (
                  <div className="flex items-center gap-1.5 text-[10px] text-[#E53935]"><AlertTriangle className="w-3 h-3" />
                    {recipe.pressureAssessment === "UNSAFE - Over Max" ? "Unsafe pressure signs observed" : "Near/at published max charge"}
                  </div>
                )}

                <div className="text-xs text-vault-text-muted space-y-1">
                  <p><span className="text-vault-text-faint">Bullet:</span> {componentLabel(recipe.bullet)}{recipe.bulletWeightGrains ? ` (${recipe.bulletWeightGrains}gr)` : ""}</p>
                  <p><span className="text-vault-text-faint">Powder:</span> {componentLabel(recipe.powder)} · {formatNumber(recipe.chargeWeightGrains)}gr</p>
                  <p><span className="text-vault-text-faint">Primer:</span> {componentLabel(recipe.primer)}</p>
                  <p><span className="text-vault-text-faint">Brass:</span> {recipe.brass ? recipe.brass.manufacturer ?? "linked" : "—"}</p>
                  <p><span className="text-vault-text-faint">COAL:</span> {recipe.coalIn}&quot;</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-vault-border">
                  <div className="flex items-center gap-2 text-[10px] text-vault-text-faint">
                    <span>{recipe._count.batches} batch{recipe._count.batches !== 1 ? "es" : ""}</span>
                    <span>·</span>
                    <Link href={`/reloading/recipes/${recipe.id}/chronograph`} className="flex items-center gap-1 hover:text-[#00C2FF] transition-colors"><Timer className="w-3 h-3" />{recipe._count.chronographSessions} session{recipe._count.chronographSessions !== 1 ? "s" : ""}</Link>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => cloneRecipe(recipe)} disabled={cloning === recipe.id} className="p-1.5 rounded text-vault-text-faint hover:text-[#00C2FF] hover:bg-[#00C2FF]/10 transition-colors" title="Clone Recipe">
                      {cloning === recipe.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <Link href={`/reloading/recipes/${recipe.id}/edit`} className="flex items-center gap-1 text-[10px] bg-vault-surface border border-vault-border text-vault-text-muted hover:text-[#00C2FF] hover:border-[#00C2FF]/40 px-2 py-1 rounded transition-colors"><Pencil className="w-2.5 h-2.5" />Edit</Link>
                    <button onClick={() => setDeleteConfirm(recipe)} className="p-1.5 rounded text-vault-text-faint hover:text-[#E53935] hover:bg-[#E53935]/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-vault-bg/80 backdrop-blur-sm">
          <div className="bg-vault-surface border border-vault-border rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-sm font-semibold text-vault-text mb-2">Delete Recipe?</h3>
            <p className="text-xs text-vault-text-muted mb-1"><span className="text-vault-text font-medium">{deleteConfirm.recipeName}</span></p>
            <p className="text-xs text-vault-text-muted mb-4">
              {deleteConfirm._count.batches > 0 || deleteConfirm._count.chronographSessions > 0
                ? `This will also delete ${deleteConfirm._count.batches} batch${deleteConfirm._count.batches !== 1 ? "es" : ""} and ${deleteConfirm._count.chronographSessions} chronograph session${deleteConfirm._count.chronographSessions !== 1 ? "s" : ""}.`
                : "This recipe has no logged batches or chronograph sessions."}
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteConfirm(null)} disabled={deleting} className="px-3 py-1.5 text-xs rounded border border-vault-border text-vault-text-muted hover:text-vault-text transition-colors">Cancel</button>
              <button onClick={confirmDelete} disabled={deleting} className="px-3 py-1.5 text-xs rounded bg-[#E53935]/10 border border-[#E53935]/30 text-[#E53935] hover:bg-[#E53935]/20 transition-colors disabled:opacity-50">{deleting ? "Deleting..." : "Delete Recipe"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
