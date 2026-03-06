import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  ChevronRight,
  Plus,
  CheckCircle2,
  Clock,
  Calendar,
  User,
  Home,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format, isPast, isToday, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import CreateTaskModal from '@/components/activity/CreateTaskModal';

const TABS = [
  { id: 'upcoming', label: 'À venir' },
  { id: 'overdue', label: 'En retard' },
  { id: 'completed', label: 'Terminé' },
];

const priorityConfig = {
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700' },
  high: { label: 'Important', color: 'bg-orange-100 text-orange-700' },
  normal: { label: 'Normal', color: 'bg-blue-100 text-blue-700' },
  low: { label: 'Bas', color: 'bg-gray-100 text-gray-600' },
};

const eventTypeConfig = {
  visit: { label: 'Visite', color: 'bg-teal-100 text-teal-700' },
  signing: { label: 'Signature', color: 'bg-amber-100 text-amber-700' },
  call: { label: 'Appel', color: 'bg-purple-100 text-purple-700' },
  meeting: { label: 'Réunion', color: 'bg-green-100 text-green-700' },
};

export default function MyTasksWidget({ className }) {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [showMore, setShowMore] = useState(false);
  const queryClient = useQueryClient();
  const today = startOfDay(new Date());

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date'),
  });

  const { data: events = [] } = useQuery({
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

  const pendingTasks = tasks.filter((t) =>
    ['todo', 'in_progress', 'pending'].includes(t.status)
  );
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  const overdueTasks = pendingTasks.filter((t) => {
    if (!t.due_date) return false;
    const d = new Date(t.due_date);
    return isPast(d) && !isToday(d);
  });

  const upcomingTasks = pendingTasks.filter((t) => {
    if (!t.due_date) return true;
    const d = new Date(t.due_date);
    return !isPast(d) || isToday(d);
  });

  const upcomingEvents = events
    .filter((e) => {
      if (!e.date || ['completed', 'cancelled'].includes(e.status)) return false;
      const d = new Date(e.date);
      return !isPast(d) || isToday(d);
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const getLinkedName = (item) => {
    if (!item.linked_to_id) return null;
    if (item.linked_to_type === 'lead') {
      const lead = leads.find((l) => l.id === item.linked_to_id);
      return lead ? `${lead.first_name} ${lead.last_name}` : null;
    }
    const listing = listings.find((l) => l.id === item.linked_to_id);
    return listing?.title ?? null;
  };

  const displayLimit = showMore ? 20 : 5;
  const getDisplayItems = () => {
    if (activeTab === 'upcoming') {
      const combined = [
        ...upcomingTasks.map((t) => ({ ...t, itemType: 'task' })),
        ...upcomingEvents.map((e) => ({ ...e, itemType: 'event' })),
      ].sort((a, b) => {
        const dateA = a.due_date || a.date ? new Date(a.due_date || a.date) : new Date(0);
        const dateB = b.due_date || b.date ? new Date(b.due_date || b.date) : new Date(0);
        return dateA - dateB;
      });
      return combined.slice(0, displayLimit);
    }
    if (activeTab === 'overdue') return overdueTasks.slice(0, displayLimit);
    return completedTasks.slice(0, displayLimit);
  };

  const displayItems = getDisplayItems();
  const hasMore =
    (activeTab === 'upcoming' &&
      (upcomingTasks.length + upcomingEvents.length > displayLimit)) ||
    (activeTab === 'overdue' && overdueTasks.length > displayLimit) ||
    (activeTab === 'completed' && completedTasks.length > displayLimit);

  const handleToggleComplete = async (task) => {
    if (task.status === 'completed') return;
    await base44.entities.Task.update(task.id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    });
    await base44.entities.Activity.create({
      type: 'task',
      title: `Tâche terminée: ${task.title}`,
      content: task.description,
      linked_to_type: task.linked_to_type,
      linked_to_id: task.linked_to_id,
    });
    queryClient.invalidateQueries(['tasks']);
    queryClient.invalidateQueries(['activities']);
  };

  const isLoading = tasksLoading;

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden',
        className
      )}
    >
      <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between">
        <h2 className="font-semibold">Mes tâches</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-lg text-xs"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Créer une tâche
          </Button>
          <Link
            to={createPageUrl('Activity')}
            className="text-xs text-[#999999] hover:text-black flex items-center gap-0.5 transition-colors"
          >
            Voir tout
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E5E5E5]">
        {TABS.map((tab) => {
          const count =
            tab.id === 'upcoming'
              ? upcomingTasks.length + upcomingEvents.length
              : tab.id === 'overdue'
              ? overdueTasks.length
              : completedTasks.length;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 px-4 py-3 text-sm font-medium transition-colors',
                isActive
                  ? 'text-[#095237] border-b-2 border-[#095237] bg-[#f0fdf4]/30'
                  : 'text-[#666666] hover:text-black hover:bg-[#FAFAFA]'
              )}
            >
              {tab.label}
              {tab.id === 'overdue' && count > 0 && (
                <span className="ml-1.5 text-rose-600 font-medium">({count})</span>
              )}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : displayItems.length === 0 ? (
        <div className="p-8 text-center">
          <Clock className="w-10 h-10 text-[#CCCCCC] mx-auto mb-3" />
          <p className="text-sm text-[#999999]">
            {activeTab === 'upcoming'
              ? 'Aucune tâche à venir'
              : activeTab === 'overdue'
              ? 'Aucune tâche en retard'
              : 'Aucune tâche terminée'}
          </p>
          {activeTab !== 'completed' && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 rounded-lg"
              onClick={() => setCreateModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Créer une tâche
            </Button>
          )}
        </div>
      ) : (
        <div className="p-3 space-y-1 max-h-[320px] overflow-y-auto">
          {displayItems.map((item) => {
            if (item.itemType === 'event') {
              const typeConf =
                eventTypeConfig[item.type] || eventTypeConfig.visit;
              const linkedName = getLinkedName(item);
              return (
                <div
                  key={`evt-${item.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#FAFAFA] transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.title}</p>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-md',
                          typeConf.color
                        )}
                      >
                        {typeConf.label}
                      </span>
                      {linkedName && (
                        <span className="text-xs text-[#666666] truncate">
                          • {linkedName}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-[#666666] flex-shrink-0">
                    {item.date &&
                      format(new Date(item.date), "d MMM yyyy", {
                        locale: fr,
                      })}
                  </span>
                </div>
              );
            }

            const task = item;
            const priorityConf =
              priorityConfig[task.priority] || priorityConfig.normal;
            const linkedName = getLinkedName(task);
            const isOverdue =
              task.due_date &&
              isPast(new Date(task.due_date)) &&
              !isToday(new Date(task.due_date));

            return (
              <div
                key={task.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl transition-colors group',
                  activeTab === 'completed'
                    ? 'hover:bg-[#FAFAFA] opacity-90'
                    : 'hover:bg-[#FAFAFA] cursor-pointer'
                )}
                onClick={() => {
                  if (activeTab !== 'completed') {
                    setEditTask(task);
                    setCreateModalOpen(true);
                  }
                }}
              >
                {activeTab === 'completed' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleComplete(task);
                    }}
                    className="w-5 h-5 rounded-full border-2 border-[#D0D0D0] hover:border-[#095237] hover:bg-[#f0fdf4] flex items-center justify-center flex-shrink-0 transition-colors"
                    aria-label="Marquer terminé"
                  >
                    {task.status === 'completed' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    )}
                  </button>
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'font-medium text-sm',
                      activeTab === 'completed' && 'line-through text-[#666666]'
                    )}
                  >
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-md',
                        priorityConf.color
                      )}
                    >
                      {priorityConf.label}
                    </span>
                    {linkedName && (
                      <span className="text-xs text-[#666666] flex items-center gap-0.5">
                        {task.linked_to_type === 'lead' ? (
                          <User className="w-3 h-3" />
                        ) : (
                          <Home className="w-3 h-3" />
                        )}
                        {linkedName}
                      </span>
                    )}
                  </div>
                </div>
                {task.due_date && (
                  <span
                    className={cn(
                      'text-xs flex-shrink-0',
                      isOverdue ? 'text-rose-600 font-medium' : 'text-[#666666]'
                    )}
                  >
                    {format(new Date(task.due_date), 'd MMM yyyy', {
                      locale: fr,
                    })}
                  </span>
                )}
              </div>
            );
          })}
          {hasMore && (
            <button
              onClick={() => setShowMore(!showMore)}
              className="w-full py-2 text-center text-sm text-[#095237] hover:underline font-medium"
            >
              {showMore ? 'Voir moins' : 'Voir plus'}
            </button>
          )}
        </div>
      )}

      <CreateTaskModal
        open={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setEditTask(null);
        }}
        task={editTask}
      />
    </div>
  );
}
