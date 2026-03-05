import os
import requests
from dotenv import load_dotenv

# Load your API key from .env
load_dotenv()
API_KEY = os.getenv("GROQ_API_KEY")

# Optional debug: make sure the key loaded
print("API KEY LOADED:", API_KEY[:5] if API_KEY else "NONE")

# Initialize your client (headers + base URL)
BASE_URL = "https://api.groq.com/openai/v1/chat/completions"

HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}
def send_message(user_message):
    data = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": "You are a friendly test chatbot."},
            {"role": "user", "content": user_message}
        ]
    }
    response = requests.post(BASE_URL, headers=HEADERS, json=data)
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]

# Example usage
print(send_message("Hi there!"))
