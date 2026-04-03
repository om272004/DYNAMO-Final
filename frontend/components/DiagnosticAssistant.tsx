"use client";

import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { MessageSquare, Send, User, Zap, Loader2, Trash2, X, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DiagnosticAssistantProps {
  liveData: any;
}

export default function DiagnosticAssistant({ liveData }: DiagnosticAssistantProps) { // <--- Update function definition
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: string, content: string }[]>([
    { role: "assistant", content: "DYNAMO AI ONLINE. System initialized. How can I assist with your motor diagnostics today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestions = [
    "What is the primary fault driver?",
    "Explain ISO 10816 vibration limits.",
    "How is Remaining Useful Life (RUL) calculated?",
    "What does a high F1 score mean here?"
  ];

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText || input;
    if (!textToSend.trim()) return;

    const userMessage = { role: "user", content: textToSend };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    if (!overrideText) setInput(""); 
    setLoading(true);

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const response = await axios.post(`${API_BASE_URL}/api/chat`, {
        messages: newMessages.map(m => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content
        })),
        live_context: liveData
      });

      setMessages([...newMessages, { role: "assistant", content: response.data.reply }]);
    } catch (err: any) {
      setMessages([...newMessages, { role: "assistant", content: "⚠️ ERROR: Communication link severed. Ensure model is trained and API key is valid." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start font-mono">

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-[#160a0a] border border-red-500/30 rounded-lg shadow-[0_10px_40px_rgba(220,38,38,0.15)] flex flex-col w-[400px] h-[550px] mb-4 overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-red-500/20 bg-[#0e0606]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center shadow-[0_0_10px_rgba(220,38,38,0.5)]">
                  <Zap className="w-3 h-3 text-black" />
                </div>
                <h2 className="text-xs font-bold tracking-[0.2em] text-white uppercase">
                  DYNAMO AI ASSISTANT
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMessages([{ role: "assistant", content: "Memory cleared. DYNAMO standing by." }])}
                  className="text-gray-500 hover:text-red-400 transition-colors"
                  title="Clear Chat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gradient-to-b from-[#160a0a] to-[#0e0606]">
              {messages.map((msg, idx) => (
                <motion.div
                  initial={{ opacity: 0, x: msg.role === "user" ? 10 : -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={idx}
                  className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div className={`w-7 h-7 rounded shrink-0 flex items-center justify-center ${msg.role === "user" ? "bg-[#1e0f0f] border border-red-500/30" : "bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]"}`}>
                    {msg.role === "user" ? <User className="w-3 h-3 text-red-400" /> : <Zap className="w-3 h-3 text-black" />}
                  </div>
                  <div className={`p-3 rounded-md max-w-[85%] text-xs font-mono leading-relaxed ${msg.role === "user" ? "bg-[#1e0f0f] text-gray-300 border border-red-500/10" : "bg-red-500/10 text-red-100 border border-red-500/20"}`}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded shrink-0 flex items-center justify-center bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]">
                    <Loader2 className="w-3 h-3 text-black animate-spin" />
                  </div>
                  <div className="p-3 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-mono flex items-center gap-2">
                    Analysing telemetry...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {!loading && messages.length === 1 && (
              <div className="px-4 pb-2 bg-[#0e0606] flex flex-wrap gap-2">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(suggestion)}
                    className="text-[9px] text-gray-400 border border-red-500/20 bg-[#1e0f0f] hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/50 px-2 py-1.5 rounded transition-colors flex items-center gap-1 text-left"
                  >
                    <ChevronRight className="w-3 h-3 text-red-500" /> {suggestion}
                  </button>
                ))}
              </div>
            )}

            <div className="p-3 border-t border-red-500/20 bg-[#0e0606]">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Ask DYNAMO..."
                  className="flex-1 bg-[#1e0f0f] border border-red-500/30 text-gray-200 font-mono text-xs p-3 rounded outline-none focus:border-red-500 transition-colors"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={loading || !input.trim()}
                  className="px-4 bg-red-600 hover:bg-red-500 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded flex items-center justify-center transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)] disabled:shadow-none"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-gradient-to-tr from-red-700 to-orange-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.6)] border-2 border-red-400/50 group"
        >
          <MessageSquare className="w-6 h-6 text-white group-hover:animate-pulse" />
        </motion.button>
      )}
    </div>
  );
}