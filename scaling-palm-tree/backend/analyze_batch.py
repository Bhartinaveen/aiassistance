"""
analyze_batch.py — MongoDB Edition
Fetches conversations/messages from MongoDB Atlas and saves results to a MongoDB collection.
No local JSON files used.
"""
import os
import json
import asyncio
import httpx
from datetime import datetime
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# Load environment variables
load_dotenv()

# Constants
MONGO_URI = os.getenv("MONGO_URI", "")
DB_NAME = "ai_analytics"
API_KEY = os.getenv("GEMINI_API_KEY", "")
RESULTS_COLLECTION = "batch_audit_results"

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
    print(f"🚀 Starting MongoDB Batch Analysis at {datetime.now()}")
    
    if not MONGO_URI:
        print("❌ MONGO_URI missing")
        return

    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    
    # Load Data from MongoDB
    print("📂 Fetching conversations from Atlas...")
    conversations = await db["conversations"].find({}).to_list(length=100) # Sample 100
    
    print("📂 Fetching messages from Atlas...")
    messages = await db["messages"].find({}).to_list(length=None)
        
    sample_size = 30
    subset = conversations[:sample_size]
    results = []
    
    for i, conv in enumerate(subset):
        conv_id = str(conv.get("_id"))
        # In original JSON it was 'conversationId', in MongoDB it's often the _id or a field.
        # Let's check both.
        cid_for_query = conv.get("conversationId") or conv_id
        
        print(f"[{i+1}/{sample_size}] Processing ID: {cid_for_query}...")
        
        transcript = await get_transcript(cid_for_query, messages)
        if not transcript:
            print(f"   ⚠️ No transcript found for {cid_for_query}")
            continue

        analysis = await analyze_transcript(transcript, cid_for_query)
        
        result_entry = {
            "conversation_id": cid_for_query,
            "widget_id": conv.get("widgetId", "unknown"),
            "audit": analysis,
            "analyzed_at": datetime.utcnow()
        }
        results.append(result_entry)
        
        # Rate limit protection
        await asyncio.sleep(2) 
        
    # Save Results to MongoDB
    if results:
        print(f"📤 Uploading {len(results)} results to MongoDB collection '{RESULTS_COLLECTION}'...")
        coll = db[RESULTS_COLLECTION]
        await coll.drop() # Clear old results like the JSON script did
        await coll.insert_many(results)
        print(f"\n✅ Analysis complete! Results saved to MongoDB cluster.")
    else:
        print("\n⚠️ No results to save.")
        
    client.close()

if __name__ == "__main__":
    asyncio.run(main())
