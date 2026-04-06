from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
import asyncio
from pydantic import BaseModel

# Load .env file
load_dotenv()

from app.services.data_orchestration import fetch_all_conversations, get_conversation_transcript
from app.services.analysis_engine import analyze_transcript
from app.services.chat_agent import process_chat_query
from app.services.cache_manager import save_to_cache, get_cached_analysis, clear_cache

class ChatRequest(BaseModel):
    query: str
    
# In-memory "cache" for the current session state
recent_cache_data = []

app = FastAPI(title="AI QA & Analytics Engine")

@app.on_event("startup")
async def initialize_state():
    """
    Called on FastAPI startup.
    - Connects to Atlas and loads conversations/messages into memory.
    - Fetches all PREVIOUSLY analyzed reports from MongoDB so the dashboard 
      and chat agent have data immediately, instead of waiting for a fresh run.
    """
    from app.services.data_orchestration import initialize_data, _conversations_cache, _messages_cache
    from app.services.cache_manager import get_all_cached_reports
    
    # 1. Clear previous analysis cache to ensure fresh "scraping"
    await clear_cache()
    
    # 2. Initialize MongoDB connection and core data (conversations/messages)
    await initialize_data()
    
    # 3. Trigger a fresh analysis run in the background immediately
    print(f"🚀 AUTO-SCRAP: Triggering background AI analysis on startup...\n")
    asyncio.create_task(run_analysis())
    
    # 4. Show target summary (top 30) for review
    start, end = 0, 30
    total = len(_conversations_cache)
    actual_end = min(end, total)
    batch = _conversations_cache[start:actual_end]
    
    if batch:
        print(f"{'='*70}")
        print(f"📦 TARGET CONVERSATIONS: #{start+1} to #{actual_end} (out of {total} total)")
        print(f"{'='*70}")
        print(f"{'#':<5} {'Conversation ID':<30} {'Widget/Brand':<28} {'Created'}")
        print(f"{'─'*70}")
        for i, conv in enumerate(batch):
            conv_id = str(conv.get('_id', 'unknown'))
            widget_id = str(conv.get('widgetId', 'unknown'))
            created = str(conv.get('createdAt', 'unknown'))[:19]
            print(f"{start+i+1:<5} {conv_id:<30} {widget_id[:26]:<28} {created}")
        
        # Count messages per conversation 
        msg_counts = {}
        for msg in _messages_cache:
            cid = msg.get('conversationId', '')
            if cid in [str(c.get('_id', '')) for c in batch]:
                msg_counts[cid] = msg_counts.get(cid, 0) + 1
        
        total_msgs = sum(msg_counts.values())
        print(f"{'─'*70}")
        print(f"📊 Total messages across these {len(batch)} conversations: {total_msgs}")
        print(f"{'='*70}")
        print(f"\n⚡ SYSTEM READY — Background analysis is active. Dashboard will update live.\n")

# Allow CORS for Next.js frontend 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to the AI QA & Analytics Engine API"}

@app.get("/api/analysis/run")
async def run_analysis():
    """
    Kicks off an evaluation of the system, fetches conversations, 
    uses a local cache to avoid redundant AI calls, and returns reports.
    """
    from datetime import datetime
    
    print(f"\n{'🚀'*20}")
    print(f"🚀 ANALYSIS ENGINE STARTED at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'🚀'*20}\n")
    
    conversations = await fetch_all_conversations()
    cache = await get_cached_analysis()
    
    print(f"📋 Cache status: {len(cache)} previously analyzed conversations found\n")
    
    reports = []
    cached_count = 0
    new_count = 0
    
    for i, conv in enumerate(conversations):
        conv_id = str(conv["_id"])
        widget_id = str(conv.get("widgetId", "Unknown_Widget"))
        
        print(f"{'─'*60}")
        print(f"🔍 [{i+1}/{len(conversations)}] Processing: {conv_id}")
        print(f"   Brand/Widget: {widget_id}")
        
        # Check cache first
        if conv_id in cache:
            cached_report = cache[conv_id]
            ev = cached_report.get("evaluation", {})
            print(f"   ⚡ CACHE HIT — Skipping LLM call")
            print(f"   📊 Cached Result: Score={ev.get('User_Satisfaction_Score')}/10 | "
                  f"Category={ev.get('Category')} | "
                  f"Hallucination={ev.get('Hallucination_Detected')}")
            reports.append(cached_report)
            cached_count += 1
            continue
            
        transcript, is_dropoff, loop_detected = await get_conversation_transcript(conv_id)
        
        if not transcript:
            print(f"   ⏭️  SKIPPED — Empty transcript")
            continue
        
        new_count += 1
        print(f"   🤖 Sending to Gemini LLM for analysis...")
        evaluation = await analyze_transcript(transcript)
        
        report = {
            "conversation_id": conv_id,
            "widget_id": widget_id,
            "dropoff": is_dropoff,
            "loop_detected": loop_detected,
            "evaluation": evaluation
        }
        
        # Log the LLM result
        print(f"   ✅ LLM RESULT:")
        print(f"      Category:      {evaluation.get('Category', '?')}")
        print(f"      Score:         {evaluation.get('User_Satisfaction_Score', '?')}/10")
        print(f"      Hallucination: {evaluation.get('Hallucination_Detected', '?')}")
        print(f"      Sentiment:     {evaluation.get('Sentiment_Shift', '?')}")
        print(f"      Inquiry Type:  {evaluation.get('Primary_Inquiry_Type', '?')}")
        print(f"      Product:       {evaluation.get('Product_Mentioned', '?')}")
        print(f"      Dropoff:       {is_dropoff} | Loop: {loop_detected}")
        
        # Save to MongoDB
        await save_to_cache(conv_id, report)
        reports.append(report)
        
        # Slight delay to respect Rate Limits only when hitting the AI
        await asyncio.sleep(1)
        
    global recent_cache_data
    recent_cache_data = reports
    
    # Final summary
    print(f"\n{'='*60}")
    print(f"📊 ANALYSIS COMPLETE — SUMMARY")
    print(f"{'='*60}")
    print(f"   Total conversations:  {len(reports)}")
    print(f"   From cache:           {cached_count}")
    print(f"   New LLM analyses:     {new_count}")
    if reports:
        scores = [r.get("evaluation", {}).get("User_Satisfaction_Score", 0) for r in reports]
        hall_count = sum(1 for r in reports if r.get("evaluation", {}).get("Hallucination_Detected") == True)
        drop_count = sum(1 for r in reports if r.get("dropoff") == True)
        print(f"   Avg Satisfaction:     {sum(scores)/len(scores):.1f}/10")
        print(f"   Hallucination Rate:   {hall_count}/{len(reports)} ({hall_count/len(reports)*100:.0f}%)")
        print(f"   Dropout Rate:         {drop_count}/{len(reports)} ({drop_count/len(reports)*100:.0f}%)")
    print(f"{'='*60}\n")
        
    return {"status": "success", "data": reports}

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    """
    Accepts a natural language query, processes it against recent data using LangChain,
    and returns a textual response + a UI targeting directive.
    """
    result = await process_chat_query(req.query, recent_cache_data)
    return {"status": "success", "response": result}
