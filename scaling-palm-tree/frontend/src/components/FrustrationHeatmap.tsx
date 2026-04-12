"use client";

import { useMemo } from 'react';

export default function FrustrationHeatmap({ data }: { data: any[] }) {
  // Cluster frustration themes by keyword so similar AI phrases group together.
  // Without this, phrases like "Inflexible return policy com..." and "Return Policy Rigidity"
  // would be counted as two separate entries (each 1 occurrence = 17%) instead of
  // clustering into one strong "return policy" bar with higher weight.
  const frustrationData = useMemo(() => {
    const keywordFreq: Record<string, number> = {};

    data.forEach(d => {
      const ev = d.evaluation || {};
      const textSources = [
        ev.Root_Cause,
        ev.Bottleneck,
        ev.User_Frustration_Point,
        ev.Agent_Message_Problem,
      ];

      textSources.forEach(source => {
        if (!source || typeof source !== 'string') return;
        const lower = source.toLowerCase().trim();
        if (['none', 'n/a', 'none.', 'none identified', 'no issue'].includes(lower)) return;

        // Extract meaningful keywords from each phrase and count each keyword
        // This clusters phrases like "Inflexible return policy" and "Return policy rigidity"
        // into the same "return policy" bucket automatically
        const keywords = extractKeywords(source);
        keywords.forEach(kw => {
          keywordFreq[kw] = (keywordFreq[kw] || 0) + 1;
        });
      });
    });

    // Sort by frequency, take top 6 most common themes
    const sortedRaw = Object.entries(keywordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    const totalCount = sortedRaw.reduce((sum, [, count]) => sum + count, 0);

    return sortedRaw.map(([text, count]) => ({
      // Capitalize the keyword for display
      name: text.charAt(0).toUpperCase() + text.slice(1),
      size: count,
      percentage: Math.round((count / (totalCount || 1)) * 100)
    }));
  }, [data]);

  const getTheme = (phrase: string): { color: string; bg: string; border: string; label: string } => {
    const p = phrase.toLowerCase();
    if (p.includes('fail') || p.includes('error') || p.includes('hallucinat') || p.includes('wrong') || p.includes('policy') || p.includes('return')) {
      return { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)', label: 'Critical' };
    }
    if (p.includes('support') || p.includes('frustrat') || p.includes('delay') || p.includes('loop') || p.includes('rigid') || p.includes('timeout') || p.includes('checkout')) {
      return { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', label: 'Friction' };
    }
    if (p.includes('knowledge') || p.includes('context') || p.includes('generic') || p.includes('understanding') || p.includes('api') || p.includes('inconsistent')) {
      return { color: '#6366f1', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.25)', label: 'Gap' };
    }
    return { color: '#14b8a6', bg: 'rgba(20,184,166,0.12)', border: 'rgba(20,184,166,0.25)', label: 'General' };
  };

  const maxCount = Math.max(...frustrationData.map(d => d.size), 1);

  return (
    <div className="w-full p-5 bg-white/[0.03] border border-white/10 rounded-2xl backdrop-blur-md shadow-xl flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="text-white/90 font-black text-sm tracking-[0.2em] uppercase flex items-center gap-2">
            <span className="w-1.5 h-4 rounded-full bg-amber-400 inline-block"></span>
            Top Friction Drivers
          </h3>
          <p className="text-[10px] text-white/40 mt-1">Most common bottlenecks causing user frustration, ranked by frequency</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 bg-black/20 px-3 py-2 rounded-xl border border-white/5">
          {[
            { c: '#ef4444', l: 'Critical' },
            { c: '#f59e0b', l: 'Friction' },
            { c: '#6366f1', l: 'Gap' },
            { c: '#14b8a6', l: 'General' },
          ].map(item => (
            <div key={item.l} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.c }} />
              <span className="text-[9px] text-white/50 font-black uppercase tracking-widest">{item.l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bars */}
      {frustrationData.length > 0 ? (
        <div className="flex flex-col gap-3">
          {frustrationData.map((entry, idx) => {
            const theme = getTheme(entry.name);
            const widthPct = Math.round((entry.size / maxCount) * 100);
            return (
              <div key={idx} className="flex items-center gap-3 group">
                {/* Rank Badge */}
                <span
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0"
                  style={{ background: theme.bg, color: theme.color, border: `1px solid ${theme.border}` }}
                >
                  {idx + 1}
                </span>

                {/* Label + Bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-white/80 truncate">{entry.name}</span>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span
                        className="text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider"
                        style={{ background: theme.bg, color: theme.color, border: `1px solid ${theme.border}` }}
                      >
                        {theme.label}
                      </span>
                      <span className="text-[11px] font-black text-white/60 tabular-nums">{entry.percentage}%</span>
                    </div>
                  </div>
                  {/* Animated gradient bar */}
                  <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${widthPct}%`,
                        background: `linear-gradient(90deg, ${theme.color}99, ${theme.color})`,
                        boxShadow: `0 0 8px ${theme.color}60`,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center justify-center h-32 text-white/20 text-sm italic">
            No friction patterns identified yet...
          </div>
        )}
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
