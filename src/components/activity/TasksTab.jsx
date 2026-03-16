import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LayoutGrid, List, AlertCircle, User, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import CreateTaskModal from './CreateTaskModal';

const priorityConfig = {
  urgent: { label: 'Urgent', color: 'bg-red-600', textColor: 'text-red-600', bgLight: 'bg-red-50' },
  high: { label: 'Important', color: 'bg-orange-600', textColor: 'text-orange-600', bgLight: 'bg-orange-50' },
  normal: { label: 'Normal', color: 'bg-blue-600', textColor: 'text-blue-600', bgLight: 'bg-blue-50' },
  medium: { label: 'Normal', color: 'bg-blue-600', textColor: 'text-blue-600', bgLight: 'bg-blue-50' },
  low: { label: 'Bas', color: 'bg-gray-400', textColor: 'text-gray-600', bgLight: 'bg-gray-50' },
};

const statusColumns = {
  todo: { label: 'À faire', color: 'border-gray-300', statuses: ['todo', 'pending'] },
  in_progress: { label: 'En cours', color: 'border-blue-400', statuses: ['in_progress'] },
  completed: { label: 'Terminé', color: 'border-primary', statuses: ['completed'] },
};

const statusDisplayMap = { ...statusColumns, pending: statusColumns.todo };

const getStatusConfig = (status) => statusColumns[status] || statusColumns.todo;
const getPriorityConfig = (priority) => priorityConfig[priority] || priorityConfig.normal;

export default function TasksTab() {
  const [view, setView] = useState('kanban');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date'),
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list(),
  });

  const { data: listings = [] } = useQuery({
    queryKey: ['listings'],
    queryFn: () => base44.entities.Listing.list(),
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      queryClient.invalidateQueries(['activities']);
    },
  });

  const handleStatusChange = async (taskId, newStatus) => {
    const task = tasks.find(t => t.id === taskId);
    const updateData = { status: newStatus };
    
    if (newStatus === 'completed' && !task.completed_at) {
      updateData.completed_at = new Date().toISOString();
      
      // Create activity
      await base44.entities.Activity.create({
        type: 'task',
        title: `Tâche terminée: ${task.title}`,
        content: task.description,
        linked_to_type: task.linked_to_type,
        linked_to_id: task.linked_to_id,
        tags: task.tags,
      });
    }
    
    updateTaskMutation.mutate({ id: taskId, data: updateData });
  };

  const getLinkedItem = (task) => {
    if (!task.linked_to_id) return null;
    if (task.linked_to_type === 'lead') {
      return leads.find(l => l.id === task.linked_to_id);
    }
    return listings.find(l => l.id === task.linked_to_id);
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  if (isLoading) {
    return <div className="text-center py-12 text-[#999999]">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={view === 'kanban' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('kanban')}
            className="rounded-lg"
          >
            <LayoutGrid className="w-4 h-4 mr-2" />
            Kanban
          </Button>
          <Button
            variant={view === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('list')}
            className="rounded-lg"
          >
            <List className="w-4 h-4 mr-2" />
            Liste
          </Button>
        </div>
        
        <Button onClick={() => setCreateModalOpen(true)} className="rounded-xl">
          Nouvelle tâche
        </Button>
      </div>

      {/* Kanban View */}
      {view === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(statusColumns).map(([status, config]) => {
            const statusTasks = tasks.filter(t => (config.statuses || [status]).includes(t.status));
            
            return (
              <div key={status} className="space-y-3">
                <div className={cn("bg-white rounded-xl border-2 p-3", config.color)}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{config.label}</h3>
                    <Badge variant="secondary">{statusTasks.length}</Badge>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {statusTasks.map(task => {
                    const priorityConf = getPriorityConfig(task.priority);
                    const linkedItem = getLinkedItem(task);
                    const overdue = isOverdue(task.due_date);
                    
                    return (
                      <div
                        key={task.id}
                        onClick={() => { setEditTask(task); setCreateModalOpen(true); }}
                        className="bg-white rounded-xl border border-[#E5E5E5] p-4 hover:shadow-md transition-shadow cursor-pointer"
                      >
                        <div className={cn("w-1 h-full absolute left-0 top-0 bottom-0 rounded-l-xl", priorityConf.color)} />
                        
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-medium mb-1">{task.title}</h4>
                            {task.description && (
                              <p className="text-sm text-[#666666] line-clamp-2">{task.description}</p>
                            )}
                          </div>
                          
                          {task.due_date && !isNaN(new Date(task.due_date).getTime()) && (
                            <div className={cn(
                              "text-xs font-medium flex items-center gap-1",
                              overdue ? "text-red-600" : "text-[#666666]"
                            )}>
                              {overdue && <AlertCircle className="w-3 h-3" />}
                              {format(new Date(task.due_date), 'dd MMM yyyy', { locale: fr })}
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={cn(priorityConf.bgLight, priorityConf.textColor, "border-0")}>
                              {priorityConf.label}
                            </Badge>
                            
                            {linkedItem && (
                              <Badge variant="outline" className="text-xs flex items-center gap-1 w-fit">
                                {task.linked_to_type === 'lead' ? (
                                  <User className="w-3 h-3" />
                                ) : (
                                  <Home className="w-3 h-3" />
                                )}{' '}
                                {task.linked_to_type === 'lead'
                                  ? `${linkedItem.first_name} ${linkedItem.last_name}`
                                  : linkedItem.title}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {statusTasks.length === 0 && (
                    <div className="bg-[#FAFAFA] rounded-xl border-2 border-dashed border-[#E5E5E5] p-8 text-center">
                      <p className="text-sm text-[#999999]">Aucune tâche</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] divide-y divide-[#E5E5E5]">
          {tasks.map(task => {
            const priorityConf = getPriorityConfig(task.priority);
            const statusConf = getStatusConfig(task.status);
            const linkedItem = getLinkedItem(task);
            const overdue = isOverdue(task.due_date);
            
            return (
              <div
                key={task.id}
                onClick={() => { setEditTask(task); setCreateModalOpen(true); }}
                className="p-4 hover:bg-[#FAFAFA] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className={cn("w-1 h-12 rounded-full", priorityConf.color)} />
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium mb-1">{task.title}</h4>
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge className={cn(priorityConf.bgLight, priorityConf.textColor, "border-0 text-xs")}>
                        {priorityConf.label}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {statusConf.label}
                      </Badge>
                      {task.due_date && !isNaN(new Date(task.due_date).getTime()) && (
                        <span className={cn("text-xs", overdue ? "text-red-600 font-medium" : "text-[#666666]")}>
                          {format(new Date(task.due_date), 'dd MMM yyyy', { locale: fr })}
                        </span>
                      )}
                      {linkedItem && (
                        <Badge variant="outline" className="text-xs flex items-center gap-1 w-fit">
                          {task.linked_to_type === 'lead' ? (
                            <User className="w-3 h-3" />
                          ) : (
                            <Home className="w-3 h-3" />
                          )}{' '}
                          {task.linked_to_type === 'lead'
                            ? `${linkedItem.first_name} ${linkedItem.last_name}`
                            : linkedItem.title}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {tasks.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-[#999999]">Aucune tâche pour le moment</p>
            </div>
          )}
        </div>
      )}

      <CreateTaskModal
        open={createModalOpen}
        onClose={() => { setCreateModalOpen(false); setEditTask(null); }}
        task={editTask}
      />
    </div>
  );
}