import React, { createContext, useContext, useState, useCallback } from 'react';

const ChatContext = createContext(null);

export function ChatContextProvider({ children }) {
  const [activeLead, setActiveLead] = useState(null);
  const [activeListing, setActiveListing] = useState(null);
  const [recentActions, setRecentActions] = useState([]);
  const [activeTab, setActiveTab] = useState('lead');
  const [pendingAssistantMessage, setPendingAssistantMessage] = useState(null);

  const pushAction = useCallback((action) => {
    setRecentActions(prev => [
      { ...action, timestamp: new Date().toISOString() },
      ...prev.slice(0, 19),
    ]);
  }, []);

  const clearContext = useCallback(() => {
    setActiveLead(null);
    setActiveListing(null);
  }, []);

  const switchToAssistant = useCallback((message) => {
    if (message) setPendingAssistantMessage(message);
    setActiveTab('chat');
  }, []);

  return (
    <ChatContext.Provider value={{
      activeLead,
      setActiveLead,
      activeListing,
      setActiveListing,
      recentActions,
      pushAction,
      clearContext,
      activeTab,
      setActiveTab,
      pendingAssistantMessage,
      setPendingAssistantMessage,
      switchToAssistant,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    return {
      activeLead: null,
      setActiveLead: () => {},
      activeListing: null,
      setActiveListing: () => {},
      recentActions: [],
      pushAction: () => {},
      clearContext: () => {},
      activeTab: 'lead',
      setActiveTab: () => {},
      pendingAssistantMessage: null,
      setPendingAssistantMessage: () => {},
      switchToAssistant: () => {},
    };
  }
  return ctx;
}
