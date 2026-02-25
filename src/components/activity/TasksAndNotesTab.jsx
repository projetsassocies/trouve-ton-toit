import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TasksTab from './TasksTab';
import NotesTab from './NotesTab';

export default function TasksAndNotesTab() {
  const [subTab, setSubTab] = useState('tasks');

  return (
    <Tabs value={subTab} onValueChange={setSubTab}>
      <TabsList className="grid w-full max-w-xs grid-cols-2 bg-[#F5F5F5] rounded-xl p-1 mb-6">
        <TabsTrigger
          value="tasks"
          className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
        >
          Tâches
        </TabsTrigger>
        <TabsTrigger
          value="notes"
          className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
        >
          Notes
        </TabsTrigger>
      </TabsList>

      <TabsContent value="tasks" className="mt-0">
        <TasksTab />
      </TabsContent>

      <TabsContent value="notes" className="mt-0">
        <NotesTab />
      </TabsContent>
    </Tabs>
  );
}
