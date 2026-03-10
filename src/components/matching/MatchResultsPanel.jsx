import React, { useState } from 'react';
import { Home, User, Sparkles, Loader2, XCircle, MapPin, Euro, Maximize, BedDouble, CreditCard, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatPrice, getScoreColor, LEAD_TYPE_LABELS } from '@/lib/matching-engine';
import MatchScoreCard from './MatchScoreCard';

export default function MatchResultsPanel({
  mode,
  selectedEntity,
  matchResults,
  matchRecords,
  isMatching,
  onRunMatching,
  compareIds,
  onCompareToggle,
  selectedMatchId,
  onSelectMatch,
}) {
  const [expandedId, setExpandedId] = useState(null);

  if (!selectedEntity) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        {mode === 'lead-to-listing' ? (
          <>
            <User className="w-12 h-12 text-[#E5E5E5] mb-3" />
            <p className="text-[#999999] text-sm">Sélectionnez un lead pour voir les correspondances</p>
          </>
        ) : (
          <>
            <Home className="w-12 h-12 text-[#E5E5E5] mb-3" />
            <p className="text-[#999999] text-sm">Sélectionnez un bien pour voir les leads compatibles</p>
          </>
        )}
      </div>
    );
  }

  const isLeadMode = mode === 'lead-to-listing';

  return (
    <div className="flex flex-col h-full">
      {/* Entity summary card */}
      <div className="p-4 border-b border-[#E5E5E5] bg-[#FAFAFA]">
        <div className="flex items-start gap-3">
          {isLeadMode ? (
            <div className="w-10 h-10 rounded-full bg-white border border-[#E5E5E5] flex items-center justify-center font-semibold text-sm flex-shrink-0">
              {selectedEntity.first_name?.[0]}{selectedEntity.last_name?.[0]}
            </div>
          ) : (
            <div className="w-12 h-12 rounded-lg bg-white border border-[#E5E5E5] overflow-hidden flex-shrink-0">
              {selectedEntity.images?.[0] ? (
                <img src={selectedEntity.images[0]} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Home className="w-5 h-5 text-[#CCCCCC]" />
                </div>
              )}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">
              {isLeadMode
                ? `${selectedEntity.first_name} ${selectedEntity.last_name}`
                : selectedEntity.title}
            </h3>

            <div className="flex flex-wrap gap-2 mt-1.5">
              {isLeadMode ? (
                <>
                  {selectedEntity.lead_type && (
                    <Badge className={cn("text-[10px]", LEAD_TYPE_LABELS[selectedEntity.lead_type]?.color)}>
                      {LEAD_TYPE_LABELS[selectedEntity.lead_type]?.label}
                    </Badge>
                  )}
                  {selectedEntity.city && (
                    <span className="text-xs text-[#666666] flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{selectedEntity.city}
                    </span>
                  )}
                  {selectedEntity.budget_max && (
                    <span className="text-xs text-[#666666] flex items-center gap-1">
                      <Euro className="w-3 h-3" />{formatPrice(selectedEntity.budget_max)}
                    </span>
                  )}
                  {selectedEntity.property_type && (
                    <span className="text-xs text-[#666666] capitalize">{selectedEntity.property_type}</span>
                  )}
                  {selectedEntity.rooms_min && (
                    <span className="text-xs text-[#666666] flex items-center gap-1">
                      <BedDouble className="w-3 h-3" />{selectedEntity.rooms_min}+ pièces
                    </span>
                  )}
                  {selectedEntity.surface_min && (
                    <span className="text-xs text-[#666666] flex items-center gap-1">
                      <Maximize className="w-3 h-3" />{selectedEntity.surface_min}+ m²
                    </span>
                  )}
                  {selectedEntity.financing_status && (
                    <span className={cn("text-[10px] px-1.5 py-0 rounded-full",
                      selectedEntity.financing_status === 'valide' && "bg-green-100 text-green-700",
                      selectedEntity.financing_status === 'en_cours' && "bg-blue-100 text-blue-700",
                      selectedEntity.financing_status === 'pas_encore_vu' && "bg-amber-100 text-amber-700",
                    )}>
                      <CreditCard className="w-3 h-3 inline mr-0.5" />
                      {selectedEntity.financing_status === 'valide' && 'Financement validé'}
                      {selectedEntity.financing_status === 'en_cours' && 'En cours'}
                      {selectedEntity.financing_status === 'pas_encore_vu' && 'À évaluer'}
                    </span>
                  )}
                  {selectedEntity.delai && (
                    <span className="text-xs text-[#666666] flex items-center gap-1">
                      <Clock className="w-3 h-3" />{selectedEntity.delai}
                    </span>
                  )}
                </>
              ) : (
                <>
                  {selectedEntity.city && (
                    <span className="text-xs text-[#666666] flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{selectedEntity.city}
                    </span>
                  )}
                  <span className="text-xs font-semibold">{formatPrice(selectedEntity.price)}</span>
                  {selectedEntity.surface && (
                    <span className="text-xs text-[#666666]">{selectedEntity.surface} m²</span>
                  )}
                  {selectedEntity.rooms && (
                    <span className="text-xs text-[#666666]">{selectedEntity.rooms} pièces</span>
                  )}
                </>
              )}
            </div>

            {isLeadMode && selectedEntity.blocking_criteria?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {selectedEntity.blocking_criteria.map((c, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <Button
          onClick={onRunMatching}
          disabled={isMatching}
          className="w-full mt-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-9 text-sm font-medium"
        >
          {isMatching ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          {isMatching ? 'Analyse en cours...' : isLeadMode ? 'Lancer le matching' : 'Trouver les leads'}
        </Button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {isMatching ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
            <p className="text-sm text-[#999999]">Analyse des correspondances...</p>
          </div>
        ) : matchResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-6">
            <XCircle className="w-8 h-8 text-[#E5E5E5] mb-2" />
            <p className="text-sm text-[#999999]">Aucune correspondance</p>
            <p className="text-xs text-[#CCCCCC] mt-1">
              {onRunMatching ? 'Lancez le matching pour trouver des résultats' : 'Score minimum : 60%'}
            </p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            <p className="text-xs text-[#999999] font-medium px-1">
              {matchResults.length} correspondance{matchResults.length > 1 ? 's' : ''}
            </p>
            {matchResults.map(({ item, score, details }) => {
              const matchRecord = matchRecords?.find(m =>
                isLeadMode
                  ? m.listing_id === item.id
                  : m.lead_id === item.id
              );
              return (
                <MatchScoreCard
                  key={item.id}
                  item={item}
                  score={score}
                  details={details}
                  matchRecord={matchRecord}
                  mode={mode}
                  isSelected={selectedMatchId === item.id}
                  isCompareChecked={compareIds.includes(item.id)}
                  onCompareToggle={() => onCompareToggle(item.id)}
                  onSelect={() => onSelectMatch(item.id)}
                  expanded={expandedId === item.id}
                  onToggleExpand={() => setExpandedId(expandedId === item.id ? null : item.id)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
