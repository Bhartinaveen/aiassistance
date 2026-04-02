import os
import json

# We will load the JSON files into memory when this module is imported.
# This prevents the 2MB+ file from freezing the backend repeatedly during chat.

# __file__ = .../mlai/scaling-palm-tree/backend/app/services/data_orchestration.py
# We need to go 5 levels up to reach mlai/ where the JSON data lives
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))
CONVERSATIONS_FILE = os.path.join(BASE_DIR, "conversations.json")
MESSAGES_FILE = os.path.join(BASE_DIR, "messages.json")

_conversations_cache = []
_messages_cache = []

def _load_data():
    global _conversations_cache, _messages_cache
    if not _conversations_cache and os.path.exists(CONVERSATIONS_FILE):
        try:
            print(f"\n{'='*60}")
            print(f"📂 Loading conversations from: {CONVERSATIONS_FILE}")
            with open(CONVERSATIONS_FILE, "r", encoding="utf-8") as f:
                _conversations_cache = json.load(f)
            print(f"✅ Loaded {len(_conversations_cache)} conversations successfully")
        except Exception as e:
            print(f"❌ Error loading conversations: {e}")
            
    if not _messages_cache and os.path.exists(MESSAGES_FILE):
        try:
            print(f"📂 Loading messages from: {MESSAGES_FILE}")
            with open(MESSAGES_FILE, "r", encoding="utf-8") as f:
                _messages_cache = json.load(f)
            print(f"✅ Loaded {len(_messages_cache)} messages successfully")
            print(f"{'='*60}\n")
        except Exception as e:
            print(f"❌ Error loading messages: {e}")

# Attempt eager load on import
_load_data()

async def get_conversation_transcript(conversation_id: str):
    """
    Fetches all messages for a given conversation_id and formats them chronologically.
    Includes metadata like click events and product views for deep LLM analysis.
    Returns: A transcript string, and boolean flags for drop_offs and loops.
    """
    # Ensure data is loaded
    _load_data()

    # Filter messages for this conversation id
    messages = [m for m in _messages_cache if m.get("conversationId") == conversation_id]
    
    # Sort chronologically
    messages.sort(key=lambda x: x.get("timestamp", ""))
    
    if not messages:
        print(f"   ⚠️  No messages found for conversation {conversation_id}")
        return "", False, False

    transcript_lines = []
    loop_detected = False
    user_msgs = []

    for msg in messages:
        sender = msg.get("sender", "unknown")
        raw_text = msg.get("text", "")
        # The agent's raw 'text' has mega JSON payloads appended after 'End of stream' taking up massive token count:
        text = raw_text.split("End of stream")[0].strip()
        
        # Further clean text of any potential leftover JSON blocks if Split failed
        if text.startswith("{") and text.endswith("}"):
            text = "[System Interaction/JSON Payload]"
        
        msg_type = msg.get("messageType", "")
        meta = msg.get("metadata", {})
        
        if msg_type == "event":
            event_type = meta.get("eventType", "unknown_event")
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
                # Loop detection: 3 identical messages in a row
                if len(user_msgs) >= 3 and user_msgs[-1] == user_msgs[-2] == user_msgs[-3]:
                    loop_detected = True
            
            transcript_lines.append(f"{sender.capitalize()}: {text}")

    transcript = "\n".join(transcript_lines)
    
    # Phase 2B Dropout Analysis: If last message is from the agent and user never replied.
    is_dropoff = False
    if messages and messages[-1].get("sender") == "agent":
        is_dropoff = True

    print(f"   📝 Transcript built: {len(messages)} messages | Dropoff: {is_dropoff} | Loop: {loop_detected}")
    return transcript, is_dropoff, loop_detected
    
async def fetch_all_conversations(start: int = 0, end: int = 20):
    """
    Returns the top 20 conversations (0-indexed: 0–19) for LLM analysis.
    Adjustable via start/end parameters.
    """
    _load_data()
    total = len(_conversations_cache)
    actual_end = min(end, total)
    batch = _conversations_cache[start:actual_end]
    
    print(f"\n{'='*60}")
    print(f"📦 FETCHING CONVERSATIONS #{start+1} to #{actual_end} (out of {total} total)")
    print(f"{'='*60}")
    for i, conv in enumerate(batch):
        conv_id = str(conv.get('_id', 'unknown'))
        widget_id = str(conv.get('widgetId', 'unknown'))
        created = conv.get('createdAt', 'unknown')
        print(f"   [{i+1:>2}/{len(batch)}] Conv: {conv_id[:20]}... | Widget: {widget_id[:12]}... | Created: {created}")
    print(f"{'='*60}\n")
    
    return batch
