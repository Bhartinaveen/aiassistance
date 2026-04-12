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
    - Connects to Atlas and loads conversations/messages into memory.
    - Fetches all PREVIOUSLY analyzed reports from MongoDB so the dashboard 
      and chat agent have data immediately, instead of waiting for a fresh run.
    """
    from app.services.data_orchestration import initialize_data, _conversations_cache, _messages_cache
    from app.services.cache_manager import get_all_cached_reports
    
    # ─────────────────────────────────────────────────────────────────
    # NOTE: We do NOT clear the cache on startup anymore.
    # This allows the system to resume from where it left off:
    # - Previously analyzed conversations are loaded from MongoDB instantly.
    # - Only NEW un-analyzed conversations will be sent to Gemini.
    # - This means zero redundant API calls and zero wasted tokens!
    # ─────────────────────────────────────────────────────────────────
    
    # 1. Initialize MongoDB connection and core data (conversations/messages)
    await initialize_data()
    
    # 2. Load any previously cached reports into memory RIGHT NOW
    #    so the dashboard has data immediately on restart (no waiting for AI)
    global recent_cache_data
    existing_reports = await get_all_cached_reports()
    if existing_reports:
        recent_cache_data = existing_reports
        print(f"\n⚡ STARTUP: Loaded {len(existing_reports)} previously analyzed conversations from cache.")
        print(f"   Dashboard is ready immediately! Only new conversations will be sent to Gemini.\n")
    
    # 3. Trigger a fresh incremental analysis run in the background
    #    It will automatically skip already-cached conversations.
    print(f"🚀 AUTO-SCRAP: Triggering incremental background AI analysis on startup...\n")
    asyncio.create_task(run_analysis())
    
    # 4. Show target summary (top 20) for review
    start, end = 0, 20
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
async def run_analysis(limit: int = 20):
    """
    Kicks off an evaluation of the system, fetches conversations, 
    uses a local cache to avoid redundant AI calls, and returns reports.
    
    NOTE: limit=20 by default. Pass limit=0 to process ALL conversations in the database.
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
    
    # 💡 TIP: By default, this limits analysis to 20 conversations to save API tokens.
    # If someone wants to analyze ALL conversation data, they can choose to do that
    # by setting limit=0 (e.g., calling the API via GET /api/analysis/run?limit=0).
    # 
    # HOW IT WORKS:
    # We assign `-1` as the variable here when `limit=0` is passed.
    # The `fetch_all_conversations` data fetcher sees `-1` and automatically 
    # calculates `len(_conversations_cache)` to set the exact max possible target!
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
        
        # Update live progress state after each new analysis
        _analysis_progress["done"] = len(reports)
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
        print(f"   💡 Incremental run: only {new_count} new conversations were analyzed.")
    if reports:
        scores = [r.get("evaluation", {}).get("User_Satisfaction_Score", 0) for r in reports]
        hall_count = sum(1 for r in reports if r.get("evaluation", {}).get("Hallucination_Detected") == True)
        drop_count = sum(1 for r in reports if r.get("dropoff") == True)
        print(f"   Avg Satisfaction:     {sum(scores)/len(scores):.1f}/10")
        print(f"   Hallucination Rate:   {hall_count}/{len(reports)} ({hall_count/len(reports)*100:.0f}%)")
        print(f"   Dropout Rate:         {drop_count}/{len(reports)} ({drop_count/len(reports)*100:.0f}%)")
    print(f"{'='*60}\n")
        
    return {"status": "success", "data": reports, "skipped_ids": _analysis_progress["skipped_ids"]}

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    """
    Accepts a natural language query, processes it against recent data using LangChain,
    and returns a textual response + a UI targeting directive.
    """
    result = await process_chat_query(req.query, recent_cache_data)
    return {"status": "success", "response": result}
