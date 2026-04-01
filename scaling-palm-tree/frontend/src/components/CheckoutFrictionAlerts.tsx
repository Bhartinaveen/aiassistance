"use client";

import { AlertCircle, User, Zap, Sparkles } from 'lucide-react';

export default function CheckoutFrictionAlerts({ data }: { data: any[] }) {
  // Aggregate friction points detected by the LLM
  const frictionPoints: Array<{ conversation_id: string; friction: string, rule: string, severity: string }> = [];
  
  data.forEach(d => {
    if (d.evaluation?.Checkout_Friction_Detected === true || d.evaluation?.Checkout_Friction_Detected === "true") {
      frictionPoints.push({
        conversation_id: d.conversation_id,
        friction: d.evaluation?.User_Frustration_Point || "Potential checkout issue",
        rule: d.evaluation?.Agent_Improvement_Rule || "Analyze for better handling",
        severity: (d.evaluation?.User_Satisfaction_Score < 5) ? "CRITICAL" : "HIGH"
      });
    }
  });

  return (
    <div className="w-full h-full glass-card rounded-[2.5rem] flex flex-col p-8 overflow-hidden">
      <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
        <div>
          <h3 className="text-white font-black text-xs uppercase tracking-[0.3em] flex items-center gap-3">
             <AlertCircle size={16} className="text-primary" />
             Checkout Friction Feed
          </h3>
          <p className="text-[10px] text-white/30 uppercase tracking-widest mt-2 font-bold">Real-time Conversion Watch</p>
        </div>
        {frictionPoints.length > 0 && (
          <div className="flex flex-col items-end">
            <span className="text-[20px] font-black text-primary leading-none">{frictionPoints.length}</span>
            <span className="text-[8px] font-black text-white/20 uppercase tracking-tighter mt-1">Active Blocks</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 pr-2 -mr-2">
        {frictionPoints.length > 0 ? (
          frictionPoints.map((p, i) => (
            <div key={i} className="group animate-entry" style={{ animationDelay: `${0.1 * (i + 1)}s` }}>
              <div className="relative p-6 rounded-3xl glass border border-white/5 hover:border-primary/20 transition-all duration-500 overflow-hidden">
                {/* Accent Glow */}
                <div className={`absolute top-0 right-0 w-24 h-24 blur-[40px] opacity-10 transition-opacity group-hover:opacity-30 ${p.severity === 'CRITICAL' ? 'bg-red-500' : 'bg-orange-500'}`} />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full animate-pulse ${p.severity === 'CRITICAL' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]'}`} />
                      <span className={`text-[9px] font-black tracking-widest uppercase ${p.severity === 'CRITICAL' ? 'text-red-400' : 'text-orange-400'}`}>
                        {p.severity} INTENSITY
                      </span>
                    </div>
                    <span className="text-[9px] font-mono text-white/20 font-bold">NODE://{p.conversation_id.slice(-6).toUpperCase()}</span>
                  </div>

                  <h4 className="text-white font-black text-base leading-tight mb-4 group-hover:text-primary transition-colors duration-300">
                    "{p.friction}"
                  </h4>

                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 group-hover:bg-white/[0.08] transition-all duration-300">
                    <div className="flex items-center gap-2 mb-2">
                       <Zap size={10} className="text-primary" />
                       <span className="text-[8px] font-black text-primary uppercase tracking-[0.2em]">Improvement Logic</span>
                    </div>
                    <p className="text-xs text-white/50 leading-relaxed italic font-medium">
                      {p.rule}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center py-20 animate-entry">
            <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center mb-6 border border-primary/10 relative">
               <Sparkles className="text-primary animate-pulse" size={32} />
               <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl opacity-20" />
            </div>
            <p className="text-lg font-black text-white/90 tracking-tight">System Optimal</p>
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 mt-2 font-bold">Zero Friction detected in active sessions</p>
          </div>
        )}
      </div>
    </div>
  );
}
