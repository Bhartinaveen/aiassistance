"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';

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

  return (
    <div className="w-full h-full flex flex-col pt-4 overflow-hidden">
      <h3 className="text-white/70 text-sm font-medium px-6 mb-3">Customer Inquiry Intent Distribution</h3>
      <div className="flex-1 px-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={130}
              tick={{ fill: '#ffffff80', fontSize: 11, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#171717',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '8px 12px',
              }}
              itemStyle={{ color: '#fff', fontSize: '12px' }}
              formatter={(value: any, name: any, props: any) => [
                `${value} conversation${value > 1 ? 's' : ''}`,
                props.payload.fullName,
              ]}
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            />
            <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={20}>
              {chartData.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
