import React from 'react';
import { UserPlus, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatContextProvider, useChatContext } from '@/contexts/ChatContext';
import { useAuth } from '@/lib/AuthContext';
import { getChatGreeting } from '@/lib/chatGreeting';
import LeadChatTab from './LeadChatTab';
import AssistantChatTab from './AssistantChatTab';

const TABS = [
  { id: 'lead', label: 'Lead', icon: UserPlus, color: '#095237' },
  { id: 'chat', label: 'Assistant', icon: MessageCircle, color: '#095237' },
];

function TabsContent({ fullWidth }) {
  const { user } = useAuth();
  const { activeTab, setActiveTab, activeLead, activeListing } = useChatContext();
  const greeting = getChatGreeting(user);

  return (
    <div className={cn("w-full bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden min-w-0", !fullWidth && "max-w-[1200px] mx-auto")}>
      <div className="p-4 sm:p-5">
        {activeTab === 'lead' && <LeadChatTab greetingText={greeting} />}
        {activeTab === 'chat' && <AssistantChatTab activeLead={activeLead} activeListing={activeListing} greetingText={greeting} />}

        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[#E5E5E5]">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-[#f0fdf4] border-2"
                    : "bg-[#F3F4F6] text-[#6B7280] border-2 border-transparent hover:bg-[#E5E7EB]"
                )}
                style={isActive ? { borderColor: tab.color, color: '#095237' } : {}}
              >
                <Icon className="w-4 h-4" style={isActive ? { color: tab.color } : {}} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function AIAssistantTabs({ fullWidth = false }) {
  return (
    <ChatContextProvider>
      <TabsContent fullWidth={fullWidth} />
    </ChatContextProvider>
  );
}
