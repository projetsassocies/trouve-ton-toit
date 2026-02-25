import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { 
  Phone, 
  Mail, 
  FileText, 
  CheckSquare, 
  Calendar,
  Plus,
  MoreVertical,
  Trash2,
  Edit
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import CreateActivityModal from '@/components/activity/CreateActivityModal';
import CreateNoteModal from '@/components/activity/CreateNoteModal';
import CreateTaskModal from '@/components/activity/CreateTaskModal';
import CreateEventModal from '@/components/activity/CreateEventModal';
import { toast } from 'sonner';

const activityIcons = {
  call: Phone,
  email: Mail,
  note: FileText,
  task: CheckSquare,
  event: Calendar,
};

const activityColors = {
  call: 'bg-blue-50 text-blue-600',
  email: 'bg-purple-50 text-purple-600',
  note: 'bg-amber-50 text-amber-600',
  task: 'bg-green-50 text-green-600',
  event: 'bg-rose-50 text-rose-600',
};

export default function LeadActivityTimeline({ leadId }) {
  const [filter, setFilter] = useState('all');
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityType, setActivityType] = useState(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  
  const queryClient = useQueryClient();

  // Fetch all activities linked to this lead (exclude 'event' type to avoid duplicates with events query)
  const { data: activities = [] } = useQuery({
    queryKey: ['activities', leadId],
    queryFn: async () => {
      const allActivities = await base44.entities.Activity.filter({
        linked_to_type: 'lead',
        linked_to_id: leadId,
      }, '-created_date');
      return allActivities.filter(a => a.type !== 'event');
    },
    enabled: !!leadId,
  });

  // Fetch tasks linked to this lead
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', leadId],
    queryFn: async () => {
      const allTasks = await base44.entities.Task.filter({
        linked_to_type: 'lead',
        linked_to_id: leadId,
      }, '-created_date');
      return allTasks;
    },
    enabled: !!leadId,
  });

  // Fetch notes linked to this lead
  const { data: notes = [] } = useQuery({
    queryKey: ['notes', leadId],
    queryFn: async () => {
      const allNotes = await base44.entities.Note.filter({
        linked_to_type: 'lead',
        linked_to_id: leadId,
      }, '-created_date');
      return allNotes;
    },
    enabled: !!leadId,
  });

  // Fetch events linked to this lead
  const { data: events = [] } = useQuery({
    queryKey: ['events', leadId],
    queryFn: async () => {
      const allEvents = await base44.entities.Event.filter({
        linked_to_type: 'lead',
        linked_to_id: leadId,
      }, '-created_date');
      return allEvents;
    },
    enabled: !!leadId,
  });

  const deleteActivityMutation = useMutation({
    mutationFn: (id) => base44.entities.Activity.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['activities', leadId]);
      toast.success('Activité supprimée');
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks', leadId]);
      queryClient.invalidateQueries(['tasks']);
      toast.success('Tâche supprimée');
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (id) => base44.entities.Note.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['notes', leadId]);
      queryClient.invalidateQueries(['notes']);
      toast.success('Note supprimée');
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id) => base44.entities.Event.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['events', leadId]);
      queryClient.invalidateQueries(['events']);
      toast.success('Événement supprimé');
    },
  });

  // Combine all items with normalized structure
  const allItems = [
    ...activities.map(a => ({ ...a, itemType: 'activity', sortDate: a.created_date })),
    ...tasks.map(t => ({ ...t, itemType: 'task', sortDate: t.created_date })),
    ...notes.map(n => ({ ...n, itemType: 'note', sortDate: n.created_date })),
    ...events.map(e => ({ ...e, itemType: 'event', sortDate: e.created_date })),
  ].sort((a, b) => new Date(b.sortDate) - new Date(a.sortDate));

  const filteredItems = filter === 'all' 
    ? allItems 
    : allItems.filter(item => {
        if (item.itemType === 'activity') return item.type === filter;
        if (item.itemType === 'task') return filter === 'task';
        if (item.itemType === 'note') return filter === 'note';
        if (item.itemType === 'event') return filter === 'event';
        return false;
      });

  const handleCreateActivity = (type) => {
    setActivityType(type);
    setShowActivityModal(true);
  };

  const handleEditNote = (note) => {
    setEditingNote(note);
    setShowNoteModal(true);
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setShowEventModal(true);
  };

  const renderItem = (item) => {
    const Icon = item.itemType === 'activity' 
      ? activityIcons[item.type] || FileText
      : item.itemType === 'task' 
      ? CheckSquare 
      : item.itemType === 'note'
      ? FileText
      : Calendar;
      
    const colorClass = item.itemType === 'activity'
      ? activityColors[item.type] || 'bg-gray-50 text-gray-600'
      : item.itemType === 'task'
      ? 'bg-green-50 text-green-600'
      : item.itemType === 'note'
      ? 'bg-amber-50 text-amber-600'
      : 'bg-rose-50 text-rose-600';

    const isClickable = item.itemType === 'event' || item.itemType === 'note' || item.itemType === 'task';
    const handleCardClick = () => {
      if (item.itemType === 'event') handleEditEvent(item);
      else if (item.itemType === 'note') handleEditNote(item);
      else if (item.itemType === 'task') handleEditTask(item);
    };

    return (
      <div key={`${item.itemType}-${item.id}`} className="flex gap-4 pb-6 border-l border-[#E5E5E5] pl-6 ml-4 last:border-0">
        <div className={`w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center flex-shrink-0 -ml-11`}>
          <Icon className="w-5 h-5" />
        </div>
        
        <div className={`flex-1 pt-1 ${isClickable ? 'cursor-pointer hover:bg-[#FAFAFA] rounded-lg -m-2 p-2 transition-colors' : ''}`}
          onClick={isClickable ? handleCardClick : undefined}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h4 className="font-medium text-sm">{item.title}</h4>
              <p className="text-xs text-[#999999] mt-0.5">
                {format(new Date(item.created_date), 'dd MMMM yyyy à HH:mm', { locale: fr })}
              </p>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {item.itemType === 'note' && (
                  <DropdownMenuItem onClick={() => handleEditNote(item)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Modifier
                  </DropdownMenuItem>
                )}
                {item.itemType === 'task' && (
                  <DropdownMenuItem onClick={() => handleEditTask(item)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Modifier
                  </DropdownMenuItem>
                )}
                {item.itemType === 'event' && (
                  <DropdownMenuItem onClick={() => handleEditEvent(item)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Modifier
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={() => {
                    if (item.itemType === 'activity') deleteActivityMutation.mutate(item.id);
                    if (item.itemType === 'task') deleteTaskMutation.mutate(item.id);
                    if (item.itemType === 'note') deleteNoteMutation.mutate(item.id);
                    if (item.itemType === 'event') deleteEventMutation.mutate(item.id);
                  }}
                  className="text-rose-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {item.content && (
            <p className="text-sm text-[#666666] mt-2 whitespace-pre-line">{item.content}</p>
          )}
          {item.description && (
            <p className="text-sm text-[#666666] mt-2 whitespace-pre-line">{item.description}</p>
          )}
          
          {item.itemType === 'task' && (
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                item.status === 'completed' ? 'bg-green-100 text-green-700' :
                item.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {item.status === 'completed' ? 'Terminée' : 
                 item.status === 'in_progress' ? 'En cours' : 'À faire'}
              </span>
              {item.priority && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  item.priority === 'urgent' ? 'bg-rose-100 text-rose-700' :
                  item.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                  item.priority === 'normal' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {item.priority === 'urgent' ? '🔴 Urgent' :
                   item.priority === 'high' ? '🟡 Important' :
                   item.priority === 'normal' ? '🟢 Normal' : '⚪ Bas'}
                </span>
              )}
            </div>
          )}

          {item.itemType === 'event' && item.date && (
            <p className="text-xs text-[#666666] mt-2">
              📅 {format(new Date(item.date), 'dd MMMM yyyy à HH:mm', { locale: fr })}
              {item.location && ` • 📍 ${item.location}`}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Historique des échanges</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="bg-[#c5ff4e] hover:bg-[#b5ef3e] text-black rounded-xl">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleCreateActivity('call')}>
              <Phone className="w-4 h-4 mr-2" />
              Appel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleCreateActivity('email')}>
              <Mail className="w-4 h-4 mr-2" />
              Email
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setEditingNote(null); setShowNoteModal(true); }}>
              <FileText className="w-4 h-4 mr-2" />
              Note
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setEditingTask(null); setShowTaskModal(true); }}>
              <CheckSquare className="w-4 h-4 mr-2" />
              Tâche
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setEditingEvent(null); setShowEventModal(true); }}>
              <Calendar className="w-4 h-4 mr-2" />
              Événement
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="rounded-xl w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les activités</SelectItem>
            <SelectItem value="call">Appels</SelectItem>
            <SelectItem value="email">Emails</SelectItem>
            <SelectItem value="note">Notes</SelectItem>
            <SelectItem value="task">Tâches</SelectItem>
            <SelectItem value="event">Événements</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Timeline */}
      <div className="space-y-0">
        {filteredItems.length === 0 ? (
          <p className="text-sm text-[#999999] text-center py-8">
            Aucune activité pour le moment
          </p>
        ) : (
          filteredItems.map(renderItem)
        )}
      </div>

      {/* Modals */}
      <CreateActivityModal 
        open={showActivityModal} 
        onClose={() => { setShowActivityModal(false); setActivityType(null); }}
        type={activityType}
        prefilledLeadId={leadId}
      />
      
      <CreateNoteModal 
        open={showNoteModal} 
        onClose={() => { setShowNoteModal(false); setEditingNote(null); }}
        note={editingNote}
        prefilledLeadId={leadId}
      />
      
      <CreateTaskModal 
        open={showTaskModal} 
        onClose={() => { setShowTaskModal(false); setEditingTask(null); }}
        task={editingTask}
        prefilledLeadId={leadId}
      />
      
      <CreateEventModal 
        open={showEventModal} 
        onClose={() => { setShowEventModal(false); setEditingEvent(null); }}
        event={editingEvent}
        prefilledLeadId={leadId}
      />
    </div>
  );
}