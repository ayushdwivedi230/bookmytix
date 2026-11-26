import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Bot,
  User,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import { aiApi } from '../../services/api';
import type { AssistantMessage, AssistantResponse } from '../../types';

interface ChatItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  relatedLinks?: Array<{ label: string; url: string }>;
  suggestedFollowUps?: string[];
}

export function AiAssistantModal() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatItem[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        `Hello! I am the **BookMyTix AI Concierge**.\n\n` +
        `Ask me about movie ratings & cast, multiplex showtimes, our 8-minute seat lock rules, or cancellation & refund policies!`,
      suggestedFollowUps: [
        'How does the 8-minute seat lock work?',
        'What is your cancellation and refund policy?',
        'Where do I find my digital gate pass?',
      ],
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const q = (textToSend !== undefined ? textToSend : input).trim();
    if (!q || loading) return;

    const userMsg: ChatItem = {
      id: String(Date.now()),
      role: 'user',
      content: q,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (textToSend === undefined) setInput('');
    setLoading(true);

    try {
      const history: AssistantMessage[] = messages.slice(-4).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res: AssistantResponse = await aiApi.askAssistant(q, history);

      const botMsg: ChatItem = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: res.answer,
        sources: res.sources,
        relatedLinks: res.relatedLinks,
        suggestedFollowUps: res.suggestedFollowUps,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: 'assistant',
          content:
            'I encountered a temporary connection issue. Please check our Help Desk or try asking again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Pill */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white font-extrabold text-xs sm:text-sm shadow-2xl shadow-purple-900/50 hover:scale-105 active:scale-95 transition-all border border-white/20 cursor-pointer"
          aria-label="Open AI Assistant"
        >
          <Sparkles size={16} className="text-amber-300 animate-pulse" />
          <span>Ask AI Concierge</span>
        </button>
      )}

      {/* Assistant Modal Window */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] max-h-[85vh] sm:max-h-[600px] h-[550px] bg-[#0E1019] border border-white/15 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100 animate-fadeIn"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#121422] shrink-0">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Bot size={18} />
              </span>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-sm text-white">BookMyTix Concierge</h3>
                  <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/20 px-1.5 py-0.2 rounded">
                    <ShieldCheck size={10} /> Verified
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">Contextual answers grounded in live catalog</p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Safety Disclaimer Banner */}
          <div className="bg-purple-950/30 border-b border-purple-500/20 px-4 py-2 flex items-center gap-2 text-[10px] text-purple-300/90 shrink-0">
            <Info size={12} className="shrink-0 text-purple-400" />
            <span>AI guidance only. Official purchases are recorded in your Dashboard.</span>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-6 h-6 rounded-lg bg-purple-600/30 border border-purple-500/40 text-purple-300 flex items-center justify-center shrink-0 mt-1">
                      <Sparkles size={11} />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 space-y-2 ${
                      isUser
                        ? 'bg-purple-600 text-white rounded-tr-none'
                        : 'bg-[#161928] border border-white/10 text-slate-200 rounded-tl-none shadow-lg'
                    }`}
                  >
                    <p className="whitespace-pre-line leading-relaxed">{m.content}</p>

                    {/* Sources Badge */}
                    {m.sources && m.sources.length > 0 && (
                      <div className="pt-2 border-t border-white/10 flex flex-wrap gap-1 text-[9px] text-slate-400">
                        <span className="font-bold text-slate-500">Sources:</span>
                        {m.sources.map((s) => (
                          <span
                            key={s}
                            className="bg-white/[0.06] border border-white/10 px-1.5 py-0.5 rounded"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Related Links */}
                    {m.relatedLinks && m.relatedLinks.length > 0 && (
                      <div className="pt-1 flex flex-wrap gap-1.5">
                        {m.relatedLinks.map((link) => (
                          <button
                            key={link.url}
                            onClick={() => {
                              setIsOpen(false);
                              navigate(link.url);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:text-white text-[10px] font-bold transition-colors cursor-pointer"
                          >
                            <span>{link.label}</span>
                            <ExternalLink size={10} />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Suggested Followups */}
                    {m.suggestedFollowUps && m.suggestedFollowUps.length > 0 && (
                      <div className="pt-2 flex flex-col gap-1">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                          Suggested questions:
                        </p>
                        {m.suggestedFollowUps.map((fu) => (
                          <button
                            key={fu}
                            onClick={() => handleSend(fu)}
                            className="text-left text-[11px] text-purple-300 hover:text-purple-200 font-semibold py-0.5 flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <ChevronRight size={12} className="shrink-0 text-purple-400" />
                            <span>{fu}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-6 h-6 rounded-lg bg-white/10 text-white flex items-center justify-center shrink-0 mt-1">
                      <User size={12} />
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="flex gap-2 items-center text-slate-400 text-xs py-2 pl-2">
                <Loader2 size={14} className="animate-spin text-purple-400" />
                <span>Checking verified policies and catalog…</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 border-t border-white/10 bg-[#121422] shrink-0 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about movies, seats, policies..."
              className="flex-1 bg-[#181B2B] rounded-xl border border-white/10 px-3.5 py-2.5 text-xs text-white placeholder-slate-400 outline-none focus:border-purple-500/60"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-9 h-9 rounded-xl bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 shadow-lg shadow-purple-600/30"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
