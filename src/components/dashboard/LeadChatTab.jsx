import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/api/apiClient';
import { useQueryClient } from '@tanstack/react-query';
import { UserPlus, MapPin, Euro, Check, Building2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useChatContext } from '@/contexts/ChatContext';
import ConversationalChat from './ConversationalChat';

const LEAD_SYSTEM_PROMPT = `Tu es l'assistant d'extraction de leads de TrouveTonToit, expert en qualification de prospects immobiliers.

COMPORTEMENT :
- Quand l'utilisateur te donne un texte (email, SMS, WhatsApp, description), extrais TOUS les leads detectes
- Si l'utilisateur demande une modification, mets a jour les donnees et confirme
- Tutoie l'utilisateur, sois concis (2-3 phrases max dans le message)
- Si le texte ne contient pas d'info exploitable, demande des precisions

REPONDS TOUJOURS en JSON valide avec ce format :
{
  "leads": [
    {
      "first_name": "Prenom",
      "last_name": "Nom",
      "email": null,
      "phone": null,
      "budget_max": 250000,
      "city": "Lyon",
      "property_type": "t3",
      "surface_min": 70,
      "rooms_min": 3,
      "notes": "Criteres detailles, delai, financement, disponibilite, contexte",
      "financing_status": "En cours",
      "delai": "3 mois",
      "disponibilite": "Flexible",
      "score": 72,
      "categorie": "TIEDE"
    }
  ],
  "message": "Ta reponse conversationnelle courte et dynamique",
  "ready": true
}

SCORING (0-100) :
- Financement (max 35) : pret accepte +20, apport >50k +15, budget precis +10, fourchette +5
- Urgence (max 25) : <1 mois +25, 1-2 mois +20, 3 mois +15, 3-6 mois +10, >6 mois +5
- Criteres (max 20) : tres precis (quartier+surface+pieces) +20, assez precis +15, moyen +10, vagues +5
- Disponibilite (max 10) : dates precises +10, flexible +7, a definir +4
- Contexte (max 10) : urgent (mutation/divorce) +10, stable +7, exploratoire +4
- Penalites : "reve/un jour" -10, "veille" -10, "comparer" -8, multiples villes -5

CATEGORIES : CHAUD >= 75, TIEDE 40-74, FROID < 40
Pour property_type : studio, t1, t2, t3, t4, t5, maison, villa, loft
"ready" = true si au minimum un nom et une ville sont identifies`;

export default function LeadChatTab({ greetingText, renderBarContent, renderSuggestions }) {
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [createdLeadIds, setCreatedLeadIds] = useState(new Set());

  const queryClient = useQueryClient();
  const { setActiveLead, pushAction, switchToAssistant } = useChatContext();

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    setLoadingConversations(true);
    try {
      const list = await api.agents.listConversations('lead_extractor');
      setConversations(list);
    } catch (err) {
      console.error('Failed to load lead conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  };

  const handleSelectConversation = (conv) => {
    setActiveConversationId(conv.id);
    setMessages(conv.messages || []);
    setCreatedLeadIds(new Set(conv.metadata?.createdLeadIds || []));
  };

  const handleNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
    setCreatedLeadIds(new Set());
  };

  const handleDeleteConversation = async (id) => {
    try {
      await api.agents.deleteConversation(id);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConversationId === id) handleNewConversation();
      toast.success('Conversation supprimee');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleRenameConversation = async (id, newTitle) => {
    try {
      const conv = conversations.find(c => c.id === id);
      await api.agents.updateConversation(id, {
        metadata: { ...conv?.metadata, title: newTitle }
      });
      setConversations(prev => prev.map(c =>
        c.id === id ? { ...c, metadata: { ...c.metadata, title: newTitle } } : c
      ));
    } catch {
      toast.error('Erreur lors du renommage');
    }
  };

  const handleSendMessage = async (text) => {
    setIsProcessing(true);

    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    let convId = activeConversationId;

    try {
      if (!convId) {
        const newConv = await api.agents.createConversation({
          agent_name: 'lead_extractor',
          metadata: { title: text.substring(0, 50) + (text.length > 50 ? '...' : '') }
        });
        convId = newConv.id;
        setActiveConversationId(convId);
      }

      const openaiMessages = [
        { role: 'system', content: LEAD_SYSTEM_PROMPT },
        ...updatedMessages.map(m => {
          if (m.role === 'assistant' && m.data) {
            return { role: 'assistant', content: JSON.stringify({ leads: m.data.leads, message: m.content, ready: m.data.ready }) };
          }
          return { role: m.role, content: m.content };
        }),
      ];

      const aiContent = await api.integrations.Core.InvokeLLM({
        messages: openaiMessages,
        response_json_schema: { type: 'object' },
      });

      let parsed;
      if (typeof aiContent === 'string') {
        try { parsed = JSON.parse(aiContent); } catch { parsed = { leads: [], message: aiContent, ready: false }; }
      } else {
        parsed = aiContent;
      }

      const assistantMsg = {
        role: 'assistant',
        content: parsed.message || "J'ai analyse le texte.",
        data: { leads: parsed.leads || [], ready: parsed.ready !== false },
        timestamp: new Date().toISOString()
      };
      const allMessages = [...updatedMessages, assistantMsg];
      setMessages(allMessages);

      await api.agents.updateConversation(convId, { messages: allMessages });

      setConversations(prev => {
        const exists = prev.find(c => c.id === convId);
        if (exists) {
          return prev.map(c => c.id === convId ? { ...c, messages: allMessages, updated_date: new Date().toISOString() } : c);
        }
        return [{
          id: convId, agent_name: 'lead_extractor',
          metadata: { title: text.substring(0, 50) },
          messages: allMessages,
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString()
        }, ...prev];
      });
    } catch (err) {
      console.error('Lead chat error:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Desole, une erreur s'est produite. Reessaye dans un instant.",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateLead = async (lead, idx) => {
    try {
      const leadData = {
        first_name: lead.first_name || 'Inconnu',
        last_name: lead.last_name || '',
        email: lead.email || null,
        phone: lead.phone || null,
        city: lead.city || '',
        property_type: lead.property_type || 't3',
        budget_max: lead.budget_max || 0,
        surface_min: lead.surface_min || null,
        rooms_min: lead.rooms_min || null,
        notes: lead.notes || '',
        financing_status: lead.financing_status || null,
        source: 'ai_extraction',
        lead_type: 'acheteur',
        status: 'nouveau',
        score: lead.score || 0,
        categorie: lead.categorie || 'FROID',
        date_scoring: new Date().toISOString()
      };

      const createdLead = await api.entities.Lead.create(leadData);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setActiveLead(createdLead);
      pushAction({ type: 'lead_created', lead: createdLead });

      const newCreated = new Set([...createdLeadIds, idx]);
      setCreatedLeadIds(newCreated);

      if (activeConversationId) {
        const conv = conversations.find(c => c.id === activeConversationId);
        await api.agents.updateConversation(activeConversationId, {
          metadata: { ...conv?.metadata, createdLeadIds: [...newCreated], status: 'created' }
        });
      }

      toast.success(`Lead ${lead.first_name} ${lead.last_name} cree !`);
    } catch (err) {
      console.error('Create lead error:', err);
      toast.error('Erreur lors de la creation du lead');
    }
  };

  const handleCreateAllLeads = async (leads) => {
    for (let i = 0; i < leads.length; i++) {
      if (!createdLeadIds.has(i)) {
        await handleCreateLead(leads[i], i);
      }
    }
  };

  const formatPrice = (price) => {
    if (!price) return '-';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price);
  };

  const getCategoryStyle = (categorie) => {
    switch (categorie) {
      case 'CHAUD': return { border: 'border-[#EF4444]', badge: 'bg-[#FEE2E2] text-[#DC2626]', scoreColor: 'text-[#EF4444]' };
      case 'TIEDE': return { border: 'border-[#F59E0B]', badge: 'bg-[#FEF3C7] text-[#D97706]', scoreColor: 'text-[#F59E0B]' };
      default: return { border: 'border-secondary', badge: 'bg-secondary/10 text-secondary', scoreColor: 'text-secondary' };
    }
  };

  const renderMessageExtra = (msg, msgIdx) => {
    if (msg.role !== 'assistant' || !msg.data?.leads?.length) return null;

    const isLastDataMsg = (() => {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'assistant' && messages[i].data?.leads?.length) {
          return i === msgIdx;
        }
      }
      return false;
    })();

    if (!isLastDataMsg) return null;

    const leads = msg.data.leads;
    const allCreated = leads.every((_, idx) => createdLeadIds.has(idx));
    const remainingCount = leads.filter((_, idx) => !createdLeadIds.has(idx)).length;

    return (
      <div className="mt-2 space-y-2 ml-0 max-w-[85%]">
        {leads.map((lead, idx) => {
          const style = getCategoryStyle(lead.categorie);
          const isCreated = createdLeadIds.has(idx);
          return (
            <div key={idx} className={`bg-white border-l-4 ${style.border} rounded-lg shadow-sm p-3.5 space-y-2`}>
              <div className="flex items-start justify-between">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${style.badge}`}>
                  {lead.categorie || 'FROID'}
                </span>
                <span className={`text-sm font-semibold ${style.scoreColor}`}>
                  {lead.score}/100
                </span>
              </div>
              <h4 className="text-sm font-semibold text-[#111827]">
                {lead.first_name} {lead.last_name}
              </h4>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#6B7280]">
                {lead.city && (
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {lead.city}</span>
                )}
                {lead.budget_max > 0 && (
                  <span className="flex items-center gap-1"><Euro className="w-3 h-3" /> {formatPrice(lead.budget_max)}</span>
                )}
                {lead.property_type && <span className="uppercase">{lead.property_type}</span>}
                {lead.surface_min && <span>{lead.surface_min} m²</span>}
              </div>
              {lead.notes && (
                <p className="text-[11px] text-[#9CA3AF] line-clamp-2">{lead.notes}</p>
              )}
              <div className="pt-1.5">
                {isCreated ? (
                  <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                    <Check className="w-3 h-3" /> Cree dans le CRM
                  </span>
                ) : (
                  <Button
                    onClick={(e) => { e.stopPropagation(); handleCreateLead(lead, idx); }}
                    size="sm"
                    className="h-7 text-xs bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-lg px-3"
                  >
                    <UserPlus className="w-3 h-3 mr-1" /> Creer le lead
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {leads.length > 1 && remainingCount > 0 && (
          <Button
            onClick={() => handleCreateAllLeads(leads)}
            className="w-full h-8 text-xs bg-black hover:bg-black/90 text-white rounded-lg"
          >
            <UserPlus className="w-3 h-3 mr-1" /> Creer tous les leads ({remainingCount} restant{remainingCount > 1 ? 's' : ''})
          </Button>
        )}

        {allCreated && (
          <>
            <Link to={createPageUrl('Leads')} className="block">
              <Button variant="outline" className="w-full h-8 text-xs rounded-lg border-[#E5E7EB]">
                Voir dans le Pipeline
              </Button>
            </Link>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  const lead = leads[0];
                  switchToAssistant(`Est-ce que j'ai des biens qui matchent pour ${lead.first_name} ${lead.last_name} ?`);
                }}
                variant="outline"
                className="flex-1 h-8 text-xs rounded-lg border-secondary text-secondary hover:bg-secondary/5"
              >
                <Building2 className="w-3 h-3 mr-1" /> Chercher un bien compatible
              </Button>
              <Button
                onClick={() => {
                  const lead = leads[0];
                  switchToAssistant(`Programme un appel avec ${lead.first_name} ${lead.last_name}`);
                }}
                variant="outline"
                className="flex-1 h-8 text-xs rounded-lg border-secondary text-secondary hover:bg-secondary/5"
              >
                <MessageCircle className="w-3 h-3 mr-1" /> Demander a l'assistant
              </Button>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <ConversationalChat
      greetingText={greetingText}
      conversations={conversations}
      loadingConversations={loadingConversations}
      activeConversationId={activeConversationId}
      onSelectConversation={handleSelectConversation}
      onNewConversation={handleNewConversation}
      onDeleteConversation={handleDeleteConversation}
      onRenameConversation={handleRenameConversation}
      messages={messages}
      isProcessing={isProcessing}
      onSendMessage={handleSendMessage}
      renderMessageExtra={renderMessageExtra}
      placeholderPrompts={useMemo(() => [
        "Sophie Martin, 35 ans, cherche T3 Lyon, budget 280k",
        "Couple cherche maison 4 chambres, 500k max",
        "Jean veut vendre son T2 à Marseille",
        "Email : Marie Dupont, acheteuse Lyon 6e, T2 200k",
        "Colle un message WhatsApp ou email client",
        "Lead vendeur : maison 120m² avec jardin",
        "Prospect locataire T1 Paris 15e, 900€",
        "Nouveau contact : budget 350k, Lyon et environs",
        "Paul 45 ans cherche villa sur la Côte",
        "SMS client : recherche appart centre-ville Bordeaux",
      ], [])}
      inputPlaceholder="Colle un message client ou décris un lead..."
      renderBarContent={renderBarContent}
      renderSuggestions={renderSuggestions}
    />
  );
}
