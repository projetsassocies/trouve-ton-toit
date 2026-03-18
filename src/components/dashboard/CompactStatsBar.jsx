import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { useAuth } from '@/lib/AuthContext';
import {
  CalendarCheck,
  FileSignature,
  Percent,
  Handshake,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { startOfDay, isAfter, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

const statConfig = {
  visites: {
    label: 'Visites planifiées',
    icon: CalendarCheck,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  mandats: {
    label: 'Mandats signés',
    icon: FileSignature,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  conversion: {
    label: 'Taux conversion',
    icon: Percent,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
  },
  signatures: {
    label: 'Signatures',
    icon: Handshake,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
};

export default function CompactStatsBar({ className }) {
  const { user } = useAuth();
  const today = startOfDay(new Date());

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['events', user?.email],
    queryFn: () => api.entities.Event.filter({ created_by: user.email }, '-date', 100),
    enabled: !!user?.email,
  });

  const { data: matches = [], isLoading: matchesLoading } = useQuery({
    queryKey: ['matches', user?.email],
    queryFn: () => api.entities.Match.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const isLoading = eventsLoading || matchesLoading;

  const stats = React.useMemo(() => {
    const visitEvents = events.filter((e) => {
      if (e.type !== 'visit') return false;
      if (!e.date) return false;
      const d = new Date(e.date);
      if (isNaN(d.getTime())) return false;
      if (e.status === 'completed' || e.status === 'cancelled') return false;
      return !isAfter(today, d) || isToday(d);
    });
    const visitesPlanifiees = visitEvents.length;

    const mandatsSignes = [...new Set(
      matches.filter((m) => m.status === 'accepte').map((m) => m.lead_id)
    )].length;

    const proposed = matches.filter((m) => m.status !== 'nouveau').length;
    const accepted = matches.filter((m) => m.status === 'accepte').length;
    const tauxConversion = proposed > 0 ? Math.round((accepted / proposed) * 100) : 0;

    const signingEvents = events.filter((e) => {
      if (e.type !== 'signing') return false;
      if (!e.date) return false;
      const d = new Date(e.date);
      if (isNaN(d.getTime())) return false;
      if (e.status === 'completed' || e.status === 'cancelled') return false;
      return !isAfter(today, d) || isToday(d);
    });
    const signatures = signingEvents.length;

    return {
      visites: visitesPlanifiees,
      mandats: mandatsSignes,
      conversion: tauxConversion,
      signatures,
    };
  }, [events, matches, today]);

  if (isLoading) {
    return (
      <div className={cn('flex flex-wrap gap-3', className)}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-14 w-24 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-wrap gap-3 items-stretch',
        className
      )}
      role="region"
      aria-label="Statistiques stratégiques"
    >
      {Object.entries(stats).map(([key, value]) => {
        const config = statConfig[key];
        const Icon = config?.icon;
        if (!config) return null;
        return (
          <div
            key={key}
            className={cn(
              'flex items-center gap-3 px-4 py-2.5 rounded-xl border border-[#E5E5E5] bg-white',
              'hover:shadow-sm hover:border-[#D0D0D0] transition-all'
            )}
          >
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', config.bg)}>
              <Icon className={cn('w-4 h-4', config.color)} />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-semibold tracking-tight">{key === 'conversion' ? `${value}%` : value}</p>
              <p className="text-xs text-[#666666] truncate">{config.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
