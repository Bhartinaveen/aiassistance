"""Quick script to trigger the top 20-30 conversation analysis and display results."""
import httpx
import json
import asyncio

async def main():
    print("🚀 Triggering LLM analysis on conversations #20-30...")
    async with httpx.AsyncClient(timeout=300.0) as client:
        resp = await client.get("http://127.0.0.1:8000/api/analysis/run")
        data = resp.json()

    status = data["status"]
    reports = data["data"]
    print(f"\n✅ Status: {status}")
    print(f"📊 Total reports generated: {len(reports)}\n")
    print("=" * 90)
    print(f"{'#':<4} {'Conv ID':<28} {'Category':<14} {'Score':<6} {'Hallucination':<14} {'Dropoff':<8} {'Loop'}")
    print("=" * 90)

    for i, rep in enumerate(reports):
        ev = rep.get("evaluation", {})
        print(f"{i+1:<4} {rep['conversation_id'][:26]:<28} "
              f"{ev.get('Category','?'):<14} "
              f"{ev.get('User_Satisfaction_Score','?'):<6} "
              f"{str(ev.get('Hallucination_Detected','?')):<14} "
              f"{str(rep.get('dropoff','?')):<8} "
              f"{rep.get('loop_detected','?')}")

    print("\n" + "=" * 90)
    print("\n📋 Detailed Insights per Conversation:\n")
    for i, rep in enumerate(reports):
        ev = rep.get("evaluation", {})
        print(f"--- Conversation #{i+1}: {rep['conversation_id']} ---")
        print(f"   Brand/Widget: {rep.get('widget_id', 'Unknown')}")
        print(f"   Category: {ev.get('Category')}")
        print(f"   Satisfaction Score: {ev.get('User_Satisfaction_Score')}/10")
        print(f"   Sentiment Shift: {ev.get('Sentiment_Shift')}")
        print(f"   Hallucination: {ev.get('Hallucination_Detected')} → {ev.get('Hallucination_Reason')}")
        print(f"   Checkout Friction: {ev.get('Checkout_Friction_Detected')} → {ev.get('User_Frustration_Point')}")
        print(f"   Bottleneck: {ev.get('Bottleneck')}")
        print(f"   Root Cause: {ev.get('Root_Cause')}")
        print(f"   Inquiry Type: {ev.get('Primary_Inquiry_Type')}")
        print(f"   Product: {ev.get('Product_Mentioned')}")
        print(f"   Improvement: {ev.get('Agent_Improvement_Rule')}")
        print(f"   Summary: {ev.get('Summary_Insights')}")
        print()

    print("✅ All analysis reports have been saved to MongoDB Atlas by the backend server.")

if __name__ == "__main__":
    asyncio.run(main())
