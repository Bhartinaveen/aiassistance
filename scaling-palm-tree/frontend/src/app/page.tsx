"use client";
import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Zap, ShoppingBag, TrendingUp, Cpu, Info } from "lucide-react";

import InquiryIntentChart from '@/components/InquiryIntentChart';
import ProductInterestCloud from '@/components/ProductInterestCloud';
import FrustrationHeatmap from '@/components/FrustrationHeatmap';
import ModelWeaknessRadar from '@/components/ModelWeaknessRadar';
import ChatInterface from '@/components/ChatInterface';
import ProblemConversationsList from '@/components/ProblemConversationsList';

export default function Home() {
  const [allData, setAllData] = useState<any[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState<string>("All Brands");
  const [limitInput, setLimitInput] = useState<number>(20);
  // isClearing tracks when the user triggered a Force Re-scan (cache wipe)
  const [isClearing, setIsClearing] = useState(false);
  // isStopping tracks when the user has pressed the Stop button
  const [isStopping, setIsStopping] = useState(false);
   // progress holds the real-time analysis state polled from the backend
  const [progress, setProgress] = useState<{ running: boolean; total: number; done: number; stopped: boolean; skipped_ids?: string[] } | null>(null);
  const [skippedIds, setSkippedIds] = useState<string[]>([]);

  // 💡 TO ANALYZE CUSTOM DATA LIMITS: This function grabs the user's preference and feeds it to the Backend
  const fetchAnalysisData = (targetLimit: number) => {
    setLoading(true);
    setIsStopping(false);
    setProgress(null);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    
    // 📡 Start polling /api/analysis/progress every 1 second for real-time counter
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`${apiUrl}/api/analysis/progress`);
        const d = await res.json();
        if (d.status === "success") {
          setProgress(d.progress);
          if (d.progress.skipped_ids) setSkippedIds(d.progress.skipped_ids);
          // Stop polling once the backend signals it is no longer running
          if (!d.progress.running) clearInterval(pollInterval);
        }
      } catch { clearInterval(pollInterval); }
    }, 1000);
    
    // Calls the dynamic API parameter feature built in the backend
    fetch(`${apiUrl}/api/analysis/run?limit=${targetLimit}`)
      .then(res => res.json())
      .then(resData => {
        if (resData.status === "success") {
          setAllData(resData.data);
          setData(resData.data);
          if (resData.skipped_ids) setSkippedIds(resData.skipped_ids);
        }
      })
      .catch((e) => {
        console.warn("Backend unavailable", e);
      })
      .finally(() => { setLoading(false); clearInterval(pollInterval); setProgress(null); });
  };

  // 🛑 STOP ANALYSIS: Sends a stop signal to the backend to halt the current run
  const stopAnalysis = () => {
    setIsStopping(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    // POST to /api/analysis/stop — the backend sets _stop_flag=True
    // The analysis loop checks this flag on each iteration and breaks immediately
    fetch(`${apiUrl}/api/analysis/stop`, { method: "POST" })
      .catch(() => {});
  };

  // 🖥️ FORCE RE-SCAN: Clears ALL cached analysis from MongoDB and re-runs fresh AI analysis.
  // ⚠️  USE WITH CAUTION: This will consume Gemini API tokens for every conversation.
  // Only use when you want completely fresh results (e.g., after your data source has updated).
  const forceRescan = () => {
    if (!confirm(`⚠️ Force Re-scan will CLEAR all ${limitInput || 'all'} cached analyses and re-run fresh AI analysis.\n\nThis uses Gemini API tokens for every conversation.\n\nAre you sure?`)) return;
    setIsClearing(true);
    setLoading(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    
    // Calls DELETE /api/analysis/clear-cache which: (1) wipes MongoDB cache, (2) re-runs fresh Gemini analysis
    fetch(`${apiUrl}/api/analysis/clear-cache?limit=${limitInput}`, { method: "DELETE" })
      .then(res => res.json())
      .then(resData => {
        if (resData.status === "success") {
          setAllData(resData.data);
          setData(resData.data);
        }
      })
      .catch((e) => console.warn("Force re-scan failed", e))
      .finally(() => { setIsClearing(false); setLoading(false); });
  };

  useEffect(() => {
    // Initial load keeps the 20 lock token-saver
    fetchAnalysisData(limitInput);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedBrand === "All Brands") {
      setData(allData);
    } else {
      setData(allData.filter(d => (d.widget_id === selectedBrand || d.widgetId === selectedBrand)));
    }
  }, [selectedBrand, allData]);

  const brands = Array.from(new Set(allData.map(d => d.widget_id || d.widgetId))).filter(Boolean);

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Abstract Background Elements */}
      <div className="fixed inset-0 -z-10 bg-[#020203]">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      <div className="max-w-[1600px] mx-auto px-6 lg:px-12 py-8">
        {/* Navigation / Header */}
        <nav className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 animate-entry">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-primary/20 border border-primary/30 glow-primary">
              <Cpu className="text-primary" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Nvn..B <span className="text-primary font-light text-sm tracking-[0.3em] ml-2 opacity-50 uppercase">OS</span>
              </h1>
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">AI Behavior Engine</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-start md:justify-end gap-3 w-full md:w-auto">
            {/* 💡 Feature: Premium Interactive UI for Analysis Length */}
            <div className="flex items-center flex-wrap sm:flex-nowrap gap-1 p-1 rounded-2xl glass border border-primary/20 bg-black/40 backdrop-blur-md shadow-[0_0_15px_rgba(139,92,246,0.1)] w-full sm:w-auto justify-center sm:justify-start">
              <div className="flex items-center pl-4 pr-2">
                <span className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em]">Volume</span>
                <input 
                  type="number"
                  min="1"
                  value={limitInput === 0 ? "" : limitInput}
                  onChange={(e) => setLimitInput(Number(e.target.value) || 0)}
                  placeholder="∞"
                  className="bg-transparent text-lg font-black text-primary outline-none w-14 text-center border-none p-0 focus:ring-0 placeholder:text-primary/40 ml-2"
                />
              </div>

              <div className="hidden sm:block w-px h-6 bg-white/10 mx-1"></div>

              <button
                onClick={() => fetchAnalysisData(limitInput)}
                className="px-4 py-2 flex-grow sm:flex-grow-0 rounded-xl bg-primary/20 text-primary text-[10px] font-black tracking-[0.2em] uppercase hover:bg-primary hover:text-black transition-all duration-300"
              >
                Scan
              </button>

              <button
                onClick={() => {
                  setLimitInput(0);
                  fetchAnalysisData(0);
                }}
                className="px-4 py-2 flex-grow sm:flex-grow-0 rounded-xl bg-white/5 text-white/70 text-[10px] font-black tracking-[0.2em] uppercase hover:bg-white/20 hover:text-white transition-all duration-300 border border-white/5"
              >
                Scan All
              </button>

              {/* ─── Force Re-scan (Clear Cache) Button ─────────────────
                  USE THIS WHEN: You want fresh AI results and don't mind
                  consuming API tokens. Wipes MongoDB cache first, then
                  re-analyzes all conversations up to the current limit.
              ─────────────────────────────────────────────────────────── */}
              <div className="hidden sm:block w-px h-6 bg-white/10 mx-1"></div>
              <button
                onClick={forceRescan}
                disabled={isClearing}
                title="⚠️ Clears cache and re-analyzes fresh. Uses API tokens."
                className="px-4 py-2 mt-2 sm:mt-0 w-full sm:w-auto flex-grow sm:flex-grow-0 rounded-xl bg-red-900/20 text-red-400 text-[10px] font-black tracking-[0.2em] uppercase hover:bg-red-500/30 hover:text-red-300 transition-all duration-300 border border-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed justify-center items-center gap-1.5 flex"
              >
                {isClearing ? (
                  <><span className="w-2.5 h-2.5 rounded-full border border-red-400 border-t-transparent animate-spin inline-block"></span> Clearing...</>
                ) : (
                  <>🖥️ Re-scan</>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl glass border border-white/5">
              <span className="text-[10px] font-black text-white/30 uppercase tracking-tighter">Active Brand</span>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="bg-transparent text-sm font-bold text-primary outline-none cursor-pointer border-none p-0 focus:ring-0"
              >
                <option className="bg-[#020203]" value="All Brands">All Brands</option>
                {brands.map(b => {
                  const brandName = b === "680a0a8b70a26f7a0e24eedd" ? "Blue Nectar" : (b as string).slice(-8).toUpperCase();
                  return <option className="bg-[#020203]" key={b as string} value={b as string}>{brandName}</option>
                })}
              </select>
            </div>

            {/* Live Feed counter — shows real-time progress during a run */}
            <div className="px-4 py-2.5 rounded-2xl glass border border-white/5 flex flex-col items-center min-w-[60px]">
              <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] leading-none mb-1">
                {progress?.running ? "Analyzing" : "Live Feed"}
              </span>
              <span className="text-sm font-mono font-bold text-white/90 leading-none">
                {progress?.running
                  ? `${progress.done}/${progress.total}`
                  : data.length || "0"
                }
              </span>
            </div>

            {/* 🛑 Stop button — only visible while analysis is running */}
            {(loading && !isClearing) && (
              <button
                onClick={stopAnalysis}
                disabled={isStopping}
                title="Stop analysis and show results so far"
                className="px-4 py-2.5 rounded-2xl bg-red-500/20 text-red-400 text-[10px] font-black tracking-[0.2em] uppercase border border-red-500/20 hover:bg-red-500/40 hover:text-red-200 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isStopping
                  ? <><span className="w-2 h-2 rounded-full bg-red-400 inline-block animate-pulse"></span> Stopping...</>
                  : <>⏹️ Stop</>
                }
              </button>
            )}
          </div>
        </nav>

        {loading ? (
          <div className="flex flex-col h-[60vh] items-center justify-center gap-6 glass rounded-[2.5rem] border-dashed border-white/5 animate-pulse">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" size={20} />
            </div>
            <div className="text-center">
              <p className="text-white font-bold tracking-widest uppercase text-xs">Synchronizing Neural Data</p>
              <p className="text-white/20 text-[10px] mt-2">Connecting to decentralized analysis nodes...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8 pb-32">
            {/* Top Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-entry" style={{ animationDelay: '0.1s' }}>
              {(() => {
                const total = data.length || 1;
                const avgScore = data.length > 0
                  ? (data.reduce((sum, d) => sum + (d.evaluation?.User_Satisfaction_Score || 0), 0) / total).toFixed(1)
                  : "0";
                const hallucinationRate = data.length > 0
                  ? ((data.filter(d => d.evaluation?.Hallucination_Detected === true).length / total) * 100).toFixed(1)
                  : "0";
                const dropoffRate = data.length > 0
                  ? ((data.filter(d => d.dropoff === true).length / total) * 100).toFixed(1)
                  : "0";

                return [
                  { label: "Avg User Satisfaction", value: `${avgScore}/10`, icon: Zap, color: "text-yellow-400" },
                  { label: "Agent Hallucination Rate", value: `${hallucinationRate}%`, icon: AlertTriangle, color: "text-red-400" },
                  { label: "User Dropout Rate", value: `${dropoffRate}%`, icon: Activity, color: "text-orange-400" },
                  { label: "Total Conversations", value: `${data.length}`, icon: Info, color: "text-blue-400" },
                ].map((stat, i) => (
                  <div key={i} className="p-4 rounded-3xl glass-card flex items-center justify-between group hover:border-primary/30 transition-all cursor-default">
                    <div>
                      <span className="text-[9px] font-black text-white/20 uppercase tracking-widest block mb-1">{stat.label}</span>
                      <span className="text-xl font-black text-white/90">{stat.value}</span>
                    </div>
                    <stat.icon size={20} className={`${stat.color} opacity-40 group-hover:opacity-100 transition-opacity`} />
                  </div>
                ));
              })()}
            </div>

            {/* Main Visualizations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="glass-card rounded-[2.5rem] p-1 animate-entry" style={{ animationDelay: '0.2s' }}>
                <div className="p-6 pb-0">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
                    <TrendingUp size={14} className="text-primary" /> Behavioral Intent Map
                  </h3>
                </div>
                <div className="h-[400px]">
                  <InquiryIntentChart data={data} />
                </div>
              </div>
              <div className="glass-card rounded-[2.5rem] p-1 animate-entry" style={{ animationDelay: '0.3s' }}>
                <div className="p-6 pb-0">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
                    <AlertTriangle size={14} className="text-red-400" /> Agent Capability Profile
                  </h3>
                </div>
                <div className="h-[400px]">
                  <ModelWeaknessRadar data={data} />
                </div>
              </div>

              {/* Product Interest - Spanning 2 columns */}
              <div className="md:col-span-2 glass-card rounded-[2.5rem] p-1 animate-entry" style={{ animationDelay: '0.4s' }}>
                <div className="p-6 pb-0">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
                    <ShoppingBag size={14} className="text-green-400" /> Product Interest Cloud
                  </h3>
                </div>
                <div className="h-[400px]">
                  <ProductInterestCloud data={data} />
                </div>
              </div>
            </div>

            {/* Error Tracking Section */}
            <div className="grid grid-cols-1 gap-8 animate-entry" style={{ animationDelay: '0.6s' }}>
              <div className="glass-card rounded-[2.5rem] p-8 overflow-hidden">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/30 mb-6 flex items-center gap-2">
                  <Zap size={14} className="text-yellow-400" /> Frustration Heatmap
                </h3>
                <FrustrationHeatmap data={data} />
              </div>
            </div>

            {/* Problematic Conversations Tracker */}
            <div className="animate-entry" style={{ animationDelay: '0.7s' }}>
              <ProblemConversationsList data={data} />
            </div>

            {/* skippedIds Audit Section - Positioned just above the footer */}
            {skippedIds.length > 0 && (
              <div className="animate-entry mt-12 mb-4 p-8 rounded-[2.5rem] glass border border-red-500/10" style={{ animationDelay: '0.75s' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-1.5 h-4 rounded-full bg-red-400 opacity-50"></div>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-red-400/60">Skipped Analysis Audit</h3>
                  <span className="text-[10px] text-white/20 ml-auto font-mono uppercase tracking-widest">{Array.from(new Set(skippedIds)).length} Empty Transactions Detected</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set(skippedIds)).map(id => (
                    <span key={id} className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/5 text-white/40 text-[9px] font-mono hover:border-red-500/20 transition-colors">
                      {id}
                    </span>
                  ))}
                </div>
                <p className="mt-4 text-[9px] text-white/20 italic">Note: These conversation IDs were skipped because they contain 0 messages or lack valid transcript data.</p>
              </div>
            )}

            {/* Refined Compact Footer */}
            <footer className="mt-8 pt-10 pb-10 border-t border-white/5 relative animate-entry" style={{ animationDelay: '0.8s' }}>
              {/* Footer Background Glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-20" />

              <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                {/* Branding Column */}
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 glow-primary">
                    <Cpu className="text-primary" size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-white uppercase">Nvn..B <span className="text-primary font-light text-xs tracking-[0.3em] ml-1 opacity-50 uppercase">OS</span></h2>
                    <p className="text-[9px] text-white/40 font-bold uppercase tracking-[0.2em]">AI Behavior Engine</p>
                  </div>
                </div>

                {/* Bottom Copyright Bar - Integrated */}
                <div className="flex flex-col md:items-end gap-2 text-[9px] font-mono font-black text-white/20 uppercase tracking-tighter">
                  <div className="flex items-center gap-4">
                    <span>© {new Date().getFullYear()} NVN..B RESEARCH LABS</span>
                    <span className="opacity-30 text-white/5">|</span>
                    <span className="hover:text-primary transition-colors cursor-pointer">PRIVACY MATRICS</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-white/10 italic">
                    INTELLIGENCE MODE: <span className="text-primary font-black not-italic opacity-80 uppercase tracking-widest">NVN-LITE</span>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        )}
      </div>


      {/* Chat Bot Interface Overlay */}
      <ChatInterface onVisualizationChange={() => { }} />
    </main>
  );
}
