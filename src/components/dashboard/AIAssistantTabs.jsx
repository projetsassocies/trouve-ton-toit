import React from 'react';
import { Link } from 'react-router-dom';
import {
  User, Bot,
  Monitor, FileText, BarChart3, Globe, MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatContextProvider, useChatContext } from '@/contexts/ChatContext';
import { useAuth } from '@/lib/AuthContext';
import { getChatGreeting } from '@/lib/chatGreeting';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import LeadChatTab from './LeadChatTab';
import AssistantChatTab from './AssistantChatTab';

const TABS = [
  { id: 'lead', label: 'Lead', icon: User },
  { id: 'chat', label: 'Assistant', icon: Bot },
];

const QUICK_ACTIONS = [
  { label: 'Analyser mes leads', prompt: "Combien de leads chauds j'ai ?", icon: Monitor },
  { label: 'Estimer un bien', prompt: 'Je veux estimer un bien. Montre-moi la liste de mes biens à vendre et propose-moi d\'en choisir un pour l\'estimation.', icon: FileText },
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

  const renderBarContent = ({ sendButton, historyButton }) => (
    <>
      <div className="flex items-center gap-3">
        {historyButton}
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <Button
              key={tab.id}
              variant="ghost"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Button>
          );
        })}
      </div>
      {sendButton}
    </>
  );

  const renderSuggestions = () => (
    <div className="flex items-center gap-3 flex-wrap justify-center">
      {QUICK_ACTIONS.map((action) => {
        const Icon = action.icon;
        if (action.link) {
          return (
            <Link
              key={action.label}
              to={createPageUrl(action.link)}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border border-border bg-transparent text-foreground hover:bg-muted transition-colors outline"
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
              {action.label}
            </Link>
          );
        }
        return (
          <Button
            key={action.label}
            variant="outline"
            onClick={() => switchToAssistant(action.prompt)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
          >
            <Icon className="h-4 w-4" />
            {action.label}
          </Button>
        );
      })}
    </div>
  );

  return (
    <div className={cn("flex flex-col items-center justify-center py-12 w-full min-w-0", !fullWidth && "max-w-[1200px] mx-auto")}>
      <h1 className="text-3xl font-semibold text-foreground mb-2">
        {getAISuggestion()}
      </h1>
      <div className="w-full max-w-4xl flex flex-col items-center">
        {activeTab === 'lead' && (
          <LeadChatTab
            greetingText={greeting}
            renderBarContent={renderBarContent}
            renderSuggestions={renderSuggestions}
          />
        )}
        {activeTab === 'chat' && (
          <AssistantChatTab
            activeLead={activeLead}
            activeListing={activeListing}
            greetingText={greeting}
            renderBarContent={renderBarContent}
            renderSuggestions={renderSuggestions}
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
