import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, MapPin, Maximize, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import StatusBadge from '@/components/ui/StatusBadge';
import { calculateMatchScore, getScoreColor, formatPrice } from '@/lib/matching-engine';

export default function MatchedListings({ listings, matchedIds = [], lead }) {
  const matchedListingsWithScores = listings
    .filter(l => matchedIds.includes(l.id))
    .map(listing => ({
      listing,
      ...calculateMatchScore(lead, listing)
    }))
    .filter(m => m.score >= 60)
    .sort((a, b) => b.score - a.score);

  if (matchedListingsWithScores.length === 0) {
    return (
      <div className="text-center py-6">
        <Home className="w-8 h-8 text-[#CCCCCC] mx-auto mb-2" />
        <p className="text-sm text-[#999999]">Aucune correspondance</p>
        <Link to={createPageUrl(`Matching?leadId=${lead?.id}`)} className="text-xs text-black underline mt-1 inline-block">
          Lancer le matching
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {matchedListingsWithScores.slice(0, 5).map(({ listing, score }) => (
        <Link
          key={listing.id}
          to={createPageUrl(`ListingDetail?id=${listing.id}`)}
          className="flex items-center gap-3 p-3 rounded-xl bg-[#F5F5F5] hover:bg-[#E5E5E5] transition-colors group"
        >
          <div className="w-14 h-14 rounded-lg bg-white overflow-hidden flex-shrink-0">
            {listing.images?.[0] ? (
              <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Home className="w-5 h-5 text-[#CCCCCC]" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{listing.title}</p>
            <div className="flex items-center gap-2 text-xs text-[#999999] mt-0.5">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {listing.city}
              </span>
              {listing.surface && <span>{listing.surface} m²</span>}
            </div>
            <p className="text-sm font-semibold mt-1">{formatPrice(listing.price)}</p>
          </div>
          <span className={cn("text-xs font-medium px-2 py-1 rounded-full border", getScoreColor(score))}>
            {score}%
          </span>
        </Link>
      ))}
      {matchedListingsWithScores.length > 5 && (
        <Link
          to={createPageUrl(`Matching?leadId=${lead?.id}`)}
          className="flex items-center justify-center gap-2 text-sm text-[#666666] hover:text-black transition-colors py-2"
        >
          Voir toutes les correspondances
          <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}
