"use client";

import { useState } from 'react';
import { Bot, Send, User, X } from 'lucide-react';

export default function ChatInterface({ onVisualizationChange }: { onVisualizationChange: (viz: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{sender: 'user'|'bot', text: string}[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!inputMsg.trim() || loading) return;
    
    const userQ = inputMsg.trim();
    setMessages(prev => [...prev, { sender: 'user', text: userQ }]);
    setInputMsg('');
    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userQ })
      });
      const data = await res.json();
      
      if (data.status === "success" && data.response) {
        setMessages(prev => [...prev, { sender: 'bot', text: data.response.reply_text }]);
        if (data.response.target_visualization) {
          onVisualizationChange(data.response.target_visualization);
        }
      } else {
        setMessages(prev => [...prev, { sender: 'bot', text: "Sorry, I couldn't reach the backend." }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { sender: 'bot', text: "Error connecting to AI service." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* FAB Launcher */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 p-4 rounded-full bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-500/20 text-white transition-all transform hover:scale-105"
        >
          <Bot size={28} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-3rem)] h-[500px] bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
            <div className="flex items-center gap-2">
              <Bot className="text-indigo-400" size={20} />
              <h3 className="text-white/90 font-medium tracking-wide">AI Analytics Agent</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white">
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-white/40 mt-10 text-sm">
                Ask me anything about the recent QA evaluation run...
                <br /><br />
                Try: <span className="italic">"Which brand hallucinates?"</span>
              </div>
            )}
            
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${m.sender === 'user' ? 'bg-neutral-800' : 'bg-indigo-600'}`}>
                  {m.sender === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div className={`p-3 rounded-2xl text-sm max-w-[80%] ${m.sender === 'user' ? 'bg-neutral-800 text-white/90 rounded-tr-sm' : 'bg-indigo-900/40 text-indigo-100 rounded-tl-sm border border-indigo-500/20'}`}>
                  {m.text}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
                  <Bot size={14} className="animate-pulse text-white" />
                </div>
                <div className="p-3 text-sm text-indigo-200">Thinking...</div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/10 bg-black/20">
            <div className="relative">
              <input 
                type="text" 
                value={inputMsg}
                onChange={e => setInputMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Ask about the data..."
                className="w-full bg-white/5 border border-white/10 rounded-full py-3 pr-12 pl-4 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                disabled={loading}
              />
              <button 
                onClick={handleSend}
                disabled={loading}
                className="absolute right-2 top-2 p-1.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
