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
from app.services.cache_manager import save_to_cache, get_cached_analysis

class ChatRequest(BaseModel):
    query: str
    
# In-memory "cache" for the current session state
recent_cache_data = []

app = FastAPI(title="AI QA & Analytics Engine")

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
    conversations = await fetch_all_conversations()
    cache = get_cached_analysis()
    
    reports = []
    
    for conv in conversations:
        conv_id = str(conv["_id"])
        
        # Check cache first
        if conv_id in cache:
            reports.append(cache[conv_id])
            continue
            
        widget_id = str(conv.get("widgetId", "Unknown_Widget"))
        transcript, is_dropoff, loop_detected = await get_conversation_transcript(conv_id)
        
        if not transcript:
            continue
            
        print(f"Analyzing new conversation: {conv_id}")
        evaluation = await analyze_transcript(transcript)
        
        report = {
            "conversation_id": conv_id,
            "widget_id": widget_id,
            "dropoff": is_dropoff,
            "loop_detected": loop_detected,
            "evaluation": evaluation
        }
        
        # Save to persistent cache
        save_to_cache(conv_id, report)
        reports.append(report)
        
        # Slight delay to respect Rate Limits only when hitting the AI
        await asyncio.sleep(1)
        
    global recent_cache_data
    recent_cache_data = reports
        
    return {"status": "success", "data": reports}

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    """
    Accepts a natural language query, processes it against recent data using LangChain,
    and returns a textual response + a UI targeting directive.
    """
    result = await process_chat_query(req.query, recent_cache_data)
    return {"status": "success", "response": result}
