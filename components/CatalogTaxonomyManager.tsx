"use client";

import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { CatalogTaxonomy, createTaxonomyId, TaxonomyKey, taxonomyLabels } from "@/lib/catalogTaxonomy";

export default function CatalogTaxonomyManager({
  taxonomy,
  isDayMode,
  onChange,
}: {
  taxonomy: CatalogTaxonomy;
  isDayMode: boolean;
  onChange: (taxonomy: CatalogTaxonomy) => void;
}) {
  const [newLabels, setNewLabels] = useState<Record<TaxonomyKey, string>>({ categories: "", subcategories: "", themes: "", colors: "" });
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const keys: TaxonomyKey[] = ["categories", "subcategories", "themes", "colors"];

  const save = async (nextTaxonomy: CatalogTaxonomy) => {
    const previousTaxonomy = taxonomy;
    onChange(nextTaxonomy);
    setIsSaving(true);
    setFeedback(null);
    try {
      await setDoc(doc(db, "settings", "catalogTaxonomy"), nextTaxonomy, { merge: false });
      setFeedback({ type: "success", message: "Modification enregistrée." });
    } catch (error: unknown) {
      onChange(previousTaxonomy);
      const message = error instanceof Error ? error.message : "Erreur Firebase inconnue";
      setFeedback({ type: "error", message: `Impossible d'enregistrer : ${message}` });
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const addItem = async (key: TaxonomyKey) => {
    const label = newLabels[key].trim();
    const id = createTaxonomyId(label);
    if (!label || !id) return;
    if (taxonomy[key].some(item => item.id === id)) {
      alert("Cette valeur existe déjà.");
      return;
    }
    try {
      await save({ ...taxonomy, [key]: [...taxonomy[key], { id, label, isVisible: true }] });
      setNewLabels(current => ({ ...current, [key]: "" }));
    } catch {
      // Le message détaillé est affiché dans l'interface.
    }
  };

  return (
    <div className={`p-8 border space-y-5 ${isDayMode ? "bg-stone-100 border-stone-200" : "bg-stone-950 border-stone-900"}`}>
      <div>
        <h2 className="font-serif text-xl tracking-[0.2em] text-[#C4A77D]">Organisation du catalogue</h2>
        <p className="mt-2 text-xs text-stone-500">Masquer retire le filtre de la boutique sans modifier les articles. Supprimer retire définitivement la valeur de la liste.</p>
      </div>
      {feedback && (
        <div className={`border p-3 text-xs ${feedback.type === "success" ? "border-green-500/30 bg-green-500/10 text-green-400" : "border-red-500/30 bg-red-500/10 text-red-400"}`}>
          {feedback.message}
        </div>
      )}
      {isSaving && <p className="text-xs text-[#C4A77D]">Enregistrement en cours...</p>}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {keys.map(key => (
          <section key={key} className={`border p-4 ${isDayMode ? "border-stone-300 bg-white" : "border-stone-800 bg-black"}`}>
            <h3 className="mb-3 text-xs uppercase tracking-widest text-[#C4A77D]">{taxonomyLabels[key]}</h3>
            <div className="mb-3 flex gap-2">
              <input
                value={newLabels[key]}
                onChange={event => setNewLabels(current => ({ ...current, [key]: event.target.value }))}
                onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void addItem(key); } }}
                placeholder={`Nouvelle ${taxonomyLabels[key].toLowerCase()}`}
                className={`min-w-0 flex-1 border p-2 text-xs ${isDayMode ? "border-stone-300 bg-white" : "border-stone-800 bg-stone-950"}`}
              />
              <button type="button" onClick={() => void addItem(key)} className="bg-[#C4A77D] px-3 text-black"><Plus className="h-4 w-4" /></button>
            </div>
            <div className="flex flex-wrap gap-2">
              {taxonomy[key].map(item => (
                <span key={item.id} className={`inline-flex items-center gap-2 border px-3 py-2 text-[10px] ${item.isVisible ? "border-green-500/30 text-green-400" : "border-stone-700 text-stone-500"}`}>
                  {item.label}
                  <button type="button" disabled={isSaving} title={item.isVisible ? "Masquer" : "Afficher"} onClick={() => { void save({ ...taxonomy, [key]: taxonomy[key].map(current => current.id === item.id ? { ...current, isVisible: !current.isVisible } : current) }).catch(() => undefined); }}>
                    {item.isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                  <button type="button" disabled={isSaving} title="Supprimer" className="text-red-400" onClick={() => { if (confirm(`Supprimer « ${item.label} » ?`)) void save({ ...taxonomy, [key]: taxonomy[key].filter(current => current.id !== item.id) }).catch(() => undefined); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
              {taxonomy[key].length === 0 && <span className="text-[10px] italic text-stone-500">Aucune valeur</span>}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
