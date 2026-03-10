import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Flame, Percent, Clock } from 'lucide-react';
import { subDays } from 'date-fns';
import { cn } from '@/lib/utils';

export default function BottomSummaryBar({ className }) {
  const { user } = useAuth();

  const { data: leads = [] } = useQuery({
    queryKey: ['leads', user?.email],
    queryFn: () => base44.entities.Lead.filter({ created_by: user.email }, '-created_date', 200),
    enabled: !!user?.email,
  });

  const { data: matches = [] } = useQuery({
    queryKey: ['matches', user?.email],
    queryFn: () => base44.entities.Match.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activities', user?.email],
    queryFn: () => base44.entities.Activity.filter({ created_by: user.email }, '-created_date', 300),
    enabled: !!user?.email,
  });

  const stats = useMemo(() => {
    const hotLeads = leads.filter((l) => l.categorie === 'CHAUD').length;
    const proposed = matches.filter((m) => m.status !== 'nouveau').length;
    const accepted = matches.filter((m) => m.status === 'accepte').length;
    const conversionRate = proposed > 0 ? Math.round((accepted / proposed) * 100) : 0;

    const contactTypes = ['call', 'email', 'sms'];
    const leadResponseTimes = [];
    leads.forEach((lead) => {
      const firstContact = activities
        .filter(
          (a) =>
            a.linked_to_type === 'lead' &&
            a.linked_to_id === lead.id &&
            contactTypes.includes(a.type)
        )
        .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))[0];
      const createdAt = lead.created_date ? new Date(lead.created_date) : null;
      if (firstContact && createdAt) {
        const diffDays = (new Date(firstContact.created_date) - createdAt) / (1000 * 60 * 60 * 24);
        leadResponseTimes.push(diffDays);
      }
    });
    const avgResponseDays =
      leadResponseTimes.length > 0
        ? (leadResponseTimes.reduce((a, b) => a + b, 0) / leadResponseTimes.length).toFixed(1)
        : null;

    return { hotLeads, conversionRate, avgResponseDays };
  }, [leads, matches, activities]);

  const needsImprovement = stats.avgResponseDays !== null && parseFloat(stats.avgResponseDays) > 3;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-4 md:gap-8 py-4 px-5 rounded-2xl',
        'bg-white border border-[#EBEBEB]',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <Flame className="w-4 h-4 text-amber-500" />
        <span className="text-sm font-medium text-[#1a1a1a]">
          {stats.hotLeads} Lead{stats.hotLeads > 1 ? 's' : ''} chaud{stats.hotLeads > 1 ? 's' : ''}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Percent className="w-4 h-4 text-secondary" />
        <span className="text-sm font-medium text-[#1a1a1a]">
          {stats.conversionRate}% Taux de conversion
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-[#666] dark:text-[#999]" />
        <span className="text-sm font-medium text-[#1a1a1a]">
          {stats.avgResponseDays !== null ? `${stats.avgResponseDays}j` : '—'} Temps moy. de réponse
        </span>
        {needsImprovement && (
          <span className="text-xs text-amber-600 font-medium">À améliorer</span>
        )}
      </div>
    </div>
  );
}
