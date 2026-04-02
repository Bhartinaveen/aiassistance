import json
import os
from pymongo import MongoClient

def import_data():
    client = MongoClient("mongodb://localhost:27017/")
    db = client["helio_intern"]
    
    # Load and import conversations
    conv_file = "conversations.json"
    if os.path.exists(conv_file):
        with open(conv_file, "r") as f:
            conversations = json.load(f)
            db.conversations.drop() # Clean old data
            db.conversations.insert_many(conversations)
            print(f"Imported {len(conversations)} conversations.")
    
    # Load and import messages
    msg_file = "messages.json"
    if os.path.exists(msg_file):
        with open(msg_file, "r") as f:
            messages = json.load(f)
            db.messages.drop() # Clean old data
            db.messages.insert_many(messages)
            print(f"Imported {len(messages)} messages.")

if __name__ == "__main__":
    import_data()
