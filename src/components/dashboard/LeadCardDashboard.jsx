import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { MapPin, Home, Euro } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';

export default function LeadCardDashboard({ lead, formatPrice }) {
  return (
    <Link
      to={createPageUrl(`LeadDetail?id=${lead.id}`)}
      className="block p-3 bg-white rounded-xl border border-[#E5E5E5] hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-[#f9ffed] flex items-center justify-center font-semibold text-sm flex-shrink-0 text-[#095237]">
          {lead.first_name?.[0]}{lead.last_name?.[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">
            {lead.first_name} {lead.last_name}
          </p>
          {lead.score !== undefined && (
            <p className="text-xs text-[#999999]">
              Score: {lead.score}/100
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1.5 text-xs text-[#666666]">
        {lead.city && (
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-[#999999]" />
            <span className="truncate">{lead.city}</span>
          </div>
        )}
        {lead.property_type && (
          <div className="flex items-center gap-2">
            <Home className="w-3.5 h-3.5 flex-shrink-0 text-[#999999]" />
            <span className="truncate capitalize">{lead.property_type}</span>
          </div>
        )}
        {lead.budget_max && (
          <div className="flex items-center gap-2">
            <Euro className="w-3.5 h-3.5 flex-shrink-0 text-[#999999]" />
            <span className="truncate">{formatPrice(lead.budget_max)}</span>
          </div>
        )}
      </div>
      
      <div className="mt-3 pt-3 border-t border-[#E5E5E5]">
        <StatusBadge status={lead.status} />
      </div>
    </Link>
  );
}