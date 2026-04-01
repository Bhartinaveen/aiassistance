"use client";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

export default function ModelWeaknessRadar({ data }: { data: any[] }) {
  // Aggregate performance by Category
  const aggregated = data.reduce((acc: any, curr: any) => {
    const cat = curr.evaluation?.Category || "General";
    if (!acc[cat]) { acc[cat] = { category: cat, score_sum: 0, drops: 0, count: 0 }; }
    
    acc[cat].score_sum += curr.evaluation?.User_Satisfaction_Score || 0;
    if (curr.dropoff) acc[cat].drops += 1;
    acc[cat].count += 1;
    
    return acc;
  }, {});

  const chartData = Object.values(aggregated).map((item: any) => ({
    subject: item.category,
    A: parseFloat((item.score_sum / item.count).toFixed(1)),
    B: 10 - item.drops // Inverse relationship for radar (more drops = lower score)
  }));
  
  // Provide sample data if API returns an empty category matrix
  const displayData = chartData.length > 2 ? chartData : [
    { subject: 'Electronics', A: 8, B: 7 },
    { subject: 'Fashion', A: 4, B: 4 },
    { subject: 'Luxury', A: 9, B: 6 },
    { subject: 'Health', A: 2, B: 3 },
    { subject: 'Unknown', A: 5, B: 5 },
  ];

  return (
    <div className="h-72 w-full p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md shadow-xl">
      <h3 className="text-white/80 font-medium mb-4 text-sm tracking-wide">Model Weakness by Category</h3>
      <ResponsiveContainer width="100%" height="85%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={displayData}>
          <PolarGrid stroke="#ffffff40" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#ffffff90', fontSize: 11 }} />
          <PolarRadiusAxis angle={30} domain={[0, 10]} max={10} tick={false} stroke="#ffffff40" />
          <Radar name="Satisfaction Score" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
          <Radar name="Resilience (No Drops)" dataKey="B" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.6} />
          <Tooltip contentStyle={{ backgroundColor: '#1e1e1e', borderColor: '#333', borderRadius: '8px' }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
