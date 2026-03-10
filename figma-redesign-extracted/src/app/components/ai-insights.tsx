import { Sparkles, User, ArrowRight, Presentation, FileText, LayoutDashboard, Globe, MoreHorizontal, Bot, History } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useState, useEffect } from 'react';
import { ConversationHistory } from './conversation-history';
import { useTypingEffect } from '../hooks/useTypingEffect';

const quickActions = [
  { icon: Presentation, label: 'Publier un bien' },
  { icon: FileText, label: 'Préparer une visite' },
  { icon: LayoutDashboard, label: 'Relancer un lead' },
  { icon: Globe, label: 'Estimer un bien' },
  { icon: MoreHorizontal, label: 'Plus' },
];

const placeholderSuggestions = [
  "Sophie Martin a rendez-vous avec vous à 8h...",
  "N'oubliez pas de rapporter le dossier pour la visite de 14h...",
  "Votre lead Marc Dubois n'a pas répondu depuis 3 jours...",
  "Vous avez 2 mandats qui expirent cette semaine...",
  "Le marché de Bordeaux centre est en hausse de 5%...",
  "3 nouveaux leads correspondent au bien Rue Victor Hugo..."
];

// Fonction pour obtenir le message de salutation selon l'heure
function getGreetingMessage(name: string = 'Grace') {
  const hour = new Date().getHours();
  let suggestion = '';
  
  if (hour >= 5 && hour < 12) {
    suggestion = "Qu'avons-nous au programme aujourd'hui ?";
  } else if (hour >= 12 && hour < 18) {
    suggestion = "Comment puis-je vous aider cet après-midi ?";
  } else if (hour >= 18 && hour < 22) {
    suggestion = "Faisons le point sur votre journée ?";
  } else {
    suggestion = "Comment puis-je vous aider ?";
  }
  
  return { suggestion };
}

export function AIInsights() {
  const [message, setMessage] = useState('');
  const [activeMode, setActiveMode] = useState<'lead' | 'assistant'>('assistant');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>();
  const currentPlaceholder = useTypingEffect(placeholderSuggestions, 50, 30, 2000);
  const [greetingMessage, setGreetingMessage] = useState(getGreetingMessage());

  // Mise à jour du message de salutation toutes les minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setGreetingMessage(getGreetingMessage());
    }, 60000); // Vérifie toutes les minutes

    return () => clearInterval(interval);
  }, []);

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    // Here you would load the conversation history
    console.log('Loading conversation:', id);
  };

  return (
    <>
      <div className="flex flex-col items-center justify-center py-12">
        {/* Title */}
        <h1 className="text-3xl font-semibold text-foreground mb-2">
          {greetingMessage.suggestion}
        </h1>

        {/* Chat Input Card */}
        <Card className="w-full max-w-4xl mb-6">
          <div className="p-6">
            {/* Text Area */}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={currentPlaceholder}
              className="w-full min-h-[120px] resize-none border-0 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-lg transition-all"
            />

            {/* Bottom Bar */}
            <div className="flex items-center justify-between pt-4 border-t">
              {/* Left Side Actions */}
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  onClick={() => setIsHistoryOpen(true)}
                >
                  <History className="h-5 w-5" />
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={() => setActiveMode('lead')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                    activeMode === 'lead'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-accent hover:text-white'
                  }`}
                >
                  <User className="h-4 w-4" />
                  Lead
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={() => setActiveMode('assistant')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                    activeMode === 'assistant'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-accent hover:text-white'
                  }`}
                >
                  <Bot className="h-4 w-4" />
                  Assistant
                </Button>
              </div>

              {/* Right Side Actions */}
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  className="rounded-full bg-accent hover:bg-accent/90 text-white"
                  disabled={!message.trim()}
                >
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="flex items-center gap-3">
          {quickActions.map((action, idx) => (
            <Button
              key={idx}
              variant="outline"
              className="flex items-center gap-2 rounded-full"
            >
              <action.icon className="h-4 w-4" />
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Conversation History Sidebar */}
      <ConversationHistory
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
      />
    </>
  );
}