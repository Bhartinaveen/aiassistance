"use client";
import { useState } from 'react';
import { ShieldAlert, Search, Copy, Check, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import ConversationModal from './ConversationModal';
import { getApiUrl } from '@/config';

const PAGE_SIZE = 6;

export default function ProblemConversationsList({ data }: { data: any[] }) {
  const [selectedConv, setSelectedConv] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [onDemandList, setOnDemandList] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'high' | 'medium'>('all');

  const toggleExpand = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setExpandedCards(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCopy = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const combinedData = [...onDemandList, ...data];
  const uniqueData = combinedData.filter(
    (v, i, a) => a.findIndex(t => t.conversation_id === v.conversation_id) === i
  );

  const isFlagged = (item: any) => {
    if (!item.evaluation) return false;
    const e = item.evaluation;
    return (
      e.Hallucination_Detected === true ||
      e.Checkout_Friction_Detected === true ||
      (e.Agent_Message_Problem && e.Agent_Message_Problem !== 'None') ||
      (e.User_Frustration_Point && e.User_Frustration_Point !== 'None')
    );
  };

  // ── Severity Classifier ───────────────────────────────────────────────────
  // Critical: confirmed hallucination OR checkout friction breakdown
  // High:     low score (< 6) OR both agent problem + frustration together
  // Medium:   any single soft signal (just agent problem or just frustration)
  const getSeverity = (item: any): 'critical' | 'high' | 'medium' => {
    if (!item.evaluation) return 'medium';
    const e = item.evaluation;
    const score = parseFloat(e.User_Satisfaction_Score);
    if (e.Hallucination_Detected === true || e.Checkout_Friction_Detected === true) return 'critical';
    const hasAgentProblem = e.Agent_Message_Problem && e.Agent_Message_Problem !== 'None';
    const hasFrustration = e.User_Frustration_Point && e.User_Frustration_Point !== 'None';
    if ((!isNaN(score) && score < 6) || (hasAgentProblem && hasFrustration)) return 'high';
    return 'medium';
  };

  const flaggedData = uniqueData.filter(isFlagged);

  const filteredData = flaggedData.filter(d => {
    const matchesSearch = !searchQuery || d.conversation_id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || getSeverity(d) === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  const criticalCount = flaggedData.filter(d => getSeverity(d) === 'critical').length;
  const highCount = flaggedData.filter(d => getSeverity(d) === 'high').length;
  const mediumCount = flaggedData.filter(d => getSeverity(d) === 'medium').length;

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  const pagedData = filteredData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleAnalyzeOnDemand = async () => {
    if (!searchQuery) return;
    setIsAnalyzing(true);
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/analysis/single/${searchQuery.trim()}`);
      const resData = await res.json();
      if (resData.status === 'success' && resData.data) {
        setOnDemandList(prev => {
          if (prev.find(p => p.conversation_id === resData.data.conversation_id)) return prev;
          return [resData.data, ...prev];
        });
        setSelectedConv(resData.data);
      } else {
        alert('Could not analyze conversation: ' + (resData.message || 'Unknown error'));
      }
    } catch {
      alert('Error reaching the analysis server.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (filteredData.length === 0 && !searchQuery) return null;

  return (
    <>
      <div className="w-full glass-premium rounded-[3rem] p-10 overflow-hidden animate-entry mt-12 border border-white/5">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10 border-b border-white/10 pb-8">
          <div>
            <h3 className="text-white font-black text-lg uppercase tracking-[0.4em] flex items-center gap-4">
              <div className="w-2 h-6 bg-red-500 rounded-full" />
              Flagged Conversations
            </h3>
            <p className="text-[11px] text-white/30 mt-3 font-bold uppercase tracking-widest">
              Displaying problematic sessions that require review
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-5 w-full md:w-auto">
            {/* Search */}
            <div className="relative w-full sm:w-auto overflow-hidden rounded-2xl">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
              <input
                type="text"
                placeholder="SEARCH BY ID..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-6 text-xs font-mono text-white placeholder-white/20 focus:outline-none focus:border-primary/50 focus:bg-white/[0.08] transition-all w-full sm:w-64"
              />
            </div>

            {searchQuery && searchQuery.length > 5 && (
              <button
                onClick={handleAnalyzeOnDemand}
                disabled={isAnalyzing}
                className="px-6 py-3 rounded-2xl bg-primary text-white hover:bg-accent glow-primary text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap self-start sm:self-auto transition-all disabled:opacity-20 flex items-center gap-2"
              >
                {isAnalyzing
                  ? <><span className="w-2 h-2 rounded-full border border-white border-t-transparent animate-spin" /> Analyzing</>
                  : 'Analyze Session'
                }
              </button>
            )}

            <div className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/40 text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap">
              <span className="text-red-400 mr-2">{filteredData.length}</span> Issues Found
            </div>
          </div>
        </div>

        {/* ── Severity Filter Pills ── */}
        <div className="flex flex-wrap items-center gap-2 mb-8">
          <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mr-2">Filter by severity:</span>
          {([
            { key: 'all',      label: 'All Issues',  count: flaggedData.length,  active: 'bg-white/10 text-white border-white/20',      inactive: 'bg-white/5 text-white/30 border-white/5' },
            { key: 'critical', label: '🔴 Critical',  count: criticalCount,       active: 'bg-red-500/20 text-red-400 border-red-500/40',  inactive: 'bg-white/5 text-white/30 border-white/5' },
            { key: 'high',     label: '🟠 High',      count: highCount,           active: 'bg-orange-500/20 text-orange-400 border-orange-500/40', inactive: 'bg-white/5 text-white/30 border-white/5' },
            { key: 'medium',   label: '🟡 Medium',    count: mediumCount,         active: 'bg-amber-500/20 text-amber-400 border-amber-500/40',   inactive: 'bg-white/5 text-white/30 border-white/5' },
          ] as const).map(f => (
            <button
              key={f.key}
              onClick={() => { setSeverityFilter(f.key); setCurrentPage(1); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-[10px] font-black uppercase tracking-[0.15em] transition-all ${
                severityFilter === f.key ? f.active : f.inactive
              }`}
            >
              {f.label}
              <span className={`px-1.5 py-0.5 rounded-lg text-[9px] ${
                severityFilter === f.key ? 'bg-white/20' : 'bg-white/5'
              }`}>{f.count}</span>
            </button>
          ))}
        </div>

        {/* ── Cards Grid (5 per page) ── */}
        {filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <p className="text-white/20 text-sm font-bold uppercase tracking-widest">No flagged conversations match your search</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-6">
            {pagedData.map((item, idx) => {
              const score = parseFloat(item.evaluation?.User_Satisfaction_Score) || 0;
              const explanation =
                item.evaluation?.Hallucination_Detected && item.evaluation?.Hallucination_Reason !== 'None'
                  ? item.evaluation.Hallucination_Reason
                  : item.evaluation?.Agent_Message_Problem && item.evaluation?.Agent_Message_Problem !== 'None'
                  ? item.evaluation.Agent_Message_Problem
                  : item.evaluation?.User_Frustration_Point && item.evaluation?.User_Frustration_Point !== 'None'
                  ? item.evaluation.User_Frustration_Point
                  : 'Session flagged by model algorithms for review.';

              const flagType = item.evaluation?.Hallucination_Detected
                ? { label: 'AI Hallucination / False Info', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' }
                : item.evaluation?.Agent_Message_Problem && item.evaluation?.Agent_Message_Problem !== 'None'
                ? { label: 'Agent Behavior Issue', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' }
                : item.evaluation?.User_Frustration_Point && item.evaluation?.User_Frustration_Point !== 'None'
                ? { label: 'User Frustration Point', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' }
                : item.evaluation?.Checkout_Friction_Detected
                ? { label: 'Checkout Friction', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' }
                : { label: 'Flagged by Model', color: 'text-white/40', bg: 'bg-white/5', border: 'border-white/10' };

              return (
                <div
                  key={item.conversation_id}
                  onClick={() => setSelectedConv(item)}
                  className="group relative flex flex-col p-px rounded-[2.5rem] bg-gradient-to-b from-white/10 to-transparent hover:from-red-500/30 transition-all duration-500 cursor-pointer overflow-hidden animate-in fade-in zoom-in-95"
                  style={{ animationDelay: `${idx * 0.06}s` }}
                >
                  {/* Card inner */}
                  <div className="flex-1 flex flex-col p-6 rounded-[2.4rem] bg-[#0a0a0f] group-hover:bg-[#0c0c14] transition-colors duration-500 relative z-10 overflow-hidden">
                    {/* Glow overlay */}
                    <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.03)_0%,transparent_70%)] group-hover:scale-110 transition-transform duration-700 pointer-events-none" />

                    {/* Header — dot color + label together explain the flag type */}
                    <div className="flex items-center gap-3 mb-5 relative z-10">
                      <div className="relative shrink-0">
                        <div className={`w-2.5 h-2.5 rounded-full animate-ping absolute inset-0 ${
                          flagType.label === 'AI Hallucination / False Info' ? 'bg-red-500' :
                          flagType.label === 'Agent Behavior Issue' ? 'bg-orange-500' :
                          flagType.label === 'User Frustration Point' ? 'bg-amber-500' :
                          flagType.label === 'Checkout Friction' ? 'bg-purple-500' : 'bg-white/30'
                        }`} />
                        <div className={`w-2.5 h-2.5 rounded-full relative z-10 ${
                          flagType.label === 'AI Hallucination / False Info' ? 'bg-red-500' :
                          flagType.label === 'Agent Behavior Issue' ? 'bg-orange-500' :
                          flagType.label === 'User Frustration Point' ? 'bg-amber-500' :
                          flagType.label === 'Checkout Friction' ? 'bg-purple-500' : 'bg-white/30'
                        }`} />
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${flagType.color}`}>
                        {flagType.label}
                      </span>
                    </div>

                    {/* Explanation */}
                    <div className="flex-1 bg-white/[0.03] rounded-2xl p-5 border border-white/5 group-hover:border-red-500/20 group-hover:bg-red-500/[0.02] transition-all duration-500 mb-6 relative z-10">
                      <p
                        className={`text-sm text-white/80 leading-relaxed font-medium group-hover:text-white transition-colors ${
                          expandedCards.has(item.conversation_id) ? '' : 'line-clamp-4'
                        }`}
                      >
                        {explanation}
                      </p>
                      {explanation.length > 180 && (
                        <button
                          onClick={e => toggleExpand(e, item.conversation_id)}
                          className="mt-3 flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.15em] text-primary/70 hover:text-primary transition-colors"
                        >
                          {expandedCards.has(item.conversation_id) ? (
                            <><ChevronUp size={12} /> Read less</>
                          ) : (
                            <><ChevronDown size={12} /> Read more</>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-white/5 relative z-10">
                      {/* Satisfaction bar */}
                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Satisfaction</span>
                        <div className="flex items-center gap-1.5">
                          <div className="h-1 w-12 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-red-500" style={{ width: `${(score / 10) * 100}%` }} />
                          </div>
                          <span className="text-[10px] font-black text-white/60">{score}/10</span>
                        </div>
                      </div>

                      {/* Session ID + Copy */}
                      <div className="flex items-center gap-2 min-w-0 flex-1 ml-4">
                        <div className="flex flex-col items-end gap-1 min-w-0 flex-1">
                          <span className="text-[8px] font-black text-white/20 uppercase tracking-widest leading-none">Session ID</span>
                          <span
                            className="text-[9px] font-mono font-bold text-white/40 group-hover:text-primary transition-colors truncate w-full text-right"
                            title={item.conversation_id}
                          >
                            {item.conversation_id}
                          </span>
                        </div>
                        <button
                          onClick={e => handleCopy(e, item.conversation_id)}
                          className={`p-2.5 rounded-xl transition-all cursor-pointer shrink-0 ${
                            copiedId === item.conversation_id
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-white/5 text-white/20 hover:text-primary hover:bg-primary/10'
                          }`}
                        >
                          {copiedId === item.conversation_id ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (() => {
          // Build a windowed set of page numbers: always show first, last, current±2, with ellipsis gaps
          const delta = 2;
          const range: (number | '...')[] = [];
          const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

          let prev = 0;
          for (const page of pages) {
            const nearCurrent = page >= currentPage - delta && page <= currentPage + delta;
            const isEdge = page === 1 || page === totalPages;
            if (nearCurrent || isEdge) {
              if (prev && page - prev > 1) range.push('...');
              range.push(page);
              prev = page;
            }
          }

          return (
            <div className="mt-10 flex items-center justify-between border-t border-white/10 pt-8 gap-4">
              <span className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-black shrink-0">
                {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredData.length)} / {filteredData.length}
              </span>

              <div className="flex items-center gap-2 overflow-x-auto">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-[10px] font-black text-white/50 uppercase tracking-[0.2em] disabled:opacity-20 disabled:cursor-not-allowed transition-all border border-white/5 shrink-0"
                >
                  <ChevronLeft size={14} /> Prev
                </button>

                <div className="flex items-center gap-1.5">
                  {range.map((item, i) =>
                    item === '...' ? (
                      <span key={`ellipsis-${i}`} className="w-8 text-center text-white/20 text-[10px] font-black">…</span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setCurrentPage(item as number)}
                        className={`w-8 h-8 rounded-xl text-[10px] font-black transition-all shrink-0 ${
                          item === currentPage
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-white/5 text-white/30 hover:bg-white/10 border border-white/5'
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-[10px] font-black text-red-400 uppercase tracking-[0.2em] disabled:opacity-20 disabled:cursor-not-allowed transition-all border border-red-500/20 shrink-0"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          );
        })()}

      </div>

      {selectedConv && (
        <ConversationModal
          convId={selectedConv.conversation_id}
          report={selectedConv}
          onClose={() => setSelectedConv(null)}
        />
      )}
    </>
  );
}
