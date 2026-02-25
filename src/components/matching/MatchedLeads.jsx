import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { User, MapPin, Euro, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { calculateMatchScore, getScoreColor, formatPrice, LEAD_TYPE_LABELS } from '@/lib/matching-engine';

export default function MatchedLeads({ leads, listing }) {
  const matchedLeads = leads
    .filter(lead => lead.lead_type === 'acheteur' || lead.lead_type === 'locataire' || !lead.lead_type)
    .map(lead => ({
      lead,
      ...calculateMatchScore(lead, listing)
    }))
    .filter(m => m.score >= 60)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (matchedLeads.length === 0) {
    return (
      <div className="text-center py-6">
        <User className="w-8 h-8 text-[#CCCCCC] mx-auto mb-2" />
        <p className="text-sm text-[#999999]">Aucun lead correspondant</p>
        <Link to={createPageUrl('Matching')} className="text-xs text-black underline mt-1 inline-block">
          Voir le matching
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {matchedLeads.map(({ lead, score }) => (
        <Link
          key={lead.id}
          to={createPageUrl(`LeadDetail?id=${lead.id}`)}
          className="flex items-center gap-3 p-3 rounded-xl bg-[#F5F5F5] hover:bg-[#E5E5E5] transition-colors group"
        >
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-medium text-sm flex-shrink-0">
            {lead.first_name?.[0]}{lead.last_name?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{lead.first_name} {lead.last_name}</p>
              {lead.lead_type && (
                <Badge className={cn("text-[10px] px-1.5 py-0", LEAD_TYPE_LABELS[lead.lead_type]?.color)}>
                  {LEAD_TYPE_LABELS[lead.lead_type]?.label}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-[#999999] mt-0.5">
              {lead.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {lead.city}
                </span>
              )}
              {lead.budget_max && (
                <span className="flex items-center gap-1">
                  <Euro className="w-3 h-3" />
                  {formatPrice(lead.budget_max)}
                </span>
              )}
            </div>
          </div>
          <span className={cn("text-xs font-medium px-2 py-1 rounded-full border", getScoreColor(score))}>
            {score}%
          </span>
        </Link>
      ))}
      {leads.length > 5 && (
        <Link
          to={createPageUrl('Matching')}
          className="flex items-center justify-center gap-2 text-sm text-[#666666] hover:text-black transition-colors py-2"
        >
          Voir tous les leads
          <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}
