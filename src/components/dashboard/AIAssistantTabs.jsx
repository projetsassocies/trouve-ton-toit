import React from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, MessageCircle, Flame, Calendar, BarChart3, Target, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatContextProvider, useChatContext } from '@/contexts/ChatContext';
import { useAuth } from '@/lib/AuthContext';
import { getChatGreeting } from '@/lib/chatGreeting';
import { createPageUrl } from '@/utils';
import LeadChatTab from './LeadChatTab';
import AssistantChatTab from './AssistantChatTab';

const TABS = [
  { id: 'lead', label: 'Lead', icon: UserPlus },
  { id: 'chat', label: 'Assistant', icon: MessageCircle },
];

const QUICK_ACTIONS = [
  { label: 'Leads chauds', prompt: "Combien de leads chauds j'ai ?", icon: Flame },
  { label: 'Prochains RDV', prompt: 'Mes prochains rendez-vous', icon: Calendar },
  { label: 'Pipeline', prompt: 'Résume mon pipeline', icon: BarChart3 },
  { label: 'Matcher un lead', link: 'Matching', icon: Target },
  { label: '… Plus', prompt: 'Que peux-tu faire pour moi ?', icon: MoreHorizontal },
];

function TabsContent({ fullWidth }) {
  const { user } = useAuth();
  const { activeTab, setActiveTab, activeLead, activeListing, switchToAssistant } = useChatContext();
  const greeting = getChatGreeting(user);

  const renderBelowInput = (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-[#095237] text-white'
                  : 'bg-[#F3F4F6] dark:bg-[#222] text-[#6B7280] dark:text-[#999] border-2 border-transparent hover:bg-[#E5E7EB] dark:hover:bg-[#333]'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          if (action.link) {
            return (
              <Link
                key={action.label}
                to={createPageUrl(action.link)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-[#F3F4F6] dark:bg-[#222] text-[#374151] dark:text-[#ccc] hover:bg-[#E5E7EB] dark:hover:bg-[#333] transition-colors"
              >
                <Icon className="w-3.5 h-3.5" />
                {action.label}
              </Link>
            );
          }
          return (
            <button
              key={action.label}
              onClick={() => switchToAssistant(action.prompt)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-[#F3F4F6] dark:bg-[#222] text-[#374151] dark:text-[#ccc] hover:bg-[#E5E7EB] dark:hover:bg-[#333] transition-colors"
            >
              <Icon className="w-3.5 h-3.5" />
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className={cn("w-full bg-white dark:bg-[#111] rounded-2xl border border-[#E5E7EB] dark:border-[#333] shadow-sm overflow-hidden min-w-0", !fullWidth && "max-w-[1200px] mx-auto")}>
      <div className="p-4 sm:p-5">
        <h2 className="text-lg sm:text-xl font-semibold text-[#111] dark:text-white mb-4">
          {greeting}
        </h2>
        {activeTab === 'lead' && <LeadChatTab greetingText="" renderBelowInput={renderBelowInput} />}
        {activeTab === 'chat' && (
          <AssistantChatTab
            activeLead={activeLead}
            activeListing={activeListing}
            greetingText=""
            renderBelowInput={renderBelowInput}
          />
        )}
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
