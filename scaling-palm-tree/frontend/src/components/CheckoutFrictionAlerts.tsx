"use client";

import { AlertCircle, Zap, Sparkles, Brain, ShieldAlert, UserX, RotateCcw, TrendingDown } from 'lucide-react';

interface Issue {
  conversation_id: string;
  type: 'hallucination' | 'friction' | 'dropoff' | 'low_score' | 'loop';
  title: string;
  detail: string;
  rule: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

const issueConfig = {
  hallucination: { icon: Brain, color: 'text-red-400', bg: 'bg-red-500', label: 'HALLUCINATION' },
  friction: { icon: ShieldAlert, color: 'text-orange-400', bg: 'bg-orange-500', label: 'CHECKOUT FRICTION' },
  dropoff: { icon: UserX, color: 'text-amber-400', bg: 'bg-amber-500', label: 'USER DROPOUT' },
  low_score: { icon: TrendingDown, color: 'text-rose-400', bg: 'bg-rose-500', label: 'LOW SATISFACTION' },
  loop: { icon: RotateCcw, color: 'text-purple-400', bg: 'bg-purple-500', label: 'LOOP DETECTED' },
};

export default function CheckoutFrictionAlerts({ data }: { data: any[] }) {
  const issues: Issue[] = [];

  data.forEach(d => {
    const ev = d.evaluation || {};
    const convId = d.conversation_id || 'unknown';

    // Hallucination issues
    if (ev.Hallucination_Detected === true || ev.Hallucination_Detected === "true") {
      issues.push({
        conversation_id: convId,
        type: 'hallucination',
        title: 'Hallucination Flagged',
        detail: ev.Hallucination_Reason || 'Unverified claim detected',
        rule: ev.Agent_Improvement_Rule || 'Verify all claims against catalog data',
        severity: (ev.User_Satisfaction_Score < 5) ? 'CRITICAL' : 'HIGH',
      });
    }

    // Checkout friction
    if (ev.Checkout_Friction_Detected === true || ev.Checkout_Friction_Detected === "true") {
      issues.push({
        conversation_id: convId,
        type: 'friction',
        title: ev.User_Frustration_Point || 'Checkout Issue',
        detail: ev.Bottleneck || 'Friction point in checkout flow',
        rule: ev.Agent_Improvement_Rule || 'Optimize checkout handling',
        severity: (ev.User_Satisfaction_Score < 5) ? 'CRITICAL' : 'HIGH',
      });
    }

    // Dropoff detection
    if (d.dropoff === true) {
      issues.push({
        conversation_id: convId,
        type: 'dropoff',
        title: 'User Abandoned Session',
        detail: ev.Bottleneck || ev.Summary_Insights || 'User left without response',
        rule: ev.Agent_Improvement_Rule || 'Improve engagement to reduce dropoffs',
        severity: 'MEDIUM',
      });
    }

    // Low satisfaction
    if (ev.User_Satisfaction_Score && ev.User_Satisfaction_Score <= 4) {
      issues.push({
        conversation_id: convId,
        type: 'low_score',
        title: `Score: ${ev.User_Satisfaction_Score}/10`,
        detail: ev.Summary_Insights || 'Poor user experience detected',
        rule: ev.Root_Cause || 'Investigate conversation quality',
        severity: 'CRITICAL',
      });
    }

    // Loop detection
    if (d.loop_detected === true) {
      issues.push({
        conversation_id: convId,
        type: 'loop',
        title: 'Conversation Loop',
        detail: 'User repeated the same query 3+ times — AI stuck',
        rule: ev.Agent_Improvement_Rule || 'Implement loop-breaking logic',
        severity: 'CRITICAL',
      });
    }
  });

  // Sort: CRITICAL first, then HIGH, then MEDIUM
  const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };
  issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const criticalCount = issues.filter(i => i.severity === 'CRITICAL').length;
  const highCount = issues.filter(i => i.severity === 'HIGH').length;

  return (
    <div className="w-full h-full glass-card rounded-[2.5rem] flex flex-col p-8 overflow-hidden">
      <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-5">
        <div>
          <h3 className="text-white font-black text-xs uppercase tracking-[0.3em] flex items-center gap-3">
             <AlertCircle size={16} className="text-primary" />
             Issues Feed
          </h3>
          <p className="text-[10px] text-white/30 uppercase tracking-widest mt-2 font-bold">
            Real-time Quality Monitor
          </p>
        </div>
        {issues.length > 0 && (
          <div className="flex items-center gap-3">
            {criticalCount > 0 && (
              <div className="flex flex-col items-center">
                <span className="text-[18px] font-black text-red-400 leading-none">{criticalCount}</span>
                <span className="text-[7px] font-black text-red-400/50 uppercase tracking-tighter mt-0.5">Critical</span>
              </div>
            )}
            <div className="flex flex-col items-center">
              <span className="text-[18px] font-black text-primary leading-none">{issues.length}</span>
              <span className="text-[7px] font-black text-white/20 uppercase tracking-tighter mt-0.5">Total</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 -mr-2 custom-scrollbar">
        {issues.length > 0 ? (
          issues.map((p, i) => {
            const config = issueConfig[p.type];
            const IconComp = config.icon;
            return (
              <div key={i} className="group animate-entry" style={{ animationDelay: `${0.05 * (i + 1)}s` }}>
                <div className="relative p-5 rounded-2xl glass border border-white/5 hover:border-primary/20 transition-all duration-500 overflow-hidden">
                  {/* Accent Glow */}
                  <div className={`absolute top-0 right-0 w-20 h-20 blur-[40px] opacity-10 transition-opacity group-hover:opacity-30 ${config.bg}`} />

                  <div className="relative z-10">
                    {/* Header row */}
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <IconComp size={12} className={config.color} />
                        <span className={`text-[8px] font-black tracking-widest uppercase ${config.color}`}>
                          {config.label}
                        </span>
                        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${p.severity === 'CRITICAL' ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]' : p.severity === 'HIGH' ? 'bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.5)]' : 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]'}`} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[7px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full ${p.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' : p.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400' : 'bg-amber-500/20 text-amber-400'}`}>
                          {p.severity}
                        </span>
                        <span className="text-[8px] font-mono text-white/15 font-bold">
                          {p.conversation_id.slice(-6).toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Issue detail */}
                    <p className="text-[11px] text-white/60 leading-relaxed mb-3 line-clamp-3">
                      {p.detail}
                    </p>

                    {/* Improvement rule */}
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 group-hover:bg-white/[0.06] transition-all duration-300">
                      <div className="flex items-center gap-1.5 mb-1">
                         <Zap size={8} className="text-primary" />
                         <span className="text-[7px] font-black text-primary uppercase tracking-[0.15em]">Fix</span>
                      </div>
                      <p className="text-[10px] text-white/40 leading-relaxed italic font-medium line-clamp-2">
                        {p.rule}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center py-20 animate-entry">
            <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center mb-6 border border-primary/10 relative">
               <Sparkles className="text-primary animate-pulse" size={32} />
               <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl opacity-20" />
            </div>
            <p className="text-lg font-black text-white/90 tracking-tight">System Optimal</p>
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 mt-2 font-bold">Zero issues detected in active sessions</p>
          </div>
        )}
      </div>
    </div>
  );
}
