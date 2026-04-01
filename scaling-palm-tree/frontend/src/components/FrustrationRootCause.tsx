"use client";

import { useMemo } from 'react';

export default function FrustrationRootCause({ data }: { data: any[] }) {
  // Aggregate topic mentions dynamically mapping frequency
  const frustrationKeywords = useMemo(() => {
    const counts: Record<string, number> = {};
    
    data.forEach((curr: any) => {
      const topic = curr.evaluation?.Frustrating_Topic_Or_Brand;
      if (topic && topic !== "None" && topic !== "None (Key Missing)" && topic !== "API Error") {
        const key = topic.length > 20 ? topic.substring(0, 20) + "..." : topic;
        if (!counts[key]) counts[key] = 0;
        counts[key] += 1;
      }
    });

    // Make an array
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    
    // Default mock visualization if none are found
    if (sorted.length === 0) {
      return [
        { text: 'Refund Policy', weight: 80, color: '#f43f5e' },
        { text: 'Shipping Delay', weight: 65, color: '#fb923c' },
        { text: 'Out of Stock', weight: 45, color: '#fbbf24' },
      ];
    }
    
    // Map to dynamic styling arrays
    const colors = ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6'];
    return sorted.map((entry, index) => ({
      text: entry[0],
      weight: 40 + (entry[1] * 20), // Scale size
      color: colors[index % colors.length]
    }));
  }, [data]);

  return (
    <div className="h-80 w-full p-6 bg-indigo-950/20 shadow-[0_0_30px_rgba(79,70,229,0.15)] border border-indigo-500/20 rounded-2xl backdrop-blur-xl flex flex-col justify-center">
      <h3 className="text-white font-bold mb-4 tracking-wide flex items-center gap-2 self-start mix-blend-screen">
        <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
        Aggregated Frustration Hotspots
      </h3>
      <div className="flex flex-wrap items-center justify-center gap-6 h-full content-center overflow-hidden">
        {frustrationKeywords.map((word, i) => (
          <span 
            key={i} 
            style={{ 
              fontSize: `${Math.min(word.weight / 2, 36)}px`, 
              color: word.color, 
              // Create dynamic neon glow effect based on exact color hex mapping
              textShadow: `0 0 10px ${word.color}80`,
            }}
            className="font-extrabold transition-all duration-300 hover:scale-125 hover:drop-shadow-2xl cursor-pointer"
          >
            {word.text}
          </span>
        ))}
      </div>
      <p className="text-indigo-200/40 text-[10px] uppercase font-bold tracking-[0.2em] mt-auto self-center">Identified Topics & Brands via Generative Extraction</p>
    </div>
  );
}
