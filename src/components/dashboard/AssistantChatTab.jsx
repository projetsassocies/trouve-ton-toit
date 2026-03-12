import React, { useState, useEffect, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import {
  MessageCircle, Calendar, UserPen, ClipboardList, StickyNote,
  Activity, Search, BarChart3, Building2, CheckCircle2, AlertCircle,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useChatContext } from '@/contexts/ChatContext';
import ConversationalChat from './ConversationalChat';
import { runAgentLoop } from '@/lib/ai-tools';

const TOOL_ICONS = {
  search_leads: Search,
  search_listings: Building2,
  get_lead_details: Search,
  get_listing_details: Building2,
  get_upcoming_events: Calendar,
  get_pipeline_stats: BarChart3,
  find_matching_listings: Building2,
  create_event: Calendar,
  update_lead: UserPen,
  create_task: ClipboardList,
  add_note: StickyNote,
  add_activity: Activity,
};

const TOOL_LABELS = {
  search_leads: 'Recherche de leads',
  search_listings: 'Recherche de biens',
  get_lead_details: 'Détails du lead',
  get_listing_details: 'Détails du bien',
  get_upcoming_events: 'Prochains RDV',
  get_pipeline_stats: 'Stats pipeline',
  find_matching_listings: 'Matching lead/biens',
  create_event: 'RDV créé',
  update_lead: 'Lead mis à jour',
  create_task: 'Tâche créée',
  add_note: 'Note ajoutée',
  add_activity: 'Activité enregistrée',
};

const WRITE_TOOLS = new Set(['create_event', 'update_lead', 'create_task', 'add_note', 'add_activity']);

function buildSystemPrompt(context) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const tzOffset = -now.getTimezoneOffset();
  const tzSign = tzOffset >= 0 ? '+' : '-';
  const tzHours = String(Math.floor(Math.abs(tzOffset) / 60)).padStart(2, '0');
  const tzMinutes = String(Math.abs(tzOffset) % 60).padStart(2, '0');
  const tzString = `${tzSign}${tzHours}:${tzMinutes}`;

  let prompt = `Tu es l'assistant IA de TrouveTonToit, agent operationnel pour mandataires immobiliers.
Tu as acces au CRM complet via des outils : leads, biens, RDV, taches, notes, activites.

DATE ACTUELLE : ${dateStr}, ${timeStr}
FUSEAU HORAIRE DE L'UTILISATEUR : UTC${tzString} (Europe/Paris)

REGLES :
- Reponds en 2-4 phrases max, sauf demande explicite de detail
- Sois direct, concret et actionnable
- Ton conversationnel et dynamique, tutoie l'utilisateur
- N'utilise pas de gras (**) ni de markdown
- Quand l'utilisateur demande une action (creer RDV, modifier lead, etc.), execute-la directement avec les outils
- Quand l'utilisateur pose une question sur ses donnees, utilise les outils pour chercher la reponse
- Si tu manques d'info pour executer une action, demande les details manquants
- Apres une action, confirme ce qui a ete fait de facon concise
- Pour les dates relatives ("mardi", "demain", "la semaine prochaine"), calcule la date exacte a partir de la date actuelle
- IMPORTANT pour les dates ISO 8601 : utilise TOUJOURS le fuseau horaire de l'utilisateur (${tzString}). Exemple : si l'utilisateur dit "demain 10h", genere "2026-02-26T10:00:00${tzString}" et NON "2026-02-26T10:00:00Z"`;

  if (context?.activeLead) {
    const l = context.activeLead;
    prompt += `\n\nCONTEXTE - Lead actif : ${l.first_name} ${l.last_name} (ID: ${l.id})
- Catégorie: ${l.categorie}, Score: ${l.score}/100, Statut: ${l.status}
- Recherche: ${l.city || '?'}, ${l.property_type || '?'}, budget max ${l.budget_max || '?'}€
Quand l'utilisateur parle de "ce lead" ou "lui/elle", il fait reference a ce lead.`;
  }

  if (context?.activeListing) {
    const b = context.activeListing;
    prompt += `\n\nCONTEXTE - Bien actif : ${b.title} (ID: ${b.id})
- ${b.city}, ${b.price}€, ${b.surface}m², ${b.rooms} pieces
Quand l'utilisateur parle de "ce bien", il fait reference a ce bien.`;
  }

  return prompt;
}

function ToolCallCard({ toolCall, isExpanded, onToggle }) {
  const Icon = TOOL_ICONS[toolCall.name] || Activity;
  const label = TOOL_LABELS[toolCall.name] || toolCall.name;
  const isWrite = WRITE_TOOLS.has(toolCall.name);

  let resultData;
  try {
    resultData = typeof toolCall.result === 'string' ? JSON.parse(toolCall.result) : toolCall.result;
  } catch {
    resultData = toolCall.result;
  }

  const hasError = resultData?.error;
  const isSuccess = isWrite && resultData?.success;

  return (
    <div className={`border rounded-lg overflow-hidden text-xs ${
      hasError ? 'border-red-200 bg-red-50' :
      isSuccess ? 'border-green-200 bg-green-50' :
      'border-[#E5E7EB] bg-[#F9FAFB]'
    }`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-black/5 transition-colors"
      >
        <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${
          hasError ? 'text-red-500' :
          isSuccess ? 'text-green-600' :
          'text-secondary'
        }`} />
        <span className="font-medium text-[#374151] flex-1 text-left">{label}</span>
        {isSuccess && <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />}
        {hasError && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
        {isExpanded ? <ChevronUp className="w-3 h-3 text-[#9CA3AF]" /> : <ChevronDown className="w-3 h-3 text-[#9CA3AF]" />}
      </button>

      {isExpanded && resultData && (
        <div className="px-3 pb-2 border-t border-[#E5E7EB]/50">
          <ToolResultSummary name={toolCall.name} data={resultData} />
        </div>
      )}
    </div>
  );
}

function ToolResultSummary({ name, data }) {
  if (data?.error) {
    return <p className="text-red-600 text-[11px] mt-1.5">Erreur : {data.error}</p>;
  }

  switch (name) {
    case 'search_leads':
      return (
        <div className="mt-1.5 space-y-1">
          <p className="text-[11px] text-[#6B7280]">{data.count} lead{data.count > 1 ? 's' : ''} trouvé{data.count > 1 ? 's' : ''}</p>
          {data.leads?.slice(0, 3).map(l => (
            <div key={l.id} className="flex items-center gap-2 text-[11px]">
              <span className={`px-1.5 py-0.5 rounded font-medium ${
                l.categorie === 'CHAUD' ? 'bg-red-100 text-red-700' :
                l.categorie === 'TIEDE' ? 'bg-amber-100 text-amber-700' :
                'bg-emerald-100 text-emerald-700'
              }`}>{l.categorie}</span>
              <span className="text-[#374151]">{l.first_name} {l.last_name}</span>
              <span className="text-[#9CA3AF]">{l.city}</span>
            </div>
          ))}
          {data.count > 3 && <p className="text-[11px] text-[#9CA3AF]">+ {data.count - 3} autres</p>}
        </div>
      );

    case 'search_listings':
      return (
        <div className="mt-1.5 space-y-1">
          <p className="text-[11px] text-[#6B7280]">{data.count} bien{data.count > 1 ? 's' : ''} trouvé{data.count > 1 ? 's' : ''}</p>
          {data.listings?.slice(0, 3).map(b => (
            <div key={b.id} className="text-[11px] text-[#374151]">
              {b.title || b.property_type} — {b.city}, {b.price?.toLocaleString('fr-FR')}€, {b.surface}m²
            </div>
          ))}
        </div>
      );

    case 'get_pipeline_stats':
      return (
        <div className="mt-1.5 grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-sm font-semibold text-red-600">{data.leads?.by_categorie?.CHAUD || 0}</div>
            <div className="text-[10px] text-[#9CA3AF]">Chauds</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-amber-600">{data.leads?.by_categorie?.TIEDE || 0}</div>
            <div className="text-[10px] text-[#9CA3AF]">Tièdes</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-emerald-700">{data.leads?.by_categorie?.FROID || 0}</div>
            <div className="text-[10px] text-[#9CA3AF]">Froids</div>
          </div>
        </div>
      );

    case 'find_matching_listings':
      return (
        <div className="mt-1.5 space-y-1">
          <p className="text-[11px] text-[#6B7280]">{data.count} bien{data.count > 1 ? 's' : ''} compatible{data.count > 1 ? 's' : ''}</p>
          {data.matching_listings?.slice(0, 3).map(b => (
            <div key={b.id} className="text-[11px] text-[#374151]">
              {b.title || b.property_type} — {b.price?.toLocaleString('fr-FR')}€, {b.surface}m²
            </div>
          ))}
        </div>
      );

    case 'create_event':
      return data.message ? <p className="text-[11px] text-green-700 mt-1.5">{data.message}</p> : null;

    case 'update_lead':
      return data.message ? <p className="text-[11px] text-green-700 mt-1.5">{data.message}</p> : null;

    case 'create_task':
      return data.message ? <p className="text-[11px] text-green-700 mt-1.5">{data.message}</p> : null;

    case 'add_note':
    case 'add_activity':
      return data.message ? <p className="text-[11px] text-green-700 mt-1.5">{data.message}</p> : null;

    default:
      return <pre className="text-[10px] text-[#6B7280] mt-1 overflow-x-auto">{JSON.stringify(data, null, 2)}</pre>;
  }
}

export default function AssistantChatTab({ activeLead, activeListing, greetingText, renderBarContent, renderSuggestions }) {
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedTools, setExpandedTools] = useState({});
  const queryClient = useQueryClient();
  const { pendingAssistantMessage, setPendingAssistantMessage } = useChatContext();
  const pendingHandled = useRef(false);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (pendingAssistantMessage && !isProcessing && !pendingHandled.current) {
      pendingHandled.current = true;
      const msg = pendingAssistantMessage;
      setPendingAssistantMessage(null);
      handleSendMessage(msg);
    }
    if (!pendingAssistantMessage) {
      pendingHandled.current = false;
    }
  }, [pendingAssistantMessage, isProcessing]);

  const loadConversations = async () => {
    setLoadingConversations(true);
    try {
      const list = await base44.agents.listConversations('assistant_trouvetontoit');
      setConversations(list);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  };

  const handleSelectConversation = (conv) => {
    setActiveConversationId(conv.id);
    setMessages(conv.messages || []);
    setExpandedTools({});
  };

  const handleNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
    setExpandedTools({});
  };

  const handleDeleteConversation = async (id) => {
    try {
      await base44.agents.deleteConversation(id);
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
      await base44.agents.updateConversation(id, {
        metadata: { ...conv?.metadata, title: newTitle }
      });
      setConversations(prev => prev.map(c =>
        c.id === id ? { ...c, metadata: { ...c.metadata, title: newTitle } } : c
      ));
    } catch {
      toast.error('Erreur lors du renommage');
    }
  };

  const invokeLLM = async (params) => {
    return await base44.functions.invoke('invoke-llm', params);
  };

  const handleSendMessage = async (text) => {
    setIsProcessing(true);

    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    let convId = activeConversationId;

    try {
      if (!convId) {
        const newConv = await base44.agents.createConversation({
          agent_name: 'assistant_trouvetontoit',
          metadata: { title: text.substring(0, 50) + (text.length > 50 ? '...' : '') }
        });
        convId = newConv.id;
        setActiveConversationId(convId);
      }

      const systemPrompt = buildSystemPrompt({ activeLead, activeListing });

      const conversationForAI = updatedMessages.map(m => {
        if (m.role === 'assistant') {
          return { role: 'assistant', content: m.content };
        }
        return { role: m.role, content: m.content };
      });

      const { finalContent, toolCallsExecuted } = await runAgentLoop(
        systemPrompt,
        conversationForAI,
        invokeLLM
      );

      const hasWriteAction = toolCallsExecuted?.some(tc => WRITE_TOOLS.has(tc.name));

      const assistantMsg = {
        role: 'assistant',
        content: finalContent,
        data: toolCallsExecuted?.length > 0 ? { toolCalls: toolCallsExecuted } : undefined,
        timestamp: new Date().toISOString()
      };

      const allMessages = [...updatedMessages, assistantMsg];
      setMessages(allMessages);

      await base44.agents.updateConversation(convId, { messages: allMessages });

      if (hasWriteAction) {
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        queryClient.invalidateQueries({ queryKey: ['events'] });
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['notes'] });
        queryClient.invalidateQueries({ queryKey: ['activities'] });
      }

      setConversations(prev => {
        const exists = prev.find(c => c.id === convId);
        if (exists) {
          return prev.map(c => c.id === convId ? { ...c, messages: allMessages, updated_date: new Date().toISOString() } : c);
        }
        return [{
          id: convId, agent_name: 'assistant_trouvetontoit',
          metadata: { title: text.substring(0, 50) },
          messages: allMessages,
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString()
        }, ...prev];
      });
    } catch (err) {
      console.error('Agent chat error:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Desole, une erreur s'est produite. Reessaye dans un instant.",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleTool = (msgIdx, toolIdx) => {
    const key = `${msgIdx}-${toolIdx}`;
    setExpandedTools(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderMessageExtra = (msg, msgIdx) => {
    if (msg.role !== 'assistant' || !msg.data?.toolCalls?.length) return null;

    return (
      <div className="mt-2 space-y-1.5 ml-0 max-w-[85%]">
        {msg.data.toolCalls.map((tc, idx) => (
          <ToolCallCard
            key={idx}
            toolCall={tc}
            isExpanded={!!expandedTools[`${msgIdx}-${idx}`]}
            onToggle={() => toggleTool(msgIdx, idx)}
          />
        ))}
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
        "Combien de leads chauds j'ai ?",
        "Programme un appel demain 10h avec mon dernier lead",
        "Quels biens matchent pour mes leads à Lyon ?",
        "Résume mon pipeline cette semaine",
        "Crée un RDV visite pour ce lead",
        "Qui sont mes 5 leads les plus chauds ?",
        "Modifie le statut du lead Martin",
        "Prochains rendez-vous cette semaine",
        "Biens disponibles pour acheteurs Lyon ?",
        "Stats de conversion ce mois",
      ], [])}
      inputPlaceholder="Demande-moi ce que tu veux..."
      renderBarContent={renderBarContent}
      renderSuggestions={renderSuggestions}
    />
  );
}
