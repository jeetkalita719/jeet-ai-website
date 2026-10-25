'use client';
import { useChat } from '@ai-sdk/react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';

// Component imports
import ChatBottombar from '@/components/chat/chat-bottombar';
import ChatLanding from '@/components/chat/chat-landing';
import ChatMessageContent from '@/components/chat/chat-message-content';
import { SimplifiedChatView } from '@/components/chat/simple-chat-view';
import {
  ChatBubble,
  ChatBubbleMessage,
} from '@/components/ui/chat/chat-bubble';
import HelperBoost from './HelperBoost';
import { ChatMessagesProvider } from './chat-messages-context';
import DoodleAvatar from '@/components/doodle-avatar';
import { Home } from 'lucide-react';
import Link from 'next/link';

// ClientOnly component for client-side rendering
//@ts-ignore
const ClientOnly = ({ children }) => {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return null;
  }

  return <>{children}</>;
};

interface AvatarProps {
  hasActiveTool: boolean;
  isTalking: boolean;
}

const Avatar = ({ hasActiveTool, isTalking }: AvatarProps) => (
  <div className={`flex items-center justify-center transition-all duration-300 ${hasActiveTool ? 'h-16 w-16' : 'h-28 w-28'}`}>
    <div className="cursor-pointer" onClick={() => (window.location.href = '/')}>
      <DoodleAvatar talking={isTalking} size={hasActiveTool ? 64 : 112} />
    </div>
  </div>
);

const MOTION_CONFIG = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
  transition: {
    duration: 0.3,
    ease: 'easeOut',
  },
};

const AVATAR_HIDE_AT = 48; // px of chat scroll after which the avatar hides
const AVATAR_SHOW_AT = 16; // px of chat scroll at or below which it shows again

const Chat = () => {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('query');
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showAvatar, setShowAvatar] = useState(true);
  const [contentSwaps, setContentSwaps] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  // Hysteresis: hide past AVATAR_HIDE_AT, show again only at AVATAR_SHOW_AT
  const syncAvatar = useCallback(
    (scrollTop: number) =>
      setShowAvatar((prev) =>
        prev ? scrollTop <= AVATAR_HIDE_AT : scrollTop <= AVATAR_SHOW_AT
      ),
    []
  );

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    stop,
    setMessages,
    setInput,
    reload,
    addToolResult,
    append,
  } = useChat({
    onResponse: (response) => {
      if (response) {
        setLoadingSubmit(false);
        setIsTalking(true);
      }
    },
    onFinish: () => {
      setLoadingSubmit(false);
      setIsTalking(false);
    },
    onError: (error) => {
      setLoadingSubmit(false);
      setIsTalking(false);
      console.error('Chat error:', error.message, error.cause);
      toast.error(error.message);
    },
    onToolCall: (tool) => {
      const toolName = tool.toolCall.toolName;
      console.log('Tool call:', toolName);
    },
  });

  const { currentAIMessage, latestUserMessage, hasActiveTool } = useMemo(() => {
    const latestAIMessageIndex = messages.findLastIndex(
      (m) => m.role === 'assistant'
    );
    const latestUserMessageIndex = messages.findLastIndex(
      (m) => m.role === 'user'
    );

    const result = {
      currentAIMessage:
        latestAIMessageIndex !== -1 ? messages[latestAIMessageIndex] : null,
      latestUserMessage:
        latestUserMessageIndex !== -1 ? messages[latestUserMessageIndex] : null,
      hasActiveTool: false,
    };

    if (result.currentAIMessage) {
      result.hasActiveTool =
        result.currentAIMessage.parts?.some(
          (part) =>
            part.type === 'tool-invocation' &&
            part.toolInvocation?.state === 'result'
        ) || false;
    }

    if (latestAIMessageIndex < latestUserMessageIndex) {
      result.currentAIMessage = null;
    }

    return result;
  }, [messages]);

  const isToolInProgress = messages.some(
    (m) =>
      m.role === 'assistant' &&
      m.parts?.some(
        (part) =>
          part.type === 'tool-invocation' &&
          part.toolInvocation?.state !== 'result'
      )
  );

  const submitQuery = (query: string) => {
    if (!query.trim() || isToolInProgress) return;
    setLoadingSubmit(true);
    append({ role: 'user', content: query });
  };

  useEffect(() => {
    if (initialQuery && !autoSubmitted) {
      setAutoSubmitted(true);
      setInput('');
      submitQuery(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery, autoSubmitted]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isToolInProgress) return;
    submitQuery(input);
    setInput('');
  };

  const handleStop = () => {
    stop();
    setLoadingSubmit(false);
    setIsTalking(false);
  };

  // Check if this is the initial empty state (no messages)
  const isEmptyState =
    !currentAIMessage && !latestUserMessage && !loadingSubmit;

  // Content swaps can clamp scrollTop without the user scrolling
  useEffect(() => {
    if (scrollRef.current) syncAvatar(scrollRef.current.scrollTop);
  }, [
    currentAIMessage?.id,
    loadingSubmit,
    isEmptyState,
    contentSwaps,
    syncAvatar,
  ]);

  // Calculate header height based on hasActiveTool
  const headerHeight = hasActiveTool ? 100 : 180;

  return (
    <ChatMessagesProvider messages={messages}>
    <div className="relative h-screen overflow-hidden">
      <div className="absolute top-6 right-6 z-[51]">
        <Link href="/" aria-label="Back to home" className="hover:bg-accent text-muted-foreground hover:text-foreground flex items-center gap-2 rounded-2xl px-3 py-1.5 text-sm transition-colors">
          <Home className="h-4 w-4" /> Home
        </Link>
      </div>

      {/* Fixed Avatar Header with Gradient */}
      <div
        className="pointer-events-none fixed top-0 right-0 left-0 z-50"
        style={{
          background:
            'linear-gradient(to bottom, var(--background) 0%, color-mix(in srgb, var(--background) 92%, transparent) 40%, transparent 100%)',
        }}
      >
        <div
          className={`transition-all duration-300 ease-in-out ${hasActiveTool ? 'pt-6 pb-0' : 'py-6'}`}
        >
          <div className="flex justify-center">
            <motion.div
              aria-hidden={!showAvatar}
              className={
                showAvatar ? 'pointer-events-auto' : 'pointer-events-none'
              }
              initial={false}
              animate={
                prefersReducedMotion
                  ? { opacity: showAvatar ? 1 : 0 }
                  : { opacity: showAvatar ? 1 : 0, y: showAvatar ? 0 : -16 }
              }
              transition={{
                duration: prefersReducedMotion ? 0.15 : 0.25,
                ease: 'easeOut',
              }}
            >
              <ClientOnly>
                <Avatar hasActiveTool={hasActiveTool} isTalking={isTalking} />
              </ClientOnly>
            </motion.div>
          </div>

          <AnimatePresence>
            {latestUserMessage && !currentAIMessage && (
              <motion.div
                {...MOTION_CONFIG}
                className="pointer-events-auto mx-auto flex max-w-3xl px-4"
              >
                <ChatBubble variant="sent">
                  <ChatBubbleMessage>
                    <ChatMessageContent
                      message={latestUserMessage}
                      isLast={true}
                      isLoading={false}
                      reload={() => Promise.resolve(null)}
                    />
                  </ChatBubbleMessage>
                </ChatBubble>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto flex h-full max-w-3xl flex-col">
        {/* Scrollable Chat Content */}
        <div
          ref={scrollRef}
          onScroll={(e) => syncAvatar(e.currentTarget.scrollTop)}
          className="flex-1 overflow-y-auto px-2"
          style={{ paddingTop: `${headerHeight}px` }}
        >
          <AnimatePresence
            mode="wait"
            onExitComplete={() => setContentSwaps((n) => n + 1)}
          >
            {isEmptyState ? (
              <motion.div
                key="landing"
                className="flex min-h-full items-center justify-center"
                {...MOTION_CONFIG}
              >
                <ChatLanding submitQuery={submitQuery} />
              </motion.div>
            ) : currentAIMessage ? (
              <div className="pb-4">
                <SimplifiedChatView
                  message={currentAIMessage}
                  isLoading={isLoading}
                  reload={reload}
                  addToolResult={addToolResult}
                />
              </div>
            ) : (
              loadingSubmit && (
                <motion.div
                  key="loading"
                  {...MOTION_CONFIG}
                  className="px-4 pt-18"
                >
                  <ChatBubble variant="received">
                    <ChatBubbleMessage isLoading />
                  </ChatBubble>
                </motion.div>
              )
            )}
          </AnimatePresence>
        </div>

        {/* Fixed Bottom Bar */}
        <div className="bg-background sticky bottom-0 px-2 pt-3 md:px-0 md:pb-4">
          <div className="relative flex flex-col items-center gap-3">
            <HelperBoost submitQuery={submitQuery} setInput={setInput} />
            <ChatBottombar
              input={input}
              handleInputChange={handleInputChange}
              handleSubmit={onSubmit}
              isLoading={isLoading}
              stop={handleStop}
              isToolInProgress={isToolInProgress}
            />
          </div>
        </div>
      </div>
    </div>
    </ChatMessagesProvider>
  );
};

export default Chat;
