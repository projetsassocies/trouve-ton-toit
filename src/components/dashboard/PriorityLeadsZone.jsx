import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ChevronRight, Phone, Calendar, FileSignature, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { subDays } from 'date-fns';
import { cn } from '@/lib/utils';

export default function PriorityLeadsZone({ formatPrice, className }) {
  const { user } = useAuth();

  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['leads', user?.email],
    queryFn: () => base44.entities.Lead.filter({ created_by: user.email }, '-created_date', 100),
    enabled: !!user?.email,
  });

  const { data: matches = [] } = useQuery({
    queryKey: ['matches', user?.email],
    queryFn: () => base44.entities.Match.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activities', user?.email],
    queryFn: () => base44.entities.Activity.filter({ created_by: user.email }, '-created_date', 200),
    enabled: !!user?.email,
  });

  const priorityLeads = useMemo(() => {
    const twoDaysAgo = subDays(new Date(), 2);
    const contactTypes = ['call', 'email', 'sms', 'visite', 'matching_proposition', 'matching_accepte'];

    return leads
      .filter((lead) => {
        const score = lead.score ?? 0;
        const isChaud = lead.categorie === 'CHAUD';
        const isTiede = lead.categorie === 'TIÈDE';
        const isHighPotential = score >= 70 || isChaud || isTiede;
        if (!isHighPotential) return false;

        const leadActivities = activities.filter(
          (a) =>
            (a.linked_to_id === lead.id && a.linked_to_type === 'lead') ||
            (a.linked_to_type === 'lead' && a.linked_to_id === lead.id)
        );
        const lastContact = leadActivities
          .filter((a) => contactTypes.includes(a.type))
          .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
        const lastContactDate = lastContact ? new Date(lastContact.created_date) : null;
        const needsAction = !lastContactDate || lastContactDate < twoDaysAgo;

        const leadMatches = matches.filter((m) => m.lead_id === lead.id);
        const hasPendingMatch =
          leadMatches.some((m) =>
            ['propose', 'visite_planifiee', 'visite_effectuee'].includes(m.status)
          ) || leadMatches.some((m) => m.status === 'accepte');

        return needsAction || hasPendingMatch;
      })
      .map((lead) => {
        const leadMatches = matches.filter((m) => m.lead_id === lead.id);
        const proposeMatch = leadMatches.find((m) => m.status === 'propose');
        const visiteMatch = leadMatches.find((m) =>
          ['visite_planifiee', 'visite_effectuee'].includes(m.status)
        );
        const accepteMatch = leadMatches.find((m) => m.status === 'accepte');

        let actionLabel = 'Rappeler';
        let actionIcon = Phone;
        if (accepteMatch) {
          actionLabel = 'Mandat à signer';
          actionIcon = FileSignature;
        } else if (visiteMatch) {
          actionLabel = 'Suivi visite';
          actionIcon = Calendar;
        } else if (proposeMatch) {
          actionLabel = 'Relancer proposition';
          actionIcon = AlertCircle;
        }

        return {
          ...lead,
          actionLabel,
          actionIcon,
        };
      })
      .slice(0, 6);
  }, [leads, matches, activities]);

  if (leadsLoading) {
    return (
      <div className={cn('bg-white rounded-2xl border border-[#E5E5E5] p-5', className)}>
        <h2 className="font-semibold mb-4">Leads prioritaires</h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden',
        className
      )}
    >
      <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between">
        <h2 className="font-semibold">Leads prioritaires</h2>
        {priorityLeads.length > 0 && (
          <span className="text-xs text-[#666666]">
            {priorityLeads.length} action{priorityLeads.length > 1 ? 's' : ''} à mener
          </span>
        )}
      </div>
      <div className="p-3">
        {priorityLeads.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-[#999999]">Aucun lead prioritaire pour le moment</p>
            <p className="text-xs text-[#BBBBBB] mt-1">
              Les leads à fort potentiel apparaîtront ici
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {priorityLeads.map((lead) => {
              const ActionIcon = lead.actionIcon;
              return (
                <Link
                  key={lead.id}
                  to={createPageUrl(`LeadDetail?id=${lead.id}`)}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl',
                    'hover:bg-[#FAFAFA] transition-colors group'
                  )}
                >
                  <div
                    className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                      lead.categorie === 'CHAUD' ? 'bg-red-50' : 'bg-amber-50'
                    )}
                  >
                    <ActionIcon
                      className={cn(
                        'w-4 h-4',
                        lead.categorie === 'CHAUD' ? 'text-red-500' : 'text-amber-500'
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {lead.first_name} {lead.last_name}
                    </p>
                    <p className="text-xs text-[#666666]">{lead.actionLabel}</p>
                  </div>
                  {lead.budget_max && formatPrice && (
                    <p className="text-xs font-medium text-[#333333] flex-shrink-0">
                      {formatPrice(lead.budget_max)}
                    </p>
                  )}
                  <ChevronRight className="w-4 h-4 text-[#CCCCCC] group-hover:text-[#666666] flex-shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
      {priorityLeads.length > 0 && (
        <div className="p-3 border-t border-[#E5E5E5]">
          <Link
            to={createPageUrl('Leads')}
            className="flex items-center justify-center gap-1 text-xs text-[#999999] hover:text-black transition-colors"
          >
            Voir tous les leads
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
