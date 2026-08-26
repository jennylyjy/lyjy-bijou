import React, { useState } from 'react';

const ALL_CATEGORIES = [
  { id: 'boucles', label: "Boucles d'oreilles" },
  { id: 'bracelets', label: 'Bracelets' },
  { id: 'colliers', label: 'Colliers' },
  { id: 'bagues', label: 'Bagues' },
];

const FINITIONS = [
  { id: 'mixte', label: 'Mixte (Surprise)' },
  { id: 'dore', label: 'Doré' },
  { id: 'argente', label: 'Argenté' },
];

export default function CalendarConfigurator({
  article,
  availableCategories = ALL_CATEGORIES.map((category) => category.id),
  isDayMode = false,
  onAddToCart,
}) {
  const configuredCategories = Array.isArray(article?.adventConfig?.categories)
    ? article.adventConfig.categories.map((category) => String(category).toLowerCase())
    : ALL_CATEGORIES.map((category) => category.id);
  const categoriesToDisplay = ALL_CATEGORIES.filter((category) =>
    configuredCategories.includes(category.id) && availableCategories.includes(category.id)
  );

  const [formule, setFormule] = useState('surprise');
  const [categories, setCategories] = useState([]);
  const [finition, setFinition] = useState('mixte');
  const selectedAvailableCategories = categories.filter((category) =>
    categoriesToDisplay.some((availableCategory) => availableCategory.id === category)
  );

  const handleFormuleChange = (newFormule) => {
    setFormule(newFormule);
    setCategories([]);
  };

  const handleCategoryToggle = (id) => {
    if (formule === 'mono') {
      setCategories([id]);
    } else if (formule === 'multi') {
      setCategories((prev) =>
        prev.includes(id) ? prev.filter((cat) => cat !== id) : [...prev, id]
      );
    }
  };

  const isValid = () => {
    if (categoriesToDisplay.length === 0) return false;
    if (formule === 'surprise') return true;
    if (formule === 'mono') return selectedAvailableCategories.length === 1;
    if (formule === 'multi') return selectedAvailableCategories.length >= 2;
    return false;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid()) return;

    const payload = {
      formule,
      categories: formule === 'surprise'
        ? categoriesToDisplay.map((category) => category.id)
        : selectedAvailableCategories,
      finition,
    };

    if (onAddToCart) {
      onAddToCart(payload);
    } else {
      console.log('Données prêtes pour le panier :', payload);
    }
  };

  return (
    <div
      className={`max-w-md w-full p-6 rounded-2xl border font-sans transition-colors ${
        isDayMode
          ? 'bg-white border-stone-200 text-stone-900 shadow-sm'
          : 'bg-stone-900 border-stone-800 text-stone-100 shadow-xl'
      }`}
    >
      <h3 className="text-xl font-serif tracking-wide text-[#C4A77D] mb-6">
        Personnalisez votre Calendrier
      </h3>

      {categoriesToDisplay.length === 0 && (
        <p className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
          Les bijoux prévus pour ce calendrier sont momentanément indisponibles.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ÉTAPE 1 : SÉLECTION FORMULE */}
        {categoriesToDisplay.length > 0 && (
          <div>
            <label className={`block text-xs uppercase tracking-wider font-semibold mb-3 ${isDayMode ? 'text-stone-700' : 'text-stone-300'}`}>
              1. Choisissez votre formule
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'surprise', label: '100% Surprise', desc: 'Sélection complète' },
                { id: 'mono', label: 'Mono-article', desc: '1 seul type' },
                { id: 'multi', label: 'Mix sur-mesure', desc: '2 types ou +' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleFormuleChange(opt.id)}
                  className={`p-3 text-left border rounded-xl transition-all ${
                    formule === opt.id
                      ? 'border-[#C4A77D] bg-[#C4A77D]/10 text-[#C4A77D] shadow-sm'
                      : isDayMode
                      ? 'border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-300'
                      : 'border-stone-800 bg-black/40 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <div className="font-semibold text-xs">{opt.label}</div>
                  <div className={`text-[10px] mt-1 ${formule === opt.id ? 'text-[#C4A77D]/80' : 'text-stone-500'}`}>
                    {opt.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ÉTAPE 2 : SÉLECTION DES CATÉGORIES */}
        {categoriesToDisplay.length > 0 && formule !== 'surprise' && (
          <div className={`pt-4 border-t ${isDayMode ? 'border-stone-200' : 'border-stone-800'}`}>
            <label className={`block text-xs uppercase tracking-wider font-semibold mb-1 ${isDayMode ? 'text-stone-700' : 'text-stone-300'}`}>
              {formule === 'mono' ? '2. Choisissez la catégorie' : '2. Choisissez au moins 2 catégories'}
            </label>

            {formule === 'multi' && (
              <p className="text-xs text-stone-400 mb-2">
                {categories.length < 2
                  ? `Sélectionnez encore ${2 - categories.length} catégorie(s)`
                  : `${categories.length} catégories sélectionnées`}
              </p>
            )}

            <div className={`grid gap-2 mt-2 ${categoriesToDisplay.length <= 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
              {categoriesToDisplay.map((cat) => {
                const isSelected = categories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategoryToggle(cat.id)}
                    className={`p-3 text-xs font-medium border rounded-lg transition-all text-center ${
                      isSelected
                        ? 'border-[#C4A77D] bg-[#C4A77D] text-black font-semibold'
                        : isDayMode
                        ? 'border-stone-200 text-stone-700 hover:bg-stone-50'
                        : 'border-stone-800 text-stone-400 hover:bg-stone-800/50'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ÉTAPE 3 : FINITION */}
        <div className={`pt-4 border-t ${isDayMode ? 'border-stone-200' : 'border-stone-800'}`}>
          <label className={`block text-xs uppercase tracking-wider font-semibold mb-3 ${isDayMode ? 'text-stone-700' : 'text-stone-300'}`}>
            {formule === 'surprise' ? '2. Finition souhaitée' : '3. Finition souhaitée'}
          </label>
          <div className="flex gap-2">
            {FINITIONS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFinition(f.id)}
                className={`flex-1 py-2 px-3 text-xs font-medium border rounded-lg transition-all ${
                  finition === f.id
                    ? 'border-[#C4A77D] bg-[#C4A77D] text-black font-semibold'
                    : isDayMode
                    ? 'border-stone-200 text-stone-600 hover:bg-stone-50'
                    : 'border-stone-800 text-stone-400 hover:bg-stone-800/50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* BOUTON D'ACTION */}
        <button
          type="submit"
          disabled={!isValid()}
          className={`w-full py-3.5 text-center font-medium text-xs uppercase tracking-widest rounded-xl transition-all ${
            isValid()
              ? 'bg-[#C4A77D] hover:bg-[#b0936a] text-black shadow-md cursor-pointer'
              : 'bg-stone-800 text-stone-600 cursor-not-allowed border border-stone-800'
          }`}
        >
          {isValid() ? 'Ajouter au panier' : 'Complétez votre choix'}
        </button>
      </form>
    </div>
  );
}
