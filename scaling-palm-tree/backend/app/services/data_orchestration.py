import os
import json

# We will load the JSON files into memory when this module is imported.
# This prevents the 2MB+ file from freezing the backend repeatedly during chat.

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
CONVERSATIONS_FILE = os.path.join(BASE_DIR, "conversations.json")
MESSAGES_FILE = os.path.join(BASE_DIR, "messages.json")

_conversations_cache = []
_messages_cache = []

def _load_data():
    global _conversations_cache, _messages_cache
    if not _conversations_cache and os.path.exists(CONVERSATIONS_FILE):
        try:
            with open(CONVERSATIONS_FILE, "r", encoding="utf-8") as f:
                _conversations_cache = json.load(f)
        except Exception as e:
            print(f"Error loading conversations: {e}")
            
    if not _messages_cache and os.path.exists(MESSAGES_FILE):
        try:
            with open(MESSAGES_FILE, "r", encoding="utf-8") as f:
                _messages_cache = json.load(f)
        except Exception as e:
            print(f"Error loading messages: {e}")

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

    return transcript, is_dropoff, loop_detected
    
async def fetch_all_conversations(limit: int = 15):
    """
    Returns a batch of conversation objects for analysis.
    """
    _load_data()
    return _conversations_cache[:limit]
