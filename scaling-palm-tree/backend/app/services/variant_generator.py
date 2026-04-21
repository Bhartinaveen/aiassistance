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
NEW REQUIREMENT: Whenever the Agent provides a better or corrected response compared to the original, prefix that message text with [FIX] so our system can highlight it.

For the `behavior_timeline` and `original_behavior` objects, provide detailed analysis for every stage (start, middle, end).
- `analysis`: a short plain-English sentence about what happened.
- `security`: highlight any sensitive data sharing, risk, or compliance breach. If none, write "None".

Return ONLY a strictly valid JSON object with this exact structure. All string values must be simple — no raw newlines, no unescaped quotes:
{{
  "original_behavior": {{
    "agent": {{ "start": {{"label": "Cold", "score": 4, "analysis": "...", "security": "None"}}, "middle": {{"label": "Unhelpful", "score": 3, "analysis": "...", "security": "None"}}, "end": {{"label": "Dismissive", "score": 2, "analysis": "...", "security": "None"}} }},
    "user": {{ "start": {{"label": "Confused", "score": 5, "analysis": "...", "security": "None"}}, "middle": {{"label": "Frustrated", "score": 3, "analysis": "...", "security": "None"}}, "end": {{"label": "Angry", "score": 1, "analysis": "...", "security": "None"}} }}
  }},
  "variants": [
    {{
      "name": "Variant 1: Brief description",
      "transcript": [
        {{"role": "User", "text": "message text here"}},
        {{"role": "Agent", "text": "[FIX] improved response here"}},
        {{"role": "User", "text": "next user message"}}
      ],
      "fixes": [
        {{"problem_identified": "specific issue in original chat", "resolution_in_variant": "how this variant fixed it"}}
      ],
      "behavior_timeline": {{
        "agent": {{ "start": {{"label": "Professional", "score": 8, "analysis": "...", "security": "None"}}, "middle": {{"label": "Empathetic", "score": 9, "analysis": "...", "security": "None"}}, "end": {{"label": "Reassuring", "score": 10, "analysis": "...", "security": "None"}} }},
        "user": {{ "start": {{"label": "Confused", "score": 5, "analysis": "...", "security": "None"}}, "middle": {{"label": "Calming down", "score": 7, "analysis": "...", "security": "None"}}, "end": {{"label": "Satisfied", "score": 9, "analysis": "...", "security": "None"}} }}
      }}
    }},
    {{
      "name": "Variant 2: Brief description",
      "transcript": [
        {{"role": "User", "text": "message text here"}},
        {{"role": "Agent", "text": "[FIX] improved response here"}}
      ],
      "fixes": [
        {{"problem_identified": "specific issue", "resolution_in_variant": "how fixed"}}
      ],
      "behavior_timeline": {{
        "agent": {{ "start": {{"label": "behavior", "score": 8, "analysis": "...", "security": "None"}}, "middle": {{"label": "behavior", "score": 9, "analysis": "...", "security": "None"}}, "end": {{"label": "behavior", "score": 10, "analysis": "...", "security": "None"}} }},
        "user": {{ "start": {{"label": "behavior", "score": 5, "analysis": "...", "security": "None"}}, "middle": {{"label": "behavior", "score": 7, "analysis": "...", "security": "None"}}, "end": {{"label": "behavior", "score": 9, "analysis": "...", "security": "None"}} }}
      }}
    }}
  ]
}}
IMPORTANT: The "transcript" field MUST be a JSON array of objects. Each object has exactly two keys: "role" (either "User" or "Agent") and "text" (the message content as a plain string with no embedded newlines).
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

            # Strip markdown fences if the model wraps output in them
            content = re.sub(r'^```[a-z]*\s*', '', content.strip())
            content = re.sub(r'```$', '', content.strip())

            # ── Robust JSON Parser ──────────────────────────────────────────
            # The model embeds unescaped double-quotes AND raw newlines inside
            # string values.  We fix this in two passes:
            #   Pass 1 – escape control characters (\n \r \t) inside strings.
            #   Pass 2 – iteratively use JSONDecodeError.pos to locate and
            #             escape the exact unescaped " that confused the parser.
            # ────────────────────────────────────────────────────────────────
            def robust_parse(raw: str) -> dict:
                json_match = re.search(r'\{.*\}', raw, re.DOTALL)
                text = json_match.group(0) if json_match else raw

                # Pass 1: escape control characters inside string values
                chars = list(text)
                in_str = False
                i = 0
                while i < len(chars):
                    c = chars[i]
                    if c == '"' and (i == 0 or chars[i-1] != '\\'):
                        in_str = not in_str
                    elif in_str:
                        if c == '\n':
                            chars[i] = '\\n'
                        elif c == '\r':
                            chars[i] = '\\r'
                        elif c == '\t':
                            chars[i] = '\\t'
                    i += 1
                text = ''.join(chars)

                # Pass 2: iteratively escape rogue double-quotes at error position
                for _ in range(40):
                    try:
                        return json.loads(text)
                    except json.JSONDecodeError as err:
                        pos = err.pos
                        # Scan backwards from the error position to find the
                        # nearest unescaped " that prematurely ended a string.
                        fixed = False
                        for j in range(pos - 1, max(0, pos - 300), -1):
                            if text[j] == '"' and (j == 0 or text[j-1] != '\\'):
                                # Escape this rogue quote
                                text = text[:j] + '\\"' + text[j+1:]
                                fixed = True
                                break
                        if not fixed:
                            break

                return json.loads(text)  # Final attempt — raises if still broken

            result = robust_parse(content)

            # ── Normalise transcript field ─────────────────────────────────
            # The prompt asks for an array of {role, text} objects.
            # Convert back to a plain string so downstream code is unchanged.
            for variant in result.get("variants", []):
                t = variant.get("transcript", "")
                if isinstance(t, list):
                    # Join message objects into a readable string
                    variant["transcript"] = "\n".join(
                        f"{msg.get('role', 'Unknown')}: {msg.get('text', '')}"
                        for msg in t
                    )
                # If it's already a string (model ignored instruction), leave it
            # ──────────────────────────────────────────────────────────────

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
