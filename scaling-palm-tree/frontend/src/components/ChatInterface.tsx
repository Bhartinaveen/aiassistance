"use client";

import { useState } from 'react';
import { Bot, Send, User, X, Maximize2, Minimize2 } from 'lucide-react';

export default function ChatInterface({ onVisualizationChange }: { onVisualizationChange: (viz: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<{sender: 'user'|'bot', text: string}[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Safely renders markdown bolding (** text **) and bullet points (* text)
  const formatMessage = (text: string) => {
    let formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>') // Bold text
      .replace(/(?:\r\n|\r|\n)/g, '\n'); // Normalize newlines
    
    // Identify bullet lists (* item) and wrap them properly in HTML tags
    formatted = formatted.replace(/(?:^|\n)\s*\*\s+(.*?)(?=\n|$)/g, '<li class="ml-6 list-disc mt-1.5">$1</li>');
    formatted = formatted.replace(/(<li[^>]*>.*?<\/li>)+/g, '<ul class="my-2 pl-2 border-l border-white/10">$&</ul>');
    
    // Convert remaining newlines into HTML breaks
    formatted = formatted.replace(/\n/g, '<br/>');
    
    return <div className="leading-relaxed space-y-1" dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  const handleSend = async () => {
    if (!inputMsg.trim() || loading) return;
    
    const userQ = inputMsg.trim();
    setMessages(prev => [...prev, { sender: 'user', text: userQ }]);
    setInputMsg('');
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${apiUrl}/api/chat`, {
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
          className="fixed bottom-6 right-6 p-4 rounded-full bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-500/20 text-white transition-all transform hover:scale-105 z-50"
        >
          <Bot size={28} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className={`fixed z-50 bottom-6 right-6 bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 transition-all duration-300 ease-out origin-bottom-right ${
            isExpanded ? 'w-[750px] max-w-[calc(100vw-3rem)] h-[85vh]' : 'w-96 max-w-[calc(100vw-3rem)] h-[500px]'
        }`}>
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
            <div className="flex items-center gap-2">
              <Bot className="text-indigo-400" size={20} />
              <h3 className="text-white/90 font-medium tracking-wide">AI Analytics Agent</h3>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 text-white/50 hover:text-white rounded hover:bg-white/10 transition-colors" title={isExpanded ? "Collapse Size" : "Expand Size"}>
                {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
              <button onClick={() => setIsOpen(false)} className="p-1.5 text-white/50 hover:text-white rounded hover:bg-white/10 transition-colors" title="Close Chat">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
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
                <div className={`p-4 rounded-2xl text-[13px] sm:text-sm max-w-[85%] shadow-sm ${m.sender === 'user' ? 'bg-neutral-800 text-white/90 rounded-tr-sm' : 'bg-indigo-950/50 text-indigo-100/90 rounded-tl-sm border border-indigo-500/20'}`}>
                  {m.sender === 'bot' ? formatMessage(m.text) : m.text}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <Bot size={14} className="animate-pulse text-white" />
                </div>
                <div className="p-4 text-sm text-indigo-300 animate-pulse">Analyzing matrix...</div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/10 bg-[#0A0A0C]">
            <div className="relative">
              <input 
                type="text" 
                value={inputMsg}
                onChange={e => setInputMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Ask about the data..."
                className="w-full bg-white/5 border border-white/10 rounded-full py-3.5 pr-12 pl-4 text-sm text-white focus:outline-none focus:border-indigo-500 focus:bg-white/10 transition-all font-mono"
                disabled={loading}
              />
              <button 
                onClick={handleSend}
                disabled={loading}
                className="absolute right-2 top-2 p-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
