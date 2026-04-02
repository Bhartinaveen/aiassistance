"use client";
import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Zap, ShoppingBag, TrendingUp, Cpu, Info } from "lucide-react";

import InquiryIntentChart from '@/components/InquiryIntentChart';
import ProductInterestCloud from '@/components/ProductInterestCloud';
import CheckoutFrictionAlerts from '@/components/CheckoutFrictionAlerts';
import FrustrationHeatmap from '@/components/FrustrationHeatmap';
import HallucinationTracker from '@/components/HallucinationTracker';
import ModelWeaknessRadar from '@/components/ModelWeaknessRadar';
import ChatInterface from '@/components/ChatInterface';

export default function Home() {
  const [allData, setAllData] = useState<any[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState<string>("All Brands");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/analysis/run")
      .then(res => res.json())
      .then(resData => {
        if (resData.status === "success") {
          setAllData(resData.data);
          setData(resData.data);
        }
      })
      .catch((e) => {
        console.warn("Backend unavailable", e);
      })
      .finally(() => setLoading(false));
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

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl glass border border-white/5">
              <span className="text-[10px] font-black text-white/30 uppercase tracking-tighter">Brand Matrix</span>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="bg-transparent text-sm font-bold text-white outline-none cursor-pointer border-none p-0 focus:ring-0"
              >
                <option className="bg-[#020203]" value="All Brands">All Brands</option>
                {brands.map(b => (
                  <option className="bg-[#020203]" key={b as string} value={b as string}>{(b as string).slice(-8).toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div className="px-4 py-2.5 rounded-2xl glass border border-white/5 flex flex-col items-center">
              <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] leading-none mb-1">Live Feed</span>
              <span className="text-sm font-mono font-bold text-white/90 leading-none">{data.length || "0"}</span>
            </div>
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
                  { label: "Avg Satisfaction", value: `${avgScore}/10`, icon: Zap, color: "text-yellow-400" },
                  { label: "Hallucination Rate", value: `${hallucinationRate}%`, icon: AlertTriangle, color: "text-red-400" },
                  { label: "Dropout Rate", value: `${dropoffRate}%`, icon: Activity, color: "text-orange-400" },
                  { label: "Conversations", value: `${data.length}`, icon: Info, color: "text-blue-400" },
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
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Intent & Weakness */}
              <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-8">
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
                      <AlertTriangle size={14} className="text-red-400" /> Model Weakness Radar
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

              {/* Right Column: Checkout Friction Feed */}
              <div className="lg:col-span-4 h-[600px] max-h-[600px] animate-entry" style={{ animationDelay: '0.5s' }}>
                <CheckoutFrictionAlerts data={data} />
              </div>
            </div>

            {/* Error Tracking Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-entry" style={{ animationDelay: '0.6s' }}>
              <div className="glass-card rounded-[2.5rem] p-8 overflow-hidden">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/30 mb-6 flex items-center gap-2">
                  <Zap size={14} className="text-yellow-400" /> Frustration Heatmap
                </h3>
                <FrustrationHeatmap data={data} />
              </div>
              <div className="glass-card rounded-[2.5rem] p-8 overflow-hidden">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/30 mb-6 flex items-center gap-2">
                  < Zap size={14} className="text-primary" /> Hallucination Tracker
                </h3>
                <HallucinationTracker data={data} />
              </div>
            </div>

            {/* Refined Compact Footer */}
            <footer className="mt-16 pt-10 pb-10 border-t border-white/5 relative animate-entry" style={{ animationDelay: '0.8s' }}>
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
                  <div className="flex items-center gap-2 text-white/10 italic">
                    INTELLIGENCE MODE: <span className="text-primary font-black not-italic opacity-80 uppercase tracking-widest"></span>
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
