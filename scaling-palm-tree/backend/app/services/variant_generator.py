import os
import json
import re
import asyncio
import httpx

from app.services.analysis_engine import analyze_transcript
from app.services.data_orchestration import get_conversation_transcript

api_key = os.getenv("GEMINI_API_KEY", "")

async def generate_variants(transcript: str) -> list:
    """
    Generates 2 alternative chat transcripts representing a "better" handling
    of the user's issue to increase user satisfaction.
    """
    if not api_key:
        print("   ❌ API Key missing. Skipping variant generation.")
        return []

    # 📡 TOKEN OPTIMIZATION: Contextual Truncation (Start + End)
    if len(transcript) > 3510:
        clean_transcript = (
            f"--- START ---\n{transcript[:1200]}\n"
            f"\n... [Truncated for efficiency] ...\n\n"
            f"--- END ---\n{transcript[-2000:]}"
        )
    else:
        clean_transcript = transcript

    prompt = f'''You are an expert E-commerce QA Lead and Customer Success Manager.
Given the following chat transcript, generate 2 alternative distinct variants of the chat transcript.
In these variants, the 'Agent' should respond differently to better resolve the user's issue, avoid hallucinations, prevent drop-off, and maximize user satisfaction.

Original Transcript:
{clean_transcript}

CRITICAL INSTRUCTION: Start the variant EXACTLY as the original chat started. Do not add a new generic greeting if the original chat did not have one. Do not alter the initial messages that correctly set up the context.
NEW REQUIREMENT: In the 'transcript', whenever the Agent provides a better or corrected response compared to the original, wrap the improved text in <fix>...</fix> tags. This will help our system highlight these improvements to the user.

For the `behavior_timeline` and `original_behavior` objects, you MUST provide detailed analysis for every single dot (Start, Middle, End). 
- In `analysis`, write a short, easy-to-understand sentence explaining WHAT happened. For Start: Cover tone, clarity, intent, initial response. For Middle: Cover engagement, problem-solving, confusion. For End: Cover resolution quality, success, satisfaction. Keep it extremely simple and clear for non-technical users. 
- In `security`, detect and clearly highlight ANY sensitive data sharing, risk, compliance breach, or unsafe interaction. If none, output "None".

Return ONLY a strictly valid JSON object with the following structure:
{{
  "original_behavior": {{
    "agent": {{ "start": {{"label": "(e.g., Cold)", "score": 4, "analysis": "...", "security": "..."}}, "middle": {{"label": "(e.g., Unhelpful)", "score": 3, "analysis": "...", "security": "..."}}, "end": {{"label": "(e.g., Dismissive)", "score": 2, "analysis": "...", "security": "..."}} }},
    "user": {{ "start": {{"label": "(e.g., Confused)", "score": 5, "analysis": "...", "security": "..."}}, "middle": {{"label": "(e.g., Frustrated)", "score": 3, "analysis": "...", "security": "..."}}, "end": {{"label": "(e.g., Angry)", "score": 1, "analysis": "...", "security": "..."}} }}
  }},
  "variants": [
    {{
      "name": "Variant 1: (Brief description, e.g., Empathetic and concise)",
      "transcript": "(full variant transcript matching the flow of the original chat, but resolving the issue better)",
      "fixes": [
        {{ "problem_identified": "(specific issue in original chat)", "resolution_in_variant": "(how this variant fixed it)" }}
      ],
      "behavior_timeline": {{
        "agent": {{ "start": {{"label": "(e.g., Professional)", "score": 8, "analysis": "...", "security": "..."}}, "middle": {{"label": "(e.g., Empathetic)", "score": 9, "analysis": "...", "security": "..."}}, "end": {{"label": "(e.g., Reassuring)", "score": 10, "analysis": "...", "security": "..."}} }},
        "user": {{ "start": {{"label": "(e.g., Confused)", "score": 5, "analysis": "...", "security": "..."}}, "middle": {{"label": "(e.g., Calming down)", "score": 7, "analysis": "...", "security": "..."}}, "end": {{"label": "(e.g., Satisfied)", "score": 9, "analysis": "...", "security": "..."}} }}
      }}
    }},
    {{
      "name": "Variant 2: (Brief description)",
      "transcript": "(full variant transcript)",
      "fixes": [
        {{ "problem_identified": "(specific issue in original chat)", "resolution_in_variant": "(how this variant fixed it)" }}
      ],
      "behavior_timeline": {{
        "agent": {{ "start": {{"label": "(behavior)", "score": 8, "analysis": "...", "security": "..."}}, "middle": {{"label": "(behavior)", "score": 9, "analysis": "...", "security": "..."}}, "end": {{"label": "(behavior)", "score": 10, "analysis": "...", "security": "..."}} }},
        "user": {{ "start": {{"label": "(behavior)", "score": 5, "analysis": "...", "security": "..."}}, "middle": {{"label": "(behavior)", "score": 7, "analysis": "...", "security": "..."}}, "end": {{"label": "(behavior)", "score": 9, "analysis": "...", "security": "..."}} }}
      }}
    }}
  ]
}}
Ensure the 'transcript' string contains newline characters (\\n) separating each line of dialogue.
'''

    # ── Model: Gemma 3 27B ────────────────
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 2048
        }
    }
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, headers={'Content-Type': 'application/json'}, timeout=60.0)
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

            return result
            
        except Exception as e:
            print(f"   ⚠️  Variant Gen Attempt {attempt+1}/{max_retries} failed: {str(e)[:120]}")
            if "429" in str(e) or "quota" in str(e).lower():
                await asyncio.sleep(15)
            else:
                await asyncio.sleep(3)
            continue
            
    return {}

async def process_conversation_variants(conv_id: str, original_report: dict) -> dict:
    """
    Fetches the original transcript, generates variants, and scores them.
    Returns the full structure for the UI.
    """
    print(f"\n✨ GENERATING AUTO-VARIANTS for {conv_id}...")
    transcript, is_dropoff, loop_detected = await get_conversation_transcript(conv_id)
    
    if not transcript:
        return {"status": "error", "message": "Transcript not found."}

    # Generate base payload containing original behavior and variant transcripts
    generation_result = await generate_variants(transcript)
    
    variants = generation_result.get("variants", [])
    original_behavior = generation_result.get("original_behavior", {})

    if not variants:
        return {"status": "error", "message": "Failed to generate variants."}

    print(f"   🔄 Generated {len(variants)} variants. Scoring them...")
    
    # Analyze the variants concurrently
    async def analyze_and_format(variant):
        print(f"      🤖 Scoring {variant['name']}...")
        evaluation = await analyze_transcript(variant['transcript'])
        return {
            "name": variant["name"],
            "transcript": variant["transcript"],
            "fixes": variant.get("fixes", []),
            "behavior_timeline": variant.get("behavior_timeline", {}),
            "evaluation": evaluation
        }
        
    tasks = [analyze_and_format(v) for v in variants]
    scored_variants = await asyncio.gather(*tasks)
    
    # Filter out failures
    scored_variants = [v for v in scored_variants if v["evaluation"] is not None]

    print(f"   ✅ Variant generation complete for {conv_id}.\n")
    return {
        "status": "success",
        "data": {
            "original": {
                "evaluation": original_report.get("evaluation", {}),
                "behavior": original_behavior
            },
            "variants": scored_variants
        }
    }
