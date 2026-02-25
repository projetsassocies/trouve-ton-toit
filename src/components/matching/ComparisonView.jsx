import React from 'react';
import { X, Home, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatPrice, getScoreColor } from '@/lib/matching-engine';
import ScoreBreakdown from './ScoreBreakdown';

export default function ComparisonView({
  items,
  scores,
  mode,
  onClose,
  onPropose,
}) {
  if (!items || items.length < 2) return null;

  const isListingMode = mode === 'lead-to-listing';

  const rows = isListingMode ? [
    { label: 'Prix', render: (item) => formatPrice(item.price), best: 'min' },
    { label: 'Ville', render: (item) => item.city || '—' },
    { label: 'Surface', render: (item) => item.surface ? `${item.surface} m²` : '—', best: 'max' },
    { label: 'Pièces', render: (item) => item.rooms ? `${item.rooms}` : '—', best: 'max' },
    { label: 'Chambres', render: (item) => item.bedrooms ? `${item.bedrooms}` : '—', best: 'max' },
    { label: 'SdB', render: (item) => item.bathrooms ? `${item.bathrooms}` : '—' },
    { label: 'Étage', render: (item) => item.floor != null ? `${item.floor}/${item.total_floors || '?'}` : '—' },
    { label: 'Type', render: (item) => item.property_type || '—' },
    { label: 'DPE', render: (item) => item.energy_class || '—' },
    { label: 'Parking', render: (item) => item.parking ? 'Oui' : 'Non', best: 'yes' },
    { label: 'Ascenseur', render: (item) => item.elevator ? 'Oui' : 'Non', best: 'yes' },
    { label: 'Balcon', render: (item) => item.balcony ? 'Oui' : 'Non', best: 'yes' },
    { label: 'Jardin', render: (item) => item.garden ? 'Oui' : 'Non', best: 'yes' },
    { label: 'Cave', render: (item) => item.cellar ? 'Oui' : 'Non', best: 'yes' },
  ] : [
    { label: 'Budget max', render: (item) => formatPrice(item.budget_max) },
    { label: 'Ville', render: (item) => item.city || '—' },
    { label: 'Type recherché', render: (item) => item.property_type || '—' },
    { label: 'Surface min', render: (item) => item.surface_min ? `${item.surface_min} m²` : '—' },
    { label: 'Pièces min', render: (item) => item.rooms_min ? `${item.rooms_min}` : '—' },
    { label: 'Financement', render: (item) => item.financing_status || '—' },
    { label: 'Catégorie', render: (item) => item.categorie || '—' },
    { label: 'Délai', render: (item) => item.delai || '—' },
  ];

  const getBestIndex = (row) => {
    if (!row.best) return -1;
    const values = items.map(item => row.render(item));
    if (row.best === 'min') {
      const nums = values.map(v => parseFloat(String(v).replace(/[^\d,.-]/g, '').replace(',', '.')) || Infinity);
      const min = Math.min(...nums);
      return nums.indexOf(min);
    }
    if (row.best === 'max') {
      const nums = values.map(v => parseFloat(String(v).replace(/[^\d,.-]/g, '').replace(',', '.')) || -Infinity);
      const max = Math.max(...nums);
      return nums.indexOf(max);
    }
    if (row.best === 'yes') {
      const idx = values.indexOf('Oui');
      return values.filter(v => v === 'Oui').length === 1 ? idx : -1;
    }
    return -1;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — épuré */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0">
          <h2 className="text-lg font-medium text-[#1a1a1a] tracking-tight">
            Comparaison — {items.length} {isListingMode ? 'biens' : 'leads'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 -m-2 rounded-lg text-[#999999] hover:text-[#333] hover:bg-[#f5f5f5] transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-auto min-h-0">
          <div className="min-w-[500px]">
            {/* En-tête sticky avec cartes colonnes */}
            <div className="sticky top-0 z-10 bg-white border-b border-[#eee]">
              <div className="flex">
                <div className="w-[120px] shrink-0 p-4" />
                {items.map((item) => {
                  const scoreData = scores[item.id];
                  return (
                    <div
                      key={item.id}
                      className="flex-1 min-w-[140px] p-4 border-l first:border-l-0 border-[#eee] bg-[#fafafa]/80"
                    >
                      <div className="flex flex-col items-center text-center gap-3">
                        {isListingMode ? (
                          <div className="w-16 h-16 rounded-xl bg-[#f0f0f0] overflow-hidden shrink-0">
                            {item.images?.[0] ? (
                              <img src={item.images[0]} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Home className="w-7 h-7 text-[#ccc]" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-[#f0f0f0] flex items-center justify-center shrink-0 font-semibold text-sm text-[#666]">
                            {item.first_name?.[0]}{item.last_name?.[0]}
                          </div>
                        )}
                        <p className="font-medium text-sm text-[#333] truncate w-full px-1">
                          {isListingMode ? item.title : `${item.first_name} ${item.last_name}`}
                        </p>
                        {scoreData && (
                          <span className={cn(
                            "text-xs font-semibold px-2.5 py-1 rounded-full",
                            getScoreColor(scoreData.score)
                          )}>
                            {scoreData.score}%
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ligne Score détaillé — compacte */}
            <div className="flex border-b border-[#f0f0f0] bg-[#fafafa]">
              <div className="w-[120px] shrink-0 p-4 flex items-center">
                <span className="text-xs font-medium text-[#888]">Score détaillé</span>
              </div>
              {items.map((item) => {
                const scoreData = scores[item.id];
                return (
                  <div key={item.id} className="flex-1 min-w-[140px] p-4 border-l first:border-l-0 border-[#f0f0f0]">
                    {scoreData?.details && (
                      <ScoreBreakdown details={scoreData.details} compact />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Lignes critères */}
            {rows.map((row, rowIdx) => {
              const bestIdx = getBestIndex(row);
              return (
                <div
                  key={rowIdx}
                  className={cn(
                    "flex border-b border-[#f5f5f5]",
                    rowIdx % 2 === 1 && "bg-[#fafafa]/50"
                  )}
                >
                  <div className="w-[120px] shrink-0 p-4 flex items-center">
                    <span className="text-xs font-medium text-[#666]">{row.label}</span>
                  </div>
                  {items.map((item, colIdx) => (
                    <div
                      key={item.id}
                      className={cn(
                        "flex-1 min-w-[140px] p-4 border-l first:border-l-0 border-[#f0f0f0] flex items-center justify-center text-sm",
                        bestIdx === colIdx && "bg-emerald-50/70 text-emerald-800 font-semibold"
                      )}
                    >
                      {row.render(item)}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer fixe — boutons Proposer alignés avec les colonnes */}
        <div className="shrink-0 flex border-t border-[#e5e5e5] bg-[#fafafa]">
          <div className="w-[120px] shrink-0" />
          {items.map((item) => (
            <div key={item.id} className="flex-1 min-w-[140px] p-4 border-l first:border-l-0 border-[#eee] flex justify-center">
              <Button
                size="sm"
                onClick={() => onPropose(item)}
                className="bg-[#c5ff4e] hover:bg-[#b5ef3e] text-black rounded-xl h-9 px-5 text-sm font-medium shadow-sm hover:shadow transition-shadow"
              >
                <Send className="w-3.5 h-3.5 mr-2" />
                Proposer
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
