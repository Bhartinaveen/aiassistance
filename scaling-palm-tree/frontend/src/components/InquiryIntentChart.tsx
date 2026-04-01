"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export default function InquiryIntentChart({ data }: { data: any[] }) {
  // Aggregate intents from evaluation data
  const intentCounts: Record<string, number> = {};
  
  data.forEach(d => {
    const intent = d.evaluation?.Primary_Inquiry_Type || "Other";
    intentCounts[intent] = (intentCounts[intent] || 0) + 1;
  });

  const chartData = Object.entries(intentCounts).map(([name, value]) => ({ name, value }));

  const COLORS = ['#818cf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#94a3b8'];

  return (
    <div className="w-full h-full min-h-[300px] flex flex-col pt-4">
      <h3 className="text-white/70 text-sm font-medium px-6 mb-2">Customer Inquiry Intent Distribution</h3>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="45%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: '#171717', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              itemStyle={{ color: '#fff' }}
            />
            <Legend verticalAlign="bottom" height={36}/>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
