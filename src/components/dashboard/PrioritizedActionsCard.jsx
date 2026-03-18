import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
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
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
    queryFn: () => api.entities.Task.list('-created_date'),
    enabled: !!user?.email,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => api.entities.Event.list('-date'),
    enabled: !!user?.email,
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads', user?.email],
    queryFn: () => api.entities.Lead.filter({ created_by: user.email }, '-created_date', 100),
    enabled: !!user?.email,
  });

  const { data: matches = [] } = useQuery({
    queryKey: ['matches', user?.email],
    queryFn: () => api.entities.Match.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activities', user?.email],
    queryFn: () => api.entities.Activity.filter({ created_by: user.email }, '-created_date', 200),
    enabled: !!user?.email,
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      queryClient.invalidateQueries(['activities']);
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Event.update(id, data),
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
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-secondary" />
            <h2 className="font-semibold">Actions prioritaires</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center">
            <Target className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Aucune action prioritaire pour le moment</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const Icon = currentAction.icon;
  const priorityStyle = currentAction.isUrgent
    ? { label: 'Urgent', color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400', dotColor: 'bg-red-500' }
    : { label: 'Important', color: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400', dotColor: 'bg-orange-500' };

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-secondary" />
            <h3 className="font-semibold">Actions prioritaires</h3>
            <Badge className="ml-2 bg-primary text-primary-foreground hover:bg-primary/90">
              {actions.length} à traiter
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} / {actions.length}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                disabled={!canGoPrev}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentIndex((i) => Math.min(actions.length - 1, i + 1))}
                disabled={!canGoNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="absolute -bottom-1 -right-1 h-full w-full rounded-lg border bg-muted/30 -z-10" />
          <div className="absolute -bottom-2 -right-2 h-full w-full rounded-lg border bg-muted/20 -z-20" />
          <Card className="relative">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-secondary/10 dark:bg-white/10">
                    <Icon className="h-6 w-6 text-secondary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={cn('text-xs', priorityStyle.color)}>
                        <span className={cn('inline-block w-1.5 h-1.5 rounded-full mr-1.5', priorityStyle.dotColor)} />
                        {priorityStyle.label}
                      </Badge>
                    </div>
                    <h4 className="text-lg font-semibold mb-2">{currentAction.title}</h4>
                  </div>
                </div>
              </div>
              <p className="text-sm text-foreground mb-4 leading-relaxed">{currentAction.context}</p>
              <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">Pourquoi maintenant :</span>
                <span>{currentAction.pourquoiMaintenant}</span>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  className="flex-1 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                  onClick={handleTraite}
                >
                  <Check className="h-4 w-4 mr-2" />
                  {currentAction.primaryLabel}
                </Button>
                {currentAction.secondaryHref ? (
                  <Link to={currentAction.secondaryHref}>
                    <Button variant="outline">
                      {currentAction.secondaryLabel === 'Appeler maintenant' && <Phone className="w-4 h-4 mr-1" />}
                      {currentAction.secondaryLabel}
                    </Button>
                  </Link>
                ) : (
                  <Button variant="outline">{currentAction.secondaryLabel}</Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="flex justify-center gap-2 mt-4">
          {actions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={cn(
                'h-2 rounded-full transition-all',
                i === currentIndex ? 'w-8 bg-secondary' : 'w-2 bg-muted-foreground/30'
              )}
              aria-label={`Action ${i + 1}`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
