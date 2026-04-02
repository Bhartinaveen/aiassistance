"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, LabelList } from 'recharts';

const COLORS = ['#818cf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#38bdf8', '#fb923c', '#e879f9', '#4ade80', '#2dd4bf'];

export default function ProductInterestCloud({ data }: { data: any[] }) {
  // Aggregate products mentioned during chat — split comma-separated lists
  const productCount: Record<string, number> = {};

  data.forEach(d => {
    const raw = d.evaluation?.Product_Mentioned || "None";
    if (raw === "None" || raw === "Other") return;

    // Split by comma since LLM returns "Product A, Product B"
    raw.split(',').forEach((p: string) => {
      const product = p.trim();
      if (product && product !== "None") {
        productCount[product] = (productCount[product] || 0) + 1;
      }
    });
  });

  const chartData = Object.entries(productCount)
    .map(([name, count]) => ({
      name: name.length > 25 ? name.slice(0, 22) + "…" : name,
      fullName: name,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8); // Top 8 products for clarity

  return (
    <div className="w-full h-full flex flex-col p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white/70 text-sm font-medium">Trending Product Interests</h3>
        <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Top 8 Products</span>
      </div>
      
      <div className="flex-1 min-h-[300px]">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 40, left: 0, bottom: 5 }}
            >
              <defs>
                {chartData.map((_, index) => (
                  <linearGradient key={`gradient-${index}`} id={`colorGradient-${index}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.8} />
                    <stop offset="100%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.2} />
                  </linearGradient>
                ))}
              </defs>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={150}
                tick={{ fill: '#ffffff90', fontSize: 11, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#171717',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                }}
                itemStyle={{ color: '#fff', fontSize: '12px' }}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                formatter={(value: number, _name: string, props: any) => [
                  `${value} Mentions`,
                  props.payload.fullName
                ]}
              />
              <Bar 
                dataKey="count" 
                radius={[0, 10, 10, 0]} 
                barSize={18}
                animationDuration={1500}
              >
                {chartData.map((_, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`url(#colorGradient-${index})`}
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                  />
                ))}
                <LabelList 
                  dataKey="count" 
                  position="right" 
                  style={{ fill: '#ffffff60', fontSize: 10, fontWeight: 700 }} 
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-white/20 text-sm italic">
            No specific products tracked in this batch...
          </div>
        )}
      </div>
    </div>
  );
}
