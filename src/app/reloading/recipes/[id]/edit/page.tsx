"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { LoadRecipeForm, type RecipeFormValues } from "@/components/reloading/LoadRecipeForm";

export default function EditRecipePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [values, setValues] = useState<RecipeFormValues | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    void fetch(`/api/reloading/recipes/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.error) { setError(data.error); return; }
        setValues({
          id: data.id,
          recipeName: data.recipeName,
          caliberCartridge: data.caliberCartridge,
          status: data.status,
          intendedUse: data.intendedUse ? data.intendedUse.split(",") : [],
          isFavorite: data.isFavorite,
          notes: data.notes ?? "",
          bulletId: data.bulletId,
          powderId: data.powderId,
          chargeWeightGrains: data.chargeWeightGrains,
          primerId: data.primerId,
          brassId: data.brassId,
          brassFireCount: data.brassFireCount,
          coalIn: data.coalIn,
          cbtoIn: data.cbtoIn,
          jumpToLandsIn: data.jumpToLandsIn,
          crimpType: data.crimpType ?? "",
          crimpAmountIn: data.crimpAmountIn,
          publishedChargeMinGrains: data.publishedChargeMinGrains,
          publishedChargeMaxGrains: data.publishedChargeMaxGrains,
          publishedVelocityFps: data.publishedVelocityFps,
          expectedVelocityFps: data.expectedVelocityFps,
          publishedPressurePsi: data.publishedPressurePsi,
          publishedPressureCup: data.publishedPressureCup,
          publishedBarrelLengthIn: data.publishedBarrelLengthIn,
          loadDataSource: data.loadDataSource ?? "",
          primerAppearance: data.primerAppearance ?? "",
          ejectorMarks: data.ejectorMarks ?? "",
          extractionDifficulty: data.extractionDifficulty ?? "",
          caseHeadExpansionIn: data.caseHeadExpansionIn,
          pressureAssessment: data.pressureAssessment ?? "",
          pressureNotes: data.pressureNotes ?? "",
        });
      })
      .catch(() => { if (isMounted) setError("Failed to load recipe"); });
    return () => { isMounted = false; };
  }, [id]);

  if (error) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center gap-4 p-6">
        <div className="flex items-center gap-2 text-[#E53935]"><AlertCircle className="w-5 h-5" /><p className="text-sm">{error}</p></div>
        <Link href="/reloading/recipes" className="flex items-center gap-1.5 text-vault-text-muted hover:text-vault-text text-sm transition-colors"><ArrowLeft className="w-4 h-4" />Back to Recipes</Link>
      </div>
    );
  }

  if (!values) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 text-[#00C2FF] animate-spin" /></div>;
  }

  return <LoadRecipeForm mode="edit" initial={values} />;
}
