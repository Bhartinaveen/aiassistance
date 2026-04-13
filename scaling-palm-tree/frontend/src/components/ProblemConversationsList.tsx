"use client";
import { useState } from 'react';
import { AlertCircle, AlertTriangle, ShieldAlert, Cpu, Search, Copy } from 'lucide-react';
import ConversationModal from './ConversationModal';

export default function ProblemConversationsList({ data }: { data: any[] }) {
  const [selectedConv, setSelectedConv] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [onDemandList, setOnDemandList] = useState<any[]>([]);

  const combinedData = [...onDemandList, ...data];
  // Deduplicate by conversation_id just in case
  const uniqueData = combinedData.filter((v, i, a) => a.findIndex(t => t.conversation_id === v.conversation_id) === i);

  const filteredData = uniqueData.filter(d => {
    if (!searchQuery) return true;
    return d.conversation_id?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleAnalyzeOnDemand = async () => {
    if (!searchQuery) return;
    setIsAnalyzing(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${apiUrl}/api/analysis/single/${searchQuery.trim()}`);
      const resData = await res.json();
      if (resData.status === "success" && resData.data) {
        setOnDemandList(prev => {
          // Add if not already present
          if (prev.find(p => p.conversation_id === resData.data.conversation_id)) return prev;
          return [resData.data, ...prev];
        });
        setSelectedConv(resData.data);
      } else {
        alert("Could not analyze conversation: " + (resData.message || "Unknown error"));
      }
    } catch (e) {
      alert("Error reaching the analysis server.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (filteredData.length === 0 && !searchQuery) return null;

  return (
    <>
      <div className="w-full glass-card rounded-[2.5rem] p-8 overflow-hidden animate-entry mt-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-white/5 pb-5">
        <div>
          <h3 className="text-white font-black text-sm uppercase tracking-[0.2em] sm:tracking-[0.3em] flex items-center gap-3">
             <AlertTriangle size={18} className="text-primary shrink-0" />
             All Conversations Tracker
          </h3>
          <p className="text-xs text-white/40 mt-2 font-medium">Click on any conversation row to view deep analysis and message logs.</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full md:w-auto">
          <div className="relative w-full sm:w-auto">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input 
              type="text" 
              placeholder="SEARCH BY ID..." 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-white/5 border border-white/10 rounded-full py-1.5 pl-9 pr-4 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all w-full sm:w-48"
            />
          </div>
          {searchQuery && searchQuery.length > 5 && (
            <button 
              onClick={handleAnalyzeOnDemand}
              disabled={isAnalyzing}
              className="px-4 py-1.5 rounded-full bg-primary/20 text-primary hover:bg-primary hover:text-black hover:shadow-[0_0_15px_rgba(139,92,246,0.5)] text-[10px] font-black uppercase tracking-wider whitespace-nowrap self-start sm:self-auto transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? "Analyzing..." : "Analyze ID"}
            </button>
          )}
          <div className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-wider whitespace-nowrap self-start sm:self-auto">
            {filteredData.length} Conversations
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredData.slice((currentPage - 1) * 10, currentPage * 10).map((item, idx) => {
          const brand = item.widget_id === "680a0a8b70a26f7a0e24eedd" ? "Blue Nectar" : (item.widget_id || "Unknown");
          
          return (
            <div 
              key={idx} 
              onClick={() => setSelectedConv(item)}
              className="p-5 rounded-[1.5rem] border border-white/5 bg-white/[0.02] hover:bg-white/5 hover:border-primary/30 cursor-pointer transition-all hover:shadow-[0_0_15px_rgba(139,92,246,0.1)] group flex flex-col gap-3"
            >
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-white/40 uppercase font-black tracking-widest flex items-center gap-1.5">
                  <Cpu size={12} className="text-primary/70" /> {brand}
                </span>
                
                <div className="flex items-center justify-between">
                  <span 
                    className="text-xs font-mono font-bold text-white/80 group-hover:text-primary transition-colors truncate w-full" 
                    title={`Conversation ID: ${item.conversation_id}`}
                  >
                    {item.conversation_id}
                  </span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(item.conversation_id);
                      const icon = e.currentTarget.querySelector('svg');
                      if(icon) {
                        icon.style.color = '#34d399';
                        setTimeout(() => icon.style.color = '', 1500);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-white/40 hover:text-white rounded-lg hover:bg-white/10 shrink-0 ml-2"
                    title="Copy Conversation ID"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              </div>

              {item.widget_id && item.widget_id !== "Unknown" && (
                <div className="mt-auto pt-3 border-t border-white/5 flex items-center">
                  <span className="text-[9px] font-mono text-white/20 truncate" title={`Widget ID: ${item.widget_id}`}>
                    WID: {item.widget_id}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filteredData.length > 10 && (
        <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
          <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">
            Showing {(currentPage - 1) * 10 + 1} to {Math.min(currentPage * 10, filteredData.length)} of {filteredData.length}
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white/70 uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button 
              onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredData.length / 10), p + 1))}
              disabled={currentPage === Math.ceil(filteredData.length / 10)}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white/70 uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
      </div>

      {selectedConv && (
        <ConversationModal 
          convId={selectedConv.conversation_id} 
          report={selectedConv} 
          onClose={() => setSelectedConv(null)} 
        />
      )}
    </>
  );
}
