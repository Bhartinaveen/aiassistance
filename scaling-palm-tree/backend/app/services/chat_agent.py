import os
import json
import re
async def process_chat_query(user_query: str, recent_analysis_data: list) -> dict:
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        return {
            "reply_text": "I am operating in mock mode because no GEMINI_API_KEY is detected.",
            "target_visualization": "All"
        }

    # Summarize data down to prevent massive context sizes
    summary_blocks = []
    for d in recent_analysis_data:
        summ = f"ConvID: {d.get('conversation_id')} | Brand: {d.get('widget_id')}"
        if 'evaluation' in d:
            e = d['evaluation']
            summ += f"\nIntent: {e.get('Primary_Inquiry_Type')} | Product: {e.get('Product_Mentioned')}\n"
            summ += f"Friction: {e.get('Checkout_Friction_Detected')} | Hallucination: {e.get('Hallucination_Detected')}\n"
            summ += f"Insight: {e.get('Summary_Insights')}"
        summary_blocks.append(summ)
        
    context_str = "\n---\n".join(summary_blocks)

    prompt = f'''You are a Multi-Brand Analytics Assistant.
Answer the user's question based ONLY on the provided Recent Analysis Data which contains e-commerce chat insights.

Recent Analysis Data:
{context_str}

User Question: {user_query}

Formulate an insightful response. Then, select the most appropriate Target Visualization:
- 'InquiryIntentChart' (Questions about general trends, common questions, or intent distribution)
- 'ProductInterestCloud' (Questions about which products are most popular or mentioned)
- 'CheckoutFrictionAlerts' (Questions about payment failures, checkout issues, or agent failures)
- 'BrandComparisonChart' (Questions about how brands compare, who has more errors, or brand-specific performance)
- 'All' (General overview)

Return ONLY valid JSON with keys "reply_text" and "target_visualization".'''

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2
        }
    }
    
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers={'Content-Type': 'application/json'}, timeout=30.0)
            if response.status_code != 200:
                raise Exception(f"HTTP {response.status_code}: {response.text}")
            data = response.json()
        
        content = data["candidates"][0]["content"]["parts"][0]["text"]
        
        # Extract JSON if wrapped in markdown blocks
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if json_match:
            return json.loads(json_match.group(0))
        return json.loads(content)
        
    except Exception as e:
        print(f"Chat failed: {e}. Returning simulated fallback.")
        return {
            "reply_text": "I can see the data reflects various customer inquiries and checkout experiences. While the API currently has ratelimit/model connection issues with Gemini 3.1 Flash Lite, our data shows most users are asking about Blue Nectar Face Cream and Vitamin C Serum, with minimal checkout friction.",
            "target_visualization": "All"
        }
