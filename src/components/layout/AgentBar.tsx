import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { sendMessage, type ToolCall } from "../../services/anthropic";
import { generateUUID } from "../../utils/uuid";
import {
  type ConversationsStore,
  type Message,
  CONVERSATIONS_STORAGE_KEY,
  createConversation,
  generateTitle,
  ConversationsStoreSchema,
} from "../../schemas/conversations";
import { useGardenStore } from "../../store/gardenStore";

// Load conversations from localStorage
function loadConversations(): ConversationsStore {
  try {
    const stored = localStorage.getItem(CONVERSATIONS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const validated = ConversationsStoreSchema.parse(parsed);
      return validated;
    }
  } catch (e) {
    console.warn("Failed to load conversations from localStorage:", e);
  }
  return { activeConversationId: null, conversations: [] };
}

// Save conversations to localStorage
function saveConversations(store: ConversationsStore) {
  try {
    localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.warn("Failed to save conversations to localStorage:", e);
  }
}

export function AgentBar() {
  const {
    agentBarExpanded: isExpanded,
    setAgentBarExpanded: setIsExpanded,
    agentBarFullscreen: isFullScreen,
    setAgentBarFullscreen: setIsFullScreen,
    closeAgentBar,
  } = useGardenStore();
  const [showConversationList, setShowConversationList] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeToolCalls, setActiveToolCalls] = useState<ToolCall[]>([]);

  // Conversations state
  const [store, setStore] = useState<ConversationsStore>(loadConversations);

  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get active conversation
  const activeConversation = store.conversations.find(
    (c) => c.id === store.activeConversationId
  );
  const messages = activeConversation?.messages || [];

  // Save to localStorage when store changes
  useEffect(() => {
    saveConversations(store);
  }, [store]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (isExpanded && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isExpanded]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  // Update messages for active conversation
  const updateMessages = useCallback((updater: (prev: Message[]) => Message[]) => {
    setStore((prev) => {
      if (!prev.activeConversationId) return prev;

      return {
        ...prev,
        conversations: prev.conversations.map((conv) =>
          conv.id === prev.activeConversationId
            ? {
                ...conv,
                messages: updater(conv.messages),
                updatedAt: new Date().toISOString(),
              }
            : conv
        ),
      };
    });
  }, []);

  // Create new conversation
  const createNewConversation = useCallback(() => {
    const newConv = createConversation();
    setStore((prev) => ({
      activeConversationId: newConv.id,
      conversations: [newConv, ...prev.conversations],
    }));
    setShowConversationList(false);
  }, []);

  // Switch to a conversation
  const switchConversation = useCallback((id: string) => {
    setStore((prev) => ({ ...prev, activeConversationId: id }));
    setShowConversationList(false);
  }, []);

  // Delete a conversation
  const deleteConversation = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStore((prev) => {
      const newConversations = prev.conversations.filter((c) => c.id !== id);
      const newActiveId =
        prev.activeConversationId === id
          ? newConversations[0]?.id || null
          : prev.activeConversationId;
      return {
        activeConversationId: newActiveId,
        conversations: newConversations,
      };
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Create conversation if none exists
    if (!store.activeConversationId) {
      const newConv = createConversation();
      setStore((prev) => ({
        activeConversationId: newConv.id,
        conversations: [newConv, ...prev.conversations],
      }));
    }

    const userMessage: Message = {
      id: generateUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    // Add user message and potentially update title
    setStore((prev) => {
      const convId = prev.activeConversationId;
      return {
        ...prev,
        conversations: prev.conversations.map((conv) => {
          if (conv.id !== convId) return conv;
          const isFirstMessage = conv.messages.length === 0;
          return {
            ...conv,
            title: isFirstMessage ? generateTitle(userMessage.content) : conv.title,
            messages: [...conv.messages, userMessage],
            updatedAt: new Date().toISOString(),
          };
        }),
      };
    });

    setInput("");
    setIsExpanded(true);
    setIsLoading(true);
    setActiveToolCalls([]);

    try {
      // Get current messages including the new one
      const currentConv = store.conversations.find(
        (c) => c.id === store.activeConversationId
      );
      const allMessages = [...(currentConv?.messages || []), userMessage];

      // Convert to format expected by API
      const apiMessages = allMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await sendMessage(apiMessages, (toolCall) => {
        // Update active tool calls in real-time
        setActiveToolCalls((prev) => [...prev, toolCall]);
      });

      const assistantMessage: Message = {
        id: generateUUID(),
        role: "assistant",
        content: response.content,
        timestamp: new Date().toISOString(),
        toolCalls: response.toolCalls.length > 0 ? response.toolCalls : undefined,
      };
      updateMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: generateUUID(),
        role: "assistant",
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: new Date().toISOString(),
      };
      updateMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setActiveToolCalls([]);
    }
  };

  const handleInputFocus = () => {
    if (messages.length > 0) {
      setIsExpanded(true);
    }
  };

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  return (
    <div
      style={{
        position: "relative",
        flexShrink: 0,
        background: "var(--bg-elevated)",
        borderTop: "1px solid var(--bg-tertiary)",
        boxShadow: "0 -4px 20px rgba(45, 58, 45, 0.08)",
        zIndex: 20,
        height: isExpanded ? "100%" : "var(--agentbar-height)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Expanded messages area */}
      {isExpanded && (
        <>
          {/* Header with controls */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "var(--space-3) var(--space-5)",
              borderBottom: "1px solid var(--bg-tertiary)",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10a10 10 0 0 1-10-10c0-5.52 4.48-10 10-10z" />
                <path d="M12 6v6l4 2" />
              </svg>

              {/* Conversation selector dropdown */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setShowConversationList((prev) => !prev)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    padding: "var(--space-1) var(--space-2)",
                    background: "transparent",
                    border: "1px solid var(--bg-tertiary)",
                    borderRadius: "var(--border-radius-sm)",
                    fontFamily: "var(--font-display)",
                    fontSize: "var(--text-base)",
                    fontWeight: "var(--weight-semibold)",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                    transition: "all var(--transition-fast)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent-tertiary)";
                    e.currentTarget.style.background = "var(--bg-secondary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--bg-tertiary)";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span style={{ maxWidth: "min(40vw, 200px)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {activeConversation?.title || "New Chat"}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {/* Conversation list dropdown */}
                {showConversationList && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      left: 0,
                      width: "min(90vw, 400px)",
                      maxWidth: 600,
                      maxHeight: "min(300px, 60vh)",
                      overflow: "auto",
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--bg-tertiary)",
                      borderRadius: "var(--border-radius)",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      zIndex: 50,
                    }}
                  >
                    {/* New conversation button */}
                    <button
                      onClick={createNewConversation}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-2)",
                        width: "100%",
                        padding: "var(--space-3) var(--space-4)",
                        background: "transparent",
                        border: "none",
                        borderBottom: "1px solid var(--bg-tertiary)",
                        color: "var(--accent-primary)",
                        fontSize: "var(--text-sm)",
                        fontWeight: "var(--weight-medium)",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--bg-secondary)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      New conversation
                    </button>

                    {/* Conversation list */}
                    {store.conversations.map((conv) => (
                      <div
                        key={conv.id}
                        onClick={() => switchConversation(conv.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "var(--space-3) var(--space-4)",
                          background: conv.id === store.activeConversationId ? "var(--bg-secondary)" : "transparent",
                          cursor: "pointer",
                          borderBottom: "1px solid var(--bg-tertiary)",
                        }}
                        onMouseEnter={(e) => {
                          if (conv.id !== store.activeConversationId) {
                            e.currentTarget.style.background = "var(--bg-secondary)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (conv.id !== store.activeConversationId) {
                            e.currentTarget.style.background = "transparent";
                          }
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: "var(--text-sm)",
                              fontWeight: "var(--weight-medium)",
                              color: "var(--text-primary)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {conv.title}
                          </div>
                          <div
                            style={{
                              fontSize: "var(--text-xs)",
                              color: "var(--text-tertiary)",
                              marginTop: 2,
                            }}
                          >
                            {conv.messages.length} messages
                          </div>
                        </div>
                        <button
                          onClick={(e) => deleteConversation(conv.id, e)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 24,
                            height: 24,
                            background: "transparent",
                            border: "none",
                            color: "var(--text-tertiary)",
                            cursor: "pointer",
                            borderRadius: "var(--border-radius-sm)",
                            opacity: 0.6,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "var(--bg-tertiary)";
                            e.currentTarget.style.color = "var(--text-primary)";
                            e.currentTarget.style.opacity = "1";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = "var(--text-tertiary)";
                            e.currentTarget.style.opacity = "0.6";
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}

                    {store.conversations.length === 0 && (
                      <div
                        style={{
                          padding: "var(--space-4)",
                          textAlign: "center",
                          color: "var(--text-tertiary)",
                          fontSize: "var(--text-sm)",
                        }}
                      >
                        No conversations yet
                      </div>
                    )}
                  </div>
                )}
              </div>

              {isLoading && (
                <span
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "var(--text-tertiary)",
                  }}
                >
                  thinking...
                </span>
              )}
            </div>

            <div style={{ display: "flex", gap: "var(--space-1)" }}>
              {/* Full screen toggle */}
              <button
                onClick={toggleFullScreen}
                aria-label={isFullScreen ? "Exit full screen" : "Full screen"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 40,
                  height: 40,
                  background: "transparent",
                  border: "none",
                  color: "var(--text-tertiary)",
                  cursor: "pointer",
                  borderRadius: "var(--border-radius-sm)",
                  transition: "all var(--transition-fast)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg-tertiary)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-tertiary)";
                }}
              >
                {isFullScreen ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                  </svg>
                )}
              </button>

              {/* Close button */}
              <button
                onClick={closeAgentBar}
                aria-label="Close chat"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 40,
                  height: 40,
                  background: "transparent",
                  border: "none",
                  color: "var(--text-tertiary)",
                  cursor: "pointer",
                  borderRadius: "var(--border-radius-sm)",
                  transition: "all var(--transition-fast)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg-tertiary)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-tertiary)";
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M1 1l12 12M13 1L1 13" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflow: "auto",
              padding: "var(--space-4) var(--space-3)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)",
            }}
          >
            {messages.length === 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: 1,
                  color: "var(--text-tertiary)",
                  textAlign: "center",
                  padding: "var(--space-6)",
                }}
              >
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, marginBottom: "var(--space-4)" }}>
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                <div style={{ fontSize: "var(--text-base)", fontWeight: "var(--weight-medium)", marginBottom: "var(--space-2)" }}>
                  Garden Assistant
                </div>
                <div style={{ fontSize: "var(--text-sm)", maxWidth: 300 }}>
                  Ask me about your garden plan, crops, timeline, budget, or anything else.
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                  gap: "var(--space-2)",
                }}
              >
                {/* Tool calls for assistant messages */}
                {msg.role === "assistant" && msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "var(--space-2)",
                      maxWidth: "85%",
                    }}
                  >
                    {msg.toolCalls.map((tc, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "var(--space-2)",
                          padding: "var(--space-2) var(--space-3)",
                          background: "var(--bg-tertiary)",
                          borderRadius: "var(--border-radius-sm)",
                          fontSize: "var(--text-xs)",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2">
                          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                        </svg>
                        <span style={{ fontWeight: "var(--weight-medium)", color: "var(--text-secondary)" }}>
                          {tc.name}
                        </span>
                        {tc.input && Object.keys(tc.input).length > 0 && (
                          <span style={{ color: "var(--text-tertiary)" }}>
                            {Object.entries(tc.input).map(([k, v]) => `${k}: ${String(v).slice(0, 30)}${String(v).length > 30 ? '...' : ''}`).join(', ')}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div
                  style={{
                    maxWidth: "85%",
                    padding: "var(--space-3) var(--space-4)",
                    borderRadius: "var(--border-radius-lg)",
                    background: msg.role === "user"
                      ? "var(--accent-secondary)"
                      : "var(--bg-secondary)",
                    color: msg.role === "user"
                      ? "var(--text-inverted)"
                      : "var(--text-secondary)",
                    fontSize: "var(--text-sm)",
                    lineHeight: "var(--leading-normal)",
                  }}
                  className={msg.role === "assistant" ? "markdown-content" : ""}
                >
                  {msg.role === "assistant" ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        // Custom renderers for refined typography
                        p: ({ children }) => (
                          <p style={{
                            margin: 0,
                            lineHeight: "var(--leading-normal)",
                          }}>
                            {children}
                          </p>
                        ),
                        ul: ({ children }) => (
                          <ul style={{
                            margin: "0.25em 0 0.75em 0",
                            paddingLeft: "1.25em",
                            lineHeight: "var(--leading-snug)",
                            listStyleType: "disc",
                          }}>
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol style={{
                            margin: "0.25em 0 0.75em 0",
                            paddingLeft: "1.25em",
                            lineHeight: "var(--leading-snug)",
                          }}>
                            {children}
                          </ol>
                        ),
                        li: ({ children }) => (
                          <li style={{
                            margin: "0.15em 0",
                            paddingLeft: "0.25em",
                          }}>
                            {children}
                          </li>
                        ),
                        strong: ({ children }) => (
                          <strong style={{
                            fontWeight: "var(--weight-semibold)",
                            color: "var(--text-primary)",
                          }}>
                            {children}
                          </strong>
                        ),
                        code: ({ children, className }) => {
                          const isInline = !className;
                          return isInline ? (
                            <code
                              style={{
                                background: "var(--bg-tertiary)",
                                padding: "0.1em 0.35em",
                                borderRadius: "var(--border-radius-sm)",
                                fontSize: "0.875em",
                                fontFamily: "var(--font-mono)",
                              }}
                            >
                              {children}
                            </code>
                          ) : (
                            <code
                              style={{
                                display: "block",
                                background: "var(--bg-tertiary)",
                                padding: "var(--space-3)",
                                borderRadius: "var(--border-radius-sm)",
                                overflow: "auto",
                                fontSize: "0.875em",
                                fontFamily: "var(--font-mono)",
                                margin: "0.5em 0",
                              }}
                            >
                              {children}
                            </code>
                          );
                        },
                        pre: ({ children }) => <pre style={{ margin: 0 }}>{children}</pre>,
                        // Clear heading hierarchy: h2 is primary section, h3 is subsection, h4 is minor
                        h1: ({ children }) => (
                          <h1 style={{
                            fontSize: "1.35em",
                            fontWeight: "var(--weight-bold)",
                            fontFamily: "var(--font-display)",
                            color: "var(--text-primary)",
                            margin: "1em 0 0.4em 0",
                            lineHeight: "var(--leading-tight)",
                            letterSpacing: "-0.01em",
                          }}>
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 style={{
                            fontSize: "1.15em",
                            fontWeight: "var(--weight-semibold)",
                            fontFamily: "var(--font-display)",
                            color: "var(--text-primary)",
                            margin: "0.9em 0 0.3em 0",
                            lineHeight: "var(--leading-tight)",
                          }}>
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 style={{
                            fontSize: "1em",
                            fontWeight: "var(--weight-semibold)",
                            fontFamily: "var(--font-body)",
                            color: "var(--text-primary)",
                            margin: "0.75em 0 0.2em 0",
                            lineHeight: "var(--leading-snug)",
                          }}>
                            {children}
                          </h3>
                        ),
                        h4: ({ children }) => (
                          <h4 style={{
                            fontSize: "0.95em",
                            fontWeight: "var(--weight-medium)",
                            fontFamily: "var(--font-body)",
                            color: "var(--text-secondary)",
                            margin: "0.6em 0 0.15em 0",
                            lineHeight: "var(--leading-snug)",
                          }}>
                            {children}
                          </h4>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote
                            style={{
                              borderLeft: "2px solid var(--accent-tertiary)",
                              paddingLeft: "var(--space-3)",
                              margin: "0.5em 0",
                              color: "var(--text-tertiary)",
                              fontStyle: "italic",
                            }}
                          >
                            {children}
                          </blockquote>
                        ),
                        table: ({ children }) => (
                          <table
                            style={{
                              borderCollapse: "collapse",
                              width: "100%",
                              margin: "0.5em 0",
                              fontSize: "0.9em",
                            }}
                          >
                            {children}
                          </table>
                        ),
                        th: ({ children }) => (
                          <th
                            style={{
                              border: "1px solid var(--bg-tertiary)",
                              padding: "var(--space-2) var(--space-3)",
                              background: "var(--bg-tertiary)",
                              textAlign: "left",
                              fontWeight: "var(--weight-semibold)",
                            }}
                          >
                            {children}
                          </th>
                        ),
                        td: ({ children }) => (
                          <td
                            style={{
                              border: "1px solid var(--bg-tertiary)",
                              padding: "var(--space-2) var(--space-3)",
                            }}
                          >
                            {children}
                          </td>
                        ),
                        a: ({ href, children }) => (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: msg.role === "user" ? "inherit" : "var(--accent-primary)",
                              textDecoration: "underline",
                            }}
                          >
                            {children}
                          </a>
                        ),
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            {/* Loading state with active tool calls */}
            {isLoading && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "var(--space-2)",
                }}
              >
                {/* Active tool calls */}
                {activeToolCalls.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "var(--space-2)",
                      maxWidth: "85%",
                    }}
                  >
                    {activeToolCalls.map((tc, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "var(--space-2)",
                          padding: "var(--space-2) var(--space-3)",
                          background: "var(--bg-tertiary)",
                          borderRadius: "var(--border-radius-sm)",
                          fontSize: "var(--text-xs)",
                          color: "var(--text-tertiary)",
                          animation: idx === activeToolCalls.length - 1 ? "pulse 1.5s infinite" : "none",
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
                          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                        </svg>
                        <span style={{ fontWeight: "var(--weight-medium)", color: "var(--text-secondary)" }}>
                          {tc.name}
                        </span>
                        {tc.input && Object.keys(tc.input).length > 0 && (
                          <span style={{ color: "var(--text-tertiary)" }}>
                            {Object.entries(tc.input).map(([k, v]) => `${k}: ${String(v).slice(0, 30)}${String(v).length > 30 ? '...' : ''}`).join(', ')}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div
                  style={{
                    padding: "var(--space-3) var(--space-4)",
                    borderRadius: "var(--border-radius-lg)",
                    background: "var(--bg-secondary)",
                    color: "var(--text-tertiary)",
                    fontSize: "var(--text-sm)",
                  }}
                >
                  <span style={{ animation: "pulse 1.5s infinite" }}>
                    {activeToolCalls.length > 0 ? "Processing..." : "Thinking..."}
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </>
      )}

      {/* Input bar */}
      <form
        onSubmit={handleSubmit}
        className="safe-area-bottom"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          padding: "var(--space-3)",
          paddingLeft: "var(--space-3)",
          paddingRight: "var(--space-3)",
          flexShrink: 0,
          borderTop: isExpanded ? "1px solid var(--bg-tertiary)" : "none",
        }}
      >
        {/* Agent icon - clickable to expand when collapsed */}
        <button
          type="button"
          onClick={() => {
            if (!isExpanded) {
              setIsExpanded(true);
            }
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            background: "linear-gradient(135deg, var(--accent-primary) 0%, var(--bed-perennial) 100%)",
            borderRadius: "var(--border-radius)",
            flexShrink: 0,
            border: "none",
            cursor: !isExpanded ? "pointer" : "default",
            transition: "transform var(--transition-fast)",
          }}
          onMouseEnter={(e) => {
            if (!isExpanded) {
              e.currentTarget.style.transform = "scale(1.05)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
          aria-label={!isExpanded ? "Open chat" : undefined}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-inverted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </button>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={handleInputFocus}
          placeholder={isLoading ? "Waiting for response..." : "Ask about your garden..."}
          disabled={isLoading}
          style={{
            flex: 1,
            minWidth: 0,
            padding: "var(--space-3)",
            minHeight: 44,
            background: "var(--bg-secondary)",
            border: "1px solid var(--bg-tertiary)",
            borderRadius: "var(--border-radius)",
            fontSize: "16px", // Prevents iOS zoom on focus
            fontFamily: "var(--font-body)",
            color: "var(--text-primary)",
            outline: "none",
            transition: "all var(--transition-fast)",
            opacity: isLoading ? 0.6 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.borderColor = "var(--accent-tertiary)";
            }
          }}
          onMouseLeave={(e) => {
            if (document.activeElement !== e.currentTarget) {
              e.currentTarget.style.borderColor = "var(--bg-tertiary)";
            }
          }}
        />

        {/* Send button */}
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          aria-label="Send message"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 44,
            height: 44,
            background: input.trim() && !isLoading ? "var(--accent-primary)" : "var(--bg-tertiary)",
            border: "none",
            borderRadius: "var(--border-radius)",
            color: input.trim() && !isLoading ? "var(--text-inverted)" : "var(--text-tertiary)",
            cursor: input.trim() && !isLoading ? "pointer" : "not-allowed",
            transition: "all var(--transition-fast)",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            if (input.trim() && !isLoading) {
              e.currentTarget.style.background = "var(--accent-primary-hover)";
            }
          }}
          onMouseLeave={(e) => {
            if (input.trim() && !isLoading) {
              e.currentTarget.style.background = "var(--accent-primary)";
            }
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  );
}
