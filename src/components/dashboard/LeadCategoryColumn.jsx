import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ChevronRight } from 'lucide-react';
import LeadCardDashboard from './LeadCardDashboard';

export default function LeadCategoryColumn({ title, icon: Icon, leads, iconColor, bgColor, formatPrice }) {
  const displayedLeads = leads.slice(0, 3);
  
  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden flex flex-col">
      <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg ${bgColor} flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{title}</h3>
            <p className="text-xs text-[#999999]">{leads.length} lead{leads.length > 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>
      
      <div className="p-3 space-y-3 flex-1">
        {displayedLeads.length === 0 ? (
          <div className="p-8 text-center text-[#999999] text-sm">
            Aucun lead {title.toLowerCase()}
          </div>
        ) : (
          displayedLeads.map(lead => (
            <LeadCardDashboard key={lead.id} lead={lead} formatPrice={formatPrice} />
          ))
        )}
      </div>

      {leads.length > 3 && (
        <div className="p-3 border-t border-[#E5E5E5]">
          <Link 
            to={createPageUrl('Leads')}
            className="flex items-center justify-center gap-1 text-xs text-[#999999] hover:text-black transition-colors"
          >
            Voir tous les leads {title.toLowerCase()}
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  );
}