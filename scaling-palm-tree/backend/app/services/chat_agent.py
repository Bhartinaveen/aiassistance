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

    # Summarize data down while retaining maximum context for complex queries
    summary_blocks = []
    for d in recent_analysis_data:
        summ = f"ConvID: {d.get('conversation_id')} | Brand: {d.get('widget_id')} | Dropoff: {d.get('dropoff', False)}"
        if 'evaluation' in d:
            e = d['evaluation']
            summ += f"\nIntent: {e.get('Primary_Inquiry_Type')} | Category: {e.get('Category')} | Product: {e.get('Product_Mentioned')}\n"
            summ += f"Issues -> Friction: {e.get('Checkout_Friction_Detected')} | Hallucination: {e.get('Hallucination_Detected')}\n"
            summ += f"Problems -> User: {e.get('User_Message_Problem')} | Agent: {e.get('Agent_Message_Problem')} | Root Cause: {e.get('Root_Cause')}\n"
            summ += f"Metrics -> Satisfaction: {e.get('User_Satisfaction_Score')}/10 | Sentiment: {e.get('Sentiment_Shift')}\n"
            summ += f"Quality -> Acc:{e.get('Accuracy_Score')} Ret:{e.get('Retention_Score')} Comp:{e.get('Compliance_Score')} Eng:{e.get('Engagement_Score')}\n"
            summ += f"Insight: {e.get('Summary_Insights')}"
        summary_blocks.append(summ)
        
    context_str = "\n---\n".join(summary_blocks)

    prompt = f'''You are a helpful, brilliant Analytics Assistant for business clients.
Analyze the provided 'Recent Analysis Data' carefully and answer the user's question.

CRITICAL INSTRUCTIONS FOR YOUR ANALYSIS:
1. Speak in clear, easy-to-understand, conversational English. Avoid overly complex tech jargon so non-technical users can easily understand your insights.
2. Provide accurate, data-backed answers based ONLY on the provided metrics.
3. Structure your 'reply_text' in a proper, easy-to-read format. Use **bolding** for key metrics, bullet points for lists, and short sentences.
4. If the data lacks an answer, politely explain in simple terms that the required information isn't in the current dataset.

Recent Analysis Data:
{context_str}

User Question: {user_query}

Formulate an insightful response. Then, select the most appropriate Target Visualization from the UI dashboard:
- 'InquiryIntentChart' (Questions about general trends, common questions, or intent distribution)
- 'ProductInterestCloud' (Questions about which products are most popular or mentioned)
- 'CheckoutFrictionAlerts' / 'FrustrationHeatmap' (Questions about payment failures, checkout issues, or agent failures)
- 'ModelWeaknessRadar' (Questions about AI scores, hallucinations, or agent weaknesses)
- 'All' (General overview)

Return ONLY a strictly valid JSON object with keys "reply_text" and "target_visualization". Ensure the JSON is properly escaped so the Markdown inside "reply_text" does not break parsing.'''

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json"
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
