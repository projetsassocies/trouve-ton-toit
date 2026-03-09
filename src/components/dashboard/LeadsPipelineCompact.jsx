import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import { Users, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const COLUMNS = [
  { id: 'nouveau', label: 'Nouveaux', status: 'nouveau' },
  { id: 'contacte', label: 'Contactés', status: 'contacte' },
  { id: 'qualifie', label: 'Qualifiés', status: 'en_negociation' },
  { id: 'visite', label: 'Visite planifiée', status: null },
];

export default function LeadsPipelineCompact({ formatPrice, className }) {
  const { user } = useAuth();

  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['leads', user?.email],
    queryFn: () => base44.entities.Lead.filter({ created_by: user.email }, '-created_date', 200),
    enabled: !!user?.email,
  });

  const { data: matches = [] } = useQuery({
    queryKey: ['matches', user?.email],
    queryFn: () => base44.entities.Match.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const leadsByColumn = useMemo(() => {
    const withVisitPlanifiee = new Set(
      matches
        .filter((m) => ['visite_planifiee', 'visite_effectuee'].includes(m.status))
        .map((m) => m.lead_id)
    );

    const nouveau = leads.filter((l) => (l.status || 'nouveau') === 'nouveau');
    const contacte = leads.filter((l) => l.status === 'contacte');
    const qualifie = leads.filter((l) => l.status === 'en_negociation');
    const visite = leads.filter((l) => withVisitPlanifiee.has(l.id));

    return { nouveau, contacte, qualifie, visite };
  }, [leads, matches]);

  const formatPriceFn = formatPrice || ((p) => `${(p || 0).toLocaleString('fr-FR')}€`);

  if (leadsLoading) {
    return (
      <div className={cn('bg-white dark:bg-[#111] rounded-2xl border border-[#E5E5E5] dark:border-[#333] p-4', className)}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-[#111] dark:text-white">Pipeline des Leads</h2>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-white dark:bg-[#111] rounded-2xl border border-[#E5E5E5] dark:border-[#333] overflow-hidden', className)}>
      <div className="p-4 border-b border-[#E5E5E5] dark:border-[#333] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[#095237]" />
          <h2 className="font-semibold text-[#111] dark:text-white">Pipeline des Leads</h2>
        </div>
        <Link
          to={createPageUrl('Leads')}
          className="text-sm text-[#095237] hover:underline font-medium"
        >
          Voir tous les leads
        </Link>
      </div>
      <div className="p-3 overflow-x-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 min-w-[400px]">
          {COLUMNS.map((col) => {
            const columnLeads = leadsByColumn[col.id] || [];
            return (
              <div
                key={col.id}
                className=" rounded-xl border border-[#E5E5E5] dark:border-[#333] overflow-hidden bg-[#FAFAFA] dark:bg-[#1a1a1a]"
              >
                <div className="p-2 border-b border-[#E5E5E5] dark:border-[#333] flex items-center justify-between">
                  <span className="text-xs font-medium text-[#666] dark:text-[#999]">{col.label}</span>
                  <span className="w-6 h-6 rounded-full bg-[#095237] text-white text-xs flex items-center justify-center font-medium">
                    {columnLeads.length}
                  </span>
                </div>
                <div className="p-2 space-y-1 max-h-[140px] overflow-y-auto">
                  {columnLeads.slice(0, 4).map((lead) => (
                    <Link
                      key={lead.id}
                      to={createPageUrl(`LeadDetail?id=${lead.id}`)}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-white dark:hover:bg-[#222] transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#111] dark:text-white truncate">
                          {lead.first_name} {lead.last_name}
                        </p>
                        <p className="text-[10px] text-[#666] dark:text-[#999] truncate">
                          {lead.property_type ? `${lead.property_type} ` : ''}
                          {lead.budget_max ? `• ${formatPriceFn(lead.budget_max)}` : ''}
                        </p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-[#CCC] group-hover:text-[#095237] flex-shrink-0" />
                    </Link>
                  ))}
                  {columnLeads.length > 4 && (
                    <p className="text-[10px] text-[#999] px-2 py-1">
                      +{columnLeads.length - 4} autres
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
