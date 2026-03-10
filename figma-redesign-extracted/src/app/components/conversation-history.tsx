import { X, Plus, Trash2, MessageSquare } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { useState } from 'react';

interface Conversation {
  id: string;
  title: string;
  preview: string;
  timestamp: string;
  dateGroup: string;
}

const mockConversations: Conversation[] = [
  {
    id: '1',
    title: 'Analyse leads appartements Paris',
    preview: 'Peux-tu analyser mes leads pour des appartements...',
    timestamp: "Aujourd'hui, 14h32",
    dateGroup: 'Aujourd\'hui',
  },
  {
    id: '2',
    title: 'Créer annonce villa Neuilly',
    preview: 'J\'ai besoin d\'aide pour créer une annonce...',
    timestamp: "Aujourd'hui, 10h15",
    dateGroup: 'Aujourd\'hui',
  },
  {
    id: '3',
    title: 'Rapport d\'activité février',
    preview: 'Génère-moi un rapport complet de mon activité...',
    timestamp: 'Hier, 16h45',
    dateGroup: 'Hier',
  },
  {
    id: '4',
    title: 'Analyse de marché 16ème arrondissement',
    preview: 'Quelles sont les tendances actuelles du marché...',
    timestamp: 'Hier, 09h20',
    dateGroup: 'Hier',
  },
  {
    id: '5',
    title: 'Préparation visite client VIP',
    preview: 'J\'ai une visite importante demain avec un client...',
    timestamp: '4 mars, 11h30',
    dateGroup: '7 derniers jours',
  },
  {
    id: '6',
    title: 'Négociation appartement Marais',
    preview: 'Des conseils pour négocier avec ce vendeur...',
    timestamp: '2 mars, 15h00',
    dateGroup: '7 derniers jours',
  },
  {
    id: '7',
    title: 'Stratégie prospection Q1',
    preview: 'Aide-moi à définir ma stratégie de prospection...',
    timestamp: '28 fév, 14h20',
    dateGroup: 'Plus ancien',
  },
];

interface ConversationHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  activeConversationId?: string;
  onSelectConversation: (id: string) => void;
}

export function ConversationHistory({ 
  isOpen, 
  onClose, 
  activeConversationId,
  onSelectConversation 
}: ConversationHistoryProps) {
  const [conversations, setConversations] = useState(mockConversations);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversations(conversations.filter(conv => conv.id !== id));
  };

  const handleNewConversation = () => {
    // Reset to new conversation
    onClose();
  };

  // Group conversations by date
  const groupedConversations = conversations.reduce((acc, conv) => {
    if (!acc[conv.dateGroup]) {
      acc[conv.dateGroup] = [];
    }
    acc[conv.dateGroup].push(conv);
    return acc;
  }, {} as Record<string, Conversation[]>);

  const dateGroups = ['Aujourd\'hui', 'Hier', '7 derniers jours', 'Plus ancien'];

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`fixed top-0 right-0 h-full w-80 bg-background border-l shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Historique</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* New Conversation Button */}
            <Button
              onClick={handleNewConversation}
              className="w-full"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle conversation
            </Button>
          </div>

          {/* Conversations List */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-6">
              {dateGroups.map(group => {
                const groupConvs = groupedConversations[group];
                if (!groupConvs || groupConvs.length === 0) return null;

                return (
                  <div key={group}>
                    <h3 className="text-xs font-medium text-muted-foreground mb-2 px-2">
                      {group}
                    </h3>
                    <div className="space-y-2">
                      {groupConvs.map(conv => (
                        <Card
                          key={conv.id}
                          className={`p-3 cursor-pointer hover:bg-accent transition-colors relative group ${
                            activeConversationId === conv.id ? 'border-primary bg-accent' : ''
                          }`}
                          onClick={() => {
                            onSelectConversation(conv.id);
                            onClose();
                          }}
                          onMouseEnter={() => setHoveredId(conv.id)}
                          onMouseLeave={() => setHoveredId(null)}
                        >
                          <div className="flex items-start gap-2">
                            <MessageSquare className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium line-clamp-1 mb-1">
                                {conv.title}
                              </h4>
                              <p className="text-xs text-muted-foreground line-clamp-1 mb-1">
                                {conv.preview}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {conv.timestamp}
                              </p>
                            </div>
                            
                            {/* Delete Button - Show on Hover */}
                            {hoveredId === conv.id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-full flex-shrink-0"
                                onClick={(e) => handleDelete(conv.id, e)}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </div>
    </>
  );
}
