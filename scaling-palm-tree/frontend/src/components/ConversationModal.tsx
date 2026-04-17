"use client";
import { useEffect, useState } from 'react';
import { X, MessageSquare, AlertTriangle, Zap, User, Bot, AlertCircle, CheckCircle2, Star, ThumbsUp, ShieldCheck, Cpu, RefreshCw, Layers, Activity, Wrench, ArrowRight, Eye, Columns } from 'lucide-react';

import { getApiUrl } from '@/config';
import BehaviorHeatmap from './BehaviorHeatmap';

interface ConversationModalProps {
  convId: string;
  report: any; // The full report object from the analysis
  onClose: () => void;
}

export default function ConversationModal({ convId, report, onClose }: ConversationModalProps) {
  const renderMessageText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(<fix>[\s\S]*?<\/fix>)/g);
    return parts.map((part, i) => {
      if (part.startsWith('<fix>') && part.endsWith('</fix>')) {
        const content = part.replace('<fix>', '').replace('</fix>', '');
        return (
          <span key={i} className="relative inline-block px-1.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-100 shadow-[0_0_10px_rgba(16,185,129,0.1)] group/fix">
            <span className="absolute -top-3 left-0 text-[7px] font-black bg-emerald-500 text-black px-1 rounded uppercase tracking-tighter opacity-0 group-hover/fix:opacity-100 transition-opacity">Fixed</span>
            {content}
          </span>
        );
      }
      return part;
    });
  };

  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [variantsData, setVariantsData] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"original" | number>("original");
  const [compareMode, setCompareMode] = useState(false);

  useEffect(() => {
    const apiUrl = getApiUrl();
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

  let clientFriendlyCause = ev.Root_Cause && ev.Root_Cause !== 'None' ? ev.Root_Cause : "Flow Issue Detected";
  const rcLower = clientFriendlyCause.toLowerCase();
  
  if (report?.dropoff) {
     clientFriendlyCause = "User Dropoff / Frustration";
  } else if (hasFriction) {
     clientFriendlyCause = "Checkout Friction Detected";
  } else if (report?.loop_detected) {
     clientFriendlyCause = "Poorly Handled Question";
  } else if (rcLower.includes("product") || rcLower.includes("irrelevant")) {
     clientFriendlyCause = "Irrelevant Product Suggested";
  } else if (rcLower.includes("policy") || rcLower.includes("brand")) {
     clientFriendlyCause = "Brand Policy Violation";
  } else if (rcLower.includes("agent") || rcLower.includes("ai")) {
     clientFriendlyCause = "AI Handling Error";
  } else if (hasHallucination) {
     clientFriendlyCause = "AI Hallucination / False Info";
  }

  const handleGenerateVariants = async () => {
    setVariantsLoading(true);
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/conversation/${convId}/variants`, { method: "POST" });
      const data = await res.json();
      if (data.status === "success") {
        setVariantsData(data.data);
      }
    } catch (err) {
      console.error("Failed to generate variants:", err);
    } finally {
      setVariantsLoading(false);
    }
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const modalContent = (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-xl animate-entry">
      <div className="w-full max-w-[1600px] h-[96vh] glass-premium rounded-[3rem] flex flex-col md:flex-row overflow-hidden shadow-[0_32px_128px_-15px_rgba(0,0,0,1)] border border-white/10">
        
        {/* Left Panel: Neural Analysis Engine */}
        <div className={`w-full md:w-[500px] md:h-full flex-none max-h-[50vh] md:max-h-full border-b md:border-b-0 md:border-r border-white/10 p-8 overflow-y-auto custom-scrollbar flex flex-col gap-6 ${isSatisfied ? 'bg-emerald-500/5' : 'bg-white/[0.01]'}`}>
          <div className="flex justify-between items-center z-10 shrink-0">
            <div className="flex flex-col gap-1">
              <h3 className={`font-black uppercase tracking-[0.3em] text-[11px] flex items-center gap-2 ${isSatisfied ? 'text-emerald-400' : 'text-primary'}`}>
                {isSatisfied
                  ? <><ShieldCheck size={16} className="text-emerald-400" /> Outcome Review</>
                  : <><Zap size={16} className="text-primary" /> Chat Analytics</>
                }
              </h3>
            </div>
            <button onClick={onClose} className="md:hidden p-2 -mr-2 text-white/50 hover:text-white rounded-full hover:bg-white/5">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-6 shrink-0 pb-6">
            {/* Score Visualization */}
            <div className={`p-6 rounded-[2rem] border text-center relative overflow-hidden group ${isSatisfied ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-primary/5 border-primary/20'}`}>
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <span className={`text-4xl font-black ${isSatisfied ? 'text-emerald-400' : 'text-primary'}`}>{scoreValue}/10</span>
                </div>
                <div className="flex justify-center gap-1 mb-2">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} size={10} className={`${i <= (scoreValue || 0)/2 ? (isSatisfied ? 'text-emerald-400 fill-emerald-400' : 'text-primary fill-primary') : 'text-white/10'}`} />
                  ))}
                </div>
                <p className="text-[9px] text-white/30 uppercase tracking-[0.2em] font-black">User Satisfaction</p>
                
                {!isSatisfied && !variantsData && (
                  <button 
                    onClick={handleGenerateVariants}
                    disabled={variantsLoading}
                    className="mt-4 flex items-center justify-center gap-2 w-full py-2 px-4 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 transition-all font-bold text-[10px] tracking-widest uppercase"
                  >
                    {variantsLoading ? <RefreshCw className="animate-spin" size={14} /> : <Layers size={14} />}
                    {variantsLoading ? "Generating Variants..." : "Auto-Generate Better Scenarios"}
                  </button>
                )}

                {variantsData && (
                   <div className="mt-4 pt-4 border-t border-white/10 text-left">
                     <p className="text-[9px] text-white/40 uppercase tracking-[0.2em] font-black mb-3">Score Comparison</p>
                     <div className="space-y-2">
                       <button
                         onClick={() => setViewMode("original")}
                         className={`w-full flex items-center justify-between p-2 rounded-lg border transition-all ${viewMode === "original" ? 'bg-primary/20 border-primary/50 text-white' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'}`}
                       >
                         <span className="text-[10px] font-bold">Original Chat</span>
                         <span className="text-[10px] font-black">{scoreValue}/10</span>
                       </button>
                       {variantsData.variants?.map((v: any, i: number) => (
                         <button
                           key={i}
                           onClick={() => setViewMode(i)}
                           className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all gap-2 ${viewMode === i ? 'bg-emerald-500/20 border-emerald-500/50 text-white' : 'bg-white/5 border-white/10 text-white/50 hover:bg-emerald-500/10 hover:text-emerald-400'}`}
                         >
                           <span className="text-[10px] font-bold text-left flex-1 break-words leading-relaxed">{v.name}</span>
                           <span className="text-[10px] font-black text-emerald-400 shrink-0">{v.evaluation?.User_Satisfaction_Score}/10</span>
                         </button>
                       ))}
                     </div>
                   </div>
                )}
              </div>
            </div>

            {/* Core Insight Area */}
            {viewMode === "original" ? (
             <>
             {/* Core Insight Area */}
             <div className="space-y-4">
               <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5">
                 <div className="flex items-center gap-2 mb-3">
                   <Cpu size={14} className="text-primary" />
                   <p className="text-[10px] text-white/40 uppercase tracking-widest font-black">Session Summary</p>
                 </div>
                 <p className="text-xs text-white/90 leading-relaxed font-medium">
                   {ev.Summary_Insights || "Awaiting neural synthesis..."}
                 </p>
               </div>

               {!isSatisfied && (
                 <div className="p-5 rounded-2xl bg-red-500/5 border border-red-500/10">
                   <div className="flex items-center gap-2 mb-3">
                     <AlertTriangle size={14} className="text-red-400" />
                     <p className="text-[10px] text-red-400 uppercase tracking-widest font-black">Issue Detail</p>
                   </div>
                   <p className="text-xs text-red-200/80 font-bold">{clientFriendlyCause}</p>
                 </div>
               )}

               {/* Multi-layered analysis fields */}
               {[
                 { label: "AI Performance", value: ev.Agent_Message_Problem, color: "text-primary", icon: Bot },
                 { label: "Customer Experience", value: ev.User_Message_Problem, color: "text-blue-400", icon: User },
                 { label: "Suggested Fix", value: ev.Agent_Improvement_Rule, color: "text-emerald-400", icon: Zap, highlight: true },
               ].map((field, i) => (
                 <div key={i} className={`p-5 rounded-2xl border ${field.highlight ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/[0.02] border-white/5'}`}>
                   <div className="flex items-center gap-2 mb-3">
                     <field.icon size={13} className={field.color} />
                     <p className={`text-[9px] uppercase tracking-widest font-black ${field.color}`}>{field.label}</p>
                   </div>
                   <p className={`text-[11px] leading-relaxed ${!field.value || field.value.toLowerCase().includes('none') ? 'text-white/20 italic' : 'text-white/80 font-medium'}`}>
                     {(!field.value || field.value.toLowerCase().includes('none')) ? "No anomalies detected" : field.value}
                   </p>
                 </div>
               ))}
             </div>

             {/* Metadata Matrix */}
             <div className="p-5 rounded-2xl bg-black/40 border border-white/5">
               <p className="text-[9px] text-white/30 uppercase tracking-[0.2em] font-black mb-4">Session Details</p>
               <div className="grid grid-cols-2 gap-4">
                 {[
                   { l: "Category", v: ev.Category || "General" },
                   { l: "Sentiment", v: ev.Sentiment_Shift || "Neutral", c: "text-blue-400" },
                   { l: "Product", v: ev.Product_Mentioned || "None", c: "text-emerald-400" },
                   { l: "Inquiry", v: ev.Primary_Inquiry_Type || "Unclassified" },
                 ].map((meta, i) => (
                   <div key={i}>
                     <p className="text-[8px] text-white/20 uppercase font-black tracking-widest mb-1">{meta.l}</p>
                     <p className={`text-[10px] font-bold truncate ${meta.c || 'text-white/70'}`}>{meta.v}</p>
                   </div>
                 ))}
               </div>
             </div>
             </>
            ) : (
             <>
               {/* Variant Specific Insights: Fixes & Timeline */}
               {(() => {
                 const variant = variantsData.variants[viewMode as number];
                 return (
                   <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                     {variant.fixes && variant.fixes.length > 0 && (
                       <div className="space-y-3">
                         <div className="flex items-center gap-2 mb-4">
                           <Wrench size={16} className="text-emerald-400" />
                           <h4 className="text-[11px] uppercase tracking-[0.2em] font-black text-white/70">Fixes Applied</h4>
                         </div>
                         {variant.fixes.map((fix: any, idx: number) => (
                           <div key={idx} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 relative overflow-hidden">
                             <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500/50 to-emerald-500/50" />
                             
                             <div className="mb-3">
                               <p className="text-[9px] text-white/40 uppercase tracking-widest font-black mb-1 flex items-center gap-2"><AlertTriangle size={10} className="text-red-400" /> Problem</p>
                               <p className="text-[11px] text-white/80 font-medium">{fix.problem_identified}</p>
                             </div>
                             <div className="pt-3 border-t border-white/5">
                               <p className="text-[9px] text-white/40 uppercase tracking-widest font-black mb-1 flex items-center gap-2"><CheckCircle2 size={10} className="text-emerald-400" /> Resolution</p>
                               <p className="text-[11px] text-emerald-100 font-medium">{fix.resolution_in_variant}</p>
                             </div>
                           </div>
                         ))}
                       </div>
                     )}


                      {variant.behavior_timeline && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 pt-2 mb-2">
                            <Activity size={16} className="text-blue-400" />
                            <h4 className="text-[11px] uppercase tracking-[0.2em] font-black text-white/70">Behavior Heatmap</h4>
                          </div>
                          <BehaviorHeatmap
                            originalBehavior={variantsData.original?.behavior || null}
                            variantBehavior={variant.behavior_timeline || null}
                            originalSummary={report.evaluation?.Summary_Insights || variantsData.original?.evaluation?.Summary_Insights}
                            variantSummary={variant.evaluation?.Summary_Insights}
                          />
                        </div>
                      )}
                   </div>
                 );
               })()}
             </>
            )}
          </div>
        </div>

        {/* Right Panel: Intelligence Stream (Chat Log) */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col relative h-full bg-[#030305]">
          <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#050508] z-10 hidden md:flex">
              <div className="flex items-center gap-4">
                <span className="text-xs font-mono font-bold text-white/20 uppercase tracking-[0.2em] underline decoration-white/5 underline-offset-4">CONV_ID: {convId}</span>
                
                {viewMode !== "original" && (
                  <button 
                    onClick={() => setCompareMode(!compareMode)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                      compareMode 
                        ? 'bg-primary/20 border-primary/40 text-primary shadow-[0_0_15px_rgba(139,92,246,0.3)]' 
                        : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'
                    }`}
                  >
                    {compareMode ? <Columns size={12} /> : <Eye size={12} />}
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {compareMode ? 'Split View' : 'Compare Chat'}
                    </span>
                  </button>
                )}
              </div>
              <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-white/5 transition-all group">
                <X size={20} className="text-white/30 group-hover:text-white group-hover:rotate-90 transition-all" />
              </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 md:px-10 pb-10 space-y-6 custom-scrollbar bg-[radial-gradient(circle_at_top_right,_#ffffff02,_transparent)]">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 rounded-full border-2 border-primary/10 border-t-primary animate-spin shadow-[0_0_20px_rgba(139,92,246,0.3)]" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">Loading Transcript</p>
              </div>
            ) : viewMode === "original" ? (
              messages.length > 0 ? (
                messages.map((msg, idx) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`} style={{ animationDelay: `${idx * 0.03}s` }}>
                      <div className={`max-w-[85%] sm:max-w-[75%] p-5 rounded-[2rem] shadow-2xl relative ${
                        msg.messageType === 'event' 
                          ? 'bg-transparent border border-white/10 text-white/30 text-[9px] w-full text-center uppercase tracking-[0.3em] py-2 rounded-xl my-4' 
                          : isUser 
                            ? 'bg-white/[0.08] text-white rounded-tr-none border border-white/10' 
                            : 'bg-primary/10 text-white/90 rounded-tl-none border border-primary/20 backdrop-blur-md'
                      }`}>
                        {msg.messageType === 'event' ? (
                          <span>
                            <Cpu size={10} className="inline mr-2 opacity-50" /> 
                            {msg.metadata?.eventType === 'product_click' 
                              ? `USER CLICKED PRODUCT: ${msg.metadata?.productName || 'Unknown Product'}` 
                              : msg.metadata?.eventType === 'product_view'
                              ? `USER VIEWED PRODUCT: ${msg.metadata?.productName || 'Unknown Product'}`
                              : `SYSTEM ACTION: ${(msg.metadata?.eventType || 'Processing').replace(/_/g, ' ')}`
                            }
                          </span>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <div className={`flex items-center gap-2 mb-1 opacity-40 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                              {isUser ? <User size={10} /> : <Bot size={10} />}
                              <span className="text-[8px] font-black uppercase tracking-widest">{isUser ? 'Customer' : 'AI Assistant'}</span>
                            </div>
                            <p className="text-[13px] sm:text-sm whitespace-pre-wrap break-words leading-relaxed font-medium">
                              {msg.text?.split("End of stream")[0]}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex items-center justify-center text-white/30 text-xs font-bold uppercase tracking-widest">
                  No messages found.
                </div>
              )
            ) : compareMode ? (
              /* Split Comparison View */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
                {/* Left Column: Original */}
                <div className="space-y-6 border-r border-white/5 pr-4 pt-10">
                  <div className="flex items-center gap-2 mb-6 md:sticky md:top-0 py-4 bg-[#030305] z-30 border-b border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                    <AlertCircle size={12} className="text-white/30" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Original Conversation</span>
                  </div>
                  {messages.map((msg, idx) => {
                    if (msg.messageType === 'event') return null;
                    const isUser = msg.sender === 'user';
                    return (
                      <div key={`orig-${idx}`} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                        <div className={`p-4 rounded-2xl border ${isUser ? 'bg-white/5 border-white/5' : 'bg-white/[0.02] border-white/5 opacity-60'} max-w-[90%]`}>
                          <p className="text-[11px] leading-relaxed text-white/60 break-words whitespace-pre-wrap">{msg.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right Column: Variant */}
                <div className="space-y-6 pt-10">
                  <div className="flex items-center gap-2 mb-6 md:sticky md:top-0 py-4 bg-[#030305] z-30 border-b border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                    <Zap size={12} className="text-emerald-400" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Improved Version</span>
                  </div>
                  {(variantsData.variants?.[viewMode as number]?.transcript || "").split(/\r?\n/).reduce((acc: any[], line: string) => {
                    if (!line.trim() || !line.includes(':')) return acc;
                    const [sender, ...textParts] = line.split(':');
                    const text = textParts.join(':').trim();
                    const isUser = /user|customer/i.test(sender);
                    acc.push({ sender: sender.toLowerCase(), text, isUser });
                    return acc;
                  }, []).map((msg: any, idx: number) => (
                    <div key={`var-${idx}`} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
                       <div className={`p-4 rounded-2xl border ${msg.isUser ? 'bg-white/5 border-white/5' : 'bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]'} max-w-[90%]`}>
                          <p className="text-[11px] leading-relaxed text-white/90 break-words whitespace-pre-wrap">
                            {renderMessageText(msg.text)}
                          </p>
                        </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Single Variant View Mode */
              (variantsData.variants?.[viewMode as number]?.transcript || "").split(/\r?\n/).reduce((acc: any[], line: string) => {
                 if (!line.trim() || !line.includes(':')) return acc;
                 const [sender, ...textParts] = line.split(':');
                 const text = textParts.join(':').trim();
                 acc.push({ sender: sender.toLowerCase(), text });
                 return acc;
              }, []).map((msg: any, idx: number) => {
                 const isUser = /user|customer/i.test(msg.sender);
                 return (
                   <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                     <div className={`max-w-[85%] sm:max-w-[75%] p-5 rounded-[2rem] shadow-2xl relative ${
                       isUser ? 'bg-white/[0.08] text-white rounded-tr-none border border-white/10' : 'bg-emerald-500/10 text-white border border-emerald-500/20 backdrop-blur-md'
                     }`}>
                       <div className="flex flex-col gap-2">
                         <div className={`flex items-center gap-2 mb-1 opacity-40 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                           {isUser ? <User size={10} /> : <Bot size={10} />}
                           <span className="text-[8px] font-black uppercase tracking-widest">{isUser ? 'Customer' : 'AI Assistant (Improved)'}</span>
                         </div>
                         <p className="text-[13px] sm:text-sm whitespace-pre-wrap break-words leading-relaxed font-medium">
                           {renderMessageText(msg.text)}
                         </p>
                       </div>
                     </div>
                   </div>
                 );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;
  const { createPortal } = require('react-dom');
  return createPortal(modalContent, document.body);
}
