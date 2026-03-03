import React from 'react';
import { UserPlus, Home, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatContextProvider, useChatContext } from '@/contexts/ChatContext';
import LeadChatTab from './LeadChatTab';
import BienChatTab from './BienChatTab';
import AssistantChatTab from './AssistantChatTab';

const TABS = [
  { id: 'lead', label: 'Lead', icon: UserPlus, color: '#095237' },
  { id: 'bien', label: 'Bien', icon: Home, color: '#095237' },
  { id: 'chat', label: 'Assistant', icon: MessageCircle, color: '#095237' },
];

function TabsContent() {
  const { activeTab, setActiveTab, activeLead, activeListing } = useChatContext();

  return (
    <div className="w-full max-w-[1200px] mx-auto bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden min-w-0">
      <div className="p-4 sm:p-6 md:p-8">
        <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-white border-2 shadow-sm"
                    : "bg-[#F3F4F6] text-[#6B7280] border-2 border-transparent hover:bg-[#E5E7EB]"
                )}
                style={isActive ? { borderColor: tab.color, color: '#111827' } : {}}
              >
                <Icon className="w-4 h-4" style={isActive ? { color: tab.color } : {}} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'lead' && <LeadChatTab />}
        {activeTab === 'bien' && <BienChatTab />}
        {activeTab === 'chat' && <AssistantChatTab activeLead={activeLead} activeListing={activeListing} />}
      </div>
    </div>
  );
}

export default function AIAssistantTabs() {
  return (
    <ChatContextProvider>
      <TabsContent />
    </ChatContextProvider>
  );
}
