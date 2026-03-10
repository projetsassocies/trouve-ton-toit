import { useState, useEffect } from 'react';
import { Bot, Send, X, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { useTypingEffect } from '../hooks/useTypingEffect';

const quickActions = [
  "Publier un bien sur mes réseaux",
  "Relancer mes leads froids",
  "Générer un compte-rendu de visite",
  "Créer un mandat de vente"
];

const placeholderSuggestions = [
  "Sophie Martin a rendez-vous avec vous à 8h...",
  "N'oubliez pas le dossier pour la visite de 14h...",
  "Marc Dubois n'a pas répondu depuis 3 jours...",
  "2 mandats expirent cette semaine...",
  "Le marché de Bordeaux centre est en hausse...",
  "3 nouveaux leads pour le bien Rue Victor Hugo..."
];

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [message, setMessage] = useState('');
  const currentPlaceholder = useTypingEffect(placeholderSuggestions, 50, 30, 2000);

  const chatMessages = [
    {
      role: 'assistant',
      content: "Bonjour Grace ! 👋 Vous avez 4 rendez-vous aujourd'hui et 3 leads nécessitent votre attention. Comment puis-je vous aider ?"
    }
  ];

  return (
    <>
      {/* Floating Chat Window */}
      {isOpen && (
        <Card className={`fixed bottom-6 right-6 shadow-2xl transition-all ${
          isExpanded ? 'h-[600px] w-[500px]' : 'h-[500px] w-[380px]'
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between border-b bg-primary p-4 rounded-t-lg">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-primary-foreground">Assistant IA</h3>
                <Badge variant="secondary" className="h-4 text-xs">En ligne</Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Chat Messages */}
          <ScrollArea className="flex-1 p-4" style={{ height: 'calc(100% - 180px)' }}>
            <div className="space-y-4">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 rounded-lg bg-muted p-3">
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              ))}

              {/* Quick Actions */}
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-2">Actions rapides :</p>
                <div className="flex flex-wrap gap-2">
                  {quickActions.map((action, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      className="text-xs h-auto py-2 px-3"
                    >
                      {action}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={currentPlaceholder}
                className="flex-1"
              />
              <Button size="icon" disabled={!message.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}