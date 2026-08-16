"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { VaultButton, VaultInput, VaultTextArea, vaultLabelClass } from "@/components/shared/ui-primitives";
import { formatDate, formatDateInput, formatNumber } from "@/lib/utils";
import { computeChronographStats } from "@/lib/reloading/chronograph-stats";
import { ArrowLeft, Plus, Loader2, AlertCircle, Trash2, Timer } from "lucide-react";

interface Session {
  id: string;
  sessionDate: string;
  sessionLabel: string | null;
  chronographModel: string | null;
  shotVelocities: number[];
  shotCount: number;
  avgVelocityFps: number | null;
  extremeSpreadFps: number | null;
  standardDeviationFps: number | null;
  velocityDeltaFps: number | null;
  groupSizeIn: number | null;
  groupSizeMoa: number | null;
  isConfirmationSession: boolean;
  sessionNotes: string | null;
}

interface RecipeSummary {
  recipeName: string;
  caliberCartridge: string;
  expectedVelocityFps: number | null;
}

function sdColor(sd: number | null): string {
  if (sd == null) return "text-vault-text-faint";
  if (sd < 10) return "text-[#00C853]";
  if (sd <= 20) return "text-[#F5A623]";
  return "text-[#E53935]";
}

function deltaColor(delta: number | null): string {
  if (delta == null) return "text-vault-text-faint";
  const abs = Math.abs(delta);
  if (abs <= 25) return "text-[#00C853]";
  if (abs <= 75) return "text-[#F5A623]";
  return "text-[#E53935]";
}

function LogSessionModal({
  recipeId, expectedVelocityFps, onClose, onSuccess,
}: { recipeId: string; expectedVelocityFps: number | null; onClose: () => void; onSuccess: (session: Session) => void }) {
  const [sessionDate, setSessionDate] = useState(formatDateInput(new Date()));
  const [sessionLabel, setSessionLabel] = useState("");
  const [chronographModel, setChronographModel] = useState("");
  const [shotInput, setShotInput] = useState("");
  const [groupSizeIn, setGroupSizeIn] = useState("");
  const [groupDistanceYards, setGroupDistanceYards] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedShots = shotInput.split(/[\s,]+/).map((s) => Number.parseFloat(s)).filter((n) => Number.isFinite(n) && n > 0);
  const preview = computeChronographStats(parsedShots, expectedVelocityFps);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (parsedShots.length === 0) { setError("Enter at least one shot velocity."); return; }
    setSubmitting(true); setError(null);
    const res = await fetch(`/api/reloading/recipes/${recipeId}/chronograph`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionDate, sessionLabel: sessionLabel || undefined, chronographModel: chronographModel || undefined,
        shotVelocities: parsedShots,
        groupSizeIn: groupSizeIn ? Number(groupSizeIn) : undefined,
        groupDistanceYards: groupDistanceYards ? Number(groupDistanceYards) : undefined,
        sessionNotes: sessionNotes || undefined,
      }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "Failed"); setSubmitting(false); }
    else { onSuccess(json); onClose(); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-vault-bg/80 backdrop-blur-sm">
      <div className="bg-vault-surface border border-vault-border rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h3 className="text-sm font-semibold text-vault-text mb-4">Log Chronograph Session</h3>
        {error && <div className="flex items-center gap-2 bg-[#E53935]/10 border border-[#E53935]/30 rounded px-3 py-2 mb-4"><AlertCircle className="w-4 h-4 text-[#E53935] shrink-0" /><p className="text-xs text-[#E53935]">{error}</p></div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={vaultLabelClass}>Date <span className="text-[#E53935]">*</span></label><VaultInput type="date" required value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} /></div>
            <div><label className={vaultLabelClass}>Chronograph Model</label><VaultInput value={chronographModel} onChange={(e) => setChronographModel(e.target.value)} placeholder="e.g. Labradar" /></div>
          </div>
          <div><label className={vaultLabelClass}>Session Label</label><VaultInput value={sessionLabel} onChange={(e) => setSessionLabel(e.target.value)} placeholder='e.g. "Summer load dev"' /></div>
          <div>
            <label className={vaultLabelClass}>Shot Velocities (fps) <span className="text-[#E53935]">*</span></label>
            <VaultTextArea rows={3} value={shotInput} onChange={(e) => setShotInput(e.target.value)} placeholder="e.g. 2750, 2748, 2755, 2751" />
            <p className="text-xs text-vault-text-faint mt-1">Comma or space separated. {parsedShots.length} shot{parsedShots.length !== 1 ? "s" : ""} parsed.</p>
          </div>
          {parsedShots.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-vault-bg border border-vault-border rounded-md p-3">
              <div><p className="text-[9px] text-vault-text-faint uppercase">Avg</p><p className="text-sm font-mono text-vault-text">{preview.avgVelocityFps?.toFixed(0)}</p></div>
              <div><p className="text-[9px] text-vault-text-faint uppercase">ES</p><p className="text-sm font-mono text-vault-text">{preview.extremeSpreadFps?.toFixed(0)}</p></div>
              <div><p className="text-[9px] text-vault-text-faint uppercase">SD</p><p className={`text-sm font-mono ${sdColor(preview.standardDeviationFps)}`}>{preview.standardDeviationFps?.toFixed(1)}</p></div>
              <div><p className="text-[9px] text-vault-text-faint uppercase">Δ Expected</p><p className={`text-sm font-mono ${deltaColor(preview.velocityDeltaFps)}`}>{preview.velocityDeltaFps != null ? `${preview.velocityDeltaFps > 0 ? "+" : ""}${preview.velocityDeltaFps.toFixed(0)}` : "—"}</p></div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><label className={vaultLabelClass}>Group Size (in)</label><VaultInput type="number" min={0} step="0.01" value={groupSizeIn} onChange={(e) => setGroupSizeIn(e.target.value)} /></div>
            <div><label className={vaultLabelClass}>Group Distance (yd)</label><VaultInput type="number" min={0} value={groupDistanceYards} onChange={(e) => setGroupDistanceYards(e.target.value)} /></div>
          </div>
          <div><label className={vaultLabelClass}>Session Notes</label><VaultTextArea rows={2} value={sessionNotes} onChange={(e) => setSessionNotes(e.target.value)} /></div>
          <div className="flex gap-2 justify-end pt-2">
            <VaultButton type="button" onClick={onClose} variant="ghost">Cancel</VaultButton>
            <VaultButton type="submit" disabled={submitting} variant="success">{submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}Log Session</VaultButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ChronographPage() {
  const params = useParams<{ id: string }>();
  const recipeId = params.id;
  const [recipe, setRecipe] = useState<RecipeSummary | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Session | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    void Promise.all([
      fetch(`/api/reloading/recipes/${recipeId}`).then((r) => r.json()),
      fetch(`/api/reloading/recipes/${recipeId}/chronograph`).then((r) => r.json()),
    ]).then(([recipeData, sessionData]) => {
      if (!isMounted) return;
      setRecipe(recipeData);
      setSessions(Array.isArray(sessionData.sessions) ? sessionData.sessions : []);
      setLoading(false);
    });
    return () => { isMounted = false; };
  }, [recipeId]);

  async function confirmDelete() {
    if (!deleteConfirm) return;
    setDeleting(true);
    const res = await fetch(`/api/reloading/recipes/${recipeId}/chronograph/${deleteConfirm.id}`, { method: "DELETE" });
    if (res.ok) { setSessions((prev) => prev.filter((s) => s.id !== deleteConfirm.id)); setDeleteConfirm(null); }
    setDeleting(false);
  }

  return (
    <div className="min-h-full">
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 px-4 sm:px-6 py-4 border-b border-vault-border">
        <Link href="/reloading/recipes" className="flex items-center gap-1.5 text-vault-text-muted hover:text-vault-text text-sm transition-colors"><ArrowLeft className="w-4 h-4" />Back to Recipes</Link>
        <span className="text-vault-border">/</span>
        <h1 className="text-sm font-semibold text-vault-text tracking-wide uppercase">Chronograph Sessions{recipe ? ` — ${recipe.recipeName}` : ""}</h1>
      </div>

      <div className="p-4 sm:p-6">
        <div className="flex justify-end mb-4">
          <button onClick={() => setLogModalOpen(true)} className="flex items-center gap-2 bg-[#00C2FF]/10 border border-[#00C2FF]/30 text-[#00C2FF] hover:bg-[#00C2FF]/20 px-3 py-1.5 rounded text-sm font-medium transition-colors"><Plus className="w-4 h-4" />Log Session</button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 text-[#00C2FF] animate-spin" /></div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-[#F5A623]/10 border border-[#F5A623]/20 flex items-center justify-center mb-4"><Timer className="w-8 h-8 text-[#F5A623]" /></div>
            <h3 className="text-lg font-semibold text-vault-text mb-2">No chronograph sessions yet</h3>
            <button onClick={() => setLogModalOpen(true)} className="flex items-center gap-2 bg-[#00C2FF]/10 border border-[#00C2FF]/30 text-[#00C2FF] hover:bg-[#00C2FF]/20 px-4 py-2 rounded text-sm font-medium transition-colors"><Plus className="w-4 h-4" />Log First Session</button>
          </div>
        ) : (
          <div className="bg-vault-surface border border-vault-border rounded-lg divide-y divide-vault-border overflow-hidden">
            {sessions.map((session) => (
              <div key={session.id} className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-vault-text">{formatDate(session.sessionDate)}</p>
                    {session.sessionLabel && <span className="text-[10px] text-vault-text-faint">{session.sessionLabel}</span>}
                    {session.isConfirmationSession && <span className="text-[9px] font-mono text-[#00C853] border border-[#00C853]/30 px-1 py-0.5 rounded">CONFIRMED</span>}
                  </div>
                  <p className="text-[10px] text-vault-text-faint mt-0.5">{session.shotCount} shots{session.chronographModel ? ` · ${session.chronographModel}` : ""}</p>
                  {session.sessionNotes && <p className="text-xs text-vault-text-muted mt-0.5">{session.sessionNotes}</p>}
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-center"><p className="text-sm font-mono text-vault-text">{session.avgVelocityFps?.toFixed(0) ?? "—"}</p><p className="text-[9px] text-vault-text-faint">avg fps</p></div>
                  <div className="text-center"><p className="text-sm font-mono text-vault-text">{session.extremeSpreadFps?.toFixed(0) ?? "—"}</p><p className="text-[9px] text-vault-text-faint">ES</p></div>
                  <div className="text-center"><p className={`text-sm font-mono ${sdColor(session.standardDeviationFps)}`}>{session.standardDeviationFps?.toFixed(1) ?? "—"}</p><p className="text-[9px] text-vault-text-faint">SD</p></div>
                  <div className="text-center"><p className={`text-sm font-mono ${deltaColor(session.velocityDeltaFps)}`}>{session.velocityDeltaFps != null ? `${session.velocityDeltaFps > 0 ? "+" : ""}${session.velocityDeltaFps.toFixed(0)}` : "—"}</p><p className="text-[9px] text-vault-text-faint">Δ exp.</p></div>
                  {session.groupSizeMoa != null && <div className="text-center"><p className="text-sm font-mono text-vault-text">{session.groupSizeMoa.toFixed(2)}</p><p className="text-[9px] text-vault-text-faint">MOA</p></div>}
                  <button onClick={() => setDeleteConfirm(session)} className="p-1.5 rounded text-vault-text-faint hover:text-[#E53935] hover:bg-[#E53935]/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {logModalOpen && recipe && (
        <LogSessionModal recipeId={recipeId} expectedVelocityFps={recipe.expectedVelocityFps} onClose={() => setLogModalOpen(false)} onSuccess={(s) => setSessions((prev) => [s, ...prev])} />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-vault-bg/80 backdrop-blur-sm">
          <div className="bg-vault-surface border border-vault-border rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-sm font-semibold text-vault-text mb-2">Delete Session?</h3>
            <p className="text-xs text-vault-text-muted mb-4">{formatDate(deleteConfirm.sessionDate)} · {deleteConfirm.shotCount} shots</p>
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
