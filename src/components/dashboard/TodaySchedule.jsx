import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import { Calendar, Video, MapPin, Phone, ChevronRight } from 'lucide-react';
import { format, isToday } from 'date-fns';
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

export default function TodaySchedule({ className }) {
  const { user } = useAuth();
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', user?.email],
    queryFn: () => base44.entities.Event.filter({ created_by: user.email }, '-date', 100),
    enabled: !!user?.email,
  });

  const todayEvents = events
    .filter((e) => {
      if (!e.date || ['completed', 'cancelled'].includes(e.status)) return false;
      const d = new Date(e.date);
      return isToday(d);
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const formatDuration = (start, end) => {
    if (!start || !end) return '';
    const s = new Date(start);
    const e = new Date(end);
    const min = Math.round((e - s) / 60000);
    if (min < 60) return `${min} min`;
    return `${Math.floor(min / 60)}h`;
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

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-secondary" />
            <h3 className="font-semibold">Emploi du temps</h3>
          </div>
          {todayEvents.length > 0 && (
            <Badge className="bg-primary text-primary-foreground">
              {todayEvents.length} rendez-vous
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {todayEvents.length === 0 ? (
          <div className="py-8 text-center">
            <Calendar className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Aucun rendez-vous aujourd'hui</p>
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
            {todayEvents.map((event) => {
              const config = eventTypeConfig[event.type] || eventTypeConfig.call;
              const Icon = config.icon;
              const eventDate = new Date(event.date);
              const endDate = event.end_date ? new Date(event.end_date) : new Date(eventDate.getTime() + 30 * 60000);
              const duration = formatDuration(event.date, endDate);

              return (
                <Link
                  key={event.id}
                  to={createPageUrl('Activity')}
                  className="group flex gap-3 p-3 rounded-lg border border-border bg-card hover:bg-secondary/10 hover:border-secondary/30 transition-colors"
                >
                  <div className="flex flex-col items-center min-w-[44px]">
                    <span className="text-sm font-medium text-foreground">
                      {format(eventDate, 'HH:mm')}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{duration}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-secondary/10 group-hover:bg-secondary/20">
                    <Icon className="w-4 h-4 text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {event.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {event.description || config.label}
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
