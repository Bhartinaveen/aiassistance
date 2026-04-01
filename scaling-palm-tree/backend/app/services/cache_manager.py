import json
import os

CACHE_FILE = "analysis_cache.json"

def get_cached_analysis():
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading cache: {e}")
            return {}
    return {}

def save_to_cache(conversation_id, analysis_data):
    cache = get_cached_analysis()
    cache[conversation_id] = analysis_data
    try:
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(cache, f, indent=2)
    except Exception as e:
        print(f"Error saving to cache: {e}")

def get_all_cached_reports():
    cache = get_cached_analysis()
    return list(cache.values())
