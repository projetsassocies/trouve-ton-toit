import React from 'react';
import { Link } from 'react-router-dom';
import {
  UserPlus, MessageCircle, Clock, ArrowRight,
  Monitor, FileText, BarChart3, Globe, MoreHorizontal,
} from 'lucide-react';
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
  { label: 'Analyser mes leads', prompt: "Combien de leads chauds j'ai ?", icon: Monitor },
  { label: 'Créer une annonce', link: 'AddListing', icon: FileText },
  { label: 'Rapport d\'activité', prompt: 'Rapport d\'activité de la semaine', icon: BarChart3 },
  { label: 'Analyse de marché', prompt: 'Résume mon pipeline', icon: Globe },
  { label: 'Plus', prompt: 'Que peux-tu faire pour moi ?', icon: MoreHorizontal },
];

function TabsContent({ fullWidth }) {
  const { user } = useAuth();
  const { activeTab, setActiveTab, activeLead, activeListing, switchToAssistant } = useChatContext();
  const greeting = getChatGreeting(user);

  const renderBelowInput = ({ sendButton }) => (
    <div className="space-y-4">
      {/* Ligne toggles : Clock | Lead | Assistant | flèche envoi */}
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-[#9ca3af] flex-shrink-0" />
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[#1a472a] text-white'
                  : 'bg-[#c5ff4e] text-[#1a1a1a]'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
        <div className="flex-1" />
        {sendButton}
      </div>

      {/* Boutons rapides : blanc, bordure grise légère */}
      <div className="flex flex-wrap gap-2">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          if (action.link) {
            return (
              <Link
                key={action.label}
                to={createPageUrl(action.link)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-white border border-[#e0e0e0] text-[#1a1a1a] hover:bg-[#fafafa] transition-colors"
              >
                <Icon className="w-3.5 h-3.5 text-[#6b6b6b]" />
                {action.label}
              </Link>
            );
          }
          return (
            <button
              key={action.label}
              onClick={() => switchToAssistant(action.prompt)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-white border border-[#e0e0e0] text-[#1a1a1a] hover:bg-[#fafafa] transition-colors"
            >
              <Icon className="w-3.5 h-3.5 text-[#6b6b6b]" />
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className={cn("w-full min-w-0", !fullWidth && "max-w-[1200px] mx-auto")}>
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-[#1a1a1a]">
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
