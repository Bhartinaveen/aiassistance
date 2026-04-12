"use client";
import { useEffect, useState } from 'react';
import { X, MessageSquare, AlertTriangle, Zap, User, Bot, AlertCircle, CheckCircle2, Star, ThumbsUp, ShieldCheck } from 'lucide-react';

interface ConversationModalProps {
  convId: string;
  report: any; // The full report object from the analysis
  onClose: () => void;
}

export default function ConversationModal({ convId, report, onClose }: ConversationModalProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    fetch(`${apiUrl}/api/conversation/${convId}/messages`)
      .then(res => res.json())
      .then(data => {
        if (data.status === "success") {
          setMessages(data.messages);
        }
      })
      .finally(() => setLoading(false));
  }, [convId]);

  const ev = report?.evaluation || {};

  // Determine if this is a satisfied conversation
  const scoreValue = ev.User_Satisfaction_Score ? parseFloat(ev.User_Satisfaction_Score) : null;
  const hasHallucination = ev.Hallucination_Detected === true || ev.Hallucination_Detected === "true";
  const hasFriction = ev.Checkout_Friction_Detected === true || ev.Checkout_Friction_Detected === "true";
  const hasUserProblem = ev.User_Message_Problem && !['none', 'n/a', 'none.', 'none identified'].includes(ev.User_Message_Problem?.toLowerCase());
  const hasAgentProblem = ev.Agent_Message_Problem && !['none', 'n/a', 'none.', 'none identified'].includes(ev.Agent_Message_Problem?.toLowerCase());
  
  const isSatisfied = (
    scoreValue !== null && scoreValue >= 8.5 &&
    !hasHallucination && !hasFriction && !hasUserProblem && !hasAgentProblem && !report?.loop_detected
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-entry">
      <div className="w-full max-w-5xl h-[85vh] bg-[#0A0A0C] border border-white/10 rounded-[2rem] flex flex-col md:flex-row overflow-hidden shadow-2xl">
        
        {/* Left Panel: Dynamically shows "Why Satisfied" OR "Issue Analysis" */}
        <div className={`w-full md:w-1/3 md:h-full flex-none max-h-[50vh] md:max-h-full border-b md:border-b-0 md:border-r border-white/5 p-4 sm:p-6 overflow-y-auto custom-scrollbar flex flex-col gap-4 ${isSatisfied ? 'bg-emerald-950/20' : 'bg-white/[0.02]'}`}>
          <div className="flex justify-between items-center z-10 shrink-0">
            <h3 className={`font-black uppercase tracking-widest text-sm flex items-center gap-2 ${isSatisfied ? 'text-emerald-400' : 'text-white'}`}>
              {isSatisfied
                ? <><CheckCircle2 size={16} className="text-emerald-400" /> Why Satisfied</>
                : <><AlertCircle size={16} className="text-primary" /> Issue Analysis</>
              }
            </h3>
            <button onClick={onClose} className="md:hidden p-2 -mr-2 text-white/50 hover:text-white rounded-full hover:bg-white/5">
              <X size={18} />
            </button>
          </div>

          {isSatisfied ? (
            /* ─── SATISFIED VIEW ─────────────────────────────────── */
            <div className="space-y-4 shrink-0 pb-4">

              {/* Score Hero Badge */}
              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Star size={18} className="text-emerald-400 fill-emerald-400" />
                  <span className="text-3xl font-black text-emerald-400">{scoreValue}/10</span>
                  <Star size={18} className="text-emerald-400 fill-emerald-400" />
                </div>
                <p className="text-[10px] text-emerald-500/80 uppercase tracking-widest font-black">User Satisfaction Score</p>
              </div>

              {/* Why It Worked — Summary */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-emerald-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <ThumbsUp size={14} className="text-emerald-400" />
                  <p className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold">Why This Conversation Worked</p>
                </div>
                <p className="text-xs text-white/80 leading-relaxed">{ev.Summary_Insights || "The conversation went smoothly with no detected issues."}</p>
              </div>

              {/* Positive Signals */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold mb-3">Positive Signals Detected</p>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={12} className="text-emerald-400 shrink-0" />
                    <span className="text-[11px] text-white/70">No hallucination detected by AI</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={12} className="text-emerald-400 shrink-0" />
                    <span className="text-[11px] text-white/70">No checkout friction reported</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={12} className="text-emerald-400 shrink-0" />
                    <span className="text-[11px] text-white/70">User message flow was clean</span>
                  </div>
                  {!report?.dropoff && (
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={12} className="text-emerald-400 shrink-0" />
                      <span className="text-[11px] text-white/70">User did not drop off</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Context */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold mb-3">Conversation Context</p>
                <div className="grid grid-cols-2 gap-y-3 gap-x-2">
                  <div>
                    <p className="text-[8px] text-white/30 uppercase font-black tracking-widest mb-0.5">Sentiment</p>
                    <p className="text-xs text-emerald-400 font-bold">{ev.Sentiment_Shift || "Positive"}</p>
                  </div>
                  <div>
                    <p className="text-[8px] text-white/30 uppercase font-black tracking-widest mb-0.5">Category</p>
                    <p className="text-xs text-white/80 font-medium">{ev.Category || "General"}</p>
                  </div>
                  <div>
                    <p className="text-[8px] text-white/30 uppercase font-black tracking-widest mb-0.5">Inquiry Type</p>
                    <p className="text-xs text-white/80 font-medium">{ev.Primary_Inquiry_Type || "Other"}</p>
                  </div>
                  <div>
                    <p className="text-[8px] text-white/30 uppercase font-black tracking-widest mb-0.5">Product</p>
                    <p className="text-xs text-emerald-400/80 font-bold">{ev.Product_Mentioned || "None"}</p>
                  </div>
                </div>
              </div>

              {/* What made it great */}
              {ev.Agent_Improvement_Rule && !['none', 'n/a'].includes(ev.Agent_Improvement_Rule?.toLowerCase()) && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap size={14} className="text-emerald-400" />
                    <p className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold">Agent Behaviour to Replicate</p>
                  </div>
                  <p className="text-xs text-white/90 italic font-medium">{ev.Agent_Improvement_Rule}</p>
                </div>
              )}
            </div>

          ) : (
            /* ─── ISSUE VIEW (unchanged behaviour) ──────────────── */
            <div className="space-y-4 shrink-0 pb-4">
              {/* Conversation Context Block */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold mb-3">Conversation Context</p>
                <div className="grid grid-cols-2 gap-y-3 gap-x-2">
                  <div>
                     <p className="text-[8px] text-white/30 uppercase font-black tracking-widest mb-0.5">Brand</p>
                     <p className="text-xs text-white/80 font-medium truncate">
                       {report?.widget_id === "680a0a8b70a26f7a0e24eedd" ? "Blue Nectar" : (report?.widget_id || "Unknown")}
                     </p>
                     {report?.widget_id && report.widget_id !== "Unknown" && (
                       <p className="text-[9px] font-mono text-white/30 truncate mt-0.5" title={report.widget_id}>
                         WID: {report.widget_id}
                       </p>
                     )}
                  </div>
                  <div>
                     <p className="text-[8px] text-white/30 uppercase font-black tracking-widest mb-0.5">Category</p>
                     <p className="text-xs text-white/80 font-medium truncate">{ev.Category || "General"}</p>
                  </div>
                  <div>
                     <p className="text-[8px] text-white/30 uppercase font-black tracking-widest mb-0.5">Inquiry Type</p>
                     <p className="text-xs text-white/80 font-medium truncate">{ev.Primary_Inquiry_Type || "Other"}</p>
                  </div>
                  <div>
                     <p className="text-[8px] text-white/30 uppercase font-black tracking-widest mb-0.5">Product</p>
                     <p className="text-xs text-primary/80 font-bold truncate">{ev.Product_Mentioned || "None"}</p>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-2xl glass-card border border-white/5">
                <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold mb-1">Issue Overview</p>
                <p className="text-sm text-white/90 font-medium">{ev.Summary_Insights || "Issue detected in conversation flow."}</p>
                
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="px-2 py-1 text-[9px] font-bold uppercase rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                    Score: {ev.User_Satisfaction_Score}/10
                  </span>
                  {hasHallucination && (
                    <span className="px-2 py-1 text-[9px] font-bold uppercase rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
                      Hallucination
                    </span>
                  )}
                  {hasFriction && (
                    <span className="px-2 py-1 text-[9px] font-bold uppercase rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Checkout Friction
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <User size={14} className="text-blue-400" />
                  <p className="text-[10px] text-blue-400 uppercase tracking-wider font-bold">User Problem</p>
                </div>
                <p className={`text-xs ${(!ev.User_Message_Problem || ev.User_Message_Problem === "None") ? 'text-white/20 italic' : 'text-white/70'}`}>
                  {(!ev.User_Message_Problem || ev.User_Message_Problem === "None") ? "No user friction detected." : ev.User_Message_Problem}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Bot size={14} className="text-purple-400" />
                  <p className="text-[10px] text-purple-400 uppercase tracking-wider font-bold">Agent Problem</p>
                </div>
                <p className={`text-xs ${(!ev.Agent_Message_Problem || ev.Agent_Message_Problem === "None") ? 'text-white/20 italic' : 'text-white/70'}`}>
                   {(!ev.Agent_Message_Problem || ev.Agent_Message_Problem === "None") ? "Flow was accurate and logical." : ev.Agent_Message_Problem}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={14} className="text-primary" />
                  <p className="text-[10px] text-primary uppercase tracking-wider font-bold">Improvement Rule (Fix)</p>
                </div>
                <p className={`text-xs italic font-medium ${(!ev.Agent_Improvement_Rule || ev.Agent_Improvement_Rule === "None") ? 'text-white/40' : 'text-white/90'}`}>
                  {(!ev.Agent_Improvement_Rule || ev.Agent_Improvement_Rule === "None") ? "Maintain current performance standards." : ev.Agent_Improvement_Rule}
                </p>
              </div>

            </div>
          )}
        </div>

        {/* Right Panel: Chat Log */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col relative h-full bg-[#050505]">
          <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#0A0A0C] z-10 hidden md:flex">
             <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-white/40" />
                <span className="text-xs font-mono font-bold text-white/40 uppercase">ID: {convId}</span>
             </div>
             <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
               <X size={16} className="text-white/60" />
             </button>
          </div>
          
          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center animate-pulse gap-3 text-white/30">
                <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                <p className="text-xs font-bold uppercase tracking-widest">Loading Logs</p>
              </div>
            ) : messages.length > 0 ? (
              messages.map((msg, idx) => {
                const isUser = msg.sender === 'user';
                return (
                  <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
                    <div className={`max-w-[85%] sm:max-w-[80%] p-3 rounded-2xl ${
                      msg.messageType === 'event' 
                        ? 'bg-transparent border border-white/10 text-white/40 text-[10px] w-full text-center uppercase tracking-widest' 
                        : isUser 
                          ? 'bg-primary/20 text-white rounded-tr-sm border border-primary/20' 
                          : 'bg-white/5 text-white/90 rounded-tl-sm border border-white/10'
                    }`}>
                      {msg.messageType === 'event' ? (
                        <span>✨ Event: {msg.metadata?.eventType || 'System Event'}</span>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.text?.split("End of stream")[0]}</p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex items-center justify-center text-white/30 text-xs font-bold uppercase tracking-widest">
                No messages found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
