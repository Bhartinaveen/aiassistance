import os
import json
import asyncio
import httpx
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Constants
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) # Root: mlai/
CONVERSATIONS_FILE = os.path.join(BASE_DIR, "conversations.json")
MESSAGES_FILE = os.path.join(BASE_DIR, "messages.json")
API_KEY = os.getenv("GEMINI_API_KEY", "")

async def get_transcript(conversation_id, messages_cache):
    """Reconstructs the transcript for a specific conversation ID."""
    messages = [m for m in messages_cache if m.get("conversationId") == conversation_id]
    messages.sort(key=lambda x: x.get("timestamp", ""))
    
    transcript_lines = []
    for msg in messages:
        sender = msg.get("sender", "unknown")
        text = msg.get("text", "").split("End of stream")[0].strip()
        if text.startswith("{") and text.endswith("}"):
            text = "[System Interaction]"
        
        meta = msg.get("metadata", {})
        if msg.get("messageType") == "event":
            event_type = meta.get("eventType", "unknown")
            product = meta.get("productName", "")
            transcript_lines.append(f"[Event: {event_type} {product}]")
        else:
            transcript_lines.append(f"{sender.capitalize()}: {text}")
            
    return "\n".join(transcript_lines)

async def analyze_transcript(transcript, conv_id):
    """Analyzes a transcript via Gemini API."""
    if not API_KEY:
        return {"error": "API Key missing"}

    prompt = f"""You are a Senior QA Lead for E-commerce AI. Analyze this transcript and return a JSON health report.
    BE AGGRESSIVE: Flag any generic or unverified claims as potential hallucinations.
    
    Transcript:
    {transcript}
    
    Return a JSON object with these exact keys:
    "Category": (Luxury, Healthcare, Electronics, Fashion, or General)
    "User_Satisfaction_Score": (integer 1-10)
    "Hallucination_Detected": (boolean)
    "Hallucination_Reason": (Specific reason or "None")
    "Checkout_Friction_Detected": (boolean)
    "User_Frustration_Point": (If friction detected, else "None")
    "Agent_Improvement_Rule": (Specific instruction, else "None")
    "Sentiment_Shift": (Emotional trend)
    "Summary_Insights": (1-sentence summary)
    "Primary_Inquiry_Type": (Inquiry type)
    "Product_Mentioned": (Product name or "None")
    """

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={API_KEY}"
    payload = {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"temperature": 0.1, "response_mime_type": "application/json"}}
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=30.0)
            if response.status_code != 200:
                print(f"Error for {conv_id}: {response.status_code}")
                return {"error": f"HTTP {response.status_code}"}
            
            data = response.json()
            content = data["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(content)
    except Exception as e:
        print(f"Failed analysis for {conv_id}: {e}")
        return {"error": str(e)}

async def main():
    print(f"🚀 Starting Batch Analysis at {datetime.now()}")
    
    # Load Data
    with open(CONVERSATIONS_FILE, "r", encoding="utf-8") as f:
        conversations = json.load(f)
    with open(MESSAGES_FILE, "r", encoding="utf-8") as f:
        messages = json.load(f)
        
    sample_size = 30
    subset = conversations[:sample_size]
    results = []
    
    for i, conv in enumerate(subset):
        conv_id = conv.get("conversationId")
        print(f"[{i+1}/{sample_size}] Processing ID: {conv_id}...")
        
        transcript = await get_transcript(conv_id, messages)
        analysis = await analyze_transcript(transcript, conv_id)
        
        result_entry = {
            "conversation_id": conv_id,
            "widget_id": conv.get("widgetId", "unknown"),
            "audit": analysis
        }
        results.append(result_entry)
        
        # Rate limit protection
        await asyncio.sleep(2) 
        
    # Save Results
    with open("batch_audit_results.json", "w") as f:
        json.dump(results, f, indent=2)
        
    print(f"\n✅ Analysis complete! Results saved to batch_audit_results.json")

if __name__ == "__main__":
    asyncio.run(main())
