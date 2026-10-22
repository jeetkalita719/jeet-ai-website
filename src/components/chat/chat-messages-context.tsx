'use client';

import type { UIMessage } from 'ai';
import React, { createContext, useContext } from 'react';

// Lets tool cards (rendered by ToolRenderer with no props) read the conversation.
const ChatMessagesContext = createContext<UIMessage[]>([]);

export function ChatMessagesProvider({
  messages,
  children,
}: {
  messages: UIMessage[];
  children: React.ReactNode;
}) {
  return (
    <ChatMessagesContext.Provider value={messages}>
      {children}
    </ChatMessagesContext.Provider>
  );
}

/** The current chat's messages, or [] outside a provider. */
export function useChatMessages(): UIMessage[] {
  return useContext(ChatMessagesContext);
}
