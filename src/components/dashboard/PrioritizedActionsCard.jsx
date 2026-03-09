import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Target,
  Phone,
  Calendar,
  FileSignature,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, startOfDay, isToday, isTomorrow, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { subDays } from 'date-fns';

const EXAMPLE_ACTIONS = [
  {
    id: 'ex-1',
    title: 'Relancer Claire Dumont immédiatement',
    context: "Claire n'a pas répondu depuis 48h après avoir montré un fort intérêt (score 70/100). Son profil budget 420k€ correspond parfaitement à votre nouveau mandat rue Caudéran.",
    pourquoiMaintenant: 'Lead chaud risquant de refroidir - Opportunité de closing élevée',
    type: 'lead_call',
    icon: Phone,
    primaryLabel: 'Marquer comme traité',
    secondaryLabel: 'Appeler maintenant',
    secondaryHref: null,
  },
  {
    id: 'ex-2',
    title: 'Opportunité de cross-selling avec Sophie Martin',
    context: "Sophie Martin a une visite planifiée aujourd'hui. Analyse de son profil : revenus élevés, cherche T4. Vous avez 2 autres biens premium dans sa zone qui correspondent.",
    pourquoiMaintenant: 'Maximiser la valeur de chaque rendez-vous',
    type: 'cross_sell',
    icon: FileText,
    primaryLabel: 'Marquer comme traité',
    secondaryLabel: 'Préparer les dossiers',
    secondaryHref: null,
  },
];

export default function PrioritizedActionsCard({ formatPrice, className }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      const s = localStorage.getItem('prioritized-actions-dismissed');
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

  const { data: leads = [] } = useQuery({
    queryKey: ['leads', user?.email],
    queryFn: () => base44.entities.Lead.filter({ created_by: user.email }, '-created_date', 100),
    enabled: !!user?.email,
  });

  const { data: matches = [] } = useQuery({
    queryKey: ['matches', user?.email],
    queryFn: () => base44.entities.Match.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activities', user?.email],
    queryFn: () => base44.entities.Activity.filter({ created_by: user.email }, '-created_date', 200),
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

  const actions = useMemo(() => {
    const items = [];
    const twoDaysAgo = subDays(new Date(), 2);
    const contactTypes = ['call', 'email', 'sms', 'visite', 'matching_proposition', 'matching_accepte'];

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
      const lead = task.linked_to_type === 'lead' && task.linked_to_id
        ? leads.find((l) => l.id === task.linked_to_id)
        : null;
      const leadName = lead ? `${lead.first_name} ${lead.last_name}` : null;
      items.push({
        id: `task-${task.id}`,
        title: task.title,
        context: leadName ? `Lié à ${leadName}` : (dayLabel ? `${dayLabel}` : 'Tâche à faire'),
        pourquoiMaintenant: isOverdue
          ? 'En retard - priorité haute'
          : due && isToday(due)
          ? "À faire aujourd'hui"
          : 'À traiter',
        type: 'task',
        sourceId: task.id,
        link: task.linked_to_id && task.linked_to_type === 'lead'
          ? createPageUrl(`LeadDetail?id=${task.linked_to_id}`)
          : null,
        priority: isOverdue ? 1 : due && isToday(due) ? 2 : 3,
        icon: FileText,
        isUrgent: isOverdue || task.priority === 'urgent',
        primaryLabel: 'Marquer comme traité',
        secondaryLabel: 'Voir la fiche',
        secondaryHref: task.linked_to_id && task.linked_to_type === 'lead'
          ? createPageUrl(`LeadDetail?id=${task.linked_to_id}`)
          : null,
      });
    });

    const priorityLeads = leads
      .filter((lead) => {
        const score = lead.score ?? 0;
        const isChaud = lead.categorie === 'CHAUD';
        const isTiede = lead.categorie === 'TIÈDE';
        if (!(score >= 70 || isChaud || isTiede)) return false;
        const leadActivities = activities.filter(
          (a) =>
            (a.linked_to_id === lead.id && a.linked_to_type === 'lead') ||
            (a.linked_to_type === 'lead' && a.linked_to_id === lead.id)
        );
        const lastContact = leadActivities
          .filter((a) => contactTypes.includes(a.type))
          .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
        const lastContactDate = lastContact ? new Date(lastContact.created_date) : null;
        const needsAction = !lastContactDate || lastContactDate < twoDaysAgo;
        const leadMatches = matches.filter((m) => m.lead_id === lead.id);
        const hasPendingMatch =
          leadMatches.some((m) =>
            ['propose', 'visite_planifiee', 'visite_effectuee'].includes(m.status)
          ) || leadMatches.some((m) => m.status === 'accepte');
        return needsAction || hasPendingMatch;
      })
      .map((lead) => {
        const leadMatches = matches.filter((m) => m.lead_id === lead.id);
        const proposeMatch = leadMatches.find((m) => m.status === 'propose');
        const visiteMatch = leadMatches.find((m) =>
          ['visite_planifiee', 'visite_effectuee'].includes(m.status)
        );
        const accepteMatch = leadMatches.find((m) => m.status === 'accepte');

        let title = `Relancer ${lead.first_name} ${lead.last_name}`;
        let context = lead.score ? `Score ${lead.score}/100. ` : '';
        if (lead.budget_max) context += `Budget ${formatPrice ? formatPrice(lead.budget_max) : `${lead.budget_max}€`}. `;
        let pourquoiMaintenant = 'Lead chaud risquant de refroidir - Opportunité de closing élevée';
        let icon = Phone;
        let secondaryLabel = 'Appeler maintenant';

        if (accepteMatch) {
          title = `Mandat à signer — ${lead.first_name} ${lead.last_name}`;
          context += 'Match accepté, prêt pour signature.';
          pourquoiMaintenant = 'Clôture imminente - ne pas laisser refroidir';
          icon = FileSignature;
          secondaryLabel = 'Voir le lead';
        } else if (visiteMatch) {
          title = `Suivi visite — ${lead.first_name} ${lead.last_name}`;
          context += 'Visite planifiée ou effectuée.';
          pourquoiMaintenant = 'Capitaliser sur la visite récente';
          icon = Calendar;
          secondaryLabel = 'Voir le lead';
        } else if (proposeMatch) {
          title = `Relancer proposition — ${lead.first_name} ${lead.last_name}`;
          context += 'Proposition envoyée, en attente de réponse.';
          pourquoiMaintenant = 'Proposition en attente depuis plusieurs jours';
          icon = AlertCircle;
          secondaryLabel = 'Voir le lead';
        }

        return {
          id: `lead-${lead.id}`,
          title,
          context,
          pourquoiMaintenant,
          type: 'lead',
          sourceId: lead.id,
          link: createPageUrl(`LeadDetail?id=${lead.id}`),
          priority: lead.categorie === 'CHAUD' ? 1 : 2,
          icon,
          isUrgent: lead.categorie === 'CHAUD',
          primaryLabel: 'Marquer comme traité',
          secondaryLabel,
          secondaryHref: createPageUrl(`LeadDetail?id=${lead.id}`),
        };
      });

    items.push(...priorityLeads);
    items.sort((a, b) => a.priority - b.priority);
    const filtered = items.filter((item) => !dismissedIds.has(item.id));

    if (filtered.length === 0) {
      return EXAMPLE_ACTIONS.filter((item) => !dismissedIds.has(item.id)).map((a) => ({
        ...a,
        icon: a.icon || Phone,
        primaryLabel: 'Marquer comme traité',
        secondaryLabel: a.secondaryLabel,
        secondaryHref: a.secondaryHref,
      }));
    }
    return filtered;
  }, [tasks, events, leads, matches, activities, dismissedIds, formatPrice]);

  const currentAction = actions[currentIndex];
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < actions.length - 1;

  const handleTraite = async () => {
    if (!currentAction) return;
    const { type, sourceId } = currentAction;

    if (type === 'task') {
      await updateTaskMutation.mutateAsync({
        id: sourceId,
        data: { status: 'completed', completed_at: new Date().toISOString() },
      });
      toast.success('Tâche marquée terminée');
    } else if (type === 'event') {
      await updateEventMutation.mutateAsync({
        id: sourceId,
        data: { status: 'completed' },
      });
      toast.success('Événement marqué terminé');
    }

    const newDismissed = new Set(dismissedIds);
    newDismissed.add(currentAction.id);
    setDismissedIds(newDismissed);
    try {
      localStorage.setItem(
        'prioritized-actions-dismissed',
        JSON.stringify([...newDismissed].slice(-100))
      );
    } catch {}

    setCurrentIndex((i) => (i >= actions.length - 1 ? Math.max(0, i - 1) : i));
  };

  if (actions.length === 0) {
    return (
      <div
        className={cn(
          'bg-white dark:bg-[#111] rounded-2xl border border-[#E5E5E5] dark:border-[#333] p-6',
          className
        )}
      >
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-[#095237]" />
          <h2 className="font-semibold text-[#111] dark:text-white">Actions prioritaires</h2>
        </div>
        <div className="py-12 text-center">
          <Target className="w-12 h-12 text-[#999] mx-auto mb-3" />
          <p className="text-sm text-[#999]">Aucune action prioritaire pour le moment</p>
        </div>
      </div>
    );
  }

  const Icon = currentAction.icon;

  return (
    <div
      className={cn(
        'bg-white dark:bg-[#111] rounded-2xl border border-[#E5E5E5] dark:border-[#333] overflow-hidden',
        className
      )}
    >
      <div className="p-4 border-b border-[#E5E5E5] dark:border-[#333] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-[#095237]" />
          <h2 className="font-semibold text-[#111] dark:text-white">Actions prioritaires</h2>
          <span className="px-2 py-0.5 rounded-full bg-[#dcfce7] dark:bg-[#14532d] text-[#166534] dark:text-[#86efac] text-xs font-medium">
            {actions.length} à traiter
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={!canGoPrev}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs text-[#666] dark:text-[#999] px-2">
            {currentIndex + 1}/{actions.length}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentIndex((i) => Math.min(actions.length - 1, i + 1))}
            disabled={!canGoNext}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-4">
        <div className="rounded-xl border border-[#E5E5E5] dark:border-[#333] p-4 bg-[#FAFAFA] dark:bg-[#1a1a1a]">
          <div className="flex items-start gap-3 mb-3">
            {currentAction.isUrgent && (
              <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-xs font-medium">
                Urgent
              </span>
            )}
            <Icon className="w-5 h-5 text-[#095237] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-[#111] dark:text-white">
                {currentAction.title}
              </h3>
            </div>
          </div>
          <p className="text-sm text-[#666] dark:text-[#999] mb-3">{currentAction.context}</p>
          <p className="text-xs text-[#095237] font-medium mb-4">
            Pourquoi maintenant : {currentAction.pourquoiMaintenant}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleTraite}
              className="bg-[#095237] hover:bg-[#074029] text-white"
            >
              <Check className="w-4 h-4 mr-1" />
              {currentAction.primaryLabel}
            </Button>
            {currentAction.secondaryHref ? (
              <Link to={currentAction.secondaryHref}>
                <Button variant="outline" size="sm">
                  {currentAction.secondaryLabel === 'Appeler maintenant' && (
                    <Phone className="w-3.5 h-3.5 mr-1" />
                  )}
                  {currentAction.secondaryLabel}
                </Button>
              </Link>
            ) : (
              <Button variant="outline" size="sm">
                {currentAction.secondaryLabel}
              </Button>
            )}
          </div>
        </div>
        <div className="flex justify-center gap-1 mt-3">
          {actions.map((_, i) => (
            <div
              key={i}
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                i === currentIndex
                  ? 'bg-[#095237]'
                  : 'bg-[#E5E5E5] dark:bg-[#333]'
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
