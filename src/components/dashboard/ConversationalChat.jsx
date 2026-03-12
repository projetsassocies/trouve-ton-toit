import React, { useState, useRef, useEffect } from 'react';
import {
  MessageCircle, Loader2, Trash2, Pencil,
  Plus, Search, ArrowRight, History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useTypingPlaceholder } from '@/hooks/useTypingPlaceholder';

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
  greetingText = '',
  inputPlaceholder = 'Ecris ta reponse...',
  placeholderPrompts = [],
  inputPrefix,
  renderAboveInput,
  renderBelowInput,
  renderBarContent,
  renderSuggestions,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hoveredConvId, setHoveredConvId] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [inputFocused, setInputFocused] = useState(false);

  const typingPlaceholder = useTypingPlaceholder(
    placeholderPrompts.length > 0 ? placeholderPrompts : [inputPlaceholder],
    45,
    25,
    2200,
    350
  );

  const messagesContainerRef = useRef(null);
  const renameInputRef = useRef(null);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
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
    // Shift+Enter = nouvelle ligne (textarea)
  };

  const sendButton = (
    <Button
      type="button"
      size="icon"
      onClick={handleSend}
      disabled={isProcessing || !inputValue.trim()}
      className="rounded-full bg-accent hover:bg-accent/90 text-white flex-shrink-0 disabled:opacity-50"
    >
      {isProcessing ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <ArrowRight className="h-5 w-5" />
      )}
    </Button>
  );

  const historyButton = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => setSidebarOpen(prev => !prev)}
      className="rounded-full"
      title={sidebarOpen ? "Masquer l'historique" : "Historique des conversations"}
    >
      <History className="h-5 w-5" />
    </Button>
  );

  const useCardLayout = !!renderBarContent;

  return (
    <div className="relative w-full flex flex-col">
      {/* History panel - smooth slide-in overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/20 transition-opacity duration-300",
          sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setSidebarOpen(false)}
      />
        <div
          className={cn(
          "absolute inset-y-0 left-0 z-50 w-[260px] sm:w-[280px] max-w-[85vw] bg-white flex flex-col flex-shrink-0 transition-transform duration-300 ease-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
          <div className="p-3 space-y-2">
            <button
              onClick={onNewConversation}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-secondary hover:bg-secondary/90 text-secondary-foreground text-sm font-medium transition-colors"
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
                        ? "bg-[#fafafa]"
                        : "hover:bg-[#fafafa]"
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
                          className="w-full text-xs bg-transparent border-b border-secondary outline-none py-0.5"
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

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {activeConversationId && (
          <div className="flex items-center px-2 py-1 min-h-0 flex-shrink-0">
            <p className="text-xs text-muted-foreground truncate">
              {getTitle(conversations.find(c => c.id === activeConversationId) || {})}
            </p>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex-1 min-h-[60px]" aria-hidden />
        ) : (
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto space-y-3 p-4">
            {messages.map((msg, idx) => (
              <div key={idx}>
                <div className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                    msg.role === 'user'
                      ? "bg-secondary text-secondary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  )}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
                {renderMessageExtra && renderMessageExtra(msg, idx)}
              </div>
            ))}
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {renderAboveInput}

        {renderBarContent ? (
          <>
            <Card className="w-full max-w-4xl mb-6 flex-shrink-0">
              <div className="p-6">
                <div className="relative">
                  {!inputValue && !inputFocused && typingPlaceholder !== undefined && (
                    <div
                      className="absolute left-0 top-0 text-lg text-muted-foreground pointer-events-none pr-12 overflow-hidden max-w-full"
                      aria-hidden
                    >
                      {typingPlaceholder}
                      <span className="inline-block w-0.5 h-4 bg-muted-foreground ml-0.5 animate-pulse align-middle" />
                    </div>
                  )}
                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    onKeyDown={handleKeyDown}
                    placeholder=""
                    rows={4}
                    disabled={isProcessing}
                    className="w-full min-h-[120px] resize-none border-0 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-lg transition-all"
                  />
                </div>
                <div className="flex items-center justify-between pt-4 border-t">
                  {renderBarContent({ sendButton, historyButton })}
                </div>
              </div>
            </Card>
            {renderSuggestions && (
              <div className="flex items-center gap-3 justify-center flex-wrap w-full">
                {typeof renderSuggestions === 'function' ? renderSuggestions() : renderSuggestions}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-3 pt-3">
            <div className="relative flex">
              {!inputValue && !inputFocused && typingPlaceholder !== undefined && (
                <div
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none pr-12 overflow-hidden max-w-[calc(100%-3rem)]"
                  aria-hidden
                >
                  {typingPlaceholder}
                  <span className="inline-block w-0.5 h-4 bg-muted-foreground ml-0.5 animate-pulse align-middle" />
                </div>
              )}
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                onKeyDown={handleKeyDown}
                placeholder=""
                className="flex-1 h-12 rounded-xl bg-card border border-border text-sm px-4 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                disabled={isProcessing}
              />
            </div>
            {renderBelowInput && (
              <div>
                {typeof renderBelowInput === 'function'
                  ? renderBelowInput({ sendButton, historyButton })
                  : renderBelowInput}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
