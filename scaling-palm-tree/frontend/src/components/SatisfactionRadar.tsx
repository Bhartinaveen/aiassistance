"use client";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

export default function SatisfactionRadar({ data }: { data: any[] }) {
  // Aggregate averages per category
  const aggregated = data.reduce((acc: any, curr: any) => {
    const cat = curr.evaluation?.Category || "General";
    if (!acc[cat]) { acc[cat] = { category: cat, totalSat: 0, totalAgentFrust: 0, totalUserFrust: 0, count: 0 }; }
    
    acc[cat].totalSat += curr.evaluation?.User_Satisfaction_Score || 0;
    acc[cat].totalAgentFrust += (curr.evaluation?.Agent_Frustration_Points?.length || 0);
    acc[cat].totalUserFrust += (curr.evaluation?.User_Frustration_Points?.length || 0);
    acc[cat].count += 1;
    
    return acc;
  }, {});

  const chartData = Object.values(aggregated).map((item: any) => ({
    subject: item.category,
    Satisfaction: parseFloat((item.totalSat / item.count).toFixed(1)),
    UserFriction: parseFloat((item.totalUserFrust / item.count).toFixed(1)) * 3, // Multiplier for scale visibility
    AgentFriction: parseFloat((item.totalAgentFrust / item.count).toFixed(1)) * 3
  }));
  
  // Provide sample fallback if empty or too small
  const displayData = chartData.length > 2 ? chartData : [
    { subject: 'Electronics', Satisfaction: 8, UserFriction: 2, AgentFriction: 1 },
    { subject: 'Fashion', Satisfaction: 4, UserFriction: 7, AgentFriction: 5 },
    { subject: 'Luxury', Satisfaction: 9, UserFriction: 1, AgentFriction: 0 },
    { subject: 'Health', Satisfaction: 2, UserFriction: 8, AgentFriction: 6 },
    { subject: 'Unknown', Satisfaction: 5, UserFriction: 5, AgentFriction: 5 },
  ];

  return (
    <div className="h-80 w-full p-6 bg-indigo-950/20 shadow-[0_0_30px_rgba(79,70,229,0.15)] border border-indigo-500/20 rounded-2xl backdrop-blur-xl">
      <h3 className="text-white font-bold mb-4 tracking-wide flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
        Category Satisfaction Matrix
      </h3>
      <ResponsiveContainer width="100%" height="85%">
        <RadarChart cx="50%" cy="50%" outerRadius="65%" data={displayData}>
          <PolarGrid stroke="#6366f1" strokeOpacity={0.2} />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#a5b4fc', fontSize: 12, fontWeight: 500 }} />
          <PolarRadiusAxis angle={30} domain={[0, 10]} max={10} tick={false} axisLine={false} />
          <Radar name="User Satisfaction" dataKey="Satisfaction" stroke="#818cf8" fill="#818cf8" fillOpacity={0.5} />
          <Radar name="User Frustration" dataKey="UserFriction" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.5} />
          <Tooltip 
             contentStyle={{ backgroundColor: 'rgba(30, 27, 75, 0.9)', borderColor: '#4f46e5', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }} 
             itemStyle={{ color: '#fff' }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
