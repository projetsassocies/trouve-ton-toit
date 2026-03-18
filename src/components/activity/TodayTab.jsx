import React from 'react';
import { api } from '@/api/apiClient';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  CheckSquare,
  FileText,
  Plus,
  MapPin,
  Clock,
} from 'lucide-react';
import {
  format,
  isToday,
  isSameDay,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const eventTypeLabels = {
  visit: 'Visite',
  call: 'Appel',
  meeting: 'Réunion',
  signing: 'Signature',
  other: 'Événement',
};

export default function TodayTab({ onNavigateToAgenda, onNavigateToTasks, onNavigateToNotes }) {
  const today = new Date();
  const dayStart = startOfDay(today);
  const dayEnd = endOfDay(today);

  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ['events'],
    queryFn: () => api.entities.Event.list('-date'),
  });

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.entities.Task.list('-created_date'),
  });

  const { data: notes = [], isLoading: loadingNotes } = useQuery({
    queryKey: ['notes'],
    queryFn: () => api.entities.Note.list('-updated_date'),
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => api.entities.Lead.list(),
  });

  const { data: listings = [] } = useQuery({
    queryKey: ['listings'],
    queryFn: () => api.entities.Listing.list(),
  });

  const todayEvents = events.filter((e) => {
    if (!e.date) return false;
    const d = new Date(e.date);
    return isSameDay(d, today) && !isNaN(d.getTime());
  }).sort((a, b) => new Date(a.date) - new Date(b.date));

  const todayTasks = tasks.filter((t) => {
    if (!t.due_date) return false;
    const d = new Date(t.due_date);
    return isSameDay(d, today) && !isNaN(d.getTime()) && t.status !== 'completed';
  });

  const recentNotes = notes
    .filter((n) => {
      const d = n.updated_date || n.created_date;
      if (!d) return false;
      return isSameDay(new Date(d), today);
    })
    .slice(0, 3);

  const isLoading = loadingEvents || loadingTasks || loadingNotes;

  const getLinkedItem = (item) => {
    if (!item.linked_to_id) return null;
    if (item.linked_to_type === 'lead') {
      return leads.find((l) => l.id === item.linked_to_id);
    }
    return listings.find((l) => l.id === item.linked_to_id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-sm text-neutral-500">Chargement...</div>
      </div>
    );
  }

  const isEmpty = todayEvents.length === 0 && todayTasks.length === 0 && recentNotes.length === 0;

  return (
    <div className="space-y-8">
      {/* Header du jour */}
      <div>
        <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wide">
          {format(today, 'EEEE d MMMM yyyy', { locale: fr })}
        </h2>
      </div>

      {isEmpty ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <EmptySection
            icon={Calendar}
            title="Aucun événement aujourd'hui"
            description="Planifiez votre journée"
            actionLabel="Voir l'agenda"
            onAction={onNavigateToAgenda}
            onCreate={onNavigateToAgenda}
          />
          <EmptySection
            icon={CheckSquare}
            title="Aucune tâche à faire"
            description="Vos tâches du jour apparaîtront ici"
            actionLabel="Voir les tâches"
            onAction={onNavigateToTasks}
            onCreate={onNavigateToTasks}
          />
          <EmptySection
            icon={FileText}
            title="Aucune note récente"
            description="Prenez des notes pendant vos échanges"
            actionLabel="Voir les notes"
            onAction={onNavigateToNotes}
            onCreate={onNavigateToNotes}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Événements du jour */}
          <section className="bg-white rounded-xl border border-neutral-200/80 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-neutral-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-neutral-500" />
                Événements
              </h3>
              {todayEvents.length > 0 && (
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={onNavigateToAgenda}>
                  Voir tout
                </Button>
              )}
            </div>
            {todayEvents.length === 0 ? (
              <div className="py-8 text-center">
                <Calendar className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                <p className="text-sm text-neutral-500">Rien de prévu</p>
                <Button variant="outline" size="sm" className="mt-3 rounded-lg" onClick={onNavigateToAgenda}>
                  <Plus className="w-3 h-3 mr-1" />
                  Ajouter
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {todayEvents.map((event) => {
                  const linked = getLinkedItem(event);
                  return (
                    <div
                      key={event.id}
                      className="p-3 rounded-lg border border-neutral-100 hover:border-neutral-200 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-neutral-900 truncate">
                            {event.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500">
                            {event.date && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(new Date(event.date), 'HH:mm', { locale: fr })}
                              </span>
                            )}
                            {event.location && (
                              <span className="flex items-center gap-1 truncate">
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                {event.location}
                              </span>
                            )}
                          </div>
                          {linked && (
                            <Link
                              to={createPageUrl('LeadDetail', `id=${event.linked_to_id}`)}
                              className="text-xs text-primary hover:underline mt-1 inline-block"
                            >
                              {event.linked_to_type === 'lead'
                                ? `${linked.first_name} ${linked.last_name}`
                                : linked.title}
                            </Link>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {eventTypeLabels[event.type] || 'Événement'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Tâches du jour */}
          <section className="bg-white rounded-xl border border-neutral-200/80 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-neutral-900 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-neutral-500" />
                Tâches à faire
              </h3>
              {todayTasks.length > 0 && (
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={onNavigateToTasks}>
                  Voir tout
                </Button>
              )}
            </div>
            {todayTasks.length === 0 ? (
              <div className="py-8 text-center">
                <CheckSquare className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                <p className="text-sm text-neutral-500">Aucune tâche</p>
                <Button variant="outline" size="sm" className="mt-3 rounded-lg" onClick={onNavigateToTasks}>
                  <Plus className="w-3 h-3 mr-1" />
                  Ajouter
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {todayTasks.map((task) => {
                  const linked = getLinkedItem(task);
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-neutral-100 hover:border-neutral-200 transition-colors"
                    >
                      <div
                        className={cn(
                          'w-4 h-4 rounded border flex-shrink-0',
                          task.status === 'completed' ? 'bg-primary border-primary' : 'border-neutral-300'
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 truncate">
                          {task.title}
                        </p>
                        {linked && (
                          <p className="text-xs text-neutral-500 truncate">
                            {task.linked_to_type === 'lead'
                              ? `${linked.first_name} ${linked.last_name}`
                              : linked.title}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Notes récentes */}
          <section className="bg-white rounded-xl border border-neutral-200/80 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-neutral-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-neutral-500" />
                Notes du jour
              </h3>
              {recentNotes.length > 0 && (
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={onNavigateToNotes}>
                  Voir tout
                </Button>
              )}
            </div>
            {recentNotes.length === 0 ? (
              <div className="py-8 text-center">
                <FileText className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                <p className="text-sm text-neutral-500">Aucune note</p>
                <Button variant="outline" size="sm" className="mt-3 rounded-lg" onClick={onNavigateToNotes}>
                  <Plus className="w-3 h-3 mr-1" />
                  Nouvelle note
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3 rounded-lg border border-neutral-100 hover:border-neutral-200 transition-colors"
                  >
                    <p className="text-sm font-medium text-neutral-900 truncate">{note.title}</p>
                    <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">
                      {note.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function EmptySection({ icon: Icon, title, description, actionLabel, onAction, onCreate }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200/80 p-6 flex flex-col items-center text-center">
      <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-neutral-400" />
      </div>
      <h3 className="font-medium text-neutral-900 mb-1">{title}</h3>
      <p className="text-sm text-neutral-500 mb-4">{description}</p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="rounded-lg" onClick={onAction}>
          {actionLabel}
        </Button>
        <Button size="sm" className="rounded-lg" onClick={onCreate}>
          <Plus className="w-3 h-3 mr-1" />
          Ajouter
        </Button>
      </div>
    </div>
  );
}
