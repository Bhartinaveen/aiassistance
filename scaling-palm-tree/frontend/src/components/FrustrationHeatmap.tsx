"use client";

import { useMemo } from 'react';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';

export default function FrustrationHeatmap({ data }: { data: any[] }) {
  // Extract real keywords and their frequencies from LLM analysis fields
  const frustrationData = useMemo(() => {
    const wordFreq: Record<string, number> = {};

    data.forEach(d => {
      const ev = d.evaluation || {};
      const textSources = [
        ev.Hallucination_Reason,
        ev.Bottleneck,
        ev.User_Frustration_Point,
        ev.Root_Cause,
        ev.Summary_Insights
      ];

      textSources.forEach(source => {
        if (source && source !== "None") {
          extractKeywords(source).forEach(w => {
            wordFreq[w] = (wordFreq[w] || 0) + 1;
          });
        }
      });
    });

    // Format for Recharts Treemap
    const sorted = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15); // Top 15 keywords

    if (sorted.length === 0) return [];

    return [{
      name: 'Frustration',
      children: sorted.map(([text, count]) => ({
        name: text,
        size: count,
      }))
    }];
  }, [data]);

  const getColorByKeyword = (word: string) => {
    const w = word.toLowerCase();
    
    // CRITICAL: Failures, Errors, Safety, Hallucination
    if (w.includes('fail') || w.includes('error') || w.includes('safety') || 
        w.includes('hallucinat') || w.includes('incorrect') || w.includes('wrong')) {
      return '#ef4444'; // Red-500
    }
    
    // FRICTION: Support, Logic, Interaction, Frustration, Delay
    if (w.includes('support') || w.includes('logic') || w.includes('interaction') || 
        w.includes('frustrat') || w.includes('delay') || w.includes('wait') || w.includes('loop')) {
      return '#f59e0b'; // Amber-500
    }
    
    // MODEL: Price, Context, Generic, Management, Explaining
    if (w.includes('price') || w.includes('context') || w.includes('generic') || 
        w.includes('management') || w.includes('knowledge')) {
      return '#6366f1'; // Indigo-500
    }
    
    // COMPLIANCE: Policy, Disclaimer, Verifying, Health
    if (w.includes('compliance') || w.includes('disclaimer') || w.includes('verify') || 
        w.includes('health') || w.includes('limit') || w.includes('policy')) {
      return '#14b8a6'; // Teal-500
    }
    
    return '#8b5cf6'; // Violet-500 (Default)
  };

  const CustomContent = (props: any) => {
    const { x, y, width, height, index, name } = props;
    const color = getColorByKeyword(name);

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: color,
            stroke: 'rgba(0,0,0,0.4)',
            strokeWidth: 1.5,
            fillOpacity: 0.85,
          }}
          className="hover:fill-opacity-100 transition-all cursor-crosshair"
        />
        {width > 45 && height > 25 && (
          <text
            x={x + width / 2}
            y={y + height / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#fff"
            fontSize={Math.min(width / 7, 13)}
            fontWeight="900"
            style={{ 
              pointerEvents: 'none',
              textShadow: '0 2px 4px rgba(0,0,0,0.5)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            {name}
          </text>
        )}
      </g>
    );
  };

  return (
    <div className="h-72 w-full p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md shadow-xl flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="text-white/80 font-medium text-sm tracking-wide uppercase">Issue Friction Matrix</h3>
          <p className="text-[9px] text-white/20 uppercase tracking-tighter mt-0.5 font-bold">Size = Frequency of Failure</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-lg border border-white/5">
              {[
                { c: '#ef4444', l: 'Critical' },
                { c: '#f59e0b', l: 'Friction' },
                { c: '#6366f1', l: 'Model' },
                { c: '#14b8a6', l: 'Policy' }
              ].map(item => (
                <div key={item.l} className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.c }} />
                  <span className="text-[7px] text-white/40 font-black uppercase tracking-tighter">{item.l}</span>
                </div>
              ))}
           </div>
           <span className="text-[10px] text-white/30 truncate pl-2 uppercase tracking-widest font-black">Neural Lab</span>
        </div>
      </div>
      
      <div className="flex-1 min-h-[180px] mt-2">
        {frustrationData.length > 0 && frustrationData[0].children.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={frustrationData}
              dataKey="size"
              aspectRatio={4 / 3}
              stroke="#000"
              content={<CustomContent />}
            >
              <Tooltip
                contentStyle={{
                  backgroundColor: '#171717',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                }}
                itemStyle={{ color: '#fff', fontSize: '11px' }}
                labelStyle={{ display: 'none' }}
                formatter={(value: any, name: any) => [`${value} Occurrences`, `Issue: ${name}`]}
              />
            </Treemap>
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
