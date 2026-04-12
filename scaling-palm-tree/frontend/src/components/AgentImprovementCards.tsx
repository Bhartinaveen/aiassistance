"use client";

import { AlertTriangle, MessagesSquare, ThumbsDown } from 'lucide-react';

export default function AgentImprovementCards({ data }: { data: any[] }) {
  // Aggregate improvement points AND Agent frustration markers.
  const improvements = data.flatMap(d => {
    const arr: { tag: string; text: string; id: string }[] = [];
    if (d.evaluation?.Improvement_Suggestions && Array.isArray(d.evaluation.Improvement_Suggestions)) {
      d.evaluation.Improvement_Suggestions.forEach((s: string) => arr.push({ tag: 'Improvement', text: s, id: d.conversation_id }));
    } else if (d.evaluation?.Agent_Improvement_Rule && d.evaluation.Agent_Improvement_Rule !== "None") {
      arr.push({ tag: 'Improvement', text: d.evaluation.Agent_Improvement_Rule, id: d.conversation_id });
    }

    if (d.evaluation?.Agent_Frustration_Points && Array.isArray(d.evaluation.Agent_Frustration_Points)) {
      d.evaluation.Agent_Frustration_Points.forEach((s: string) => arr.push({ tag: 'Agent Friction', text: s, id: d.conversation_id }));
    } else if (d.evaluation?.Agent_Message_Problem && d.evaluation.Agent_Message_Problem !== "None") {
      arr.push({ tag: 'Agent Friction', text: d.evaluation.Agent_Message_Problem, id: d.conversation_id });
    }

    return arr;
  });

  return (
    <div className="h-80 w-full p-6 bg-indigo-950/20 shadow-[0_0_30px_rgba(79,70,229,0.15)] border border-indigo-500/20 rounded-2xl backdrop-blur-xl flex flex-col">
      <h3 className="text-white font-bold mb-4 tracking-wide flex items-center gap-2 shrink-0">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
        Agent Optimization Targets
      </h3>
      
      {improvements.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-indigo-200/50">
          <p className="text-sm">No critical optimizations detected.</p>
        </div>
      ) : (
        <ul className="space-y-4 overflow-y-auto pr-2 custom-scrollbar pb-2">
          {improvements.map((item, i) => (
            <li key={i} className="flex gap-4 items-start bg-indigo-950/50 border border-indigo-400/20 p-4 rounded-xl hover:bg-indigo-900/60 transition-colors group">
              {item.tag === 'Improvement' ? (
                 <MessagesSquare className="text-cyan-400 w-5 h-5 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
              ) : (
                 <ThumbsDown className="text-rose-400 w-5 h-5 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1.5">
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${item.tag === 'Improvement' ? 'bg-cyan-400/10 text-cyan-300' : 'bg-rose-400/10 text-rose-300'}`}>
                    {item.tag}
                  </span>
                  <p className="text-indigo-200/50 text-[10px] font-mono">ID: {item.id.substring(0, 5)}</p>
                </div>
                <p className="text-indigo-100/90 text-xs leading-relaxed">
                  {item.text}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
