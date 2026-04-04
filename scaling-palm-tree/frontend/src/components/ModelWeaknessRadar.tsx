"use client";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';

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
    fullMark: 10,
  }));

  return (
    <div className="h-72 w-full p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md shadow-xl">
      <h3 className="text-white/80 font-medium mb-2 text-sm tracking-wide">Model Performance Radar</h3>
      <ResponsiveContainer width="100%" height="85%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
          <PolarGrid stroke="#ffffff20" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#ffffff90', fontSize: 11 }} />
          <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} stroke="#ffffff20" />
          <Radar
            name="Score"
            dataKey="score"
            stroke="#818cf8"
            fill="#818cf8"
            fillOpacity={0.4}
            strokeWidth={2}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#171717',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            itemStyle={{ color: '#fff' }}
            formatter={(value: any) => [`${value}/10`, 'Score']}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
