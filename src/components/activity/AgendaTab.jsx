import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Home,
  Phone,
  Users,
  FileSignature,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isFuture,
  isToday,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import CreateEventModal from './CreateEventModal';

const eventTypeConfig = {
  visit: { label: 'Visite', icon: Home, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  call: { label: 'Appel', icon: Phone, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  meeting: { label: 'Réunion', icon: Users, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  signing: { label: 'Signature', icon: FileSignature, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  other: { label: 'Autre', icon: CalendarIcon, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' },
};

const statusConfig = {
  pending: { label: 'Prévu', color: 'bg-gray-100 text-gray-700' },
  planned: { label: 'Prévu', color: 'bg-gray-100 text-gray-700' },
  confirmed: { label: 'Confirmé', color: 'bg-green-100 text-green-700' },
  completed: { label: 'Terminé', color: 'bg-blue-100 text-blue-700' },
  cancelled: { label: 'Annulé', color: 'bg-red-100 text-red-700' },
};

export default function AgendaTab() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-date'),
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list(),
  });

  const { data: listings = [] } = useQuery({
    queryKey: ['listings'],
    queryFn: () => base44.entities.Listing.list(),
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Event.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['events']);
      queryClient.invalidateQueries(['activities']);
    },
  });

  const handleMarkAsCompleted = async (event) => {
    await updateEventMutation.mutateAsync({
      id: event.id,
      data: { status: 'completed' },
    });
    await base44.entities.Activity.create({
      type: 'event',
      title: `Événement terminé: ${event.title}`,
      content: event.description,
      linked_to_type: event.linked_to_type,
      linked_to_id: event.linked_to_id,
    });
  };

  const getLinkedItem = (event) => {
    if (!event.linked_to_id) return null;
    if (event.linked_to_type === 'lead') {
      return leads.find((l) => l.id === event.linked_to_id);
    }
    return listings.find((l) => l.id === event.linked_to_id);
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const getEventsForDay = (day) => {
    return events.filter((event) => {
      if (!event.date) return false;
      const eventDate = new Date(event.date);
      if (isNaN(eventDate.getTime())) return false;
      return isSameDay(eventDate, day);
    });
  };

  const groupedEvents = events.reduce((groups, event) => {
    if (!event.date) return groups;
    const date = new Date(event.date);
    if (isNaN(date.getTime())) return groups;
    let label;
    if (isToday(date)) label = "Aujourd'hui";
    else if (isFuture(date)) label = 'À venir';
    else label = 'Passés';
    if (!groups[label]) groups[label] = [];
    groups[label].push(event);
    return groups;
  }, {});

  const orderedGroups = ["Aujourd'hui", 'À venir', 'Passés'];
  const selectedDayEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  const renderEventCard = (event) => {
    const typeConf = eventTypeConfig[event.type] || eventTypeConfig.other;
    const Icon = typeConf.icon;
    const statusConf = statusConfig[event.status] || statusConfig.pending;
    const linkedItem = getLinkedItem(event);

    return (
      <div
        key={event.id}
        className="bg-white rounded-xl border border-[#E5E5E5] p-4 hover:shadow-sm transition-shadow"
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center border flex-shrink-0',
              typeConf.bg,
              typeConf.border
            )}
          >
            <Icon className={cn('w-5 h-5', typeConf.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="font-medium text-sm">{event.title}</h4>
              <Badge className={cn(statusConf.color, 'border-0 text-xs')}>
                {statusConf.label}
              </Badge>
            </div>
            {event.date && !isNaN(new Date(event.date).getTime()) && (
              <div className="text-xs text-[#666666] mb-1">
                {format(new Date(event.date), 'dd MMM HH:mm', { locale: fr })}
                {event.end_date &&
                  !isNaN(new Date(event.end_date).getTime()) &&
                  ` - ${format(new Date(event.end_date), 'HH:mm', { locale: fr })}`}
              </div>
            )}
            {event.location && (
              <p className="text-xs text-[#999999] mb-2">📍 {event.location}</p>
            )}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Badge className={cn(typeConf.bg, typeConf.color, 'border-0 text-xs')}>
                  {typeConf.label}
                </Badge>
                {linkedItem && (
                  <Badge variant="outline" className="text-xs">
                    {event.linked_to_type === 'lead' ? '👤' : '🏠'}{' '}
                    {event.linked_to_type === 'lead'
                      ? `${linkedItem.first_name} ${linkedItem.last_name}`
                      : linkedItem.title}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                {event.status !== 'completed' && event.status !== 'cancelled' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMarkAsCompleted(event)}
                    className="rounded-lg text-xs h-7"
                  >
                    Terminé
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditEvent(event);
                    setCreateModalOpen(true);
                  }}
                  className="rounded-lg text-xs h-7"
                >
                  Modifier
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <div className="text-center py-12 text-[#999999]">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setCreateModalOpen(true)} className="rounded-xl">
          Nouvel événement
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E5E5E5] p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold capitalize">
              {format(currentDate, 'MMMM yyyy', { locale: fr })}
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                className="rounded-lg"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCurrentDate(new Date());
                  setSelectedDate(new Date());
                }}
                className="rounded-lg"
              >
                Aujourd'hui
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                className="rounded-lg"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-[#999999] py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isTodayDate = isSameDay(day, new Date());

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    'aspect-square p-2 rounded-lg border transition-all relative',
                    !isCurrentMonth && 'text-[#CCCCCC]',
                    isCurrentMonth && 'hover:bg-[#FAFAFA]',
                    isSelected && 'border-blue-600 bg-blue-50',
                    isTodayDate && !isSelected && 'border-blue-600',
                    !isSelected && !isTodayDate && 'border-[#E5E5E5]'
                  )}
                >
                  <div className="text-sm font-medium">{format(day, 'd')}</div>
                  {dayEvents.length > 0 && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {dayEvents.slice(0, 3).map((_, i) => (
                        <div key={i} className="w-1 h-1 rounded-full bg-blue-600" />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right panel: selected day or grouped list */}
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 overflow-auto max-h-[500px] lg:max-h-none">
          {selectedDate && selectedDayEvents.length > 0 ? (
            <>
              <h3 className="font-semibold mb-4">
                {format(selectedDate, 'dd MMMM yyyy', { locale: fr })}
              </h3>
              <div className="space-y-3">{selectedDayEvents.map(renderEventCard)}</div>
            </>
          ) : selectedDate ? (
            <div className="text-center py-8">
              <h3 className="font-semibold mb-2">
                {format(selectedDate, 'dd MMMM yyyy', { locale: fr })}
              </h3>
              <CalendarIcon className="w-8 h-8 text-[#CCCCCC] mx-auto mb-2" />
              <p className="text-sm text-[#999999] mb-4">Aucun événement ce jour</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCreateModalOpen(true)}
                className="rounded-xl"
              >
                Créer un événement
              </Button>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8">
              <CalendarIcon className="w-8 h-8 text-[#CCCCCC] mx-auto mb-2" />
              <p className="text-sm text-[#999999] mb-4">Aucun événement</p>
              <Button
                size="sm"
                onClick={() => setCreateModalOpen(true)}
                className="rounded-xl"
              >
                Nouvel événement
              </Button>
            </div>
          ) : (
            <>
              <h3 className="font-semibold mb-4">Tous les événements</h3>
              <div className="space-y-6">
                {orderedGroups.map((label) => {
                  const groupEvents = groupedEvents[label];
                  if (!groupEvents || groupEvents.length === 0) return null;
                  return (
                    <div key={label}>
                      <h4 className="text-xs font-semibold text-[#666666] mb-2">{label}</h4>
                      <div className="space-y-2">{groupEvents.map(renderEventCard)}</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <CreateEventModal
        open={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setEditEvent(null);
        }}
        event={editEvent}
      />
    </div>
  );
}
