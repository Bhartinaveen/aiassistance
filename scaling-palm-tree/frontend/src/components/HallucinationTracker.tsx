"use client";

import { AlertTriangle } from 'lucide-react';

export default function HallucinationTracker({ data }: { data: any[] }) {
  const hallucinations = data.filter(d => {
    const val = d.evaluation?.Hallucination_Detected;
    return val === true || val === "true" || val === "True";
  });

  return (
    <div className="h-72 w-full p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md shadow-xl overflow-hidden flex flex-col">
      <h3 className="text-white/80 font-medium mb-4 text-sm tracking-wide">Hallucination Flags</h3>
      
      {hallucinations.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-white/40">
          <p className="text-sm">No hallucinations detected.</p>
        </div>
      ) : (
        <ul className="space-y-3 overflow-y-auto pr-2 custom-scrollbar">
          {hallucinations.map((h, i) => (
            <li key={i} className="flex gap-3 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
              <AlertTriangle className="text-red-400 w-5 h-5 shrink-0" />
              <div>
                <p className="text-red-200 text-xs font-semibold mb-1">Conv_ID: {h.conversation_id.substring(0, 8)}</p>
                <p className="text-white/70 text-xs line-clamp-2">
                  {h.evaluation?.Hallucination_Reason || "Reported features or price outside catalog data."}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
