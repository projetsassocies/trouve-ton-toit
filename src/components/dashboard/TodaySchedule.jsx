import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import {
  Calendar,
  Video,
  MapPin,
  Phone,
  ChevronRight,
  RotateCcw,
  CalendarClock,
} from 'lucide-react';
import { format, isToday, isAfter, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const eventTypeConfig = {
  visit: { label: 'Visite', icon: MapPin },
  signing: { label: 'Signature', icon: Phone },
  call: { label: 'Appel', icon: Phone },
  meeting: { label: 'Réunion', icon: Video },
};

// Convertit "HH:mm" ou Date en minutes depuis minuit
function timeToMinutes(timeInput) {
  if (typeof timeInput === 'string' && timeInput.includes(':')) {
    const [h, m] = timeInput.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }
  const d = timeInput instanceof Date ? timeInput : new Date(timeInput);
  return d.getHours() * 60 + d.getMinutes();
}

// Heure actuelle en minutes (pour comparaison)
function getCurrentTimeMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

const VIEWS = [
  { id: 'past', label: 'Passé', icon: RotateCcw },
  { id: 'today', label: "Aujourd'hui", icon: Calendar },
  { id: 'upcoming', label: 'À venir', icon: CalendarClock },
];

export default function TodaySchedule({ className }) {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState('today');

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', user?.email],
    queryFn: () => api.entities.Event.filter({ created_by: user.email }, '-date', 200),
    enabled: !!user?.email,
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads', user?.email],
    queryFn: () => api.entities.Lead.filter({ created_by: user.email }, '-created_date', 200),
    enabled: !!user?.email,
  });

  const { data: listings = [] } = useQuery({
    queryKey: ['listings', user?.email],
    queryFn: () => api.entities.Listing.list('-created_date'),
    enabled: !!user?.email,
  });

  const validEvents = events.filter((e) => {
    if (!e.date || ['completed', 'cancelled'].includes(e.status)) return false;
    const d = new Date(e.date);
    return !isNaN(d.getTime());
  });

  const todayEvents = useMemo(
    () =>
      validEvents
        .filter((e) => isToday(new Date(e.date)))
        .sort((a, b) => new Date(a.date) - new Date(b.date)),
    [validEvents]
  );

  const upcomingEvents = useMemo(
    () =>
      validEvents
        .filter((e) => isAfter(new Date(e.date), endOfDay(new Date())))
        .sort((a, b) => new Date(a.date) - new Date(b.date)),
    [validEvents]
  );

  const filteredAppointments = useMemo(() => {
    const now = getCurrentTimeMinutes();
    if (activeView === 'past') {
      return todayEvents
        .filter((e) => timeToMinutes(e.date) < now)
        .reverse();
    }
    if (activeView === 'upcoming') {
      return upcomingEvents;
    }
    // Vue Aujourd'hui : 2 derniers RDV passés + TOUS les RDV restants
    const past = todayEvents.filter((e) => timeToMinutes(e.date) < now);
    const future = todayEvents.filter((e) => timeToMinutes(e.date) >= now);
    const last2Past = past.slice(-2);
    return [...last2Past, ...future];
  }, [activeView, todayEvents, upcomingEvents]);

  // Prochain RDV (le plus imminent) : mise en avant fluo (uniquement vue Aujourd'hui)
  const nextEventId = useMemo(() => {
    const now = getCurrentTimeMinutes();
    const next = todayEvents.find((e) => timeToMinutes(e.date) >= now);
    return next?.id ?? null;
  }, [todayEvents]);

  const getAppointmentStyle = (event) => {
    if (activeView !== 'today') {
      return 'neutral';
    }
    const aptTime = timeToMinutes(event.date);
    const now = getCurrentTimeMinutes();

    if (aptTime < now) {
      return 'past';
    }
    // Le prochain RDV à venir = fluo (peu importe s'il est dans 30 min ou 2h)
    if (event.id === nextEventId) {
      return 'highlighted';
    }
    return 'future';
  };

  const remainingTodayCount = useMemo(
    () => todayEvents.filter((e) => timeToMinutes(e.date) >= getCurrentTimeMinutes()).length,
    [todayEvents]
  );

  const upcomingTotalCount = upcomingEvents.length;

  const formatDuration = (start, end) => {
    if (!start || !end) return '';
    const s = new Date(start);
    const e = new Date(end);
    const min = Math.round((e - s) / 60000);
    if (min < 60) return `${min} min`;
    return `${Math.floor(min / 60)}h${min % 60 ? min % 60 : ''}`;
  };

  const formatDisplayDate = (date, forUpcoming = false) => {
    const d = new Date(date);
    if (isToday(d) || !forUpcoming) return format(d, 'HH:mm');
    return format(d, "dd MMM", { locale: fr });
  };

  const formatDisplayTime = (date) => {
    return format(new Date(date), 'HH:mm', { locale: fr });
  };

  const getEventSubtitle = (event, config) => {
    if (event.description?.trim()) return event.description;
    if (event.type === 'visit' && event.linked_to_type === 'listing' && event.linked_to_id) {
      const listing = listings.find((l) => l.id === event.linked_to_id);
      if (listing) {
        const type = listing.property_type ? `Appartement ${String(listing.property_type).toUpperCase()}` : 'Bien';
        const loc = listing.city || listing.address ? ' - ' + (listing.city || listing.address) : '';
        return `${type}${loc}`;
      }
    }
    if ((event.type === 'visit' || event.type === 'call') && event.linked_to_type === 'lead' && event.linked_to_id) {
      const lead = leads.find((l) => l.id === event.linked_to_id);
      if (lead) return `avec ${lead.first_name} ${lead.last_name}`;
    }
    return config.label;
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-secondary" />
            <h2 className="font-semibold">Aujourd'hui</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasAnyEvents = todayEvents.length > 0 || upcomingEvents.length > 0;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-secondary" />
          <h3 className="font-semibold">Emploi du temps</h3>
        </div>

        {/* 3 vues avec état actif */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {VIEWS.map((view) => {
            const Icon = view.icon;
            const isActive = activeView === view.id;
            return (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'bg-muted/40 text-secondary border border-border'
                    : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
                )}
              >
                <Icon className={cn('w-4 h-4', isActive && 'text-secondary')} />
                {isActive && (
                  <span className="animate-in fade-in slide-in-from-left-2 duration-200">
                    {view.label}
                  </span>
                )}
              </button>
            );
          })}
          {(activeView === 'today' && remainingTodayCount > 0) ||
          (activeView === 'upcoming' && upcomingTotalCount > 0) ? (
            <Badge
              className={cn(
                'ml-auto bg-primary text-primary-foreground',
                activeView === 'upcoming' && 'bg-secondary text-secondary-foreground'
              )}
            >
              {activeView === 'today'
                ? `${remainingTodayCount} restants`
                : `${upcomingTotalCount} rendez-vous`}
            </Badge>
          ) : null}
        </div>
      </CardHeader>

      <CardContent>
        {!hasAnyEvents || filteredAppointments.length === 0 ? (
          <div className="py-8 text-center">
            <Calendar className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {activeView === 'past'
                ? 'Aucun rendez-vous passé aujourd\'hui'
                : activeView === 'upcoming'
                  ? 'Aucun rendez-vous à venir'
                  : 'Aucun rendez-vous aujourd\'hui'}
            </p>
            <Link
              to={createPageUrl('Activity')}
              className="text-sm text-secondary hover:underline mt-2 inline-flex items-center gap-1"
            >
              Voir l'activité
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredAppointments.map((event) => {
              const config = eventTypeConfig[event.type] || eventTypeConfig.call;
              const Icon = config.icon;
              const eventDate = new Date(event.date);
              const endDate = event.end_date
                ? new Date(event.end_date)
                : new Date(eventDate.getTime() + 30 * 60000);
              const duration = formatDuration(event.date, endDate);
              const style = getAppointmentStyle(event);

              return (
                <Link
                  key={event.id}
                  to={createPageUrl('Activity')}
                  className={cn(
                    'group flex gap-3 p-3 rounded-lg border border-border transition-colors',
                    'hover:bg-secondary/10 hover:border-secondary/30',
                    style === 'highlighted' && 'bg-primary/15 border-primary/40',
                    style === 'past' && 'opacity-60',
                    (style === 'future' || style === 'neutral') && 'bg-card'
                  )}
                >
                  <div className="flex flex-col items-center min-w-[44px] text-center">
                    {activeView === 'upcoming' ? (
                      <>
                        <span className="text-sm font-medium text-foreground">
                          {format(new Date(event.date), 'dd MMM', { locale: fr })}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDisplayTime(event.date)}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-medium text-foreground">
                          {formatDisplayDate(event.date)}
                        </span>
                        {activeView === 'today' && duration && (
                          <span className="text-[10px] text-muted-foreground">{duration}</span>
                        )}
                      </>
                    )}
                  </div>
                  <div
                    className={cn(
                      'p-2 rounded-lg flex-shrink-0',
                      style === 'highlighted' ? 'bg-primary/20' : 'bg-secondary/10 group-hover:bg-secondary/20'
                    )}
                  >
                    <Icon className={cn('w-4 h-4', style === 'highlighted' ? 'text-primary' : 'text-secondary')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{event.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {getEventSubtitle(event, config)}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-secondary flex-shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
