import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  UserPlus,
  CalendarCheck,
  TrendingUp,
  FileCheck,
  PenLine,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  subWeeks,
  subMonths,
  isWithinInterval,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const PERIODS = [
  { id: 'day', label: "Aujourd'hui" },
  { id: 'week', label: 'Cette semaine' },
  { id: 'month', label: 'Ce mois' },
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

function getPeriodRange(periodId) {
  const now = new Date();
  if (periodId === 'day') {
    return {
      start: startOfDay(now),
      end: endOfDay(now),
      prevStart: startOfDay(subDays(now, 1)),
      prevEnd: endOfDay(subDays(now, 1)),
    };
  }
  if (periodId === 'week') {
    return {
      start: startOfWeek(now, { locale: fr }),
      end: endOfWeek(now, { locale: fr }),
      prevStart: startOfWeek(subWeeks(now, 1), { locale: fr }),
      prevEnd: endOfWeek(subWeeks(now, 1), { locale: fr }),
    };
  }
  return {
    start: startOfMonth(now),
    end: endOfMonth(now),
    prevStart: startOfMonth(subMonths(now, 1)),
    prevEnd: endOfMonth(subMonths(now, 1)),
  };
}

export default function DashboardKPIs({ className }) {
  const { user } = useAuth();
  const [period, setPeriod] = useState('day');
  const range = getPeriodRange(period);

  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['leads', user?.email],
    queryFn: () => base44.entities.Lead.filter({ created_by: user.email }, '-created_date', 500),
    enabled: !!user?.email,
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['events', user?.email],
    queryFn: () => base44.entities.Event.filter({ created_by: user.email }, '-date', 200),
    enabled: !!user?.email,
  });

  const { data: matches = [], isLoading: matchesLoading } = useQuery({
    queryKey: ['matches', user?.email],
    queryFn: () => base44.entities.Match.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const isLoading = leadsLoading || eventsLoading || matchesLoading;

  const stats = useMemo(() => {
    const inRange = (dateStr) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return isWithinInterval(d, { start: range.start, end: range.end });
    };
    const inPrevRange = (dateStr) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return isWithinInterval(d, { start: range.prevStart, end: range.prevEnd });
    };

    const nouveauLead = leads.filter((l) => inRange(l.created_date)).length;
    const nouveauLeadPrev = leads.filter((l) => inPrevRange(l.created_date)).length;

    const visitEvents = events.filter((e) => {
      if (e.type !== 'visit') return false;
      if (e.status === 'completed' || e.status === 'cancelled') return false;
      return inRange(e.date);
    });
    const visitEventsPrev = events.filter((e) => {
      if (e.type !== 'visit') return false;
      if (e.status === 'completed' || e.status === 'cancelled') return false;
      return inPrevRange(e.date);
    });
    const visites = visitEvents.length;
    const visitesPrev = visitEventsPrev.length;

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
      <div className={cn('space-y-4', className)}>
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-lg" />
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 w-[140px] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-5', className)}>
      {/* Période : tabs - Aujourd'hui / Semaine / Mois */}
      <div className="flex gap-0 border-b border-border">
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

      {/* 5 cartes KPIs */}
      <div
        className="flex flex-wrap gap-4"
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
                'flex flex-col gap-3 p-5 rounded-2xl border min-w-[130px]',
                'bg-card border-border'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Icon className="w-5 h-5 text-secondary" />
                </div>
                {delta !== 0 && (
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
