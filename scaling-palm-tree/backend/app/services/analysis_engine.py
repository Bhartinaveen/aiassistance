import os
import json
import re
import asyncio
import hashlib

# Fetch API key
api_key = os.getenv("GEMINI_API_KEY", "")

async def analyze_transcript(transcript: str) -> dict:
    """
    Phase 2 & 3: Master Evaluation Engine.
    Acts as a Senior QA Lead for E-commerce AI, discovering categories, 
    detecting hallucinations, sentiment shifts, and identifying bottlenecks/root causes.
    """
    if not api_key:
        return _generate_mock_data(transcript, "Mock Mode: API Key missing")
        
    system_prompt = "You are a Senior QA Lead for E-commerce AI. Your task is to analyze chat transcripts and turn raw logs into a Health Report."
    
    prompt = f'''{system_prompt}
    
Evaluate this e-commerce chat transcript between a User and an AI Agent.
Analyze the story, categorical classification, and technical performance.
BE AGGRESSIVE: If the agent mentions any specific price, feature, or policy that seems even slightly generic or unverified, flag it as a potential hallucination.

Transcript:
{transcript}

Return a JSON object with these exact keys:
"Category": (Luxury, Healthcare, Electronics, Fashion, or General)
"User_Satisfaction_Score": (integer 1-10)
"Hallucination_Detected": (boolean)
"Hallucination_Reason": (Specific reason or "None")
"Checkout_Friction_Detected": (boolean)
"User_Frustration_Point": (If friction detected, specific issue like "Payment Timeout" or "Coupon Error", else "None")
"Agent_Improvement_Rule": (Specific instruction to fix the issue, e.g., "AI should offer alternative payment methods", else "None")
"Sentiment_Shift": (Emotional trend)
"Bottleneck": (Specific failure point)
"Root_Cause": (Error source)
"Summary_Insights": (1-sentence summary)
"Primary_Inquiry_Type": (Inquiry type)
"Product_Mentioned": (Product name or "None")

Return ONLY the JSON block. Do not include markdown code blocks.'''

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.1
        }
    }
    
    max_retries = 4
    for attempt in range(max_retries):
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, headers={'Content-Type': 'application/json'}, timeout=40.0)
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
            error_msg = str(e)
            if "404" in error_msg:
                print(f"Analysis skipping retries for 404 unsupported model: {e}. Falling back immediately.")
                break
            
            if attempt < max_retries - 1:
                if "429" in error_msg or "quota" in error_msg.lower():
                    await asyncio.sleep(25 + (attempt * 10)) 
                else:
                    await asyncio.sleep(2 ** attempt + 3) 
                continue

            print(f"Analysis failed after {max_retries} attempts: {e}. Falling back to simulated data.")
            break
            
    return _generate_mock_data(transcript, f"Fallback Error: {str(e)[:50]}")

def _generate_mock_data(transcript: str, reason: str) -> dict:
    # Simulated Data Generator for fallback and robustness
    hashed = int(hashlib.md5(transcript.encode()).hexdigest(), 16)
    
    categories = ["Luxury", "Healthcare", "Electronics", "Fashion", "General"]
    intents = ["Product Inquiry", "Checkout Issue", "Shipping Q", "Return Policy", "Order Status"]
    products = ["Blue Nectar Face Cream", "Vitamin C Serum", "Kumkumadi Tailam", "Ayurvedic Hair Oil", "None"]
    root_causes = ["Admin Data Error", "Agent Logic Error", "User Frustration", "Agent Logic Error"]
    hallucination_reasons = [
        "Agent suggested a price for a product that is currently not in the catalog.",
        "Agent promised a 2-day delivery which contradicts the standard 5-day shipping policy.",
        "Agent claimed the product contains ingredients not listed in the official manifest.",
        "Agent offered a discount code that does not exist in the active promotions list."
    ]
    
    friction_scenarios = [
        {"friction": "Payment Gateway Timeout", "rule": "AI should proactively offer to send a manual payment link."},
        {"friction": "Discount Code 'SAVE20' Rejected", "rule": "AI must verify active promotions before suggesting codes."},
        {"friction": "Address Validation Loop", "rule": "AI should detect repeated address failures and suggest guest checkout."},
        {"friction": "Cart Item Availability Mismatch", "rule": "AI needs real-time stock sync before confirming checkout steps."},
        {"friction": "Credit Card Type Not Supported", "rule": "AI should list supported payment methods early in the flow."}
    ]
    
    scenario = friction_scenarios[hashed % len(friction_scenarios)]
    
    return {
        "Category": categories[hashed % len(categories)],
        "User_Satisfaction_Score": (hashed % 6) + 4, # Scores between 4-10
        "Hallucination_Detected": bool(hashed % 2 == 0),
        "Hallucination_Reason": hallucination_reasons[hashed % len(hallucination_reasons)] if bool(hashed % 2 == 0) else "None",
        "Checkout_Friction_Detected": bool(hashed % 3 == 0),
        "User_Frustration_Point": scenario["friction"] if bool(hashed % 3 == 0) else "None",
        "Agent_Improvement_Rule": scenario["rule"] if bool(hashed % 3 == 0) else "None",
        "Sentiment_Shift": "Neutral to Positive" if hashed % 3 == 0 else "Neutral to Frustrated",
        "Bottleneck": intents[hashed % len(intents)] + " queries",
        "Root_Cause": root_causes[hashed % len(root_causes)],
        "Summary_Insights": f"Simulated evaluation: {reason}",
        "Primary_Inquiry_Type": intents[hashed % len(intents)],
        "Product_Mentioned": products[hashed % len(products)]
    }
