"use client";
import { useState } from "react";
import { Activity } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend, ReferenceArea
} from "recharts";

interface BehaviorNode { label: string; score: number; analysis?: string; security?: string; }
interface BehaviorTimeline {
  start: BehaviorNode | string;
  middle: BehaviorNode | string;
  end: BehaviorNode | string;
}
interface BehaviorSet { agent: BehaviorTimeline; user: BehaviorTimeline; }
interface Props {
  originalBehavior: BehaviorSet | null;
  variantBehavior:  BehaviorSet | null;
  originalSummary?: string;
  variantSummary?: string;
}

function resolveNode(node: any): BehaviorNode {
  if (!node) return { label: "N/A", score: 5, analysis: "Data missing.", security: "None" };
  if (typeof node === "string") return { label: node, score: 5, analysis: "Incomplete data format.", security: "None" };
  return { 
    label: node.label || "N/A", 
    score: Math.max(1, Math.min(10, Number(node.score) || 5)),
    analysis: node.analysis || "No specific analysis provided.",
    security: node.security || "None"
  };
}

function scoreColor(score: number): string {
  if (score >= 8) return "#22c55e";
  if (score >= 4) return "#f59e0b";
  return "#ef4444";
}

// Custom dot with glow
const GlowDot = (props: any) => {
  const { cx, cy, value } = props;
  const color = scoreColor(value);
  return (
    <g style={{ cursor: 'pointer', pointerEvents: 'auto' }}>
      {/* Invisible larger hit area for easier clicking */}
      <circle cx={cx} cy={cy} r={20} fill="transparent" />
      <circle cx={cx} cy={cy} r={10} fill={color} opacity={0.15} />
      <circle cx={cx} cy={cy} r={6}  fill={color} opacity={0.35} />
      <circle cx={cx} cy={cy} r={4}  fill={color} />
      <circle cx={cx} cy={cy} r={2}  fill="#fff" />
    </g>
  );
};

// Custom tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div 
      className="bg-[#0A0A12]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] min-w-[180px] animate-in slide-in-from-bottom-2 duration-200"
      style={{ 
        pointerEvents: 'none',
        transform: 'translate(-50%, calc(-100% - 15px))',
        position: 'relative'
      }}
    >
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-black">{label}</p>
      </div>
      
      {/* Downward Arrow Tip */}
      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rotate-45 w-3 h-3 bg-[#0A0A12] border-b border-r border-white/10" />
      <div className="space-y-2.5">
        {payload.map((p: any, i: number) => {
          const color = scoreColor(p.value);
          const isImproved = p.name.includes("Improved");
          return (
            <div key={i} className="flex items-center justify-between gap-4">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isImproved ? 'text-emerald-400/80' : 'text-red-400/60'}`}>
                {isImproved ? "NEW" : "OLD"}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white">{p.value}/10</span>
                <div 
                  className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter"
                  style={{ backgroundColor: `${color}20`, color: color }}
                >
                  {p.value <= 4 ? 'Poor' : p.value <= 7 ? 'Avg' : 'Best'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

function BehaviorChart({
  title, icon, data, actorColor, onSelect, selectedIndex
}: {
  title: string;
  icon: React.ReactNode;
  data: { stage: string; actual: number; actualLabel: string; variant: number; variantLabel: string }[];
  actorColor: string;
  onSelect: (index: number) => void;
  selectedIndex: number | null;
}) {
  const gradId = `grad-${title.replace(/\s/g, "")}`;

  return (
    <div className="rounded-2xl bg-[#060609] border border-white/5 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        {icon}
        <h4 className="text-[11px] uppercase tracking-[0.2em] font-black text-white/60">{title}</h4>
      </div>

      {/* Chart */}
      <div style={{ height: 220, overflow: "visible" }} className="relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart 
            data={data} 
            margin={{ top: 30, right: 80, left: -18, bottom: 0 }}
            onClick={(e) => {
              if (e && e.activeTooltipIndex !== undefined && e.activeTooltipIndex !== null) {
                onSelect(Number(e.activeTooltipIndex));
              }
            }}
          >
            <defs>
              {/* Actual fill – muted red */}
              <linearGradient id={`fill-actual-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.01} />
              </linearGradient>
              {/* Variant fill – emerald */}
              <linearGradient id={`fill-variant-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.20} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0.01} />
              </linearGradient>
              
              {/* Dynamic Line Gradient - Red to Yellow to Green */}
              <linearGradient id="line-gradient" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#ef4444" /> {/* Red 1-4 */}
                <stop offset="35%" stopColor="#ef4444" />
                <stop offset="45%" stopColor="#f59e0b" /> {/* Yellow 4-7 */}
                <stop offset="65%" stopColor="#f59e0b" />
                <stop offset="75%" stopColor="#22c55e" /> {/* Green 7-10 */}
                <stop offset="100%" stopColor="#22c55e" />
              </linearGradient>
            </defs>

            {/* Colour zone backgrounds: Red 1-4, Yellow 4-7, Green 7-10 */}
            <ReferenceArea y1={1}  y2={4}  fill="#ef4444" fillOpacity={0.06} />
            <ReferenceArea y1={4}  y2={7}  fill="#f59e0b" fillOpacity={0.06} />
            <ReferenceArea y1={7}  y2={10} fill="#22c55e" fillOpacity={0.06} />

            {/* Stage Markers / Plane Refinement */}
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={true} />
            
            <XAxis
              dataKey="stage"
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: 800, letterSpacing: 1.5 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 2 }}
              tickLine={false}
              padding={{ left: 20, right: 20 }}
            />
            <YAxis
              domain={[1, 10]}
              ticks={[1, 4, 7, 10]}
              tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 9, fontWeight: 700 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 2 }}
              tickLine={false}
              tickFormatter={(v) => v === 1 ? "POOR" : v === 4 ? "AVG" : v === 7 ? "GOOD" : "BEST"}
            />
            <Tooltip 
              content={<CustomTooltip />} 
              cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 40, strokeOpacity: 0.2 }}
              wrapperStyle={{ pointerEvents: 'none', zIndex: 1000 }}
              allowEscapeViewBox={{ x: true, y: true }}
            />
            
            {/* Legend with better labels */}
            <Legend
              verticalAlign="top" align="right"
              iconType="circle" iconSize={8}
              wrapperStyle={{ fontSize: "10px", paddingBottom: "20px", fontWeight: 800, opacity: 0.6 }}
              formatter={(value) => <span style={{ color: value.includes('Actual') ? '#f87171' : '#4ade80' }}>{value.toUpperCase()}</span>}
            />

            {/* Actual Chat Area - Dotted and Muted */}
            <Area
              type="monotone"
              dataKey="actual"
              name="Baseline (Old)"
              stroke="url(#line-gradient)"
              strokeWidth={3}
              fill={`url(#fill-actual-${title})`}
              dot={<GlowDot />}
              strokeDasharray="8 4"
              opacity={0.4}
            />

            {/* Variant Chat Area - Solid and Glowing */}
            <Area
              type="monotone"
              dataKey="variant"
              name="Improved (New)"
              stroke="url(#line-gradient)"
              strokeWidth={4}
              fill={`url(#fill-variant-${title})`}
              dot={<GlowDot />}
              activeDot={{ r: 8, fill: "#22c55e", stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Score delta summary - Card format */}
      <div className="grid grid-cols-3 gap-3">
        {data.map((d) => {
          const delta = d.variant - d.actual;
          return (
            <div key={d.stage} className="bg-[#ffffff03] border border-white/5 rounded-2xl p-3 flex flex-col items-center gap-1 transition-all hover:bg-[#ffffff05] hover:border-white/10 group">
              <span className="text-[9px] uppercase tracking-[0.2em] text-white/30 font-black group-hover:text-white/50">{d.stage}</span>
              <div className="flex items-center gap-2 my-1">
                <span className="text-[12px] font-black" style={{ color: scoreColor(d.actual) }}>{d.actual}</span>
                <span className="text-white/10 text-[10px]">→</span>
                <span className="text-[14px] font-black" style={{ color: scoreColor(d.variant) }}>{d.variant}</span>
              </div>
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                delta > 0 ? "bg-emerald-500/10 text-emerald-400" : delta < 0 ? "bg-red-500/10 text-red-400" : "bg-white/5 text-white/30"
              }`}>
                {delta > 0 ? (
                  <>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                    <span>+{delta} Better</span>
                  </>
                ) : delta < 0 ? (
                  <>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
                    <span>{delta} Down</span>
                  </>
                ) : (
                  <span>Optimal</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function BehaviorHeatmap({ originalBehavior, variantBehavior, originalSummary, variantSummary }: Props) {
  const [selectedUserStage, setSelectedUserStage] = useState<number | null>(null);
  const [selectedAgentStage, setSelectedAgentStage] = useState<number | null>(null);

  const stages = ["start", "middle", "end"] as const;
  const stageLabels = ["Start", "Middle", "End"];

  const buildData = (actor: "user" | "agent") =>
    stages.map((s, i) => {
      const orig = resolveNode((originalBehavior as any)?.[actor]?.[s]);
      const vari = resolveNode((variantBehavior  as any)?.[actor]?.[s]);
      return {
        stage: stageLabels[i],
        actual: orig.score,
        actualLabel: orig.label,
        actualAnalysis: orig.analysis,
        actualSecurity: orig.security,
        variant: vari.score,
        variantLabel: vari.label,
        variantAnalysis: vari.analysis,
        variantSecurity: vari.security,
      };
    });

  const userData = buildData("user");
  const agentData = buildData("agent");

  const RenderAnalysisCard = ({ actor, data, index }: { actor: string, data: any[], index: number | null }) => {
    if (index === null) return (
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 border-dashed flex items-center justify-center">
        <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">Click any point to view deep analysis</p>
      </div>
    );
    
    const stage = data[index];
    const delta = stage.variant - stage.actual;

    return (
      <div className="p-5 rounded-2xl bg-[#08080c] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-[9px] text-primary uppercase tracking-[0.3em] font-black mb-1">Moment Analysis</p>
            <h5 className="text-sm font-black text-white flex items-center gap-2">
              The {stage.stage} of the Chat
              <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-tighter ${delta > 0 ? 'bg-emerald-500 text-black' : 'bg-white/10 text-white'}`}>
                {delta > 0 ? `${delta}pts Better` : 'No Change'}
              </span>
            </h5>
          </div>
          <button onClick={() => actor === 'user' ? setSelectedUserStage(null) : setSelectedAgentStage(null)} className="text-white/20 hover:text-white">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {/* Left side: What went wrong */}
           <div className="space-y-4">
             <div className="flex flex-col gap-1">
               <span className="text-[10px] text-red-400 font-extrabold uppercase tracking-widest">⚠️ What Went Wrong?</span>
               <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 space-y-2">
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full" style={{ background: scoreColor(stage.actual) }} />
                   <span className="text-xs font-black text-red-200/90">{stage.actualLabel}</span>
                 </div>
                 <p className="text-[11px] text-red-200/80 leading-relaxed font-medium">
                   {stage.actualAnalysis}
                 </p>
               </div>
               {stage.actualSecurity && stage.actualSecurity.toLowerCase() !== "none" && (
                 <div className="p-3 mt-2 rounded-lg bg-orange-500/10 border border-orange-500/30 flex gap-2">
                   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-orange-400 flex-shrink-0 mt-0.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                   <div>
                     <p className="text-[9px] text-orange-400 font-black uppercase tracking-widest mb-0.5">Security Concern Detected</p>
                     <p className="text-[10px] text-orange-200/80 leading-tight">{stage.actualSecurity}</p>
                   </div>
                 </div>
               )}
             </div>
           </div>

           {/* Right side: How we fixed it */}
           <div className="space-y-4">
             <div className="flex flex-col gap-1">
               <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest">✅ How We Fixed It?</span>
               <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 space-y-2">
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]" style={{ background: scoreColor(stage.variant) }} />
                   <span className="text-xs font-black text-emerald-100">{stage.variantLabel}</span>
                 </div>
                 <p className="text-[11px] text-emerald-100/80 leading-relaxed font-medium">
                   {stage.variantAnalysis}
                 </p>
               </div>
               {stage.variantSecurity && stage.variantSecurity.toLowerCase() !== "none" && (
                 <div className="p-3 mt-2 rounded-lg bg-orange-500/10 border border-orange-500/30 flex gap-2">
                   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-orange-400 flex-shrink-0 mt-0.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                   <div>
                     <p className="text-[9px] text-orange-400 font-black uppercase tracking-widest mb-0.5">Security Check Warning</p>
                     <p className="text-[10px] text-orange-200/80 leading-tight">{stage.variantSecurity}</p>
                   </div>
                 </div>
               )}
             </div>
           </div>
        </div>

        <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <p className="text-[11px] text-white/30 leading-relaxed">
            <span className="text-white/60 font-bold">Pro Tip:</span> Click on the <span className="text-white/60 underline underline-offset-4">Start, Middle, or End</span> dots on the matching line above to see how other parts of the chat improved!
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Legend bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 rounded-full" style={{ background: "linear-gradient(to right, #ef4444, #f59e0b, #22c55e)" }} />
          </div>
          <div className="flex gap-4 text-[9px] font-black uppercase tracking-wider">
            <span className="text-red-400/60">● Poor</span>
            <span className="text-amber-400/60">● Average</span>
            <span className="text-emerald-400/60">● Good</span>
          </div>
        </div>
        <div className="text-[9px] text-white/20 font-bold uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/5">Interactive Plane Active</div>
      </div>

      {/* Customer behavior section */}
      <div className="space-y-3">
        <BehaviorChart
          title="Customer Behavior"
          actorColor="#60a5fa"
          data={userData}
          onSelect={setSelectedUserStage}
          selectedIndex={selectedUserStage}
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="text-blue-400">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
            </svg>
          }
        />
        <RenderAnalysisCard actor="user" data={userData} index={selectedUserStage} />
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-white/5 to-transparent my-6" />

      {/* Agent behavior section */}
      <div className="space-y-3">
        <BehaviorChart
          title="Agent Behavior"
          actorColor="#a78bfa"
          data={agentData}
          onSelect={setSelectedAgentStage}
          selectedIndex={selectedAgentStage}
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="text-purple-400">
              <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2Z"/>
            </svg>
          }
        />
        <RenderAnalysisCard actor="agent" data={agentData} index={selectedAgentStage} />
      </div>

      {/* Overall Success Strategy Summary */}
      <div className="p-6 rounded-2xl bg-[#ffffff03] border border-white/10 space-y-4 mt-10 shadow-2xl relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[80px] -mr-16 -mt-16 group-hover:bg-primary/10 transition-all" />
         <div className="flex items-center gap-3">
           <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
             <Activity size={16} />
           </div>
           <div>
             <p className="text-[10px] text-primary uppercase tracking-[0.4em] font-black">Overall Growth Story</p>
             <h4 className="text-xs font-black text-white mt-0.5 tracking-tight uppercase">Strategic Success Summary</h4>
           </div>
         </div>
         <p className="text-[12px] text-white/50 leading-relaxed font-medium max-w-2xl">
           <span className="text-red-400/80 font-bold underline decoration-red-500/20 underline-offset-4">Original Chat:</span> {originalSummary || "Awaiting advanced deep-dive analysis..."}
           <br/><br/>
           <span className="text-emerald-400 font-bold underline decoration-emerald-500/20 underline-offset-4">Improved Strategy:</span> {variantSummary || "Awaiting strategic insight generation..."}
         </p>
      </div>
    </div>
  );
}
