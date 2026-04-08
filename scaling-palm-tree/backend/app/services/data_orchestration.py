"""
data_orchestration.py  — MongoDB Atlas Edition
Fetches conversations and messages from the live cloud database.
"""
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

# ── Database config ───────────────────────────────────────────────────────────
MONGO_URI = os.getenv("MONGO_URI", "")
DB_NAME   = "ai_analytics"

# Module-level client (reused across requests)
_client: AsyncIOMotorClient | None = None
_conversations_cache: list = []
_messages_cache:      list = []


def get_db():
    """Returns the MongoDB database instance."""
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=10_000)
    return _client[DB_NAME]


# ── Eager cache load (on import) ──────────────────────────────────────────────
import asyncio

async def initialize_data():
    """
    Async initialization called during FastAPI startup.
    Connects to Atlas and pulls the 2MB+ of data into memory for sub-millisecond per-request speed.
    """
    global _conversations_cache, _messages_cache
    if _conversations_cache:
        return  # already loaded

    db = get_db()
    try:
        print("\n" + "="*60)
        print("🌐  DATA ORCHESTRATION — Initializing MongoDB Atlas Cache …")
        await _client.admin.command("ping")
        print("✅  Atlas connection verified")

        print("📂  Loading conversations into memory …")
        cursor = db["conversations"].find({}, {"_id": 1, "widgetId": 1,
                                               "createdAt": 1, "updatedAt": 1})
        docs = await cursor.to_list(length=None)
        for d in docs:
            if "_id" in d:
                d["_id"] = str(d["_id"])
        _conversations_cache.extend(docs)
        print(f"✅  Cached {len(_conversations_cache):,} conversations")

        print("📂  Loading messages into memory …")
        msg_cursor = db["messages"].find({})
        msgs = await msg_cursor.to_list(length=None)
        for m in msgs:
            if "_id" in m:
                m["_id"] = str(m["_id"])
        _messages_cache.extend(msgs)
        print(f"✅  Cached {len(_messages_cache):,} messages")
        print("="*60 + "\n")

    except Exception as e:
        print(f"❌  Initialization failed: {e}")
        # Fallback to empty to prevent startup crash, but log it
        _conversations_cache = []
        _messages_cache = []

async def ensure_data_loaded():
    """Safety check for public API methods."""
    if not _conversations_cache:
        await initialize_data()



# ── Public API ────────────────────────────────────────────────────────────────

async def fetch_all_conversations(start: int = 0, end: int = 20) -> list:
    """
    Returns up to `end - start` conversations from the in-memory cache.
    """
    await ensure_data_loaded()
    total     = len(_conversations_cache)
    actual_end = min(end, total)
    batch     = _conversations_cache[start:actual_end]

    print(f"\n{'='*60}")
    print(f"📦  FETCHING CONVERSATIONS #{start+1} to #{actual_end} (out of {total} total)")
    print(f"{'='*60}")
    for i, conv in enumerate(batch):
        conv_id   = str(conv.get("_id", "unknown"))
        widget_id = str(conv.get("widgetId", "unknown"))
        created   = conv.get("createdAt", "unknown")
        print(f"   [{i+1:>2}/{len(batch)}] Conv: {conv_id[:20]}... | "
              f"Widget: {str(widget_id)[:12]}... | Created: {created}")
    print(f"{'='*60}\n")
    return batch


async def get_conversation_transcript(conversation_id: str):
    """
    Builds a clean transcript string for one conversation.
    Returns: (transcript: str, is_dropoff: bool, loop_detected: bool)
    """
    await ensure_data_loaded()
    messages = [m for m in _messages_cache
                if m.get("conversationId") == conversation_id]

    messages.sort(key=lambda x: x.get("timestamp", ""))

    if not messages:
        print(f"   ⚠️  No messages found for conversation {conversation_id}")
        return "", False, False

    transcript_lines: list[str] = []
    loop_detected = False
    user_msgs: list[str] = []

    for msg in messages:
        sender   = msg.get("sender", "unknown")
        raw_text = msg.get("text", "")
        text     = raw_text.split("End of stream")[0].strip()

        if text.startswith("{") and text.endswith("}"):
            text = "[System Interaction/JSON Payload]"

        msg_type = msg.get("messageType", "")
        meta     = msg.get("metadata", {})

        if msg_type == "event":
            event_type   = meta.get("eventType", "unknown_event")
            product_name = meta.get("productName", "")
            if event_type == "product_click":
                transcript_lines.append(f"[Metadata: User clicked on {product_name}]")
            elif event_type == "product_view":
                transcript_lines.append(f"[Metadata: User viewed {product_name}]")
            else:
                transcript_lines.append(f"[Event: {event_type}]")
        else:
            if sender == "user":
                user_msgs.append(text.lower())
                if (len(user_msgs) >= 3
                        and user_msgs[-1] == user_msgs[-2] == user_msgs[-3]):
                    loop_detected = True

            transcript_lines.append(f"{sender.capitalize()}: {text}")

    transcript = "\n".join(transcript_lines)

    # Dropout: last message is from the agent with no user reply
    is_dropoff = bool(messages and messages[-1].get("sender") == "agent")

    print(f"   📝 Transcript built: {len(messages)} messages | "
          f"Dropoff: {is_dropoff} | Loop: {loop_detected}")
    return transcript, is_dropoff, loop_detected

async def get_conversation_messages(conversation_id: str) -> list:
    """
    Returns the raw list of messages for a given conversation.
    Useful for the frontend to display the chat log.
    """
    await ensure_data_loaded()
    messages = [m for m in _messages_cache if m.get("conversationId") == conversation_id]
    messages.sort(key=lambda x: x.get("timestamp", ""))
    return messages
