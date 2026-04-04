# Use the official Python image
FROM python:3.11-slim

# Set the working directory
WORKDIR /app

# Copy the requirements file and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose the port exactly as Render expects ($PORT)
ENV PORT=8000
EXPOSE 8000

# Start the server using the correct command
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
