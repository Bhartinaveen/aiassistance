"use client";
import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Zap, ShoppingBag, TrendingUp, Cpu, Info, ArrowRight, BarChart3, Brain, Shield, Sparkles } from "lucide-react";

import InquiryIntentChart from '@/components/InquiryIntentChart';
import ProductInterestCloud from '@/components/ProductInterestCloud';
import FrustrationHeatmap from '@/components/FrustrationHeatmap';
import ModelWeaknessRadar from '@/components/ModelWeaknessRadar';
import ChatInterface from '@/components/ChatInterface';
import ProblemConversationsList from '@/components/ProblemConversationsList';
import { getApiUrl } from '@/config';

export default function Home() {
  // ── Landing Page State ─────────────────────────────────────────────────────
  // showLanding controls whether the hero landing page is visible.
  // The dashboard only loads AFTER the user clicks "Launch Dashboard",
  // preventing ugly backend connection errors on first visit.
  const [showLanding, setShowLanding] = useState(true);
  const [landingFadeOut, setLandingFadeOut] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const [allData, setAllData] = useState<any[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<string>("All Brands");
  const [limitInput, setLimitInput] = useState<number | string>("");
  // isClearing tracks when the user triggered a Force Re-scan (cache wipe)
  const [isClearing, setIsClearing] = useState(false);
  // isStopping tracks when the user has pressed the Stop button
  const [isStopping, setIsStopping] = useState(false);
  // progress holds the real-time analysis state polled from the backend
  const [progress, setProgress] = useState<{ running: boolean; total: number; done: number; stopped: boolean; skipped_ids?: string[] } | null>(null);
  const [skippedRecords, setSkippedRecords] = useState<{id: string, reason: string}[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const AUDIT_PAGE_SIZE = 6;
  // backendStatus: null = unknown, 'connecting' = retrying, 'online' = ok, 'offline' = unreachable
  const [backendStatus, setBackendStatus] = useState<'connecting' | 'online' | 'offline' | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number>(0);
  const [connectionAttempt, setConnectionAttempt] = useState<number>(0);

  // ── Proactive Wake-up ──────────────────────────────────────────────────────
  // Pings the backend immediately on mount to start the Render wake-up process.
  useEffect(() => {
    const pingBackend = async () => {
      const apiUrl = getApiUrl();
      try {
        // Silent ping, we don't care about the result here, just waking it up.
        fetch(`${apiUrl}/`, { signal: AbortSignal.timeout(5000) }).catch(() => {});
      } catch (e) {}
    };
    pingBackend();
  }, []);

  // ── Enter Dashboard Handler ────────────────────────────────────────────────
  // Enhanced with automatic retry logic for cold starts.
  const enterDashboard = async () => {
    setIsConnecting(true);
    const apiUrl = getApiUrl();
    const MAX_ENTRY_ATTEMPTS = 12; // ~60 seconds total if each takes 5s
    
    for (let attempt = 1; attempt <= MAX_ENTRY_ATTEMPTS; attempt++) {
      setConnectionAttempt(attempt);
      setBackendStatus('connecting');
      
      try {
        // Use a 5s timeout per attempt to keep the UI responsive
        const res = await fetch(`${apiUrl}/`, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          setBackendStatus('online');
          setLandingFadeOut(true);
          setTimeout(() => {
            setShowLanding(false);
            setIsConnecting(false);
            // Automatically fetch data instead of showing "Ready to Analyze"
            loadDashboardData();
          }, 600);
          return; // Success!
        }
      } catch (e) {
        console.warn(`[Entry] Connection attempt ${attempt} failed, retrying...`);
      }

      // If we're here, it failed. Wait a bit before next attempt.
      if (attempt < MAX_ENTRY_ATTEMPTS) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    // All attempts failed
    setBackendStatus('offline');
    setIsConnecting(false);
    setConnectionAttempt(0);
  };

  // ── Auto-Load Stored Data ──────────────────────────────────────────────────
  // Fetches already analyzed data directly from MongoDB without triggering LLMs
  const loadDashboardData = async (attempt = 0) => {
    const MAX_LOAD_RETRIES = 5;
    setLoading(true);
    const apiUrl = getApiUrl();
    try {
      const res = await fetch(`${apiUrl}/api/analysis/data`, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const resData = await res.json();
      if (resData.status === "success" && resData.data.length > 0) {
        setAllData(resData.data);
        setData(resData.data);
        setBackendStatus('online');
      } else if (resData.status === "success" && resData.data.length === 0) {
        // DB has no data yet — show empty state
        setAllData([]);
        setData([]);
      } else {
        throw new Error('Unexpected response');
      }
    } catch (e: any) {
      console.warn(`[Data] Load attempt ${attempt + 1} failed:`, e?.message);
      if (attempt < MAX_LOAD_RETRIES) {
        // Wait 2s then retry
        setTimeout(() => loadDashboardData(attempt + 1), 2000);
        return; // keep loading=true while retrying
      }
      // All retries exhausted
      setAllData([]);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // 💡 TO ANALYZE CUSTOM DATA LIMITS: This function grabs the user's preference and feeds it to the Backend
  // Includes automatic retry with exponential backoff for when the backend is starting up.
  const fetchAnalysisData = async (targetLimit: number, attempt = 0) => {
    setLoading(true);
    setIsStopping(false);
    setProgress(null);
    const apiUrl = getApiUrl();
    const MAX_RETRIES = 5;

    // ── Step 1: Health-check first — verify backend is reachable ─────────────
    // Uses a manual AbortController for broad browser compatibility
    try {
      setBackendStatus('connecting');
      const healthCtrl = new AbortController();
      const healthTimer = setTimeout(() => healthCtrl.abort(), 5000);
      const health = await fetch(`${apiUrl}/`, { signal: healthCtrl.signal });
      clearTimeout(healthTimer);
      if (!health.ok) throw new Error('Backend not ready');
      setBackendStatus('online');
    } catch {
      if (attempt < MAX_RETRIES) {
        // Exponential backoff: 3s, 5s, 8s, 12s, 17s
        const delay = 3 + attempt * (attempt + 1);
        console.warn(`[Engine] Backend not reachable. Retry ${attempt + 1}/${MAX_RETRIES} in ${delay}s...`);
        setBackendStatus('connecting');
        // Live countdown UI
        for (let i = delay; i > 0; i--) {
          setRetryCountdown(i);
          await new Promise(r => setTimeout(r, 1000));
        }
        setRetryCountdown(0);
        return fetchAnalysisData(targetLimit, attempt + 1);
      }
      // All retries exhausted
      setBackendStatus('offline');
      setLoading(false);
      return;
    }

    // ── Step 2: Start polling /api/analysis/progress for real-time counter ───
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`${apiUrl}/api/analysis/progress`);
        const d = await res.json();
        if (d.status === "success") {
          setProgress(d.progress);
          // Ignore live skipped_ids in progress as we'll rely on the final DB payload which has reasons attached
          if (!d.progress.running) clearInterval(pollInterval);
        }
      } catch { clearInterval(pollInterval); }
    }, 1000);

    // ── Step 3: Trigger the fetching of analysis data ──
    // Instead of forcing a run that analyzes all by default, we just call the endpoint
    // to get the stored results. The endpoint should already contain all analyzed flags.
    fetch(`${apiUrl}/api/analysis/run?limit=${targetLimit}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(resData => {
        if (resData.status === "success") {
          setAllData(resData.data);
          setData(resData.data);
          setBackendStatus('online');
        }
      })
      .catch((e) => {
        // Only warn — don't mark offline if data already loaded via progress polling
        console.warn("[Engine] Analysis run error:", e.message);
      })
      .finally(() => { setLoading(false); clearInterval(pollInterval); setProgress(null); });
  };

  // 🛑 STOP ANALYSIS: Sends a stop signal to the backend to halt the current run
  const stopAnalysis = () => {
    setIsStopping(true);
    const apiUrl = getApiUrl();
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
    const apiUrl = getApiUrl();
    
    // Calls DELETE /api/analysis/clear-cache which: (1) wipes MongoDB cache, (2) re-runs fresh Gemini analysis
    const limitParam = Number(limitInput) > 0 ? Number(limitInput) : 0;
    fetch(`${apiUrl}/api/analysis/clear-cache?limit=${limitParam}`, { method: "DELETE" })
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
    let filtered = allData;

    if (selectedBrand !== "All Brands") {
      filtered = filtered.filter(d => (d.widget_id === selectedBrand || d.widgetId === selectedBrand));
    }
    
    // Parse empty/skipped conversations from the payload and set them into skippedRecords state
    const emptyConversations = filtered
        .filter(d => d.is_empty)
        .map(d => ({
            id: d.conversation_id,
            reason: d.skip_reason || "Empty transcript / No valid data"
        }));

    if (emptyConversations.length > 0) {
      // Deduplicate by ID
      const uniqueEmpty = Array.from(new Map(emptyConversations.map(item => [item.id, item])).values());
      setSkippedRecords(uniqueEmpty);
    } else {
      setSkippedRecords([]);
    }

    // Set chart data exclusively to non-empty conversations
    setData(filtered.filter(d => !d.is_empty));
  }, [selectedBrand, allData]);

  const brands = Array.from(new Set(allData.map(d => d.widget_id || d.widgetId))).filter(Boolean);

  return (
    <main className="min-h-screen relative overflow-hidden bg-[#05050a]">
      {/* ── Multidimensional Premium Background ── */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        {/* Main subtle gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#05050a] via-[#0a0a1a] to-[#05050a]" />
        
        {/* Animated dynamic glows (aurora style) */}
        <div className="absolute top-[-15%] left-[-5%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[140px] animate-mesh" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[50%] h-[50%] rounded-full bg-blue-500/15 blur-[140px] animate-mesh" style={{ animationDelay: '-4s' }} />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-accent/10 blur-[120px] animate-mesh" style={{ animationDelay: '-7s' }} />

        {/* Subtle grid pattern for texture */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          ██  LANDING PAGE — HERO SECTION
          ══════════════════════════════════════════════════════════════════════════
          Shows a stunning intro page on first visit. No backend connection needed.
          This prevents the "Backend Unreachable" error on Vercel deployments when
          the Render backend is cold-starting.
          ══════════════════════════════════════════════════════════════════════════ */}
      {showLanding && (
        <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-all duration-700 ${landingFadeOut ? 'opacity-0 scale-105' : 'opacity-100 scale-100'}`}>
          {/* Background for landing */}
          <div className="absolute inset-0 bg-[#05050a]" />
          
          {/* Animated aurora orbs */}
          <div className="absolute top-[-20%] left-[10%] w-[60%] h-[60%] rounded-full bg-violet-600/15 blur-[180px] animate-mesh" />
          <div className="absolute bottom-[-20%] right-[5%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[160px] animate-mesh" style={{ animationDelay: '-5s' }} />
          <div className="absolute top-[30%] right-[15%] w-[35%] h-[35%] rounded-full bg-fuchsia-500/8 blur-[140px] animate-mesh" style={{ animationDelay: '-8s' }} />
          
          {/* Grid texture */}
          <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

          {/* ── Hero Content ── */}
          <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-4xl mx-auto animate-entry">
            {/* Logo / Icon */}
            <div className="relative mb-8">
              <div className="absolute inset-0 w-28 h-28 rounded-[2.5rem] bg-primary/20 blur-[40px] animate-pulse" />
              <div className="relative p-7 rounded-[2.5rem] glass-premium border border-primary/30 glow-primary">
                <Cpu className="text-primary" size={42} />
              </div>
            </div>

            {/* Title */}
            <div className="mb-4">
              <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white mb-1">
                AI CHAT
              </h1>
              <div className="flex items-center justify-center gap-4">
                <div className="h-px w-16 bg-gradient-to-r from-transparent to-primary/50" />
                <span className="text-primary font-black text-sm md:text-base tracking-[0.5em] uppercase">Analytics</span>
                <div className="h-px w-16 bg-gradient-to-l from-transparent to-primary/50" />
              </div>
            </div>

            {/* Subtitle */}
            <p className="text-white/40 text-sm md:text-base max-w-lg leading-relaxed mb-3">
              AI-powered support quality intelligence platform. Analyze customer conversations, 
              detect friction points, and uncover actionable insights in real-time.
            </p>


            {/* CTA Button */}
            <button
              onClick={enterDashboard}
              disabled={isConnecting}
              className="group relative px-10 py-4 rounded-2xl bg-primary text-white font-black text-sm uppercase tracking-[0.25em] hover:scale-105 active:scale-[0.98] transition-all duration-300 glow-primary mb-6 disabled:opacity-70 disabled:hover:scale-100"
            >
              <span className="flex items-center gap-3">
                {isConnecting ? (
                  <><span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></span> {connectionAttempt > 1 ? `Waking up AI (${connectionAttempt}/12)...` : 'Waking up AI...'}</>
                ) : (
                  <>
                    Launch Dashboard
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform duration-300" />
                  </>
                )}
              </span>
              {/* Button glow */}
              {!isConnecting && <div className="absolute inset-0 rounded-2xl bg-primary/40 blur-xl -z-10 group-hover:blur-2xl transition-all duration-500" />}
            </button>

            {/* Connection Status Message */}
            {backendStatus === 'offline' && !isConnecting && (
              <p className="text-amber-400/60 text-[10px] font-black uppercase tracking-[0.2em] mb-10 animate-pulse">
                Backend is cold-starting... autowake in progress. Please wait.
              </p>
            )}

            {!isConnecting && backendStatus !== 'offline' && (
              <div className="h-10 mb-6"></div>
            )}

            {/* Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-3xl">
              {[
                { icon: BarChart3, title: "Deep Analytics", desc: "Multi-dimensional conversation analysis with visual dashboards", color: "text-blue-400", border: "border-blue-500/10", bg: "bg-blue-500/5" },
                { icon: Brain, title: "AI Insights", desc: "Gemma 3 27B powered behavioral pattern recognition", color: "text-violet-400", border: "border-violet-500/10", bg: "bg-violet-500/5" },
                { icon: Shield, title: "Quality Audit", desc: "Automated hallucination detection and compliance scoring", color: "text-emerald-400", border: "border-emerald-500/10", bg: "bg-emerald-500/5" },
                { icon: Zap, title: "Real-time", desc: "Live analysis progress with smart caching for efficiency", color: "text-amber-400", border: "border-amber-500/10", bg: "bg-amber-500/5" },
              ].map((feature, i) => (
                <div key={i} className={`p-5 rounded-2xl glass border ${feature.border} hover:border-white/10 transition-all duration-500 group cursor-default`} style={{ animationDelay: `${0.3 + i * 0.1}s` }}>
                  <feature.icon size={18} className={`${feature.color} mb-3 group-hover:scale-110 transition-transform duration-300`} />
                  <p className="text-white/80 text-xs font-bold mb-1">{feature.title}</p>
                  <p className="text-white/30 text-[10px] leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom attribution */}
          <div className="absolute bottom-8 text-center">
            <p className="text-[9px] text-white/15 font-mono font-bold uppercase tracking-[0.3em]">
              © {new Date().getFullYear()} NVN..B Research Labs · Intelligence Mode: <span className="text-primary/40">NVN-LITE</span>
            </p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          ██  DASHBOARD (shown after clicking "Launch Dashboard")
          ══════════════════════════════════════════════════════════════════════════ */}
      {!showLanding && (
        <>

      <div className="max-w-[1700px] mx-auto px-6 lg:px-10 py-10">
        {/* ── Modern Navigation / Header ── */}
        <nav className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16 animate-entry">
          <div className="flex items-center gap-5">
            <button 
              onClick={() => {
                setLandingFadeOut(false);
                setShowLanding(true);
              }}
              title="Return to Landing Page"
              className="p-3 rounded-2xl glass border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-300 group"
            >
              <ArrowRight size={20} className="text-white/40 group-hover:text-primary transition-colors rotate-180" />
            </button>
            <div className="p-4 rounded-3xl glass-premium border border-primary/30 glow-primary">
              <Cpu className="text-primary-foreground" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
                AI CHAT <span className="text-primary font-bold text-xs tracking-[0.4em] ml-2 opacity-60 uppercase border-l border-white/20 pl-4">ANALYTICS</span>
              </h1>
              <p className="text-[11px] text-white/50 uppercase tracking-[0.3em] font-bold mt-1">SUPPORT QUALITY DASHBOARD</p>
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
                  value={limitInput}
                  onChange={(e) => setLimitInput(Number(e.target.value) || "")}
                  placeholder="#"
                  className="bg-transparent text-lg font-black text-primary outline-none w-14 text-center border-none p-0 focus:ring-0 placeholder:text-primary/40 ml-2"
                />
              </div>

              <div className="hidden sm:block w-px h-6 bg-white/10 mx-1"></div>

              <button
                onClick={() => { if (Number(limitInput) > 0) fetchAnalysisData(Number(limitInput)); }}
                disabled={!limitInput || Number(limitInput) < 1}
                className="px-4 py-2 flex-grow sm:flex-grow-0 rounded-xl bg-primary/20 text-primary text-[10px] font-black tracking-[0.2em] uppercase hover:bg-primary hover:text-black transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Scan
              </button>

              <button
                onClick={() => {
                  setLimitInput("");
                  fetchAnalysisData(0);
                }}
                title="Scan All unanalyzed data"
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
              <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">View session</span>
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

        {/* ── Offline / Error State ─────────────────────────────────────────── */}
        {!loading && backendStatus === 'offline' ? (
          <div className="flex flex-col h-[60vh] items-center justify-center gap-6 glass rounded-[2.5rem] border border-red-500/20">
            <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="text-red-400" size={32} />
            </div>
            <div className="text-center max-w-sm">
              <p className="text-red-400 font-black tracking-widest uppercase text-sm mb-2">Backend Unreachable</p>
              <p className="text-white/30 text-[11px] leading-relaxed">
                Could not connect to <span className="font-mono text-white/50">{getApiUrl()}</span>.<br />
                Make sure the backend is running and the <span className="font-mono text-primary/70">NEXT_PUBLIC_API_URL</span> is correct.
              </p>
            </div>
            <button
              onClick={() => { setLoading(true); loadDashboardData(); }}
              className="mt-2 px-6 py-2.5 rounded-xl bg-primary/20 text-primary text-[10px] font-black tracking-[0.2em] uppercase hover:bg-primary hover:text-black transition-all duration-300 border border-primary/30"
            >
              ↺ Retry Connection
            </button>
          </div>

        ) : loading ? (
          <div className="flex flex-col h-[60vh] items-center justify-center gap-6 glass rounded-[2.5rem] border-dashed border-white/5">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" size={20} />
            </div>
            <div className="text-center">
              {backendStatus === 'connecting' && retryCountdown > 0 ? (
                <>
                  <p className="text-yellow-400 font-black tracking-widest uppercase text-xs animate-pulse">Backend Starting Up...</p>
                  <p className="text-white/30 text-[10px] mt-2">
                    Retrying in <span className="font-mono text-yellow-400 font-bold">{retryCountdown}s</span> — uvicorn may still be initializing
                  </p>
                </>
              ) : (
                <>
                  <p className="text-white font-bold tracking-widest uppercase text-xs">Analyzing Conversations...</p>
                  <p className="text-white/20 text-[10px] mt-2">
                    {progress?.running
                      ? `Processing ${progress.done} of ${progress.total} conversations — please wait`
                      : 'Connecting to AI analysis engine...'}
                  </p>
                </>
              )}
            </div>
          </div>

        ) : allData.length === 0 ? (
          // ── Empty State — shown when no data is returned from DB ──
          <div className="flex flex-col items-center justify-center min-h-[65vh] gap-10 animate-entry">
            <div className="text-center max-w-xl">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2rem] glass-premium border border-primary/30 glow-primary mb-8">
                <Activity className="text-primary" size={40} />
              </div>
              <h2 className="text-4xl font-black text-white tracking-tight mb-4">No Data Detected</h2>
              <p className="text-white/40 text-sm leading-relaxed">
                We couldn't find any analyzed conversations in the database.
              </p>
            </div>
            <button
                onClick={() => { loadDashboardData(); }}
                className="px-8 py-4 rounded-2xl bg-primary text-white font-black text-sm uppercase tracking-[0.2em] hover:scale-105 transition-all glow-primary"
              >
                Refresh Data
            </button>
          </div>

        ) : (
          <div className="space-y-8 pb-32">
            {/* Top Stats Bar - horizontally scrollable on mobile */}
            <div className="overflow-x-auto pb-2 animate-entry" style={{ animationDelay: '0.1s' }}>
              <div className="flex md:grid md:grid-cols-3 gap-4 min-w-max md:min-w-0">
              {(() => {
                const total = data.length || 1;
                const isTrue = (v: any) => v === true || v === "true" || v === "yes" || v === 1;
                const scores = data.map(d => parseFloat(d.evaluation?.User_Satisfaction_Score)).filter(n => !isNaN(n) && n > 0);
                const avgScore = scores.length > 0
                  ? (scores.reduce((s, n) => s + n, 0) / scores.length).toFixed(1)
                  : "0";
                const dropoffRate = data.length > 0
                  ? ((data.filter(d => isTrue(d.dropoff)).length / total) * 100).toFixed(1)
                  : "0";

                return [
                  { label: "Avg User Satisfaction", value: `${avgScore}/10`, icon: Zap, color: "text-yellow-400" },
                  { label: "User Dropout Rate", value: `${dropoffRate}%`, icon: Activity, color: "text-orange-400" },
                  { label: "Total Conversations", value: `${data.length}`, icon: Info, color: "text-blue-400" },
                ].map((stat, i) => (
                  <div key={i} className="p-4 rounded-3xl glass-premium flex items-center justify-between group hover:border-primary/30 transition-all cursor-default w-64 md:w-auto">
                    <div>
                      <span className="text-[9px] font-black text-white/20 uppercase tracking-widest block mb-1">{stat.label}</span>
                      <span className="text-xl font-black text-white/90">{stat.value}</span>
                    </div>
                    <stat.icon size={20} className={`${stat.color} opacity-40 group-hover:opacity-100 transition-opacity`} />
                  </div>
                ));
              })()}
              </div>
            </div>

            {/* Main Visualizations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="glass-premium rounded-[2.5rem] p-1 animate-entry" style={{ animationDelay: '0.2s' }}>
                <div className="p-6 pb-0">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
                    <TrendingUp size={14} className="text-primary" /> User Intent Map
                  </h3>
                </div>
                <div className="h-[400px]">
                  <InquiryIntentChart data={data} />
                </div>
              </div>
              <div className="glass-card rounded-[2.5rem] p-1 animate-entry" style={{ animationDelay: '0.3s' }}>
                <div className="p-6 pb-0">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
                    <AlertTriangle size={14} className="text-red-400" /> AI Performance Radar
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
                  <Zap size={14} className="text-yellow-400" /> Issue Heatmap
                </h3>
                <FrustrationHeatmap data={data} />
              </div>
            </div>

            {/* Problematic Conversations Tracker */}
            <div className="animate-entry" style={{ animationDelay: '0.7s' }}>
              <ProblemConversationsList data={data} />
            </div>

            {/* Data Integrity Audit Section - Always visible, just above footer */}
            <div className="animate-entry mt-16 mb-4 p-8 rounded-[2.5rem] glass border border-white/5 bg-black/20" style={{ animationDelay: '0.75s' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-1.5 h-4 rounded-full ${skippedRecords.length > 0 ? 'bg-red-400' : 'bg-white/20'}`}></div>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/50">Data Integrity Audit</h3>
                <div className="ml-auto flex items-center gap-4">
                  <span className="text-[10px] text-white/20 font-mono uppercase tracking-widest">
                    {data.length} Validated
                  </span>
                  <span className={`text-[10px] font-mono uppercase tracking-widest ${skippedRecords.length > 0 ? 'text-red-400/60' : 'text-white/20'}`}>
                    {skippedRecords.length} Skipped
                  </span>
                </div>
              </div>

              {skippedRecords.length > 0 ? (() => {
                const auditTotalPages = Math.max(1, Math.ceil(skippedRecords.length / AUDIT_PAGE_SIZE));
                const auditPaged = skippedRecords.slice((auditPage - 1) * AUDIT_PAGE_SIZE, auditPage * AUDIT_PAGE_SIZE);
                return (
                  <>
                    {/* Horizontally scrollable on mobile, grid on desktop */}
                    <div className="overflow-x-auto pb-2">
                      <div className="flex md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 min-w-max md:min-w-0">
                        {auditPaged.map((record, idx) => (
                          <div key={idx} className="w-80 md:w-auto px-6 py-5 rounded-[2rem] glass-premium border border-red-500/10 flex flex-col gap-3 hover:border-red-500/30 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 blur-[40px] -mr-12 -mt-12 group-hover:bg-red-500/10 transition-colors" />
                            <div className="flex flex-col relative z-10">
                              <span className="text-white/20 text-[9px] font-black uppercase tracking-[0.2em] mb-1">Session ID</span>
                              <span className="text-white/70 text-[11px] font-mono tracking-tight break-all">{record.id}</span>
                            </div>
                            <div className="h-px w-full bg-white/5 relative z-10" />
                            <div className="flex items-start gap-3 relative z-10">
                              <div className="mt-1.5 w-2 h-2 shrink-0 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)] animate-pulse" />
                              <div className="flex flex-col gap-1">
                                <span className="text-red-400/60 uppercase tracking-[0.2em] text-[10px] font-black">Skip Justification</span>
                                <span className="text-white/70 text-[11px] leading-relaxed font-medium">{record.reason}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pagination */}
                    {auditTotalPages > 1 && (
                      <div className="mt-8 flex items-center justify-between border-t border-white/5 pt-6">
                        <span className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-black">
                          Showing {(auditPage - 1) * AUDIT_PAGE_SIZE + 1}–{Math.min(auditPage * AUDIT_PAGE_SIZE, skippedRecords.length)} of {skippedRecords.length}
                        </span>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                            disabled={auditPage === 1}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-[10px] font-black text-white/50 uppercase tracking-[0.2em] disabled:opacity-20 disabled:cursor-not-allowed transition-all border border-white/5"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15,18 9,12 15,6"/></svg>
                            Prev
                          </button>
                          <div className="flex items-center gap-1.5">
                            {Array.from({ length: auditTotalPages }, (_, i) => i + 1).map(page => (
                              <button
                                key={page}
                                onClick={() => setAuditPage(page)}
                                className={`w-8 h-8 rounded-xl text-[10px] font-black transition-all ${
                                  page === auditPage
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                    : 'bg-white/5 text-white/30 hover:bg-white/10 border border-white/5'
                                }`}
                              >
                                {page}
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() => setAuditPage(p => Math.min(auditTotalPages, p + 1))}
                            disabled={auditPage === auditTotalPages}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-[10px] font-black text-red-400 uppercase tracking-[0.2em] disabled:opacity-20 disabled:cursor-not-allowed transition-all border border-red-500/20"
                          >
                            Next
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9,18 15,12 9,6"/></svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })() : (
                <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-white/5 rounded-[2rem] bg-white/[0.02]">
                  <Activity size={24} className="text-white/10 mb-4" />
                  <p className="text-white/40 text-[11px] font-bold uppercase tracking-widest text-center">No Skipped Conversations Detected</p>
                  <p className="text-white/20 text-[10px] mt-2 text-center max-w-sm leading-relaxed">
                    All processed data in your current database is valid. If you recently updated your session data, click <span className="text-red-400/60 font-black">RE-SCAN</span> to detect and categorize any newly skipped empty transactions.
                  </p>
                </div>
              )}
              
              <div className="mt-8 flex justify-between items-center text-[9px] text-white/15">
                <p className="italic">Note: These conversation IDs were dynamically skipped by the backend analysis engine.</p>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-primary/40"></span> Validated</span>
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500/40"></span> Skipped</span>
                </div>
              </div>
            </div>

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
                    <h2 className="text-lg font-black tracking-tight text-white uppercase">AI CHAT <span className="text-primary font-light text-xs tracking-[0.3em] ml-1 opacity-50 uppercase">ANALYTICS</span></h2>
                    <p className="text-[9px] text-white/40 font-bold uppercase tracking-[0.2em]">Support Quality Dashboard</p>
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

      {/* Chat Bot Interface Overlay — only in dashboard mode */}
      <ChatInterface onVisualizationChange={() => { }} />
      </>
      )}
    </main>
  );
}
