import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ChevronLeft, ChevronRight, Check, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, startOfDay, isToday, isTomorrow, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const POSTIT_COLORS = ['#FEF3C7', '#DBEAFE', '#D1FAE5', '#FCE7F3', '#E0E7FF'];

/** Exemples affichés lorsque la liste est vide — pour visualiser le rendu */
const EXAMPLE_INSIGHTS = [
  {
    id: 'ex-1',
    title: 'Rappeler M. Dupont — visite effectuée hier',
    subtitle: "Aujourd'hui — Suivi post-visite",
    type: 'example',
    link: null,
  },
  {
    id: 'ex-2',
    title: 'Signature mandat — Famille Martin',
    subtitle: "Visite — 6 mars 14h00",
    type: 'example',
    link: null,
  },
  {
    id: 'ex-3',
    title: 'Relancer proposition — T3 Lyon Croix-Rousse',
    subtitle: 'En attente depuis 3 jours',
    type: 'example',
    link: null,
  },
  {
    id: 'ex-4',
    title: 'Vérifier financement — Mme Bernard',
    subtitle: "Demain — Lead chaud",
    type: 'example',
    link: null,
  },
  {
    id: 'ex-5',
    title: 'Appel de relance — Lead tiède sans contact',
    subtitle: 'Dernier contact il y a 5 jours',
    type: 'example',
    link: null,
  },
];

export default function InsightPostits({ className, showExamplesWhenEmpty = true }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      const s = localStorage.getItem('insight-postits-dismissed');
      return s ? new Set(JSON.parse(s)) : new Set();
    } catch {
      return new Set();
    }
  });

  const today = startOfDay(new Date());

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date'),
    enabled: !!user?.email,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-date'),
    enabled: !!user?.email,
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      queryClient.invalidateQueries(['activities']);
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Event.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['events']);
    },
  });

  const insights = useMemo(() => {
    const items = [];

    const pendingTasks = tasks.filter((t) =>
      ['todo', 'in_progress', 'pending'].includes(t.status)
    );

    pendingTasks.forEach((task) => {
      const due = task.due_date ? new Date(task.due_date) : null;
      const isOverdue = due && isPast(due) && !isToday(due);
      const dayLabel = due
        ? isToday(due)
          ? "Aujourd'hui"
          : isTomorrow(due)
          ? "Demain"
          : format(due, "d MMM", { locale: fr })
        : null;
      items.push({
        id: `task-${task.id}`,
        title: task.title,
        subtitle: dayLabel
          ? `${dayLabel}${isOverdue ? ' (en retard)' : ''}`
          : 'Tâche à faire',
        type: 'task',
        sourceId: task.id,
        link: task.linked_to_id && task.linked_to_type === 'lead'
          ? createPageUrl(`LeadDetail?id=${task.linked_to_id}`)
          : null,
        priority: isOverdue ? 1 : due && isToday(due) ? 2 : 3,
      });
    });

    const todayEvents = events.filter((e) => {
      if (!e.date) return false;
      const d = new Date(e.date);
      if (e.status === 'completed' || e.status === 'cancelled') return false;
      return !isPast(d) || isToday(d);
    });

    todayEvents.slice(0, 5).forEach((event) => {
      const eventDate = new Date(event.date);
      const typeLabel =
        event.type === 'visit'
          ? 'Visite'
          : event.type === 'signing'
          ? 'Signature'
          : event.type === 'call'
          ? 'Appel'
          : event.type === 'meeting'
          ? 'Réunion'
          : 'Événement';
      items.push({
        id: `event-${event.id}`,
        title: event.title,
        subtitle: `${typeLabel} — ${format(eventDate, "d MMM HH'h'mm", { locale: fr })}`,
        type: 'event',
        sourceId: event.id,
        link:
          event.linked_to_id && event.linked_to_type === 'lead'
            ? createPageUrl(`LeadDetail?id=${event.linked_to_id}`)
            : null,
        priority: isToday(eventDate) ? 1 : 2,
      });
    });

    items.sort((a, b) => a.priority - b.priority);

    const filtered = items.filter((item) => !dismissedIds.has(item.id));

    if (filtered.length === 0 && showExamplesWhenEmpty) {
      return EXAMPLE_INSIGHTS.filter((item) => !dismissedIds.has(item.id));
    }
    return filtered;
  }, [tasks, events, user?.email, dismissedIds, showExamplesWhenEmpty]);

  const currentInsight = insights[currentIndex];
  const isShowingExamples = insights.length > 0 && insights[0]?.type === 'example';
  const hasMultiple = insights.length > 1;
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < insights.length - 1;

  const persistDismissed = (ids) => {
    setDismissedIds(ids);
    try {
      localStorage.setItem(
        'insight-postits-dismissed',
        JSON.stringify([...ids].slice(-100))
      );
    } catch {}
  };

  const handleTraite = async () => {
    if (!currentInsight) return;
    const { type, sourceId } = currentInsight;

    if (type === 'task') {
      await updateTaskMutation.mutateAsync({
        id: sourceId,
        data: {
          status: 'completed',
          completed_at: new Date().toISOString(),
        },
      });
      toast.success('Tâche marquée terminée');
    } else if (type === 'event') {
      await updateEventMutation.mutateAsync({
        id: sourceId,
        data: { status: 'completed' },
      });
      toast.success('Événement marqué terminé');
    }
    /* type === 'example' : on masque juste le post-it (pas d'appel API) */

    const newDismissed = new Set(dismissedIds);
    newDismissed.add(currentInsight.id);
    persistDismissed(newDismissed);

    setCurrentIndex((i) => {
      if (i >= insights.length - 1) return Math.max(0, i - 1);
      return i;
    });
  };

  const handlePrev = () => setCurrentIndex((i) => Math.max(0, i - 1));
  const handleNext = () =>
    setCurrentIndex((i) => Math.min(insights.length - 1, i + 1));

  if (insights.length === 0) {
    return (
      <div
        className={cn(
          'relative w-56 min-h-[140px] flex items-center justify-center',
          'bg-[#FAFAFA] rounded-lg border border-[#E5E5E5]',
          className
        )}
      >
        <div className="text-center p-4">
          <Lightbulb className="w-8 h-8 text-[#CCCCCC] mx-auto mb-2" />
          <p className="text-xs text-[#999999]">Aucun insight du jour</p>
        </div>
      </div>
    );
  }

  const stackCount = Math.min(3, insights.length);
  const bgColor =
    POSTIT_COLORS[(currentIndex % POSTIT_COLORS.length)] || POSTIT_COLORS[0];

  return (
    <div className={cn('relative', className)}>
      {/* Pile de post-its - feuilles qui débordent */}
      {stackCount > 1 &&
        [...Array(stackCount - 1)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-sm border border-amber-200/70 -z-10 shadow-sm"
            style={{
              width: 'calc(100% - 6px)',
              height: 'calc(100% - 4px)',
              top: 6 + (stackCount - 1 - i) * 4,
              left: 6 + (stackCount - 1 - i) * 5,
              transform: `rotate(${-2 + i}deg)`,
              backgroundColor: POSTIT_COLORS[(currentIndex + i + 1) % POSTIT_COLORS.length],
            }}
          />
        ))}

      {/* Main post-it */}
      <div
        className="relative rounded-lg border border-amber-200 shadow-sm overflow-hidden"
        style={{
          backgroundColor: bgColor,
          minHeight: 160,
          boxShadow: '2px 4px 12px rgba(0,0,0,0.08)',
        }}
      >
        <div className="p-4 pb-14">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs text-amber-800/70 font-medium">
              Insight du jour
            </p>
            {isShowingExamples && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200/60 text-amber-800">
                Exemples
              </span>
            )}
          </div>
          <p className="font-medium text-sm text-amber-900 line-clamp-2">
            {currentInsight.title}
          </p>
          <p className="text-xs text-amber-800/80 mt-1 truncate">
            {currentInsight.subtitle}
          </p>
          {currentInsight.link && (
            <Link
              to={currentInsight.link}
              className="text-xs text-amber-700 font-medium mt-2 inline-block hover:underline"
            >
              Voir la fiche →
            </Link>
          )}
        </div>

        {/* Bottom controls */}
        <div
          className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-1 px-3 py-2 border-t border-amber-200/60"
          style={{ backgroundColor: 'rgba(254,243,199,0.9)' }}
        >
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-amber-800 hover:bg-amber-200/50"
              onClick={handlePrev}
              disabled={!canGoPrev}
              aria-label="Précédent"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-[10px] text-amber-800/80 px-1">
              {currentIndex + 1}/{insights.length}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-amber-800 hover:bg-amber-200/50"
              onClick={handleNext}
              disabled={!canGoNext}
              aria-label="Suivant"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs font-medium text-amber-800 hover:bg-amber-200/50 gap-1"
            onClick={handleTraite}
            aria-label="Marquer comme traité"
          >
            <Check className="w-3.5 h-3.5" />
            Traité
          </Button>
        </div>
      </div>
    </div>
  );
}
