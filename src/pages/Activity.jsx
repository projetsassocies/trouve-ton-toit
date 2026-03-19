import React, { useState } from 'react';
import { api } from '@/api/apiClient';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import TimelineTab from '@/components/activity/TimelineTab';
import TasksAndNotesTab from '@/components/activity/TasksAndNotesTab';
import AgendaTab from '@/components/activity/AgendaTab';
import TodayTab from '@/components/activity/TodayTab';

const TAB_CONFIG = [
  { id: 'today', label: "Aujourd'hui", badge: (events, tasks) => events + tasks },
  { id: 'agenda', label: 'Agenda', badge: (events) => events },
  { id: 'tasks-notes', label: 'Tâches & Notes', badge: (_, tasks) => tasks },
  { id: 'timeline', label: 'Timeline', badge: () => 0 },
];

export default function Activity() {
  const [activeTab, setActiveTab] = useState('today');
  const isMobile = useIsMobile();
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.entities.Task.list(),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => api.entities.Event.list(),
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

  const currentIndex = TAB_CONFIG.findIndex((t) => t.id === activeTab);

  const goPrev = () => {
    const idx = currentIndex > 0 ? currentIndex - 1 : TAB_CONFIG.length - 1;
    setActiveTab(TAB_CONFIG[idx].id);
  };
  const goNext = () => {
    const idx = currentIndex < TAB_CONFIG.length - 1 ? currentIndex + 1 : 0;
    setActiveTab(TAB_CONFIG[idx].id);
  };

  const getBadgeCount = (tabId) => {
    if (tabId === 'today') return todayEvents + todayTaskCount;
    if (tabId === 'agenda') return todayEvents;
    if (tabId === 'tasks-notes') return todoCount;
    return 0;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header - épuré sans bouton global */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Activité</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gérez votre agenda, tâches et notes
        </p>
      </div>

      {/* Tabs: desktop = grille, mobile = navigation horizontale avec flèches */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {isMobile ? (
          <div className="flex items-center justify-between gap-2 bg-muted/50 rounded-xl p-2">
            <button
              onClick={goPrev}
              aria-label="Vue précédente"
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 flex justify-center items-center gap-2 min-w-0">
              <span className="font-medium text-sm truncate">
                {TAB_CONFIG[currentIndex]?.label}
              </span>
              {getBadgeCount(activeTab) > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs shrink-0">
                  {getBadgeCount(activeTab)}
                </Badge>
              )}
            </div>
            <button
              onClick={goNext}
              aria-label="Vue suivante"
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <TabsList className="grid w-full grid-cols-4 h-12 bg-muted/50 rounded-xl p-1">
            <TabsTrigger value="today" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm px-2">
              Aujourd&apos;hui
              {(todayEvents > 0 || todayTaskCount > 0) && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">{todayEvents + todayTaskCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="agenda" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm px-2">
              Agenda
              {todayEvents > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">{todayEvents}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="tasks-notes" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm px-2">
              Tâches & Notes
              {todoCount > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">{todoCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="timeline" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm px-2">
              Timeline
            </TabsTrigger>
          </TabsList>
        )}

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
