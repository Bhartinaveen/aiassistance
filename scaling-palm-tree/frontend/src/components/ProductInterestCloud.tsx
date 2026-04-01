"use client";

import { motion } from 'framer-motion';

export default function ProductInterestCloud({ data }: { data: any[] }) {
  // Aggregate products mentioned during chat
  const productCount: Record<string, number> = {};
  
  data.forEach(d => {
    const product = d.evaluation?.Product_Mentioned || "None";
    if (product !== "None" && product !== "Other") {
      productCount[product] = (productCount[product] || 0) + 1;
    }
  });

  const products = Object.entries(productCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <div className="w-full h-full min-h-[300px] flex flex-col p-6">
      <h3 className="text-white/70 text-sm font-medium mb-4">Trending Product Interests</h3>
      <div className="flex-1 flex flex-wrap gap-3 items-center justify-center">
        {products.length > 0 ? (
          products.map(([name, count], i) => (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              key={name}
              className="px-4 py-2 rounded-full border border-white/10 bg-white/5 text-white/90 shadow-lg hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-all cursor-default"
              style={{ fontSize: `${Math.max(12, Math.min(24, 12 + count * 2))}px` }}
            >
              {name} <span className="text-[0.6em] text-white/40 ml-1">{count}</span>
            </motion.div>
          ))
        ) : (
          <div className="text-white/30 text-sm italic">No specific products tracked yet...</div>
        )}
      </div>
    </div>
  );
}
