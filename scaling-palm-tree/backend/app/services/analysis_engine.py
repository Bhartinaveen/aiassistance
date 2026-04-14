import os
import json
import re
import asyncio
import hashlib

# Fetch API key
api_key = os.getenv("GEMINI_API_KEY", "")

async def analyze_transcript(transcript: str) -> dict:
    """
    Phase 2 & 3: Master Evaluation Engine (Token Optimized).
    Captures conversation context (Beginning) and outcomes (End) for token efficiency.
    """
    if not api_key:
        print("   ❌ API Key missing. Skipping analysis.")
        return None
        
    # 📡 TOKEN OPTIMIZATION: Contextual Truncation (Start + End)
    if len(transcript) > 3510:
        clean_transcript = (
            f"--- START ---\n{transcript[:1200]}\n"
            f"\n... [Truncated for efficiency] ...\n\n"
            f"--- END ---\n{transcript[-2000:]}"
        )
    else:
        clean_transcript = transcript

    from datetime import datetime
    current_date_str = datetime.now().strftime("%Y-%m-%d")
    system_prompt = f"Senior E-commerce QA Lead. Analyze raw chat logs and return a Health Report. Today's current exact date is {current_date_str}. CRITICAL INSTRUCTION: Your training cutoff is 2025, but this system operates in 2026. Never flag a date (like 2026) as a 'future date' or a 'hallucination'. Ignore calendar/time logic completely and actively look for other fundamental customer-service or operational errors instead."
    
    prompt = f'''{system_prompt}
Evaluate this chat. Flag generic/false info.

Transcript:
{clean_transcript}

Return ONLY a JSON object with strictly these keys:
"Category": (Luxury/Healthcare/Electronics/Fashion/General),
"User_Satisfaction_Score": (1-10),
"Hallucination_Detected": (bool),
"Hallucination_Reason": (If hallucination detected, explain exactly what was false, else "None"),
"Checkout_Friction_Detected": (bool),
"User_Frustration_Point": (Specific issue the user faced or "None"),
"Agent_Improvement_Rule": (Clear, easy-to-understand instruction to fix this. Use technical words only when required, or "None"),
"Agent_Message_Problem": (Clear, easy-to-understand description of the agent's mistake. Use technical words only when required, or "None"),
"User_Message_Problem": (If there's friction, explain it. If the user made no mistakes, generate a dynamically positive observation based on their actions instead of leaving it empty or 'None'),
"Sentiment_Shift": (Emotional trend),
"Bottleneck": (Technical/Process failure point),
"Root_Cause": (Original source of error),
"Summary_Insights": (1-sentence issue overview in clear, easy-to-understand language. Use technical words only when required),
"Accuracy_Score": (1-10),
"Retention_Score": (1-10),
"Compliance_Score": (1-10),
"Engagement_Score": (1-10),
"Primary_Inquiry_Type": (Type),
"Product_Mentioned": (Product or "None")'''

    # ── Model: Gemma 3 27B (instruction-tuned) via Gemini API ────────────────
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 1536
        }
    }
    
    max_retries = 4
    last_error = "Unknown"
    for attempt in range(max_retries):
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, headers={'Content-Type': 'application/json'}, timeout=40.0)
                if response.status_code != 200:
                    raise Exception(f"HTTP {response.status_code}: {response.text[:200]}")
                data = response.json()
                    
            content = data["candidates"][0]["content"]["parts"][0]["text"]

            # Strip markdown code fences if present
            content = re.sub(r'^```[a-z]*\s*', '', content.strip())
            content = re.sub(r'```$', '', content.strip())
            
            # Extract JSON block
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group(0))
            else:
                result = json.loads(content)

            # Sanitize null → "None" string for fields that expect strings
            for key in ["Hallucination_Reason", "User_Frustration_Point", "Agent_Improvement_Rule",
                        "Agent_Message_Problem", "User_Message_Problem", "Bottleneck",
                        "Root_Cause", "Product_Mentioned"]:
                if result.get(key) is None:
                    result[key] = "None"

            # ── Normalize boolean fields ────────────────────────────────────
            # Gemma sometimes returns "true"/"false"/"yes"/"no" as strings.
            # We convert them all to proper Python booleans so the frontend
            # can reliably check `=== true` without string juggling.
            for bool_key in ["Hallucination_Detected", "Checkout_Friction_Detected"]:
                raw_val = result.get(bool_key)
                if isinstance(raw_val, bool):
                    pass  # already correct
                elif isinstance(raw_val, str):
                    result[bool_key] = raw_val.strip().lower() in ("true", "yes", "1")
                elif isinstance(raw_val, int):
                    result[bool_key] = bool(raw_val)
                else:
                    result[bool_key] = False
            # ───────────────────────────────────────────────────────────────

            print(f"   ✅ Gemma 3 27B responded successfully (attempt {attempt+1})")
            print(f"   🔍 Hallucination_Detected = {result.get('Hallucination_Detected')} | Checkout_Friction = {result.get('Checkout_Friction_Detected')}")
            return result
            
        except Exception as e:
            last_error = str(e)
            print(f"   ⚠️  Attempt {attempt+1}/{max_retries} failed: {last_error[:120]}")
            if "404" in last_error:
                print(f"   ❌ 404 — Model not found. Falling back immediately.")
                break
            
            if attempt < max_retries - 1:
                if "429" in last_error or "quota" in last_error.lower():
                    wait = 25 + (attempt * 10)
                    print(f"   ⏳ Rate-limited (429). Waiting {wait}s before retry...")
                    await asyncio.sleep(wait)
                else:
                    wait = 2 ** attempt + 3
                    print(f"   ⏳ Retrying in {wait}s...")
                    await asyncio.sleep(wait)
                continue

            print(f"   ❌ Analysis failed after {max_retries} attempts.")
            break
            
    return None
