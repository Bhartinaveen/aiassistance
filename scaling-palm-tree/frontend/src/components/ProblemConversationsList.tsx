"use client";
import { useState } from 'react';
import { AlertCircle, AlertTriangle, ShieldAlert, Cpu, Search, Copy } from 'lucide-react';
import ConversationModal from './ConversationModal';

import { getApiUrl } from '@/config';

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
      const apiUrl = getApiUrl();
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
      <div className="w-full glass-premium rounded-[3rem] p-10 overflow-hidden animate-entry mt-12 border border-white/5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10 border-b border-white/10 pb-8">
        <div>
          <h3 className="text-white font-black text-lg uppercase tracking-[0.4em] flex items-center gap-4">
             <div className="w-2 h-6 bg-primary rounded-full" />
             Conversation Tracker
          </h3>
          <p className="text-[11px] text-white/30 mt-3 font-bold uppercase tracking-widest">Select a session for a detailed behavioral review</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 w-full md:w-auto">
          <div className="relative w-full sm:w-auto overflow-hidden rounded-2xl">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
            <input 
              type="text" 
              placeholder="SEARCH BY ID..." 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-6 text-xs font-mono text-white placeholder-white/20 focus:outline-none focus:border-primary/50 focus:bg-white/[0.08] transition-all w-full sm:w-64"
            />
          </div>
          {searchQuery && searchQuery.length > 5 && (
            <button 
              onClick={handleAnalyzeOnDemand}
              disabled={isAnalyzing}
              className="px-6 py-3 rounded-2xl bg-primary text-white hover:bg-accent glow-primary text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap self-start sm:self-auto transition-all disabled:opacity-20 flex items-center gap-2"
            >
              {isAnalyzing ? <><span className="w-2 h-2 rounded-full border border-white border-t-transparent animate-spin" /> Analyzing</> : "Analyze Session"}
            </button>
          )}
          <div className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/40 text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap">
            <span className="text-primary mr-2">{filteredData.length}</span> Sessions Found
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredData.slice((currentPage - 1) * 12, currentPage * 12).map((item, idx) => {
          const brand = item.widget_id === "680a0a8b70a26f7a0e24eedd" ? "Blue Nectar" : (item.widget_id || "Unknown Source");
          
          return (
            <div 
              key={idx} 
              onClick={() => setSelectedConv(item)}
              className="p-6 rounded-[2rem] border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-primary/40 cursor-pointer transition-all hover:shadow-[0_0_30px_rgba(139,92,246,0.1)] group flex flex-col gap-5 animate-in fade-in"
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-end">
                  {item.evaluation?.Hallucination_Detected && (
                    <span className="px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-[8px] font-black uppercase">Conflict</span>
                  )}
                </div>
                
                <div className="flex flex-col gap-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span 
                      className="text-[10px] font-mono font-bold text-white/80 group-hover:text-primary transition-colors truncate w-full" 
                      title={`Conversation ID: ${item.conversation_id}`}
                    >
                      <span className="text-primary/60 mr-1">CID:</span>{item.conversation_id}
                    </span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(item.conversation_id);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-white/20 hover:text-primary rounded-xl hover:bg-white/5 shrink-0 ml-2"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                  
                  {item.widget_id && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-medium text-white/30 truncate w-full" title={`Widget ID: ${item.widget_id}`}>
                        <span className="text-white/10 mr-1">WID:</span>{item.widget_id}
                      </span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(item.widget_id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-white/10 hover:text-primary rounded-xl hover:bg-white/5 shrink-0 ml-2"
                      >
                        <Copy size={11} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )
        })}
      </div>

      {filteredData.length > 12 && (
        <div className="mt-10 flex items-center justify-between border-t border-white/10 pt-8">
          <span className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-black">
            Node {(currentPage - 1) * 12 + 1} TO {Math.min(currentPage * 12, filteredData.length)} OF {filteredData.length}
          </span>
          <div className="flex gap-3">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-6 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-[10px] font-black text-white/50 uppercase tracking-[0.2em] disabled:opacity-10 disabled:grayscale transition-all border border-white/5"
            >
              Previous Range
            </button>
            <button 
              onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredData.length / 12), p + 1))}
              disabled={currentPage === Math.ceil(filteredData.length / 12)}
              className="px-6 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-[10px] font-black text-white/50 uppercase tracking-[0.2em] disabled:opacity-10 disabled:grayscale transition-all border border-white/5"
            >
              Next Range
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
