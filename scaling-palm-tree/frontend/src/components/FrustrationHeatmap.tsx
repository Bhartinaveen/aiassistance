"use client";

import { useMemo } from 'react';

export default function FrustrationHeatmap({ data }: { data: any[] }) {
  // A simple simulated word cloud mapping for now
  const frustrationKeywords = useMemo(() => [
    { text: 'Refund', weight: 80, color: '#ef4444' },
    { text: 'Wait', weight: 65, color: '#f87171' },
    { text: 'Wrong', weight: 45, color: '#fb923c' },
    { text: 'Agent', weight: 30, color: '#facc15' },
    { text: 'Broken', weight: 25, color: '#a3e635' }
  ], []);

  return (
    <div className="h-72 w-full p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md shadow-xl flex flex-col items-center justify-center">
      <h3 className="text-white/80 font-medium mb-4 text-sm self-start tracking-wide">Frustration Keywords</h3>
      <div className="flex flex-wrap items-center justify-center gap-4">
        {frustrationKeywords.map((word, i) => (
          <span 
            key={i} 
            style={{ 
              fontSize: `${word.weight / 2.5}px`, 
              color: word.color, 
              fontWeight: 600, 
              opacity: word.weight / 100 + 0.5 
            }}
            className="transition-all hover:scale-110 cursor-default"
          >
            {word.text}
          </span>
        ))}
      </div>
      <p className="text-white/40 text-xs mt-auto italic text-center w-full mt-4">Simulated tracking of primary customer drop-off topics.</p>
    </div>
  );
}
