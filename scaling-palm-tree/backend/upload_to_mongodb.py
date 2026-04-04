"""
Upload local JSON data to MongoDB Atlas.
Run this ONCE to seed your cloud database.
"""
import os
import json
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

# ── Config ────────────────────────────────────────────────────────────────────
MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise RuntimeError("MONGO_URI not found in .env")

# We'll store analytics data in a dedicated database
DB_NAME = "ai_analytics"

# Path to .json files → mlai/ (3 directories up from backend/)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CONVERSATIONS_FILE = os.path.join(BASE_DIR, "conversations.json")
MESSAGES_FILE = os.path.join(BASE_DIR, "messages.json")

# ── Helper ────────────────────────────────────────────────────────────────────
def load_json(path: str) -> list:
    print(f"📂 Reading {os.path.basename(path)} …")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    print(f"   ✅ Loaded {len(data):,} records")
    return data

def fix_ids(docs: list) -> list:
    """
    JSON exports use plain string _ids.
    Keep them as strings – MongoDB will accept them fine.
    """
    return docs


# ── Main ──────────────────────────────────────────────────────────────────────
async def upload():
    print(f"\n{'='*60}")
    print("🚀  MongoDB Atlas – Data Upload Script")
    print(f"{'='*60}\n")

    client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=10_000)

    try:
        await client.admin.command("ping")
        print("✅  Connected to MongoDB Atlas\n")
    except Exception as e:
        print(f"❌  Connection failed: {e}")
        return

    db = client[DB_NAME]

    # ── Conversations ─────────────────────────────────────────────────────────
    conversations = load_json(CONVERSATIONS_FILE)
    conversations = fix_ids(conversations)

    coll_conv = db["conversations"]
    existing_conv = await coll_conv.count_documents({})
    if existing_conv > 0:
        print(f"⚠️   Conversations collection already has {existing_conv:,} docs – dropping first …")
        await coll_conv.drop()

    BATCH = 500
    total_conv = len(conversations)
    for i in range(0, total_conv, BATCH):
        chunk = conversations[i:i + BATCH]
        await coll_conv.insert_many(chunk)
        print(f"   📤 Conversations: {min(i + BATCH, total_conv):,} / {total_conv:,} uploaded")

    await coll_conv.create_index("widgetId")
    await coll_conv.create_index("createdAt")
    print(f"✅  Conversations uploaded ({total_conv:,} docs) + indexes created\n")

    # ── Messages ──────────────────────────────────────────────────────────────
    messages = load_json(MESSAGES_FILE)
    messages = fix_ids(messages)

    coll_msg = db["messages"]
    existing_msg = await coll_msg.count_documents({})
    if existing_msg > 0:
        print(f"⚠️   Messages collection already has {existing_msg:,} docs – dropping first …")
        await coll_msg.drop()

    total_msg = len(messages)
    for i in range(0, total_msg, BATCH):
        chunk = messages[i:i + BATCH]
        await coll_msg.insert_many(chunk)
        print(f"   📤 Messages: {min(i + BATCH, total_msg):,} / {total_msg:,} uploaded")

    await coll_msg.create_index("conversationId")
    await coll_msg.create_index("timestamp")
    print(f"✅  Messages uploaded ({total_msg:,} docs) + indexes created\n")

    # ── Verify ────────────────────────────────────────────────────────────────
    print(f"{'='*60}")
    print("🔍  Verification")
    print(f"{'='*60}")
    for name in ["conversations", "messages"]:
        count = await db[name].count_documents({})
        print(f"   {name}: {count:,} documents")
    print(f"\n🎉  All data is now live in MongoDB Atlas  →  database: '{DB_NAME}'\n")

    client.close()


if __name__ == "__main__":
    asyncio.run(upload())
