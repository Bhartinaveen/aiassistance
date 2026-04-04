import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import asyncio

load_dotenv()

async def test_connection():
    uri = os.getenv("MONGO_URI")
    if not uri:
        print("❌ MONGO_URI not found in .env")
        return
    
    print(f"Testing connection to: {uri[:20]}...")
    try:
        client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=5000)
        # The admin command 'ping' is a recommended way to test connection
        await client.admin.command('ping')
        print("✅ MongoDB is CONNECTED successfully!")
        
        db_name = uri.split("/")[-1].split("?")[0]
        db = client[db_name]
        collections = await db.list_collection_names()
        print(f"📂 Available collections in '{db_name}': {collections}")
        
    except Exception as e:
        print(f"❌ MongoDB connection FAILED: {e}")

if __name__ == "__main__":
    asyncio.run(test_connection())
