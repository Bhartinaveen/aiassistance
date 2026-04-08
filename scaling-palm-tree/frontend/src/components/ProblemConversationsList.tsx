"use client";
import { useState } from 'react';
import { AlertCircle, AlertTriangle, ShieldAlert, Cpu, Search } from 'lucide-react';
import ConversationModal from './ConversationModal';

export default function ProblemConversationsList({ data }: { data: any[] }) {
  const [selectedConv, setSelectedConv] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredData = data.filter(d => {
    if (!searchQuery) return true;
    return d.conversation_id?.toLowerCase().includes(searchQuery.toLowerCase());
  });

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
          <div className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-wider whitespace-nowrap self-start sm:self-auto">
            {filteredData.length} Conversations
          </div>
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-white/40">
              <th className="pb-4 pr-4">Conv ID / Brand</th>
              <th className="pb-4 pr-4">Primary Problem</th>
              <th className="pb-4 pr-4">User Frustration</th>
              <th className="pb-4 pr-4">Agent Mistake</th>
              <th className="pb-4">Required Fix</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.slice((currentPage - 1) * 10, currentPage * 10).map((item, idx) => {
              const ev = item.evaluation || {};
              
              const hasUserProblem = ev.User_Message_Problem && !['none', 'n/a', 'none.', 'none identified'].includes(ev.User_Message_Problem.toLowerCase());
              const hasAgentProblem = ev.Agent_Message_Problem && !['none', 'n/a', 'none.', 'none identified'].includes(ev.Agent_Message_Problem.toLowerCase());
              
              const hasIssue = (
                ev.Hallucination_Detected === true ||
                ev.Hallucination_Detected === "true" ||
                ev.Checkout_Friction_Detected === true ||
                ev.Checkout_Friction_Detected === "true" ||
                item.loop_detected === true ||
                (ev.User_Satisfaction_Score && parseFloat(ev.User_Satisfaction_Score) <= 4) ||
                hasUserProblem || 
                hasAgentProblem
              );

              let scoreValue = ev.User_Satisfaction_Score ? parseFloat(ev.User_Satisfaction_Score) : null;
              let scoreStr = scoreValue !== null ? ` - ${scoreValue}/10` : "";
              
              const isHighScore = scoreValue !== null && scoreValue >= 8.5;
              const isProblematic = hasIssue && !isHighScore;

              // Different user-friendly names for "Hallucination"
              const falseInfoNames = ["Fact Error", "Misinformation", "False Policy", "Fabrication"];

              // Determine primary type
              let tag = `Satisfied${scoreStr}`;
              let color = "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
              
              if (isProblematic) {
                tag = `Issue${scoreStr}`;
                
                // Color by criticality instead of arbitrary tags
                const isCritical = scoreValue === null || scoreValue <= 5;
                color = isCritical 
                  ? "text-red-400 border-red-500/30 bg-red-500/10" // Red for severe
                  : "text-amber-400 border-amber-500/30 bg-amber-500/10"; // Yellow for moderate
                
                if (item.loop_detected) { 
                  tag = `Loop Focus${scoreStr}`; 
                }
                else if (ev.Hallucination_Detected === true || ev.Hallucination_Detected === 'true') { 
                  const friendlyName = falseInfoNames[idx % falseInfoNames.length];
                  tag = `${friendlyName}${scoreStr}`; 
                }
                else if (ev.Checkout_Friction_Detected === true || ev.Checkout_Friction_Detected === 'true') { 
                  tag = `Friction${scoreStr}`; 
                }
                else if (item.dropoff) { 
                  tag = `Dropoff${scoreStr}`; 
                }
              }

              const brand = item.widget_id === "680a0a8b70a26f7a0e24eedd" ? "Blue Nectar" : item.widget_id;
              
              return (
                <tr 
                  key={idx} 
                  onClick={() => setSelectedConv(item)}
                  className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors group"
                >
                  <td className="py-4 pr-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-mono font-bold text-white/80 group-hover:text-primary transition-colors">
                        ...{item.conversation_id?.slice(-8)}
                      </span>
                      <span className="text-[10px] text-white/30 uppercase font-black flex items-center gap-1">
                        <Cpu size={10} /> {brand}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 pr-4 align-top">
                    <span className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border ${color} whitespace-nowrap`}>
                      {tag}
                    </span>
                  </td>
                  <td className="py-4 pr-4 align-top">
                    <p className="text-xs text-white/60 line-clamp-2 max-w-[200px]">
                      {!isProblematic ? "None" : (ev.User_Message_Problem || ev.User_Frustration_Point || "General frustration")}
                    </p>
                  </td>
                  <td className="py-4 pr-4 align-top">
                    <p className="text-xs text-white/60 line-clamp-2 max-w-[200px]">
                      {!isProblematic ? "None" : (ev.Agent_Message_Problem || ev.Hallucination_Reason || "Suboptimal response")}
                    </p>
                  </td>
                  <td className="py-4 align-top">
                    <p className={`text-[11px] font-medium italic line-clamp-2 max-w-[250px] ${!isProblematic ? "text-emerald-400/80" : "text-primary/80"}`}>
                      {!isProblematic ? "User Satisfied" : (ev.Agent_Improvement_Rule || "Review guidelines")}
                    </p>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
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
