import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Plus,
  Trash2,
  Edit2,
  Bot,
  User,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Search,
  CheckCircle2,
  Terminal,
  Mic,
} from 'lucide-react';
import { api } from '../services/api';
import { Button } from '../components/common/Button';
import { Loader } from '../components/common/Common';
import { useToast } from '../context/ToastContext';

const SUGGESTED_PROMPTS = [
  'What do I have planned today?',
  'Create a task to study SQL tomorrow',
  'Remind me at 8 PM to call Rahul',
  "What's the weather today?",
  'Give me today\'s AI news',
  'Remember that my project is called TITAN',
  'Based on my tasks, what should I focus on first?',
];

export const ChatPage = () => {
  const { addToast } = useToast();
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputContent, setInputContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTools, setExpandedTools] = useState({});

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const loadConversations = async () => {
    try {
      const convs = await api.listConversations();
      setConversations(convs);
      if (convs.length > 0 && !activeConvId) {
        setActiveConvId(convs[0].id);
        loadMessages(convs[0].id);
      } else if (convs.length === 0) {
        // Create initial conversation
        const newConv = await api.createConversation('General Assistance');
        setConversations([newConv]);
        setActiveConvId(newConv.id);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setInitialLoading(false);
    }
  };

  const loadMessages = async (convId) => {
    try {
      const conv = await api.getConversation(convId);
      setMessages(conv.messages || []);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const handleSelectConversation = (convId) => {
    setActiveConvId(convId);
    loadMessages(convId);
  };

  const handleNewConversation = async () => {
    try {
      const newConv = await api.createConversation('New Conversation');
      setConversations((prev) => [newConv, ...prev]);
      setActiveConvId(newConv.id);
      setMessages([]);
    } catch (err) {
      addToast('Error', err.message, 'error');
    }
  };

  const handleDeleteConversation = async (convId, e) => {
    e.stopPropagation();
    try {
      await api.deleteConversation(convId);
      const remaining = conversations.filter((c) => c.id !== convId);
      setConversations(remaining);
      if (activeConvId === convId) {
        if (remaining.length > 0) {
          setActiveConvId(remaining[0].id);
          loadMessages(remaining[0].id);
        } else {
          setActiveConvId(null);
          setMessages([]);
        }
      }
      addToast('Conversation Deleted', '', 'info');
    } catch (err) {
      addToast('Error', err.message, 'error');
    }
  };

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputContent;
    if (!text.trim() || loading) return;

    setInputContent('');
    setLoading(true);

    // Optimistically show user message
    const tempUserMsg = {
      id: `temp_${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const response = await api.sendMessage(text, activeConvId);
      
      // Update messages with real assistant response
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== tempUserMsg.id);
        return [
          ...filtered,
          response.user_message,
          {
            ...response.assistant_message,
            executed_tools: response.executed_tools,
          },
        ];
      });

      // Update conversation title in list if refreshed
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConvId ? { ...c, title: c.title === 'New Conversation' ? text.slice(0, 30) : c.title } : c
        )
      );
    } catch (err) {
      addToast('Chat Error', err.message, 'error');
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: `**Error**: ${err.message}`,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleToolExpand = (msgId, toolIndex) => {
    const key = `${msgId}_${toolIndex}`;
    setExpandedTools((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (initialLoading) {
    return <Loader size={40} label="Opening TITAN Assistant Channel..." />;
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - var(--header-height))', overflow: 'hidden' }}>
      {/* Conversations Drawer Sidebar */}
      <div
        style={{
          width: 280,
          borderRight: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-sidebar)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        <div style={{ padding: 16, borderBottom: '1px solid var(--border-card)' }}>
          <Button variant="primary" style={{ width: '100%' }} onClick={handleNewConversation} icon={Plus}>
            New Session
          </Button>
          <div style={{ marginTop: 12, position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
              style={{ paddingLeft: 32, fontSize: '0.85rem', padding: '8px 10px 8px 32px' }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {filteredConversations.map((c) => (
            <div
              key={c.id}
              onClick={() => handleSelectConversation(c.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                marginBottom: 4,
                cursor: 'pointer',
                backgroundColor: activeConvId === c.id ? 'var(--accent-cyan-glow)' : 'transparent',
                color: activeConvId === c.id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                borderLeft: activeConvId === c.id ? '3px solid var(--accent-cyan)' : '3px solid transparent',
              }}
            >
              <span style={{ fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                {c.title}
              </span>
              <button
                onClick={(e) => handleDeleteConversation(c.id, e)}
                className="btn-icon"
                style={{ padding: 4, opacity: activeConvId === c.id ? 1 : 0.4 }}
                title="Delete Session"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Dialogue Window */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-app)' }}>
        {/* Messages Stream */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {messages.length === 0 ? (
            <div style={{ margin: 'auto', textAlign: 'center', maxWidth: 500 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--accent-cyan)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: 'var(--shadow-sm)',
                  color: '#ffffff',
                }}
              >
                <Sparkles size={28} />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>
                TITAN Intelligent Command Line
              </h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 24 }}>
                Ask questions, schedule tasks, set reminders, search memory, or retrieve live intelligence through natural dialogue.
              </p>

              {/* Suggested Prompts */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {SUGGESTED_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className="titan-card"
                    style={{
                      padding: '8px 14px',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id || idx}
                  style={{
                    display: 'flex',
                    gap: 14,
                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                  }}
                >
                  {!isUser && (
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--accent-cyan)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      <Bot size={18} />
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {/* Tool Executions Badges */}
                    {msg.executed_tools && msg.executed_tools.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 4 }}>
                        {msg.executed_tools.map((t, tIdx) => {
                          const isExp = expandedTools[`${msg.id}_${tIdx}`];
                          return (
                            <div
                              key={tIdx}
                              style={{
                                background: 'var(--accent-cyan-glow)',
                                border: '1px solid var(--accent-cyan-border)',
                                borderRadius: 'var(--radius-md)',
                                padding: '6px 12px',
                                fontSize: '0.78rem',
                                fontFamily: 'var(--font-mono)',
                              }}
                            >
                              <div
                                onClick={() => toggleToolExpand(msg.id, tIdx)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  cursor: 'pointer',
                                  color: 'var(--accent-cyan)',
                                  gap: 8,
                                }}
                              >
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <Terminal size={12} /> Tool Executed: <strong>{t.tool_name}</strong>
                                </span>
                                {isExp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </div>
                              {isExp && (
                                <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px dashed var(--accent-cyan-border)' }}>
                                  <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Arguments:</div>
                                  <pre style={{ background: 'var(--bg-input)', padding: 6, borderRadius: 4, overflowX: 'auto', marginBottom: 4 }}>
                                    {JSON.stringify(t.tool_input, null, 2)}
                                  </pre>
                                  <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Result:</div>
                                  <pre style={{ background: 'var(--bg-input)', padding: 6, borderRadius: 4, overflowX: 'auto' }}>
                                    {JSON.stringify(t.tool_result, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div
                      style={{
                        padding: '14px 18px',
                        borderRadius: 'var(--radius-lg)',
                        backgroundColor: isUser ? 'var(--accent-blue)' : 'var(--bg-card)',
                        color: isUser ? '#ffffff' : 'var(--text-primary)',
                        border: isUser ? 'none' : '1px solid var(--border-card)',
                        boxShadow: 'var(--shadow-sm)',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {msg.content}
                    </div>

                    <span
                      style={{
                        fontSize: '0.7rem',
                        color: 'var(--text-muted)',
                        alignSelf: isUser ? 'flex-end' : 'flex-start',
                      }}
                    >
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {isUser && (
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-surface)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--accent-cyan)',
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      <User size={18} />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {loading && (
            <div style={{ display: 'flex', gap: 14, alignSelf: 'flex-start' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-cyan)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                }}
              >
                <Bot size={18} />
              </div>
              <div
                className="titan-card"
                style={{
                  padding: '12px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  borderRadius: 'var(--radius-lg)',
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent-cyan)',
                    animation: 'pulseGlow 1s infinite alternate',
                  }}
                />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  TITAN is reasoning and executing tools...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Bar */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-glass)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            style={{ display: 'flex', gap: 12, alignItems: 'center' }}
          >
            <input
              type="text"
              placeholder="Ask TITAN to create tasks, schedule reminders, search memory, or give updates..."
              value={inputContent}
              onChange={(e) => setInputContent(e.target.value)}
              className="input-field"
              style={{ flex: 1, padding: '14px 18px', fontSize: '0.95rem' }}
              disabled={loading}
            />
            <Button
              variant="primary"
              type="submit"
              disabled={!inputContent.trim() || loading}
              style={{ padding: '14px 20px' }}
            >
              <Send size={16} />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
