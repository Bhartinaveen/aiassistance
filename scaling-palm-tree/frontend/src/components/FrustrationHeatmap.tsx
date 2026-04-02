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

  const COLORS = ['#ef4444', '#f87171', '#fb923c', '#facc15', '#a78bfa', '#818cf8', '#34d399', '#2dd4bf', '#38bdf8', '#6366f1'];

  const CustomContent = (props: any) => {
    const { x, y, width, height, index, name } = props;

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: COLORS[index % COLORS.length],
            stroke: 'rgba(0,0,0,0.2)',
            strokeWidth: 2,
            fillOpacity: 0.8,
          }}
          className="hover:fill-opacity-100 transition-all cursor-crosshair"
        />
        {width > 40 && height > 20 && (
          <text
            x={x + width / 2}
            y={y + height / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#fff"
            fontSize={Math.min(width / 6, 14)}
            fontWeight="bold"
            style={{ pointerEvents: 'none' }}
          >
            {name}
          </text>
        )}
      </g>
    );
  };

  return (
    <div className="h-72 w-full p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md shadow-xl flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white/80 font-medium text-sm tracking-wide">Issue Density Heatmap</h3>
        <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Top 15 Micro-Issues</span>
      </div>
      
      <div className="flex-1 min-h-[180px]">
        {frustrationData.length > 0 && frustrationData[0].children.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={frustrationData}
              dataKey="size"
              aspectRatio={4 / 3}
              stroke="#fff"
              content={<CustomContent />}
            >
              <Tooltip
                contentStyle={{
                  backgroundColor: '#171717',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                }}
                itemStyle={{ color: '#fff', fontSize: '12px' }}
                formatter={(value: number) => [`${value} Occurrences`, 'Frequency']}
              />
            </Treemap>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-white/20 text-sm italic">
            No frustration patterns identified yet...
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
    'this', 'these', 'those', 'its', 'it', 'also', 'any', 'without',
    'agent', 'user', 'ai', 'e-commerce', 'product', 'must', 'regarding',
    'provided', 'marketing', 'data', 'session', 'users', 'potentially',
    'unverified', 'successfully'
  ]);

  return text
    .replace(/[^a-zA-Z\s-]/g, ' ')
    .split(/\s+/)
    .map(w => w.toLowerCase().trim())
    .filter(w => w.length > 3 && !stopWords.has(w))
    .filter((w, i, arr) => arr.indexOf(w) === i); // dedupe per sentence
}
