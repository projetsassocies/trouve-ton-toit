import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { useAuth } from '@/lib/AuthContext';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { CheckSquare, Square } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { isPast, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function MyTodoList({ className }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.entities.Task.list('-created_date'),
    enabled: !!user?.email,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, completed }) =>
      api.entities.Task.update(id, {
        status: completed ? 'completed' : 'todo',
        completed_at: completed ? new Date().toISOString() : null,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['tasks']);
      queryClient.invalidateQueries(['activities']);
      if (variables.completed) toast.success('Tâche terminée');
    },
  });

  const pendingTasks = tasks
    .filter((t) => ['todo', 'in_progress', 'pending'].includes(t.status))
    .slice(0, 5);

  const completedTasks = tasks
    .filter((t) => t.status === 'completed')
    .slice(0, 3);

  const displayTasks = [...pendingTasks, ...completedTasks];

  if (isLoading) {
    return (
      <div className={cn('bg-white rounded-2xl border border-[#EBEBEB] p-4', className)}>
        <h2 className="font-semibold text-[#1a1a1a] mb-4">Ma to-do</h2>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-white rounded-2xl border border-[#EBEBEB] overflow-hidden', className)}>
      <div className="p-4 border-b border-[#EBEBEB]">
        <h2 className="font-semibold text-[#1a1a1a]">Ma to-do</h2>
      </div>
      <div className="p-3">
        {displayTasks.length === 0 ? (
          <div className="py-6 text-center">
            <CheckSquare className="w-8 h-8 text-[#CCCCCC] mx-auto mb-2" />
            <p className="text-sm text-[#6b6b6b]">Rien à faire</p>
            <Link
              to={createPageUrl('Activity')}
              className="text-xs text-secondary hover:underline mt-1 inline-block"
            >
              Ajouter une tâche
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            {displayTasks.map((task) => {
              const isCompleted = task.status === 'completed';
              const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date));
              const isUrgent = !isCompleted && (isOverdue || task.priority === 'urgent');

              return (
                <div
                  key={task.id}
                  className={cn(
                    'flex items-center gap-3 p-2 rounded-lg hover:bg-[#FAFAFA] transition-colors',
                    isCompleted && 'opacity-70'
                  )}
                >
                  <button
                    type="button"
                    onClick={() =>
                      toggleMutation.mutate({ id: task.id, completed: !isCompleted })
                    }
                    disabled={toggleMutation.isPending}
                    className="flex-shrink-0 text-secondary hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-secondary/30 rounded"
                  >
                    {isCompleted ? (
                      <CheckSquare className="w-4 h-4 text-secondary" />
                    ) : (
                      <Square className="w-4 h-4 border-2 border-current rounded-sm" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        'text-sm truncate',
                        isCompleted ? 'text-[#6b6b6b] line-through' : 'text-[#1a1a1a]'
                      )}
                    >
                      {task.title}
                    </p>
                    {task.linked_to_id && task.linked_to_type === 'lead' && !isCompleted && (
                      <p className="text-[10px] text-[#6b6b6b] truncate">
                        — Fiche lead
                      </p>
                    )}
                  </div>
                  {isUrgent && (
                    <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600 text-[10px] font-medium flex-shrink-0">
                      Urgent
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
