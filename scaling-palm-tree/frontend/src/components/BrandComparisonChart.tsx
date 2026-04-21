"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

export default function BrandComparisonChart({ data }: { data: any[] }) {
  // Aggregate metrics by widget_id (brand)
  const brandMetrics: Record<string, { total: number; hallucinations: number; friction: number }> = {};
  
  data.forEach(d => {
    const brand = d.widget_id || "Unknown";
    if (!brandMetrics[brand]) {
      brandMetrics[brand] = { total: 0, hallucinations: 0, friction: 0 };
    }
    brandMetrics[brand].total += 1;
    if (d.evaluation?.Hallucination_Detected) brandMetrics[brand].hallucinations += 1;
    if (d.evaluation?.Checkout_Friction_Detected) brandMetrics[brand].friction += 1;
  });

  const chartData = Object.entries(brandMetrics).map(([brand, metrics]) => ({
    name: brand.slice(-6), // Last 6 chars for readability
    hallucinationRate: (metrics.hallucinations / metrics.total) * 100,
    frictionRate: (metrics.friction / metrics.total) * 100,
    fullName: brand
  }));

  const COLORS = ['#818cf8', '#f87171', '#34d399'];

  return (
    <div className="w-full h-full min-h-[300px] flex flex-col pt-4">
      <h3 className="text-white/70 text-sm font-medium px-6 mb-2">Cross-Brand Error Comparison (%)</h3>
      <div style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="name" stroke="#ffffff50" fontSize={12} />
            <YAxis stroke="#ffffff50" fontSize={12} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#171717', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              itemStyle={{ fontSize: '12px' }}
            />
            <Legend verticalAlign="top" height={36}/>
            <Bar dataKey="hallucinationRate" name="Hallucination %" fill="#f87171" radius={[4, 4, 0, 0]} />
            <Bar dataKey="frictionRate" name="Friction %" fill="#fbbf24" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
