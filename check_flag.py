import motor.motor_asyncio
import asyncio

async def check():
    client = motor.motor_asyncio.AsyncIOMotorClient("mongodb+srv://admin:gGfXo0VwGzI89qTr@cluster0.0iymm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
    db = client['ai_analytics']
    convs = await db['conversations'].find({}).to_list(10)
    for c in convs:
        print(c.keys())
        if 'flagged' in c or 'isFlagged' in c:
            print(f"Flagged found in conv: {c.get('flagged', c.get('isFlagged'))}")
            
    msgs = await db['messages'].find({}).to_list(10)
    for m in msgs:
        print(m.keys())
        if 'flagged' in m or 'isFlagged' in m or 'is_flagged' in m:
            print(f"Flagged found in msg: {m.get('flagged', m.get('isFlagged'))}")

asyncio.run(check())
