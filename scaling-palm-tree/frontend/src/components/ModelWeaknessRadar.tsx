"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';

export default function ModelWeaknessRadar({ data }: { data: any[] }) {
  // Aggregate performance by multiple dimensions from real LLM data
  const metrics: Record<string, { label: string; score: number; max: number }> = {
    satisfaction: { label: 'Satisfaction', score: 0, max: 10 },
    hallucination: { label: 'Accuracy', score: 0, max: 10 },
    retention: { label: 'Retention', score: 0, max: 10 },
    compliance: { label: 'Compliance', score: 0, max: 10 },
    engagement: { label: 'Engagement', score: 0, max: 10 },
  };

  const total = data.length || 1;

  // Satisfaction: average score
  const avgScore = data.reduce((sum, d) => sum + (d.evaluation?.User_Satisfaction_Score || 0), 0) / total;
  metrics.satisfaction.score = parseFloat(avgScore.toFixed(1));

  // Accuracy: Use AI score if available, otherwise fallback to inverse hallucination
  const avgAccuracy = data.some(d => d.evaluation?.Accuracy_Score)
    ? data.reduce((sum, d) => sum + (d.evaluation?.Accuracy_Score || 0), 0) / total
    : (10 - (data.filter(d => d.evaluation?.Hallucination_Detected === true).length / total) * 10);
  metrics.hallucination.score = parseFloat(avgAccuracy.toFixed(1));

  // Retention: Use AI score if available, otherwise fallback to inverse dropoff
  const avgRetention = data.some(d => d.evaluation?.Retention_Score)
    ? data.reduce((sum, d) => sum + (d.evaluation?.Retention_Score || 0), 0) / total
    : (10 - (data.filter(d => d.dropoff === true).length / total) * 10);
  metrics.retention.score = parseFloat(avgRetention.toFixed(1));

  // Compliance: Use AI score if available, otherwise fallback to friction/frustration
  const avgCompliance = data.some(d => d.evaluation?.Compliance_Score)
    ? data.reduce((sum, d) => sum + (d.evaluation?.Compliance_Score || 0), 0) / total
    : (10 - ((data.filter(d => d.evaluation?.Checkout_Friction_Detected === true).length + 
              data.filter(d => d.evaluation?.Sentiment_Shift?.toLowerCase().includes('frustrat')).length) / total) * 5);
  metrics.compliance.score = parseFloat(avgCompliance.toFixed(1));

  // Engagement: Use AI score if available, otherwise fallback to positive sentiment
  const avgEngagement = data.some(d => d.evaluation?.Engagement_Score)
    ? data.reduce((sum, d) => sum + (d.evaluation?.Engagement_Score || 0), 0) / total
    : Math.max(0, Math.min(10, 10 - (data.filter(d => d.loop_detected === true).length / total) * 10 + 
                                (data.filter(d => d.evaluation?.Sentiment_Shift?.toLowerCase().includes('positive')).length / total) * 3));
  metrics.engagement.score = parseFloat(avgEngagement.toFixed(1));

  const chartData = Object.values(metrics).map(m => ({
    subject: m.label,
    score: Math.max(0, Math.min(10, m.score)),
  }));

  const COLORS = ['#818cf8', '#34d399', '#fbbf24', '#f87171', '#e879f9'];

  return (
    <div className="h-72 w-full p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md shadow-xl flex flex-col">
      <div className="mb-4">
        <h3 className="text-white/80 font-medium text-sm tracking-wide uppercase">Agent Capability Profile</h3>
        <p className="text-[10px] text-white/40 mt-0.5 max-w-[400px]">Scores the conversational agent's core capabilities out of 10 to highlight strengths and areas for improvement.</p>
      </div>
      
      <div style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            {/* Background dashed lines for score visualization */}
            <YAxis 
              domain={[0, 10]} 
              tickCount={6} 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#ffffff40', fontSize: 10, fontWeight: 'bold' }} 
            />
            <XAxis 
              dataKey="subject" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#ffffff80', fontSize: 11, fontWeight: '600' }} 
              dy={10}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              contentStyle={{
                backgroundColor: '#171717',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 'bold'
              }}
              itemStyle={{ color: '#fff' }}
              formatter={(value: any, name: any, props: any) => [`${value} / 10`, props.payload.subject]}
              labelStyle={{ display: 'none' }}
            />
            <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={40}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
