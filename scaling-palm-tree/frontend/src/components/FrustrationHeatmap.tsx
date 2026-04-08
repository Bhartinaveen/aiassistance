"use client";

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function FrustrationHeatmap({ data }: { data: any[] }) {
  // Extract real phrases instead of broken single words for better readability
  const frustrationData = useMemo(() => {
    const phraseFreq: Record<string, number> = {};

    data.forEach(d => {
      const ev = d.evaluation || {};
      // Use specific AI-generated root causes and bottlenecks
      const textSources = [
        ev.Root_Cause,
        ev.Bottleneck,
        ev.User_Frustration_Point
      ];

      textSources.forEach(source => {
        if (source && typeof source === 'string' && source.length > 3 && !['none', 'n/a', 'none.', 'none identified'].includes(source.toLowerCase().trim())) {
          // Capitalize and truncate if too long
          let p = source.trim();
          p = p.charAt(0).toUpperCase() + p.slice(1);
          if (p.length > 28) p = p.substring(0, 28) + "...";
          
          phraseFreq[p] = (phraseFreq[p] || 0) + 1;
        }
      });
    });

    // Format for Recharts BarChart
    const sortedRaw = Object.entries(phraseFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6); // Top 6 phrases fit well vertically

    const totalCount = sortedRaw.reduce((sum, [, count]) => sum + count, 0);

    return sortedRaw.map(([text, count]) => ({
      name: text,
      size: count,
      percentage: Math.round((count / (totalCount || 1)) * 100)
    }));
  }, [data]);

  const getColorByPhrase = (phrase: string) => {
    const p = phrase.toLowerCase();
    
    // CRITICAL (Red)
    if (p.includes('fail') || p.includes('error') || p.includes('hallucinat') || p.includes('wrong') || p.includes('policy')) {
      return '#ef4444'; 
    }
    // FRICTION (Yellow)
    if (p.includes('support') || p.includes('logic') || p.includes('frustrat') || p.includes('delay') || p.includes('loop') || p.includes('rigid') || p.includes('timeout')) {
      return '#f59e0b'; 
    }
    // CAPABILITY (Indigo)
    if (p.includes('knowledge') || p.includes('context') || p.includes('generic') || p.includes('understanding') || p.includes('api')) {
      return '#6366f1'; 
    }
    
    return '#14b8a6'; // General (Teal)
  };

  const renderCustomBarLabel = ({ x, y, width, height, index }: any) => {
    const percent = frustrationData[index]?.percentage || 0;
    return (
      <text 
        x={x + width + 8} 
        y={y + height / 2} 
        fill="#ffffff60" 
        textAnchor="start" 
        dominantBaseline="central" 
        fontSize={11} 
        fontWeight="bold"
      >
        {percent}%
      </text>
    );
  };

  return (
    <div className="h-80 w-full p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md shadow-xl flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-white/80 font-medium text-sm tracking-wide uppercase">Top Friction Drivers</h3>
          <p className="text-[10px] text-white/40 mt-0.5 max-w-[400px]">The most common bottlenecks and agent mistakes causing user frustration.</p>
        </div>
        <div className="flex items-center">
           <div className="flex flex-wrap items-center gap-2 bg-black/20 px-2 py-1.5 rounded-lg border border-white/5">
              {[
                { c: '#ef4444', l: 'Critical Error' },
                { c: '#f59e0b', l: 'Friction / Logic' },
                { c: '#6366f1', l: 'Missing Capability' }
              ].map(item => (
                <div key={item.l} className="flex items-center gap-1.5 px-1">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.c }} />
                  <span className="text-[8px] sm:text-[9px] text-white/50 font-black uppercase tracking-widest leading-none">{item.l}</span>
                </div>
              ))}
           </div>
        </div>
      </div>
      
      <div className="flex-1 min-h-[200px]">
        {frustrationData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={frustrationData}
              layout="vertical"
              margin={{ top: 0, right: 40, left: -10, bottom: 0 }}
            >
              <XAxis 
                type="number" 
                hide 
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                axisLine={false} 
                tickLine={false}
                width={130}
                tick={{ fill: '#ffffff80', fontSize: 10, fontWeight: 500 }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                contentStyle={{
                  backgroundColor: '#171717',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                }}
                itemStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                labelStyle={{ display: 'none' }}
                formatter={(value: any, name: any, props: any) => [`${value} Occurrences`, `${props.payload.name}`]}
              />
              <Bar dataKey="size" radius={[0, 4, 4, 0]} barSize={24} label={renderCustomBarLabel}>
                {frustrationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getColorByPhrase(entry.name)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-white/20 text-sm italic">
            No friction patterns identified yet...
          </div>
        )}
      </div>
    </div>
  );
}

/** Extracts meaningful keywords from a sentence, filtering out common stop words */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'need', 'to', 'of', 'in',
    'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through',
    'during', 'before', 'after', 'above', 'below', 'between', 'out',
    'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here',
    'there', 'when', 'where', 'why', 'how', 'all', 'both', 'each',
    'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
    'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and',
    'but', 'or', 'if', 'while', 'because', 'about', 'which', 'that',
    'this', 'these', 'those', 'its', 'it', 'all', 'also', 'any', 'without',
    'agent', 'user', 'ai', 'e-commerce', 'product', 'must', 'regarding',
    'provided', 'marketing', 'data', 'session', 'users', 'potentially',
    'unverified', 'successfully', 'medical', 'claims', 'integration',
    'order', 'health', 'specific', 'failed', 'makes', 'makes', 'lack',
    'loss', 'tracking', 'system', 'herbal', 'weight'
  ]);

  return text
    .replace(/[^a-zA-Z\s-]/g, ' ')
    .split(/\s+/)
    .map(w => w.toLowerCase().trim())
    .filter(w => w.length > 4 && !stopWords.has(w))
    .filter((w, i, arr) => arr.indexOf(w) === i); // dedupe per sentence
}
