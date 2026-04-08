"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#818cf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#38bdf8', '#fb923c', '#e879f9', '#94a3b8', '#4ade80'];

export default function InquiryIntentChart({ data }: { data: any[] }) {
  // Aggregate intents from evaluation data
  const intentCounts: Record<string, number> = {};

  data.forEach(d => {
    const intent = d.evaluation?.Primary_Inquiry_Type || "Other";
    intentCounts[intent] = (intentCounts[intent] || 0) + 1;
  });

  // Sort by count descending and take top 8, group rest as "Other"
  const sorted = Object.entries(intentCounts).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 8);
  const rest = sorted.slice(8);

  if (rest.length > 0) {
    const otherCount = rest.reduce((sum, [, v]) => sum + v, 0);
    top.push(["Other", otherCount]);
  }

  const chartData = top.map(([name, value]) => ({
    name: name.length > 18 ? name.slice(0, 16) + "…" : name,
    fullName: name,
    value,
  }));

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    if (percent < 0.05) return null; // Hide labels for very small slices
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold" style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.8)' }}>
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="w-full h-full flex flex-col p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-white/80 text-sm font-medium uppercase tracking-wide">Customer Objectives</h3>
          <p className="text-[10px] text-white/40 mt-1 max-w-[400px]">The main reasons why your users are starting conversations with the AI.</p>
        </div>
      </div>
      
      <div className="flex-1 min-h-[300px]">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
                labelLine={false}
                label={renderCustomizedLabel}
              >
                {chartData.map((_, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]} 
                    className="hover:opacity-80 transition-opacity cursor-pointer outline-none"
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#171717',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                }}
                itemStyle={{ color: '#fff', fontSize: '13px', fontWeight: 'bold' }}
                formatter={(value: any, name: any, props: any) => [
                  `${value} conversations`,
                  props.payload.fullName,
                ]}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value) => <span className="text-white/70 text-xs font-semibold">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-white/20 text-sm italic">
            No intent data tracked in this batch...
          </div>
        )}
      </div>
    </div>
  );
}
