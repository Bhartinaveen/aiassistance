"use client";

import { useMemo } from 'react';

// ── Semantic theme clusters ────────────────────────────────────────────────────
// Each cluster maps detected AI-reported keywords → a human-readable label + severity.
// This ensures "Inflexible return policy" and "Return policy rigidity" both merge
// into the same "Return & Refund Policy" bucket for cleaner reporting.
const THEME_MAP: { keywords: string[]; label: string; category: string; description: string }[] = [
  { keywords: ['hallucin', 'false', 'wrong info', 'incorrect', 'misinform', 'fabricat'], label: 'AI Gave Wrong Information', category: 'Serious Problem', description: 'The AI provided false or hallucinated facts to the customer.' },
  { keywords: ['return polic', 'return policy', 'refund', 'inflexible', 'rigid polic'], label: 'Return & Refund Issues', category: 'Serious Problem', description: 'Customers struggled with return policies or refund processes.' },
  { keywords: ['checkout', 'payment', 'cart', 'purchase', 'transaction', 'billing'], label: 'Payment / Checkout Problem', category: 'Serious Problem', description: 'Customers faced friction during checkout or payment steps.' },
  { keywords: ['pii', 'phone number', 'personal info', 'privacy', 'unnecessary info', 'excessive pii'], label: 'Unnecessary Personal Info Requested', category: 'Privacy Concern', description: 'The AI asked for personal information that was not needed.' },
  { keywords: ['delay', 'slow', 'timeout', 'wait', 'response time', 'no response'], label: 'Slow / No Response', category: 'Privacy Concern', description: 'Customers experienced long waits or no response from the AI.' },
  { keywords: ['loop', 'repeat', 'circular', 'same question', 'keep asking'], label: 'AI Kept Repeating Itself', category: 'Privacy Concern', description: 'The AI got stuck in a loop, asking the same things repeatedly.' },
  { keywords: ['escalat', 'human agent', 'transfer', 'handoff', 'live agent'], label: 'Needed Human Support', category: 'Privacy Concern', description: 'Customer had to be transferred to a human agent.' },
  { keywords: ['out of stock', 'unavailable', 'not in stock', 'stock'], label: 'Product Not Available', category: 'Privacy Concern', description: 'The requested product was out of stock or unavailable.' },
  { keywords: ['context', 'misunderstand', 'off-topic', 'irrelevant', 'generic response'], label: 'AI Misunderstood the Question', category: 'Knowledge Gap', description: 'The AI gave an off-topic or irrelevant response.' },
  { keywords: ['knowledge', 'training', 'knowledge base', 'not trained', 'no information'], label: 'AI Lacked Product Knowledge', category: 'Knowledge Gap', description: 'The AI did not have enough information to answer the customer.' },
  { keywords: ['inconsistenc', 'contradict', 'conflicting'], label: 'AI Gave Conflicting Answers', category: 'Knowledge Gap', description: 'The AI contradicted itself during the conversation.' },
  { keywords: ['script', 'agent script', 'poorly designed', 'protocol design'], label: 'AI Script Needs Improvement', category: 'Knowledge Gap', description: 'The AI conversation flow had design issues that caused confusion.' },
  { keywords: ['order status', 'tracking', 'order inquiry', 'order number'], label: 'Order Status / Tracking', category: 'General Inquiry', description: 'Customer asked about their order or shipping status.' },
  { keywords: ['shipping', 'delivery', 'courier', 'dispatch'], label: 'Shipping & Delivery Questions', category: 'General Inquiry', description: 'Customer had questions about delivery timelines or methods.' },
  { keywords: ['product info', 'product detail', 'ingredient', 'specification'], label: 'Product Detail Questions', category: 'General Inquiry', description: 'Customer needed more details about a product.' },
  { keywords: ['authentication', 'login', 'account', 'verification'], label: 'Account / Login Issues', category: 'General Inquiry', description: 'Customer had issues with logging in or account verification.' },
];

const CATEGORY_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  'Serious Problem': { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)' },
  'Privacy Concern':  { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
  'Knowledge Gap':    { color: '#6366f1', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.25)' },
  'General Inquiry':  { color: '#14b8a6', bg: 'rgba(20,184,166,0.12)', border: 'rgba(20,184,166,0.25)' },
};

export default function FrustrationHeatmap({ data }: { data: any[] }) {
  const frustrationData = useMemo(() => {
    const themeCounts: Record<string, number> = {};

    data.forEach(d => {
      const ev = d.evaluation || {};
      // Scan all AI-reported problem fields for keywords
      const textsToScan = [
        ev.Root_Cause,
        ev.Bottleneck,
        ev.User_Frustration_Point,
        ev.Agent_Message_Problem,
        ev.Agent_Improvement_Rule,
      ]
        .filter(t => t && typeof t === 'string')
        .map(t => t.toLowerCase());

      if (textsToScan.length === 0) return;

      const combined = textsToScan.join(' ');

      // Skip conversations where all fields are empty/none
      const meaningfulText = textsToScan.filter(t => !['none', 'n/a', 'none.', 'none identified'].includes(t.trim()));
      if (meaningfulText.length === 0) return;

      // Match each conversation against theme clusters (counted once per theme per conversation)
      const matchedThisConvo = new Set<string>();
      THEME_MAP.forEach(theme => {
        if (matchedThisConvo.has(theme.label)) return;
        const matched = theme.keywords.some(kw => combined.includes(kw.toLowerCase()));
        if (matched) {
          themeCounts[theme.label] = (themeCounts[theme.label] || 0) + 1;
          matchedThisConvo.add(theme.label);
        }
      });
    });

    // Sort by most frequent, show top 7
    const sorted = Object.entries(themeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7);

    const totalConversationsCount = data.length || 1;

    return sorted.map(([label, count]) => {
      const themeEntry = THEME_MAP.find(t => t.label === label);
      const category = themeEntry?.category ?? 'General Inquiry';
      const description = themeEntry?.description ?? '';
      return {
        label,
        count,
        category,
        description,
        percentage: Math.round((count / totalConversationsCount) * 100),
        style: CATEGORY_STYLES[category] ?? CATEGORY_STYLES['General Inquiry'],
      };
    });
  }, [data]);

  const maxCount = Math.max(...frustrationData.map(d => d.count), 1);
  const totalConversations = data.length;

  return (
    <div className="w-full p-8 glass-premium rounded-[2.5rem] shadow-2xl flex flex-col gap-6 border border-white/5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-white font-black text-sm tracking-[0.2em] uppercase flex items-center gap-3 mb-2">
            <div className="w-1.5 h-5 rounded-full bg-amber-400" />
            Top Customer Problems
          </h3>
          <p className="text-[11px] text-white/40 leading-relaxed max-w-lg">
            These are the most common issues customers ran into during AI chat sessions.
            The bar shows how often each problem appeared across <span className="text-white/70 font-bold">{totalConversations} analyzed conversations</span>.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 bg-black/40 px-4 py-2.5 rounded-2xl border border-white/5 shrink-0">
          {Object.entries(CATEGORY_STYLES).map(([label, s]) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-[9px] text-white/40 font-bold uppercase tracking-wider whitespace-nowrap">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bars */}
      {frustrationData.length > 0 ? (
        <div className="flex flex-col gap-4">
          {frustrationData.map((entry, idx) => {
            const widthPct = Math.round((entry.count / maxCount) * 100);
            return (
              <div key={idx} className="flex items-start gap-3 group">
                {/* Rank Badge */}
                <span
                  className="mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0"
                  style={{ background: entry.style.bg, color: entry.style.color, border: `1px solid ${entry.style.border}` }}
                >
                  {idx + 1}
                </span>

                {/* Label + Bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1 gap-2">
                    <div className="min-w-0">
                      <span className="text-[12px] font-bold text-white/90 block leading-tight">{entry.label}</span>
                      <span className="text-[10px] text-white/25 leading-snug block mt-0.5">{entry.description}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 mt-0.5">
                      <span
                        className="text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider whitespace-nowrap"
                        style={{ background: entry.style.bg, color: entry.style.color, border: `1px solid ${entry.style.border}` }}
                      >
                        {entry.category}
                      </span>
                      <span className="text-[13px] font-black text-white/80 tabular-nums whitespace-nowrap">
                        {entry.percentage}%
                      </span>
                    </div>
                  </div>
                  {/* Animated bar */}
                  <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden mt-2">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${widthPct}%`,
                        background: `linear-gradient(90deg, ${entry.style.color}80, ${entry.style.color})`,
                        boxShadow: `0 0 8px ${entry.style.color}50`,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-32 gap-2 text-center">
          <p className="text-white/20 text-sm font-bold">No recurring issues found</p>
          <p className="text-white/10 text-xs">All analyzed conversations appear to have gone smoothly.</p>
        </div>
      )}
    </div>
  );
}
