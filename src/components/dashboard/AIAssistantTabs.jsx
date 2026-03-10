import React from 'react';
import { Link } from 'react-router-dom';
import {
  UserPlus, MessageCircle, Clock,
  Monitor, FileText, BarChart3, Globe, MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatContextProvider, useChatContext } from '@/contexts/ChatContext';
import { useAuth } from '@/lib/AuthContext';
import { getChatGreeting } from '@/lib/chatGreeting';
import { createPageUrl } from '@/utils';
import { Card } from '@/components/ui/card';
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

function getAISuggestion() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Qu'avons-nous au programme aujourd'hui ?";
  if (hour >= 12 && hour < 18) return "Comment puis-je vous aider cet après-midi ?";
  if (hour >= 18 && hour < 22) return "Faisons le point sur votre journée ?";
  return "Comment puis-je vous aider ?";
}

function TabsContent({ fullWidth }) {
  const { user } = useAuth();
  const { activeTab, setActiveTab, activeLead, activeListing, switchToAssistant } = useChatContext();
  const greeting = getChatGreeting(user);

  const renderBelowInput = ({ sendButton }) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
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

      <div className="flex flex-wrap gap-2">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          if (action.link) {
            return (
              <Link
                key={action.label}
                to={createPageUrl(action.link)}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium border border-border bg-card text-foreground hover:bg-muted transition-colors"
              >
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                {action.label}
              </Link>
            );
          }
          return (
            <button
              key={action.label}
              onClick={() => switchToAssistant(action.prompt)}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium border border-border bg-card text-foreground hover:bg-muted transition-colors"
            >
              <Icon className="w-3.5 h-3.5 text-muted-foreground" />
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
        <h2 className="text-2xl sm:text-3xl font-semibold text-foreground">
          {getAISuggestion()}
        </h2>
        <Card className="overflow-hidden">
          <div className="p-4 sm:p-6">
            {activeTab === 'lead' && <LeadChatTab greetingText={greeting} renderBelowInput={renderBelowInput} />}
            {activeTab === 'chat' && (
              <AssistantChatTab
                activeLead={activeLead}
                activeListing={activeListing}
                greetingText={greeting}
                renderBelowInput={renderBelowInput}
              />
            )}
          </div>
        </Card>
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
