import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import { Calendar, Video, MapPin, Phone } from 'lucide-react';
import { format, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
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
      <div className={cn('bg-white dark:bg-[#111] rounded-2xl border border-[#E5E5E5] dark:border-[#333] p-4', className)}>
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-[#095237]" />
          <h2 className="font-semibold text-[#111] dark:text-white">Aujourd'hui</h2>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-white dark:bg-[#111] rounded-2xl border border-[#E5E5E5] dark:border-[#333] overflow-hidden', className)}>
      <div className="p-4 border-b border-[#E5E5E5] dark:border-[#333] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#095237]" />
          <h2 className="font-semibold text-[#111] dark:text-white">Aujourd'hui</h2>
        </div>
        {todayEvents.length > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-[#dcfce7] dark:bg-[#14532d] text-[#166534] dark:text-[#86efac] text-xs font-medium">
            {todayEvents.length} rendez-vous
          </span>
        )}
      </div>
      <div className="p-3">
        {todayEvents.length === 0 ? (
          <div className="py-8 text-center">
            <Calendar className="w-10 h-10 text-[#CCC] mx-auto mb-2" />
            <p className="text-sm text-[#999]">Aucun rendez-vous aujourd'hui</p>
            <Link
              to={createPageUrl('Activity')}
              className="text-xs text-[#095237] hover:underline mt-1 inline-block"
            >
              Voir l'activité
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
                  className="flex gap-3 p-3 rounded-xl hover:bg-[#FAFAFA] dark:hover:bg-[#1a1a1a] transition-colors"
                >
                  <div className="flex flex-col items-center min-w-[44px]">
                    <span className="text-sm font-medium text-[#111] dark:text-white">
                      {format(eventDate, 'HH:mm')}
                    </span>
                    <span className="text-[10px] text-[#999]">{duration}</span>
                  </div>
                  <Icon className="w-4 h-4 text-[#095237] flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-[#111] dark:text-white truncate">
                      {event.title}
                    </p>
                    <p className="text-xs text-[#666] dark:text-[#999] truncate">
                      {event.description || config.label}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
