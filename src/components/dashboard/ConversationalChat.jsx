import React, { useState, useRef, useEffect } from 'react';
import {
  MessageCircle, Loader2, Send, Trash2, Pencil,
  Plus, Search, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function ConversationalChat({
  conversations = [],
  loadingConversations = false,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  messages = [],
  isProcessing = false,
  onSendMessage,
  renderMessageExtra,
  emptyStateIcon,
  emptyStateTitle,
  emptyStateSubtitle,
  suggestions = [],
  inputPlaceholder = 'Ecris ta reponse...',
  inputPrefix,
  renderAboveInput,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hoveredConvId, setHoveredConvId] = useState(null);
  const [inputValue, setInputValue] = useState('');

  const chatEndRef = useRef(null);
  const renameInputRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  const getTitle = (conv) => {
    if (conv.metadata?.title) return conv.metadata.title;
    const firstUserMsg = (conv.messages || []).find(m => m.role === 'user');
    if (firstUserMsg) return firstUserMsg.content.substring(0, 50) + (firstUserMsg.content.length > 50 ? '...' : '');
    return 'Nouvelle conversation';
  };

  const formatRelativeDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMs / 3600000);
    const diffD = Math.floor(diffMs / 86400000);
    if (diffMin < 1) return "A l'instant";
    if (diffMin < 60) return `Il y a ${diffMin}min`;
    if (diffH < 24) return `Il y a ${diffH}h`;
    if (diffD < 7) return `Il y a ${diffD}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const filteredConversations = conversations.filter(c => {
    if (!searchQuery.trim()) return true;
    return getTitle(c).toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleRename = async (id) => {
    if (!renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    if (onRenameConversation) {
      await onRenameConversation(id, renameValue.trim());
    }
    setRenamingId(null);
  };

  const handleSend = () => {
    if (!inputValue.trim() || isProcessing) return;
    onSendMessage(inputValue.trim());
    setInputValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex rounded-xl border border-[#E5E7EB] overflow-hidden" style={{ height: '500px' }}>
      {sidebarOpen && (
        <div className="w-[280px] bg-[#F9FAFB] border-r border-[#E5E7EB] flex flex-col flex-shrink-0">
          <div className="p-3 space-y-2">
            <button
              onClick={onNewConversation}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#095237] hover:bg-[#074029] text-white text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nouvelle conversation
            </button>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher..."
                className="h-9 pl-9 text-xs bg-white border-[#E5E7EB] rounded-lg"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {loadingConversations ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-4 h-4 animate-spin text-[#9CA3AF]" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-5 h-5 text-[#D1D5DB] mx-auto mb-2" />
                <p className="text-xs text-[#9CA3AF]">
                  {searchQuery ? 'Aucun resultat' : 'Aucune conversation'}
                </p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {filteredConversations.map(conv => (
                  <div
                    key={conv.id}
                    onMouseEnter={() => setHoveredConvId(conv.id)}
                    onMouseLeave={() => setHoveredConvId(null)}
                    onClick={() => onSelectConversation(conv)}
                    className={cn(
                      "group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors relative",
                      activeConversationId === conv.id
                        ? "bg-white shadow-sm border border-[#E5E7EB]"
                        : "hover:bg-white/70"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      {renamingId === conv.id ? (
                        <input
                          ref={renameInputRef}
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename(conv.id);
                            if (e.key === 'Escape') setRenamingId(null);
                          }}
                          onBlur={() => handleRename(conv.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full text-xs bg-transparent border-b border-[#095237] outline-none py-0.5"
                        />
                      ) : (
                        <>
                          <p className="text-xs font-medium text-[#374151] truncate">
                            {getTitle(conv)}
                          </p>
                          <p className="text-[10px] text-[#9CA3AF] mt-0.5">
                            {formatRelativeDate(conv.updated_date || conv.created_date)}
                            {conv.messages?.length > 0 && ` · ${conv.messages.length} msg`}
                          </p>
                        </>
                      )}
                    </div>

                    {hoveredConvId === conv.id && renamingId !== conv.id && (
                      <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => { setRenamingId(conv.id); setRenameValue(getTitle(conv)); }}
                          className="p-1 rounded hover:bg-[#E5E7EB] transition-colors"
                          title="Renommer"
                        >
                          <Pencil className="w-3 h-3 text-[#6B7280]" />
                        </button>
                        <button
                          onClick={() => onDeleteConversation(conv.id)}
                          className="p-1 rounded hover:bg-rose-100 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3 h-3 text-[#6B7280] hover:text-rose-600" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center px-3 py-2 border-b border-[#E5E7EB]">
          <button
            onClick={() => setSidebarOpen(prev => !prev)}
            className="p-1.5 rounded-lg hover:bg-[#F3F4F6] transition-colors"
            title={sidebarOpen ? "Masquer l'historique" : "Afficher l'historique"}
          >
            {sidebarOpen
              ? <PanelLeftClose className="w-4 h-4 text-[#6B7280]" />
              : <PanelLeftOpen className="w-4 h-4 text-[#6B7280]" />}
          </button>
          {activeConversationId && (
            <p className="text-xs text-[#9CA3AF] ml-2 truncate">
              {getTitle(conversations.find(c => c.id === activeConversationId) || {})}
            </p>
          )}
        </div>

        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            {emptyStateIcon && (
              <div className="w-12 h-12 rounded-full bg-[#095237]/10 flex items-center justify-center mb-3">
                {emptyStateIcon}
              </div>
            )}
            {emptyStateTitle && <p className="text-sm text-[#6B7280] mb-1">{emptyStateTitle}</p>}
            {emptyStateSubtitle && <p className="text-xs text-[#9CA3AF] mb-4 text-center max-w-sm">{emptyStateSubtitle}</p>}
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInputValue(s)}
                    className="px-3 py-1.5 text-xs bg-[#F3F4F6] hover:bg-[#E5E7EB] rounded-full text-[#374151] transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3 p-4">
            {messages.map((msg, idx) => (
              <div key={idx}>
                <div className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                    msg.role === 'user'
                      ? "bg-[#095237] text-white rounded-br-md"
                      : "bg-[#F3F4F6] text-[#374151] rounded-bl-md"
                  )}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
                {renderMessageExtra && renderMessageExtra(msg, idx)}
              </div>
            ))}
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-[#F3F4F6] rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-[#9CA3AF] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-[#9CA3AF] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-[#9CA3AF] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}

        {renderAboveInput}

        <div className="flex gap-2 items-end p-3 border-t border-[#E5E7EB]">
          {inputPrefix}
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={messages.length > 0 ? "Ecris ta reponse..." : inputPlaceholder}
            className="flex-1 h-11 rounded-xl bg-[#F9FAFB] border-[#E5E7EB] text-sm"
            disabled={isProcessing}
          />
          <Button
            onClick={handleSend}
            disabled={isProcessing || !inputValue.trim()}
            className="h-11 w-11 rounded-xl bg-[#095237] hover:bg-[#074029] p-0 flex-shrink-0"
          >
            {isProcessing
              ? <Loader2 className="w-4 h-4 animate-spin text-white" />
              : <Send className="w-4 h-4 text-[#c5ff4e]" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
