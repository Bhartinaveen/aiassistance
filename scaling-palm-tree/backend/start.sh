#!/bin/bash
# Install dependencies (redundant but safe)
pip install -r requirements.txt
# Start the FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port $PORT
