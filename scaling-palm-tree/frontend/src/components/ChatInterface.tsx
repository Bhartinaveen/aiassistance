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
          className="fixed bottom-8 right-8 p-5 rounded-3xl bg-primary hover:bg-accent shadow-2xl glow-primary text-white transition-all transform hover:scale-110 active:scale-95 z-50 group"
        >
          <Bot size={32} className="group-hover:rotate-12 transition-transform" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#05050a] animate-pulse" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className={`fixed z-50 bottom-8 right-8 glass-premium rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 zoom-in-95 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] origin-bottom-right ${
            isExpanded ? 'w-[850px] max-w-[calc(100vw-4rem)] h-[85vh]' : 'w-[420px] max-w-[calc(100vw-4rem)] h-[620px]'
        }`}>
          {/* Header */}
          <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30">
                <Bot className="text-primary" size={24} />
              </div>
              <div>
                <h3 className="text-white font-bold tracking-tight">Sentient AI Interface</h3>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-white/40 uppercase tracking-widest font-black">Online / Neural Linked</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsExpanded(!isExpanded)} className="w-9 h-9 flex items-center justify-center text-white/30 hover:text-white rounded-xl hover:bg-white/5 transition-colors" title={isExpanded ? "Minimize" : "Full View"}>
                {isExpanded ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
              </button>
              <button onClick={() => setIsOpen(false)} className="w-9 h-9 flex items-center justify-center text-white/30 hover:text-red-400 rounded-xl hover:bg-red-500/10 transition-colors" title="Close Intelligence Feed">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-gradient-to-b from-transparent to-black/20">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center px-10">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 animate-glow">
                  <Bot className="text-primary/40" size={40} />
                </div>
                <h4 className="text-white/80 font-bold mb-2">Neural Link Established</h4>
                <p className="text-white/30 text-xs leading-relaxed max-w-[240px]">
                  Queried intelligence regarding the behavioral evaluation matrix.
                </p>
                <div className="mt-8 grid grid-cols-1 gap-2 w-full">
                  {["Analyze halluncination trends", "Summarize user friction spikes", "System health report"].map((hint) => (
                    <button 
                      key={hint}
                      onClick={() => setInputMsg(hint)}
                      className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/5 text-[11px] text-white/50 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all text-left font-mono"
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-4 ${m.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-in fade-in slide-in-from-bottom-2`}>
                <div className={`shrink-0 w-10 h-10 rounded-[1rem] flex items-center justify-center border ${m.sender === 'user' ? 'bg-white/5 border-white/10' : 'bg-primary/20 border-primary/30 shadow-[0_0_20px_rgba(139,92,246,0.2)]'}`}>
                  {m.sender === 'user' ? <User size={18} className="text-white/60" /> : <Bot size={18} className="text-primary" />}
                </div>
                <div className={`px-5 py-4 rounded-[1.5rem] text-[13px] sm:text-sm max-w-[82%] shadow-2xl leading-relaxed ${
                  m.sender === 'user' 
                    ? 'bg-white/[0.07] text-white font-medium rounded-tr-none border border-white/10' 
                    : 'bg-primary/10 text-white/90 rounded-tl-none border border-primary/20 backdrop-blur-md'
                }`}>
                  {m.sender === 'bot' ? formatMessage(m.text) : m.text}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex gap-4 animate-in fade-in">
                <div className="shrink-0 w-10 h-10 rounded-[1rem] bg-primary/20 border border-primary/30 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.2)]">
                  <Bot size={18} className="animate-pulse text-primary" />
                </div>
                <div className="px-5 py-4 text-xs font-mono text-primary/70 animate-pulse bg-primary/5 rounded-[1.5rem] rounded-tl-none border border-primary/10 flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-primary animate-ping" />
                  Synthesizing behavioral patterns...
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-6 bg-black/40 backdrop-blur-xl border-t border-white/5">
            <div className="relative group">
              <input 
                type="text" 
                value={inputMsg}
                onChange={e => setInputMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Synchronize query with AI..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pr-14 pl-5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 focus:bg-white/[0.08] transition-all font-mono shadow-inner group-hover:border-white/20"
                disabled={loading}
              />
              <button 
                onClick={handleSend}
                disabled={loading || !inputMsg.trim()}
                className="absolute right-2 top-2 w-10 h-10 rounded-xl bg-primary text-white hover:bg-accent disabled:opacity-20 disabled:grayscale transition-all flex items-center justify-center glow-primary active:scale-90"
              >
                <Send size={18} />
              </button>
            </div>
            <p className="mt-3 text-[9px] text-white/10 text-center font-mono uppercase tracking-[0.2em]">Neural Encryption Active / GPT-4 Pipeline</p>
          </div>
        </div>
      )}
    </>
  );
}
