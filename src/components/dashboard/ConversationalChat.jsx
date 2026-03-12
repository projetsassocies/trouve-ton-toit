import React, { useState, useRef, useEffect } from 'react';
import {
  MessageCircle, Loader2, Trash2, Pencil,
  Plus, Search, ArrowRight, History, X
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
      {/* Overlay - clic ferme le panneau */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/20 transition-opacity duration-300",
          sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setSidebarOpen(false)}
        aria-hidden
      />

      {/* Panneau Historique - slide depuis la DROITE */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-[320px] sm:w-[360px] max-w-[90vw] bg-white shadow-xl flex flex-col transition-transform duration-300 ease-out",
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-foreground">Historique</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
            className="rounded-full h-8 w-8"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col">
          <div className="p-4 space-y-3">
            <button
              onClick={onNewConversation}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg bg-secondary hover:bg-secondary/90 text-secondary-foreground text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nouvelle conversation
            </button>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher..."
                className="h-9 pl-9 text-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {loadingConversations ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'Aucun résultat' : 'Aucune conversation'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {(() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const yesterday = new Date(today);
                  yesterday.setDate(yesterday.getDate() - 1);
                  const weekAgo = new Date(today);
                  weekAgo.setDate(weekAgo.getDate() - 7);

                  const groups = { today: [], yesterday: [], week: [], older: [] };
                  filteredConversations.forEach(conv => {
                    const d = new Date(conv.updated_date || conv.created_date || 0);
                    d.setHours(0, 0, 0, 0);
                    if (d.getTime() >= today.getTime()) groups.today.push(conv);
                    else if (d.getTime() >= yesterday.getTime()) groups.yesterday.push(conv);
                    else if (d.getTime() >= weekAgo.getTime()) groups.week.push(conv);
                    else groups.older.push(conv);
                  });

                  const formatTimestamp = (dateStr) => {
                    const d = new Date(dateStr);
                    const today = new Date();
                    const isToday = d.toDateString() === today.toDateString();
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    const isYesterday = d.toDateString() === yesterday.toDateString();
                    if (isToday) return `Aujourd'hui, ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
                    if (isYesterday) return `Hier, ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
                    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                  };

                  const getDescription = (conv) => {
                    const firstUserMsg = (conv.messages || []).find(m => m.role === 'user');
                    if (firstUserMsg) return firstUserMsg.content.substring(0, 60) + (firstUserMsg.content.length > 60 ? '...' : '');
                    return 'Nouvelle conversation';
                  };

                  const renderGroup = (label, items) =>
                    items.length > 0 && (
                      <div key={label}>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{label}</p>
                        <div className="space-y-2">
                          {items.map(conv => (
                            <div
                              key={conv.id}
                              onClick={() => { onSelectConversation(conv); setSidebarOpen(false); }}
                              className={cn(
                                "flex gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50",
                                activeConversationId === conv.id ? "border-primary bg-primary/5" : "border-border"
                              )}
                            >
                              <MessageCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{getTitle(conv)}</p>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{getDescription(conv)}</p>
                                <p className="text-[11px] text-muted-foreground mt-1">{formatTimestamp(conv.updated_date || conv.created_date)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );

                  return (
                    <>
                      {renderGroup("Aujourd'hui", groups.today)}
                      {renderGroup("Hier", groups.yesterday)}
                      {renderGroup("7 derniers jours", groups.week)}
                      {renderGroup("Plus ancien", groups.older)}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {!useCardLayout && activeConversationId && (
          <div className="flex items-center px-2 py-1 min-h-0 flex-shrink-0">
            <p className="text-xs text-muted-foreground truncate">
              {getTitle(conversations.find(c => c.id === activeConversationId) || {})}
            </p>
          </div>
        )}

        {renderBarContent ? (
          <>
            <Card className="w-full max-w-4xl mb-6 flex-shrink-0 min-h-[320px] max-h-[50vh] flex flex-col overflow-hidden">
              <div className="p-6 flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden">
                {/* Zone unique : conversation OU animation - une seule zone qui se transforme */}
                <div
                  ref={messagesContainerRef}
                  className={cn(
                    "flex-1 min-h-0 overflow-y-auto flex flex-col",
                    messages.length === 0 && "justify-center"
                  )}
                >
                  {messages.length > 0 ? (
                    <div className="space-y-3 pr-1">
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
                  ) : (
                    /* Pas de messages : animation typing au centre de la même zone */
                    <div
                      className="flex items-center justify-center min-h-[120px] text-lg text-muted-foreground cursor-text"
                      onClick={() => document.querySelector('[data-chat-textarea]')?.focus()}
                    >
                      <span className="truncate max-w-full px-2">
                        {typingPlaceholder}
                        <span className="inline-block w-0.5 h-4 bg-muted-foreground ml-0.5 animate-pulse align-middle" />
                      </span>
                    </div>
                  )}
                </div>

                {/* Textarea : zone de saisie - hauteur réduite */}
                <div className="relative min-h-[56px] flex-shrink-0 pt-3 border-t border-border/50">
                  <textarea
                    data-chat-textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    onKeyDown={handleKeyDown}
                    placeholder={inputFocused ? "Écrivez votre message..." : ""}
                    rows={2}
                    disabled={isProcessing}
                    className="w-full min-h-[56px] resize-none border-0 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-base py-2"
                  />
                  {!inputValue && !inputFocused && messages.length > 0 && (
                    <div
                      className="absolute inset-0 flex items-center pt-3 pl-0 text-base text-muted-foreground pointer-events-none"
                      aria-hidden
                    >
                      <span>Écrivez votre message...</span>
                    </div>
                  )}
                </div>

                {/* Barre du bas */}
                <div className="flex items-center justify-between pt-4 border-t flex-shrink-0">
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
          <>
        {messages.length === 0 ? (
          <div className="flex-shrink-0 min-h-[60px]" aria-hidden />
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
        </>
        )}
      </div>
    </div>
  );
}

