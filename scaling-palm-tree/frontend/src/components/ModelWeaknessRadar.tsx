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

  // Accuracy: inverse of hallucination rate (fewer hallucinations = higher score)
  const hallucinationCount = data.filter(d => d.evaluation?.Hallucination_Detected === true).length;
  metrics.hallucination.score = parseFloat((10 - (hallucinationCount / total) * 10).toFixed(1));

  // Retention: inverse of dropoff rate
  const dropoffCount = data.filter(d => d.dropoff === true).length;
  metrics.retention.score = parseFloat((10 - (dropoffCount / total) * 10).toFixed(1));

  // Compliance: based on friction and frustration (no friction = higher score)
  const frictionCount = data.filter(d => d.evaluation?.Checkout_Friction_Detected === true).length;
  const frustrationCount = data.filter(d =>
    d.evaluation?.Sentiment_Shift?.toLowerCase().includes('frustrat') ||
    d.evaluation?.Sentiment_Shift?.toLowerCase().includes('angry') ||
    d.evaluation?.Sentiment_Shift?.toLowerCase().includes('confused')
  ).length;
  metrics.compliance.score = parseFloat((10 - ((frictionCount + frustrationCount) / total) * 5).toFixed(1));

  // Engagement: based on loop detection and positive sentiment
  const loopCount = data.filter(d => d.loop_detected === true).length;
  const positiveCount = data.filter(d =>
    d.evaluation?.Sentiment_Shift?.toLowerCase().includes('positive') ||
    d.evaluation?.Sentiment_Shift?.toLowerCase().includes('satisfied')
  ).length;
  metrics.engagement.score = parseFloat(
    Math.max(0, Math.min(10, 10 - (loopCount / total) * 10 + (positiveCount / total) * 3)).toFixed(1)
  );

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
            formatter={(value: number) => [`${value}/10`, 'Score']}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
