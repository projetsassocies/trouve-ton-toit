import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { useAuth } from '@/lib/AuthContext';
import {
  UserPlus,
  CalendarCheck,
  TrendingUp,
  FileCheck,
  PenLine,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Mêmes périodes que la page Analyse pour synchronisation des stats
const PERIODS = [
  { id: '7d', label: '7 derniers jours' },
  { id: '30d', label: '30 derniers jours' },
  { id: '90d', label: '90 derniers jours' },
  { id: 'all', label: 'Tout' },
];

const statConfig = {
  nouveauLead: {
    label: 'Nouveau lead',
    icon: UserPlus,
  },
  visites: {
    label: 'Visites planifiées',
    icon: CalendarCheck,
  },
  conversion: {
    label: 'Taux de conversion',
    icon: TrendingUp,
    isPercent: true,
  },
  mandats: {
    label: 'Prêt pour mandats',
    icon: FileCheck,
  },
  signatures: {
    label: 'Signatures',
    icon: PenLine,
  },
};

/**
 * Périodes glissantes identiques à la page Analyse (match.created_date >= cutoff).
 * Retourne { cutoff, prevCutoff } en ms pour la période courante et la période précédente.
 */
function getPeriodRange(periodId) {
  const now = Date.now();
  const msDay = 86400000;
  if (periodId === 'all') {
    return {
      cutoff: null,
      prevCutoff: null,
      prevCutoffEnd: null,
    };
  }
  const days = periodId === '7d' ? 7 : periodId === '30d' ? 30 : 90;
  const cutoff = now - days * msDay;
  const prevCutoffEnd = cutoff;
  const prevCutoff = cutoff - days * msDay;
  return { cutoff, prevCutoff, prevCutoffEnd };
}

export default function DashboardKPIs({ className }) {
  const { user } = useAuth();
  const [period, setPeriod] = useState('30d');
  const range = getPeriodRange(period);

  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['leads', user?.email],
    queryFn: () => api.entities.Lead.filter({ created_by: user.email }, '-created_date', 3000),
    enabled: !!user?.email,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['events', user?.email],
    queryFn: () => api.entities.Event.filter({ created_by: user.email }, '-date', 1000),
    enabled: !!user?.email,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const { data: matches = [], isLoading: matchesLoading } = useQuery({
    queryKey: ['matches', user?.email],
    queryFn: () => api.entities.Match.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user?.email,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const isLoading = leadsLoading || eventsLoading || matchesLoading;

  const stats = useMemo(() => {
    const inRange = (dateStr) => {
      if (!dateStr) return false;
      if (range.cutoff === null) return true;
      return new Date(dateStr).getTime() >= range.cutoff;
    };
    const inPrevRange = (dateStr) => {
      if (!dateStr) return false;
      if (range.prevCutoff === null) return false;
      const t = new Date(dateStr).getTime();
      return t >= range.prevCutoff && t < range.prevCutoffEnd;
    };

    const nouveauLead = leads.filter((l) => inRange(l.created_date)).length;
    const nouveauLeadPrev = leads.filter((l) => inPrevRange(l.created_date)).length;

    // Visites = matchs avec statut visite/accepte (même définition que page Analyse)
    const filteredMatches = range.cutoff === null
      ? matches
      : matches.filter((m) => inRange(m.created_date));
    const filteredMatchesPrev = range.prevCutoff === null
      ? []
      : matches.filter((m) => inPrevRange(m.created_date));
    const visites = filteredMatches.filter((m) =>
      ['visite_planifiee', 'visite_effectuee', 'accepte'].includes(m.status)
    ).length;
    const visitesPrev = filteredMatchesPrev.filter((m) =>
      ['visite_planifiee', 'visite_effectuee', 'accepte'].includes(m.status)
    ).length;

    const proposed = matches.filter((m) => {
      const inP = inRange(m.created_date);
      return inP && m.status !== 'nouveau';
    }).length;
    const accepted = matches.filter((m) => inRange(m.created_date) && m.status === 'accepte').length;
    const proposedPrev = matches.filter((m) => {
      const inP = inPrevRange(m.created_date);
      return inP && m.status !== 'nouveau';
    }).length;
    const acceptedPrev = matches.filter((m) => inPrevRange(m.created_date) && m.status === 'accepte').length;
    const tauxConversion = proposed > 0 ? Math.round((accepted / proposed) * 100) : 0;
    const tauxConversionPrev = proposedPrev > 0 ? Math.round((acceptedPrev / proposedPrev) * 100) : 0;

    const mandatsReady = matches.filter((m) => {
      if (!inRange(m.updated_date || m.created_date)) return false;
      return ['propose', 'visite_planifiee', 'visite_effectuee'].includes(m.status);
    }).length;
    const mandatsReadyPrev = matches.filter((m) => {
      if (!inPrevRange(m.updated_date || m.created_date)) return false;
      return ['propose', 'visite_planifiee', 'visite_effectuee'].includes(m.status);
    }).length;

    const signingEvents = events.filter((e) => {
      if (e.type !== 'signing') return false;
      if (e.status === 'completed' || e.status === 'cancelled') return false;
      return inRange(e.date);
    });
    const signingEventsPrev = events.filter((e) => {
      if (e.type !== 'signing') return false;
      if (e.status === 'completed' || e.status === 'cancelled') return false;
      return inPrevRange(e.date);
    });
    const signatures = signingEvents.length;
    const signaturesPrev = signingEventsPrev.length;

    return [
      {
        key: 'nouveauLead',
        value: nouveauLead,
        delta: nouveauLead - nouveauLeadPrev,
        config: statConfig.nouveauLead,
      },
      {
        key: 'visites',
        value: visites,
        delta: visites - visitesPrev,
        config: statConfig.visites,
      },
      {
        key: 'conversion',
        value: tauxConversion,
        delta: tauxConversion - tauxConversionPrev,
        config: statConfig.conversion,
      },
      {
        key: 'mandats',
        value: mandatsReady,
        delta: mandatsReady - mandatsReadyPrev,
        config: statConfig.mandats,
      },
      {
        key: 'signatures',
        value: signatures,
        delta: signatures - signaturesPrev,
        config: statConfig.signatures,
      },
    ];
  }, [leads, events, matches, range]);

  if (isLoading) {
    return (
      <div className={cn('space-y-4 w-full', className)}>
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 w-full">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 min-w-0 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-5 w-full', className)}>
      {/* Période : identique à la page Analyse (7d, 30d, 90d, Tout) */}
      <div className="flex gap-0 border-b border-border w-full">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={cn(
              'px-5 py-2.5 text-sm font-medium transition-colors relative -mb-px',
              period === p.id
                ? 'text-secondary border-b-2 border-secondary'
                : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* 5 cartes KPIs - pleine largeur comme séparation entre chat et infos */}
      <div
        className="flex flex-wrap lg:flex-nowrap gap-4 w-full min-w-0"
        role="region"
        aria-label="Statistiques KPIs"
      >
        {stats.map(({ key, value, delta, config }) => {
          const Icon = config.icon;
          const deltaStr = config.isPercent
            ? (delta >= 0 ? `+${delta}%` : `${delta}%`)
            : (delta >= 0 ? `+${delta}` : `${delta}`);
          return (
            <div
              key={key}
              className={cn(
                'flex flex-col gap-3 p-5 rounded-2xl border min-w-0 flex-1 basis-0 lg:basis-0',
                'bg-card border-border'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Icon className="w-5 h-5 text-secondary" />
                </div>
                {delta !== 0 && delta != null && (
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                    {deltaStr}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{config.label}</p>
              <p className="text-2xl font-bold text-foreground leading-none">
                {config.isPercent ? `${value}%` : value}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
