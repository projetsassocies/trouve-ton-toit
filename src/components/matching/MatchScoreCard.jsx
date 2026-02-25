import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, MapPin, Maximize, BedDouble, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { getScoreColor, formatPrice, MATCH_STATUSES } from '@/lib/matching-engine';
import ScoreBreakdown from './ScoreBreakdown';
import MatchStatusBadge from './MatchStatusBadge';

export default function MatchScoreCard({
  item,
  score,
  details,
  matchRecord,
  mode = 'lead-to-listing',
  isSelected,
  isCompareChecked,
  onCompareToggle,
  onSelect,
  expanded,
  onToggleExpand,
}) {
  const isListing = mode === 'lead-to-listing';
  const entity = isListing ? item : item;

  return (
    <div
      className={cn(
        "border rounded-xl transition-all",
        isSelected ? "border-black bg-[#FAFAFA]" : "border-[#E5E5E5] bg-white hover:border-[#CCCCCC]"
      )}
    >
      <div
        className="p-4 cursor-pointer"
        onClick={() => onSelect?.()}
      >
        <div className="flex gap-3">
          {onCompareToggle && (
            <Checkbox
              checked={isCompareChecked}
              onCheckedChange={() => onCompareToggle?.()}
              onClick={(e) => e.stopPropagation()}
              className="mt-1 flex-shrink-0"
            />
          )}

          {isListing && (
            <div className="w-16 h-16 rounded-lg bg-[#F5F5F5] overflow-hidden flex-shrink-0">
              {entity.images?.[0] ? (
                <img src={entity.images[0]} alt={entity.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Home className="w-5 h-5 text-[#CCCCCC]" />
                </div>
              )}
            </div>
          )}

          {!isListing && (
            <div className="w-10 h-10 rounded-full bg-[#F5F5F5] flex items-center justify-center font-medium text-sm flex-shrink-0">
              {entity.first_name?.[0]}{entity.last_name?.[0]}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">
                  {isListing ? entity.title : `${entity.first_name} ${entity.last_name}`}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[#999999] mt-0.5">
                  {entity.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {entity.city}
                    </span>
                  )}
                  {isListing && entity.surface && (
                    <span className="flex items-center gap-1">
                      <Maximize className="w-3 h-3" />
                      {entity.surface} m²
                    </span>
                  )}
                  {isListing && entity.rooms && (
                    <span className="flex items-center gap-1">
                      <BedDouble className="w-3 h-3" />
                      {entity.rooms}p
                    </span>
                  )}
                  {!isListing && entity.budget_max && (
                    <span>{formatPrice(entity.budget_max)}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {matchRecord?.status && matchRecord.status !== 'nouveau' && (
                  <MatchStatusBadge status={matchRecord.status} />
                )}
                <span className={cn(
                  "text-sm font-semibold px-2.5 py-1 rounded-lg border tabular-nums",
                  getScoreColor(score)
                )}>
                  {score}%
                </span>
              </div>
            </div>

            {isListing && (
              <p className="text-sm font-semibold mt-1">{formatPrice(entity.price)}</p>
            )}
          </div>
        </div>
      </div>

      {/* Expandable score breakdown */}
      <div className="px-4">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleExpand?.(); }}
          className="w-full flex items-center justify-center gap-1 text-xs text-[#999999] hover:text-[#666666] py-1.5 border-t border-[#F0F0F0]"
        >
          {expanded ? 'Masquer le détail' : 'Voir le détail'}
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-1">
          <ScoreBreakdown details={details} />
          <div className="mt-3 flex gap-2">
            <Link
              to={createPageUrl(isListing ? `ListingDetail?id=${entity.id}` : `LeadDetail?id=${entity.id}`)}
              className="text-xs text-[#666666] hover:text-black underline"
              onClick={(e) => e.stopPropagation()}
            >
              Voir la fiche
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
