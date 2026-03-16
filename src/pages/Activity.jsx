import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import TimelineTab from '@/components/activity/TimelineTab';
import TasksAndNotesTab from '@/components/activity/TasksAndNotesTab';
import AgendaTab from '@/components/activity/AgendaTab';
import TodayTab from '@/components/activity/TodayTab';

export default function Activity() {
  const [activeTab, setActiveTab] = useState('today');

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

  const todayTaskCount = tasks.filter((t) => {
    if (!t.due_date) return ['todo', 'in_progress'].includes(t.status);
    const d = new Date(t.due_date);
    const today = new Date();
    return d.toDateString() === today.toDateString() && ['todo', 'in_progress'].includes(t.status);
  }).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header - épuré sans bouton global */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Activité</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gérez votre agenda, tâches et notes
        </p>
      </div>

      {/* Tabs: Aujourd'hui (command center) | Agenda | Tâches & Notes | Timeline */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 h-auto sm:h-12 bg-muted/50 rounded-xl p-1">
          <TabsTrigger
            value="today"
            className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm px-2"
          >
            Aujourd&apos;hui
            {(todayEvents > 0 || todayTaskCount > 0) && (
              <Badge variant="secondary" className="ml-1 sm:ml-2 h-4 sm:h-5 px-1 sm:px-1.5 text-[10px] sm:text-xs">
                {todayEvents + todayTaskCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="agenda"
            className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm px-2"
          >
            Agenda
            {todayEvents > 0 && (
              <Badge variant="secondary" className="ml-1 sm:ml-2 h-4 sm:h-5 px-1 sm:px-1.5 text-[10px] sm:text-xs">
                {todayEvents}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="tasks-notes"
            className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm px-2"
          >
            Tâches & Notes
            {todoCount > 0 && (
              <Badge variant="secondary" className="ml-1 sm:ml-2 h-4 sm:h-5 px-1 sm:px-1.5 text-[10px] sm:text-xs">
                {todoCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="timeline"
            className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm px-2"
          >
            Timeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-6">
          <TodayTab
            onNavigateToAgenda={() => setActiveTab('agenda')}
            onNavigateToTasks={() => setActiveTab('tasks-notes')}
            onNavigateToNotes={() => setActiveTab('tasks-notes')}
          />
        </TabsContent>

        <TabsContent value="agenda" className="mt-6">
          <AgendaTab />
        </TabsContent>

        <TabsContent value="tasks-notes" className="mt-6">
          <TasksAndNotesTab />
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          <TimelineTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
