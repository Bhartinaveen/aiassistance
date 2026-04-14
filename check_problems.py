import urllib.request
import json

response = urllib.request.urlopen("http://127.0.0.1:8000/api/analysis/run")
data = json.loads(response.read().decode('utf-8'))

problematic_count = 0
for d in data:
    ev = d.get("evaluation", {})
    user_prob = ev.get("User_Message_Problem", "")
    agent_prob = ev.get("Agent_Message_Problem", "")
    
    has_user_prob = bool(user_prob and user_prob.lower() not in ['none', 'n/a', 'none.', 'none identified'])
    has_agent_prob = bool(agent_prob and agent_prob.lower() not in ['none', 'n/a', 'none.', 'none identified'])
    
    score = float(ev.get("User_Satisfaction_Score")) if ev.get("User_Satisfaction_Score") else 10
    
    has_issue = (
        str(ev.get("Hallucination_Detected")).lower() == "true" or
        str(ev.get("Checkout_Friction_Detected")).lower() == "true" or
        d.get("loop_detected") is True or
        score <= 4 or
        has_user_prob or
        has_agent_prob
    )
    if has_issue:
        problematic_count += 1

print(f"Total analyzed: {len(data)}")
print(f"Problematic found: {problematic_count}")
