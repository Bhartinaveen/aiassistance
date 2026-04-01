"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';

export default function EmotionTimeline({ data }: { data: any[] }) {
  
  const chartData = data.map((curr: any) => {
    const w = curr.conversation_id ? curr.conversation_id.substring(0, 5) : "Unknown";
    const satCount = curr.evaluation?.User_Satisfaction_Points?.length || 0;
    const frustCount = curr.evaluation?.User_Frustration_Points?.length || 0;
    
    return {
      name: `Chat ${w}`,
      Satisfaction: satCount,
      Frustration: frustCount,
    };
  });

  return (
    <div className="h-80 w-full p-6 bg-indigo-950/20 shadow-[0_0_30px_rgba(79,70,229,0.15)] border border-indigo-500/20 rounded-2xl backdrop-blur-xl">
      <h3 className="text-white font-bold mb-4 tracking-wide flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse"></span>
        Emotional Fluctuation per Session
      </h3>
      <ResponsiveContainer width="100%" height="80%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#4f46e5" strokeOpacity={0.15} vertical={false} />
          <XAxis dataKey="name" stroke="#818cf8" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="#818cf8" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip 
            cursor={{fill: 'rgba(79, 70, 229, 0.1)'}}
            contentStyle={{ backgroundColor: 'rgba(30, 27, 75, 0.95)', borderColor: '#4f46e5', borderRadius: '12px', color: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }} 
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} iconType="circle" />
          <Bar dataKey="Satisfaction" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
          <Bar dataKey="Frustration" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
