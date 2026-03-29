from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq
from dotenv import load_dotenv
import os

# Load env variables
load_dotenv()

# Create app FIRST ✅
app = Flask(__name__)
CORS(app)

# API key
api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    raise ValueError("GROQ_API_KEY is missing. check your .env file.")

client = Groq(api_key=api_key)

# THEN define routes ✅
@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_message = data.get("message", "")

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": user_message}]
    )

    return jsonify({"reply": response.choices[0].message.content})

# Run app
if __name__ == "__main__":
    app.run(debug=True, port=5000)
