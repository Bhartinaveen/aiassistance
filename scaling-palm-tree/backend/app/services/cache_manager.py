"""
cache_manager.py — MongoDB Edition
Stores and retrieves AI analysis reports from MongoDB Atlas instead of a local JSON file.
"""
import os
from app.services.data_orchestration import get_db

COLLECTION_NAME = "analysis_reports"

async def get_cached_analysis() -> dict:
    """
    Fetches all cached analysis reports from MongoDB.
    Returns a dictionary keyed by conversation_id for fast lookup.
    """
    db = get_db()
    cursor = db[COLLECTION_NAME].find({})
    docs = await cursor.to_list(length=None)
    
    # Transform list of docs into a dict: {conv_id: report_data}
    cache = {}
    for doc in docs:
        if "_id" in doc:
            doc["_id"] = str(doc["_id"])
        conv_id = doc.get("conversation_id")
        if conv_id:
            cache[conv_id] = doc
    return cache

async def save_to_cache(conversation_id: str, analysis_data: dict):
    """
    Saves or updates an analysis report in MongoDB.
    """
    db = get_db()
    # Ensure the conversation_id is part of the data
    analysis_data["conversation_id"] = conversation_id
    
    # Use upsert to update if exists, or insert if new
    await db[COLLECTION_NAME].update_one(
        {"conversation_id": conversation_id},
        {"$set": analysis_data},
        upsert=True
    )
    print(f"   💾 Saved analysis for {conversation_id} to MongoDB")

async def get_all_cached_reports() -> list:
    """
    Returns all analysis reports as a flat list.
    """
    db = get_db()
    cursor = db[COLLECTION_NAME].find({})
    docs = await cursor.to_list(length=None)
    for doc in docs:
        if "_id" in doc:
            doc["_id"] = str(doc["_id"])
    return docs

async def clear_cache():
    """
    Drops the analysis reports collection to force a fresh analysis pass.
    """
    db = get_db()
    await db[COLLECTION_NAME].drop()
    print(f"🗑️  Analysis cache collection '{COLLECTION_NAME}' cleared in MongoDB.")
