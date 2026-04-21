"use client";

import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#818cf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#38bdf8', '#fb923c', '#e879f9', '#4ade80', '#2dd4bf'];

export default function ProductInterestCloud({ data }: { data: any[] }) {
  // Aggregate products mentioned during chat — split comma-separated lists
  const productCount: Record<string, number> = {};

  data.forEach(d => {
    const raw = d.evaluation?.Product_Mentioned || "None";
    if (raw === "None" || raw === "N/A" || raw === "Other") return;

    // Split by comma since LLM returns "Product A, Product B"
    raw.split(',').forEach((p: string) => {
      const product = p.trim();
      if (product && product !== "None" && product !== "N/A") {
        productCount[product] = (productCount[product] || 0) + 1;
      }
    });
  });

  const rawChartData = Object.entries(productCount)
    .map(([name, count]) => ({
      name: name.length > 25 ? name.slice(0, 22) + "…" : name,
      fullName: name,
      value: count, // RadialBar uses 'value'
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5); // Top 5 products for clean concentric rings

  // Calculate percentages and add fill colors for RadialBar
  const totalValue = rawChartData.reduce((sum, item) => sum + item.value, 0);
  const radialData = rawChartData.map((item, idx) => ({
    ...item,
    fill: COLORS[idx % COLORS.length],
    percentage: Math.round((item.value / (totalValue || 1)) * 100)
  })).reverse(); // Reverse so largest concentric ring is on the outside

  // Custom payload for the legend to force it to render highest percentage first 
  // (re-reversing so they render top-down in descending order)
  const legendPayload = [...radialData].reverse().map(item => ({
    id: item.fullName,
    type: 'square' as const,
    value: item.name,
    color: item.fill,
    payload: item
  }));

  return (
    <div className="w-full h-full flex flex-col p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-white/80 text-sm font-medium uppercase tracking-wide">Most Popular Products</h3>
          <p className="text-[10px] text-white/40 mt-1 max-w-[400px]">This circular graph shows exactly which items users want. The percentages track each product's total share of interest.</p>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row flex-1 min-h-[300px] mt-4 items-center">
        {radialData.length > 0 ? (
          <>
            <div className="w-full md:w-3/5" style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height={250}>
                <RadialBarChart 
                  cx="50%" 
                  cy="50%" 
                  innerRadius="20%" 
                  outerRadius="100%" 
                  barSize={18} 
                  data={radialData}
                  startAngle={90}
                  endAngle={-270}
                >
                  <RadialBar
                    minPointSize={15}
                    background={{ fill: 'rgba(255,255,255,0.05)' }}
                    dataKey="value"
                    cornerRadius={10}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#171717',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                    }}
                    itemStyle={{ color: '#fff', fontSize: '13px', fontWeight: 'bold' }}
                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                    formatter={(value: any, name: any, props: any) => [
                      `${value} Mentions (${props.payload.percentage}%)`,
                      props.payload.fullName
                    ]}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="w-full md:w-2/5 flex flex-col justify-center mt-6 md:mt-0 px-4">
              <ul className="flex flex-col gap-3 m-0 p-0">
                {legendPayload.map((entry, index) => (
                  <li key={`item-${index}`} className="flex items-center text-[11px] sm:text-xs font-semibold text-white/80">
                    <span className="w-3 h-3 rounded-sm mr-3 shrink-0" style={{ backgroundColor: entry.color }}/>
                    <span className="truncate max-w-[200px]" title={entry.id}>{entry.id}</span>
                    <span className="text-white/40 ml-1 shrink-0">({entry.payload.percentage}%)</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center w-full h-full text-white/20 text-sm italic">
            No specific products tracked in this batch...
          </div>
        )}
      </div>
    </div>
  );
}
