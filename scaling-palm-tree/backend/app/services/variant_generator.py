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
            "maxOutputTokens": 4096  # Raised from 2048 to prevent truncation-induced parse errors
        }
    }

    # ── Robust JSON repair helpers ─────────────────────────────────────────────

    def sanitize_control_chars(text: str) -> str:
        """Escape raw control characters that appear inside JSON string values."""
        result = []
        in_str = False
        i = 0
        while i < len(text):
            c = text[i]
            # Handle existing escape sequences (keep intact)
            if c == '\\' and in_str:
                result.append(c)
                i += 1
                if i < len(text):
                    result.append(text[i])
                i += 1
                continue
            if c == '"':
                in_str = not in_str
                result.append(c)
                i += 1
                continue
            if in_str:
                if c == '\n':
                    result.append('\\n')
                elif c == '\r':
                    result.append('\\r')
                elif c == '\t':
                    result.append('\\t')
                elif ord(c) < 0x20:
                    result.append(f'\\u{ord(c):04x}')
                else:
                    result.append(c)
            else:
                result.append(c)
            i += 1
        return ''.join(result)

    def remove_trailing_commas(text: str) -> str:
        """Remove trailing commas before ] or } — a common LLM mistake."""
        return re.sub(r',\s*([}\]])', r'\1', text)

    def remove_comments(text: str) -> str:
        """Strip // single-line comments that appear outside string values."""
        result = []
        in_str = False
        i = 0
        while i < len(text):
            c = text[i]
            if c == '\\' and in_str:
                result.append(c)
                i += 1
                if i < len(text):
                    result.append(text[i])
                i += 1
                continue
            if c == '"':
                in_str = not in_str
                result.append(c)
                i += 1
                continue
            if not in_str and c == '/' and i + 1 < len(text) and text[i + 1] == '/':
                # Skip to end of line
                while i < len(text) and text[i] != '\n':
                    i += 1
                continue
            result.append(c)
            i += 1
        return ''.join(result)

    def count_unescaped_quotes_before(text: str, pos: int) -> int:
        """Count unescaped double-quotes in text[0:pos]."""
        count = 0
        i = 0
        while i < pos:
            if text[i] == '\\':
                i += 2  # skip escaped char
                continue
            if text[i] == '"':
                count += 1
            i += 1
        return count

    def repair_rogue_quotes(text: str) -> str:
        """
        Iteratively locate and escape rogue unescaped double-quotes that appear
        INSIDE string values.  We confirm a quote is inside a string by counting
        all unescaped quotes before it — an odd count means we're inside a string.
        This prevents accidentally escaping structural delimiters.
        """
        for _ in range(80):
            try:
                json.loads(text)
                return text  # No error — done
            except json.JSONDecodeError as err:
                pos = err.pos
                fixed = False
                # Search backwards from the error position for a rogue quote
                for j in range(pos - 1, max(0, pos - 600), -1):
                    if text[j] == '"' and (j == 0 or text[j - 1] != '\\'):
                        quote_count = count_unescaped_quotes_before(text, j)
                        if quote_count % 2 == 1:
                            # We're inside a string — this quote is rogue
                            text = text[:j] + '\\"' + text[j + 1:]
                            fixed = True
                            break
                if not fixed:
                    break
        return text

    def robust_parse(raw: str) -> dict:
        # Extract the outermost {...} block
        json_match = re.search(r'\{.*\}', raw, re.DOTALL)
        text = json_match.group(0) if json_match else raw

        # Strategy 1: Direct parse (model produced valid JSON)
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # Strategy 2: Sanitize control characters only
        t2 = sanitize_control_chars(text)
        try:
            return json.loads(t2)
        except json.JSONDecodeError:
            pass

        # Strategy 3: Remove trailing commas + comments, then sanitize
        t3 = remove_comments(text)
        t3 = remove_trailing_commas(t3)
        t3 = sanitize_control_chars(t3)
        try:
            return json.loads(t3)
        except json.JSONDecodeError:
            pass

        # Strategy 4: Iterative rogue-quote repair (stateful, quote-count aware)
        t4 = repair_rogue_quotes(t3)
        return json.loads(t4)  # Raises if still broken

    # ── Retry loop ────────────────────────────────────────────────────────────

    max_retries = 3
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url, json=payload,
                    headers={'Content-Type': 'application/json'},
                    timeout=60.0
                )
                if response.status_code != 200:
                    raise Exception(f"HTTP {response.status_code}: {response.text[:200]}")
                data = response.json()

            content = data["candidates"][0]["content"]["parts"][0]["text"]

            # Strip markdown fences if the model wraps output in them
            content = re.sub(r'^```[a-z]*\s*', '', content.strip())
            content = re.sub(r'```\s*$', '', content.strip())

            result = robust_parse(content)

            # ── Normalise transcript field ─────────────────────────────────
            # The prompt asks for an array of {role, text} objects.
            # Convert to a plain string so downstream code is unchanged.
            for variant in result.get("variants", []):
                t = variant.get("transcript", "")
                if isinstance(t, list):
                    variant["transcript"] = "\n".join(
                        f"{msg.get('role', 'Unknown')}: {msg.get('text', '')}"
                        for msg in t
                    )
            # ──────────────────────────────────────────────────────────────

            return result

        except Exception as e:
            print(f"   ⚠️  Variant Gen Attempt {attempt + 1}/{max_retries} failed: {str(e)[:120]}")
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
