import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import TimelineTab from '@/components/activity/TimelineTab';
import TasksAndNotesTab from '@/components/activity/TasksAndNotesTab';
import AgendaTab from '@/components/activity/AgendaTab';
import CreateActivityModal from '@/components/activity/CreateActivityModal';
import CreateTaskModal from '@/components/activity/CreateTaskModal';
import CreateNoteModal from '@/components/activity/CreateNoteModal';
import CreateEventModal from '@/components/activity/CreateEventModal';

export default function Activity() {
  const [activeTab, setActiveTab] = useState('timeline');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createType, setCreateType] = useState(null);

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list(),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list(),
  });

  const todoCount = tasks.filter((t) => t.status === 'todo' || t.status === 'in_progress').length;

  const todayEvents = events.filter((e) => {
    if (!e.date) return false;
    const eventDate = new Date(e.date);
    if (isNaN(eventDate.getTime())) return false;
    const today = new Date();
    return eventDate.toDateString() === today.toDateString();
  }).length;

  const handleCreateClick = (type) => {
    setCreateType(type);
    setCreateModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Activité</h1>
          <p className="text-sm text-[#999999] mt-1">
            Gérez vos tâches, notes et événements
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl whitespace-nowrap">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => handleCreateClick('call')}>
              📞 Ajouter un appel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleCreateClick('email')}>
              📧 Ajouter un email
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleCreateClick('note')}>
              📝 Créer une note
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleCreateClick('task')}>
              ✅ Créer une tâche
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleCreateClick('event')}>
              📅 Créer un événement
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tabs - 3 onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 h-auto sm:h-12 bg-[#F5F5F5] rounded-xl p-1">
          <TabsTrigger
            value="timeline"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm px-2"
          >
            Timeline
          </TabsTrigger>
          <TabsTrigger
            value="tasks-notes"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm px-2"
          >
            Tâches & Notes
            {todoCount > 0 && (
              <Badge className="ml-1 sm:ml-2 bg-blue-600 text-white h-4 sm:h-5 px-1 sm:px-1.5 text-[10px] sm:text-xs">
                {todoCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="agenda"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm px-2"
          >
            Agenda
            {todayEvents > 0 && (
              <Badge className="ml-1 sm:ml-2 bg-primary text-primary-foreground h-4 sm:h-5 px-1 sm:px-1.5 text-[10px] sm:text-xs">
                {todayEvents}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-6">
          <TimelineTab />
        </TabsContent>

        <TabsContent value="tasks-notes" className="mt-6">
          <TasksAndNotesTab />
        </TabsContent>

        <TabsContent value="agenda" className="mt-6">
          <AgendaTab />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {createType === 'call' && (
        <CreateActivityModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          type="call"
        />
      )}
      {createType === 'email' && (
        <CreateActivityModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          type="email"
        />
      )}
      {createType === 'note' && (
        <CreateNoteModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
        />
      )}
      {createType === 'task' && (
        <CreateTaskModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
        />
      )}
      {createType === 'event' && (
        <CreateEventModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
        />
      )}
    </div>
  );
}
