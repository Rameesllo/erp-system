"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { 
  Sparkles, X, Send, RotateCcw, Loader2, 
  TrendingUp, AlertTriangle, ArrowRight, Database
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolsUsed?: string[];
  timestamp: string;
}

const SUGGESTED_QUESTIONS = [
  { label: "Revenue this month", query: "How much revenue did we generate this month?", tag: "Sales" },
  { label: "Top 5 Products", query: "What were our top 5 products this month?", tag: "Inventory" },
  { label: "Low Stock Alert", query: "Which products are low in stock?", tag: "Stock" },
  { label: "ഈ മാസത്തെ Revenue", query: "ഈ മാസം എത്ര revenue ഉണ്ടാക്കി?", tag: "മലയാളം" },
  { label: "Low stock products", query: "ഏത് products ആണ് low stock ഉള്ളത്?", tag: "മലയാളം" },
  { label: "Inactive Customers", query: "Which customers haven't purchased recently?", tag: "CRM" },
  { label: "Outstanding Invoices", query: "How much money is currently outstanding in invoices?", tag: "Finance" },
  { label: "Sales Comparison", query: "Compare this month's sales with last month.", tag: "Analytics" },
];

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, isOpen]);

  // Focus input when drawer opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = (queryText || input).trim();
    if (!textToSend || loading) return;

    const userMessage: Message = {
      id: "msg_" + Date.now(),
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // Build history for context
      const history = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: textToSend, history }),
      });

      const data = await res.json();

      const assistantMessage: Message = {
        id: "msg_ai_" + Date.now(),
        role: "assistant",
        content: data.success ? data.response : (data.message || "Failed to retrieve ERP response."),
        toolsUsed: data.toolsUsed || [],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: "msg_err_" + Date.now(),
          role: "assistant",
          content: "I'm unable to connect to the ERP service right now. Please verify your connection.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-full shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 group ${
          isOpen ? "hidden" : "flex"
        }`}
        title="Open ERP AI Business Assistant"
      >
        <div className="relative">
          <Sparkles size={18} className="text-amber-300 animate-pulse" />
        </div>
        <span className="text-sm font-semibold tracking-wide">Ask ERP AI</span>
      </button>

      {/* Slide-out Panel Overlay (Backdrop on mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Main Assistant Panel */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full md:w-[430px] bg-white border-l border-slate-200/80 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 backdrop-blur-sm flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-sm shadow-indigo-200">
              <Sparkles size={18} className="text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-sm">ERP AI Assistant</h3>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Online
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Ask in English, മലയാളം, or Manglish</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                title="Clear conversation"
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
              >
                <RotateCcw size={16} />
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Conversation Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F8FAFC]">
          {messages.length === 0 ? (
            <div className="py-6 space-y-6">
              <div className="p-4 rounded-2xl bg-white border border-slate-200/70 shadow-sm space-y-2">
                <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs">
                  <Sparkles size={15} /> Real-Time ERP Intelligence
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  I analyze live database metrics for revenue, inventory health, sales trends, invoices, and customer insights.
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 px-1">
                  Suggested Questions
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {SUGGESTED_QUESTIONS.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(q.query)}
                      className="text-left p-2.5 bg-white hover:bg-indigo-50/60 border border-slate-200/70 hover:border-indigo-200 rounded-xl transition-all group flex items-center justify-between"
                    >
                      <div>
                        <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 mr-2 group-hover:bg-indigo-100 group-hover:text-indigo-700 transition-colors">
                          {q.tag}
                        </span>
                        <span className="text-xs font-medium text-slate-700 group-hover:text-indigo-900">
                          {q.label}
                        </span>
                      </div>
                      <ArrowRight size={13} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                    m.role === "user"
                      ? "bg-indigo-600 text-white rounded-br-none shadow-sm shadow-indigo-200"
                      : "bg-white text-slate-800 border border-slate-200/70 rounded-bl-none shadow-sm"
                  }`}
                >
                  <FormatMessageContent content={m.content} isUser={m.role === "user"} />

                  {/* Tool execution badge */}
                  {m.toolsUsed && m.toolsUsed.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[10px] text-slate-400">
                      <Database size={11} className="text-indigo-500" />
                      <span>Data queried: {m.toolsUsed.join(", ")}</span>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">{m.timestamp}</span>
              </div>
            ))
          )}

          {/* Thinking indicator */}
          {loading && (
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0 mt-1">
                <Loader2 size={13} className="animate-spin" />
              </div>
              <div className="bg-white border border-slate-200/70 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                <p className="text-xs text-slate-500 flex items-center gap-2">
                  <span className="inline-block w-1.5 h-1.5 bg-indigo-600 rounded-full animate-ping"></span>
                  Analyzing ERP database...
                </p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3.5 border-t border-slate-200/80 bg-white flex-shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask in English, മലയാളം, or Manglish..."
              disabled={loading}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl shadow-sm shadow-indigo-200 transition-colors flex items-center justify-center"
            >
              <Send size={15} />
            </button>
          </form>
          <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-slate-400">
            <span>Read-only analytics</span>
            <span className="flex items-center gap-1">
              <Link href="/inventory" className="hover:text-indigo-600 underline">Inventory</Link>
              •
              <Link href="/sales" className="hover:text-indigo-600 underline">Sales</Link>
              •
              <Link href="/finance/invoices" className="hover:text-indigo-600 underline">Invoices</Link>
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

/** Formatter helper for AI markdown responses */
function FormatMessageContent({ content, isUser }: { content: string; isUser: boolean }) {
  if (isUser) {
    return <p className="whitespace-pre-wrap">{content}</p>;
  }

  // Parse lines with bullet points, bold text, numbers
  const lines = content.split("\n");

  return (
    <div className="space-y-1.5">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1.5" />;

        // Header / Bold start
        if (trimmed.startsWith("### ")) {
          return <h4 key={idx} className="font-bold text-slate-900 text-xs mt-2">{trimmed.replace("### ", "")}</h4>;
        }
        if (trimmed.startsWith("## ")) {
          return <h3 key={idx} className="font-bold text-slate-900 text-xs mt-2">{trimmed.replace("## ", "")}</h3>;
        }

        // Bullet point
        if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-1">
              <span className="text-indigo-500 font-bold leading-none mt-1">•</span>
              <span className="flex-1">{renderBoldText(trimmed.replace(/^(\*|-)\s+/, ""))}</span>
            </div>
          );
        }

        // Numbered list
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-1">
              <span className="text-indigo-600 font-semibold text-[11px] min-w-[14px]">{numMatch[1]}.</span>
              <span className="flex-1">{renderBoldText(numMatch[2])}</span>
            </div>
          );
        }

        return <p key={idx}>{renderBoldText(trimmed)}</p>;
      })}
    </div>
  );
}

/** Simple parser for **bold** text */
function renderBoldText(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
