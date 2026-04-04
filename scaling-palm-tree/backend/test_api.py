import httpx
import asyncio

async def test_api():
    async with httpx.AsyncClient() as client:
        try:
            print("🚀 Calling /api/analysis/run ...")
            response = await client.get("http://localhost:8000/api/analysis/run", timeout=None)
            print(f"✅ Status Code: {response.status_code}")
            data = response.json()
            if data["status"] == "success":
                print(f"📊 Received {len(data['data'])} reports")
                if len(data['data']) > 0:
                    print(f"🔍 Sample Report: {data['data'][0]['conversation_id']}")
            else:
                print(f"❌ Error: {data}")
        except Exception as e:
            print(f"❌ Request failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_api())
