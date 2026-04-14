from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
import asyncio
from pydantic import BaseModel

# Load .env file
load_dotenv()

from app.services.data_orchestration import fetch_all_conversations, get_conversation_transcript, get_conversation_messages
from app.services.analysis_engine import analyze_transcript
from app.services.chat_agent import process_chat_query
from app.services.cache_manager import save_to_cache, get_cached_analysis, clear_cache

class ChatRequest(BaseModel):
    query: str
    
# In-memory "cache" for the current session state
recent_cache_data = []

# ─── Real-time analysis state ─────────────────────────────────────────────────
# These globals allow the frontend to poll progress and stop the analysis mid-run
# _stop_flag: set to True when the user clicks the Stop button on the frontend
# _analysis_progress: updated on every conversation loop iteration
_stop_flag = False
_analysis_progress = {
    "running": False,      # True while analysis is in progress
    "total": 0,            # Total conversations targeted for this run
    "done": 0,             # How many have been processed so far
    "cached": 0,           # How many came from cache (no AI call)
    "new": 0,              # How many were sent to Gemini
    "stopped": False,      # True if the user pressed Stop mid-run
}

app = FastAPI(title="AI QA & Analytics Engine")

@app.on_event("startup")
async def initialize_state():
    """
    Called on FastAPI startup.
    - Initializes the MongoDB connection and loads conversation/message data.
    - Clears the analysis cache so the next Scan always produces fresh AI results.
    - Does NOT trigger any analysis automatically — fully demand-driven from the dashboard.
    """
    from app.services.data_orchestration import initialize_data
    from app.services.cache_manager import clear_cache

    print(f"\n{'='*60}")
    print(f"🟢 AI CHAT ANALYTICS BACKEND STARTED")
    print(f"   Initializing database connection...")
    print(f"{'='*60}\n")

    # 1. Initialize MongoDB connection and load conversations/messages into memory
    await initialize_data()

    # 2. Clear old analysis cache so every restart gives FRESH results on next Scan
    await clear_cache()
    print(f"🗑️  Previous analysis cache cleared — ready for fresh scan.")
    print(f"\n✅ Backend is online. Open the dashboard and click Scan to begin analysis.\n")

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

@app.delete("/api/analysis/clear-cache")
async def clear_cache_endpoint(limit: int = 20):
    """
    🗑️ FORCE RE-SCAN: Clears ALL previously cached analysis reports from MongoDB,
    then immediately re-runs a fresh analysis for the specified limit.
    
    HOW TO USE FROM FRONTEND:
    - Call DELETE /api/analysis/clear-cache?limit=20  → Wipes cache, re-analyzes 20
    - Call DELETE /api/analysis/clear-cache?limit=0   → Wipes cache, re-analyzes ALL
    
    ⚠️  WARNING: This will consume Gemini API tokens for every conversation re-analyzed.
    Use this only when you want completely fresh results (e.g., after data updates).
    """
    print(f"\n{'🗑️ '*15}")
    print(f"🗑️  CACHE CLEAR REQUESTED from frontend")
    print(f"   Re-analyzing: {'ALL conversations' if limit == 0 else f'{limit} conversations'}")
    print(f"{'🗑️ '*15}\n")
    
    # Step 1: Wipe the existing cache from MongoDB
    await clear_cache()
    
    # Step 2: Re-run fresh analysis immediately (no cache hits, all new)
    result = await run_analysis(limit=limit)
    return {"status": "success", "message": "Cache cleared and re-analyzed.", "data": result.get("data", [])}

@app.get("/api/analysis/progress")
async def get_progress():
    """
    📊 REAL-TIME PROGRESS: Returns the current analysis progress state.
    
    The frontend polls this endpoint every second while analysis is running
    to update the live counter showing how many conversations are done.
    
    Returns:
    - running: True if analysis is currently in progress
    - total:   Total conversations targeted for this run
    - done:    How many have been fully processed so far
    - cached:  How many were served from cache (no Gemini call)
    - new:     How many were sent to Gemini for fresh analysis
    - stopped: True if the user pressed Stop mid-run
    """
    return {"status": "success", "progress": _analysis_progress}

@app.post("/api/analysis/stop")
async def stop_analysis():
    """
    🛑 STOP ANALYSIS: Sets the global stop flag to halt the running analysis loop.
    
    The analysis loop in run_analysis() checks this flag at the START of each
    conversation iteration. When True, it breaks immediately and returns all
    results collected so far — no conversation is left half-processed.
    
    ✅ Safe to call at any time. If no analysis is running, it has no effect.
    """
    global _stop_flag
    _stop_flag = True
    print(f"\n🛑 STOP requested from frontend — will halt after current conversation.")
    return {"status": "success", "message": "Stop signal sent. Analysis will halt after current conversation."}

@app.get("/api/conversation/{conv_id}/messages")
async def get_messages(conv_id: str):
    messages = await get_conversation_messages(conv_id)
    return {"status": "success", "messages": messages}

@app.get("/api/analysis/run")
async def run_analysis(limit: int = 0):
    """
    Runs analysis for the specified number of conversations.
    limit=0  → analyze ALL conversations in the database (no cap).
    limit=N  → analyze exactly N conversations.
    
    Results are cached in MongoDB. Subsequent runs with a higher limit will
    only send NEW (uncached) conversations to the AI — saving tokens.
    """
    from datetime import datetime
    global _stop_flag, _analysis_progress
    
    # Reset the stop flag and initialise progress at the start of each run
    _stop_flag = False
    _analysis_progress = {"running": True, "total": 0, "done": 0, "cached": 0, "new": 0, "stopped": False, "skipped_ids": []}
    
    print(f"\n{'🚀'*20}")
    print(f"🚀 ANALYSIS ENGINE STARTED at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    # 💡 FEATURE OUTING: Dynamically updates the backend terminal based on how many conversations the user requested from frontend preferences
    print(f"🎯 Target Limit Set To: {'ALL CONVERSATIONS (Full Database)' if limit == 0 else f'{limit} Conversations'}")
    print(f"{'🚀'*20}\n")
    
    # limit=0 means analyze ALL → we pass -1 to fetch_all_conversations which interprets it as "no limit"
    end = limit if limit > 0 else -1
    conversations = await fetch_all_conversations(start=0, end=end)
    cache = await get_cached_analysis()
    
    # Update total so the frontend progress counter knows how many to expect
    _analysis_progress["total"] = len(conversations)
    
    print(f"📋 Cache status: {len(cache)} previously analyzed conversations found\n")
    
    reports = []
    cached_count = 0
    new_count = 0
    
    for i, conv in enumerate(conversations):
        # ─── STOP CHECK ────────────────────────────────────────────────
        # If the user clicked Stop on the frontend, break out of the loop
        # immediately and return whatever results we have so far.
        if _stop_flag:
            print(f"\n🛑 STOP SIGNAL RECEIVED — halting at {len(reports)}/{len(conversations)} conversations.")
            _analysis_progress["stopped"] = True
            break
        # ───────────────────────────────────────────────────────────────
        
        conv_id = str(conv["_id"])
        widget_id = str(conv.get("widgetId", "Unknown_Widget"))
        
        print(f"{'─'*60}")
        print(f"🔍 [{i+1}/{len(conversations)}] Processing: {conv_id}")
        print(f"   Brand/Widget: {widget_id}")
        
        # ─── INCREMENTAL CACHE CHECK ───────────────────────────────────
        # If this conversation was already analyzed (from a previous run or
        # a prior limit), skip sending it to Gemini. Just reuse the result.
        # This means if you had 20 analyzed and now request 30,
        # only the 10 new ones get sent to the AI — saving tokens!
        # ──────────────────────────────────────────────────────────────
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
            _analysis_progress["skipped_ids"].append(conv_id)
            _analysis_progress["done"] += 1 # Increment done so counter reaches total
            continue
        
        new_count += 1
        print(f"   🤖 Sending to Gemma 3 27B for analysis...")
        evaluation = await analyze_transcript(transcript)

        # Guard: If LLM returned None (API error/503), skip this conversation
        if evaluation is None:
            print(f"   ⚠️  Skipping conv {conv_id} — LLM returned no result (API failure).")
            _analysis_progress["done"] += 1
            await asyncio.sleep(2)
            continue

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
        
        # Update live progress state after each new analysis
        _analysis_progress["done"] += 1
        _analysis_progress["new"] = new_count
        
        # Slight delay to respect Rate Limits only when hitting the AI
        await asyncio.sleep(1)
        
    global recent_cache_data
    recent_cache_data = reports
    
    # Mark analysis as finished in the progress state
    _analysis_progress["running"] = False
    _analysis_progress["done"] = len(reports)
    
    # Final summary
    print(f"\n{'='*60}")
    print(f"📊 ANALYSIS COMPLETE — SUMMARY")
    print(f"{'='*60}")
    print(f"   Total conversations:  {len(reports)}")
    print(f"   From cache (skipped): {cached_count} ✅ (no tokens used)")
    print(f"   New LLM analyses:     {new_count} 🤖 (Gemini API called)")
    if new_count == 0:
        print(f"   💡 All conversations were already cached — zero tokens consumed!")
    elif cached_count > 0:
        print(f"   💡 Incremental run: only {new_count} new conversations sent to Gemma 3 27B.")
    if reports:
        scores = [r.get("evaluation", {}).get("User_Satisfaction_Score", 0) for r in reports]
        hall_count = sum(1 for r in reports if r.get("evaluation", {}).get("Hallucination_Detected") == True)
        drop_count = sum(1 for r in reports if r.get("dropoff") == True)
        print(f"   Avg Satisfaction:     {sum(scores)/len(scores):.1f}/10")
        print(f"   Hallucination Rate:   {hall_count}/{len(reports)} ({hall_count/len(reports)*100:.0f}%)")
        print(f"   Dropout Rate:         {drop_count}/{len(reports)} ({drop_count/len(reports)*100:.0f}%)")
    print(f"{'='*60}\n")
        
    return {"status": "success", "data": reports, "skipped_ids": _analysis_progress["skipped_ids"]}

@app.get("/api/analysis/single/{conv_id}")
async def analyze_single_conversation(conv_id: str):
    """
    On-demand analysis for a single conversation ID.
    If already cached, returns the cached version. Otherwise fetches from DB, sends to LLM, and caches.
    """
    global recent_cache_data
    print(f"\n🔍 ON-DEMAND ANALYSIS REQUESTED: {conv_id}")
    
    # Check cache first
    cache = await get_cached_analysis()
    if conv_id in cache:
        print(f"   ⚡ CACHE HIT for single analysis")
        report = cache[conv_id]
        return {"status": "success", "data": report}
        
    # Not in cache, fetch transcript manually
    transcript, is_dropoff, loop_detected = await get_conversation_transcript(conv_id)
    if not transcript:
        return {"status": "error", "message": f"No transcript or messages found for {conv_id}."}
        
    print(f"   🤖 Sending {conv_id} to Gemma 3 27B for on-demand analysis...")
    evaluation = await analyze_transcript(transcript)
    
    # Try to find the exact widgetId if it's currently loaded in _conversations_cache
    widget_id = "OnDemand_Widget"
    from app.services.data_orchestration import _conversations_cache
    for c in _conversations_cache:
        if str(c.get('_id')) == conv_id:
            widget_id = str(c.get("widgetId", "Unknown_Widget"))
            break
            
    report = {
        "conversation_id": conv_id,
        "widget_id": widget_id,
        "dropoff": is_dropoff,
        "loop_detected": loop_detected,
        "evaluation": evaluation
    }
    
    await save_to_cache(conv_id, report)
    
    # Add to recent cache data so chat can see it
    existing_idx = next((i for i, r in enumerate(recent_cache_data) if r.get('conversation_id') == conv_id), -1)
    if existing_idx >= 0:
        recent_cache_data[existing_idx] = report
    else:
        recent_cache_data.insert(0, report)
        
    print(f"   ✅ On-demand analysis complete for {conv_id}.\n")
    return {"status": "success", "data": report}

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    """
    Accepts a natural language query, processes it against recent data using LangChain,
    and returns a textual response + a UI targeting directive.
    """
    result = await process_chat_query(req.query, recent_cache_data)
    return {"status": "success", "response": result}
