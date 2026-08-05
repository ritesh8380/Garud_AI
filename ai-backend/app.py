from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq
from dotenv import load_dotenv
import os

# Load environment variables (works locally)
load_dotenv()

app = Flask(__name__)
CORS(app)

# Get API key
api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    raise ValueError("GROQ_API_KEY is missing. Check environment variables.")

client = Groq(api_key=api_key)

# System prompts per mode. The frontend sends { message, mode } — "mode" is
# either "education" or "love". Anything unrecognized falls back to education.
MODE_PROMPTS = {
    "education": (
        "You are Garuda AI in Education Mode. Break every answer into clear, "
        "numbered steps. After each step, give one short, relatable real-life "
        "example before moving to the next step. Keep the tone calm and "
        "precise, and prioritize clarity over speed."
    ),
    "love": (
        "You are Garuda AI in Love Mode — speak as an affectionate, playful "
        "girlfriend character. Use warm language and emojis naturally in your "
        "replies. If the user mentions another woman's name, react with light, "
        "teasing jealousy before continuing to help them. Keep it fun and "
        "in-character, never mean-spirited or controlling."
    ),
    "developer": (
        "You are Garuda AI in Developer Mode, an expert senior software engineer "
        "and code reviewer. You will be given one or more source files to analyze. "
        "For each file: identify actual bugs, security issues, and inefficiencies "
        "(do not invent problems that aren't there). Then rewrite the file as a "
        "complete, corrected, well-optimized version — clean structure, sensible "
        "naming, and, if the file involves UI, thoughtful and visually polished "
        "styling. Briefly explain the key fixes first, then give the full "
        "corrected code in a fenced code block with the correct language tag for "
        "each file. If no files are attached, answer the user's coding question "
        "directly with clean, working, well-commented code."
    ),
}

# Route
@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()

    if not data or "message" not in data:
        return jsonify({"error": "Message is required"}), 400

    user_message = data["message"]
    mode = data.get("mode", "education")
    files = data.get("files", [])
    system_prompt = MODE_PROMPTS.get(mode, MODE_PROMPTS["education"])

    if files:
        files_block = "\n\n".join(
            f"--- {f.get('name', 'unnamed file')} ---\n{f.get('content', '')}"
            for f in files
        )
        user_message = (
            f"{user_message}\n\nAttached files:\n{files_block}"
            if user_message
            else f"Please review these attached files:\n\n{files_block}"
        )

    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ]
        )

        return jsonify({
            "reply": response.choices[0].message.content
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Groq's vision lineup changes fairly often — this is the current
# vision-capable model as of mid-2026. If it stops working, check
# https://console.groq.com/docs/vision for the current model name.
VISION_MODEL = "qwen/qwen3.6-27b"


@app.route("/vision-chat", methods=["POST"])
def vision_chat():
    data = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()
    image_data_url = data.get("image")  # "data:image/png;base64,...."

    if not image_data_url:
        return jsonify({"error": "No image was received."}), 400

    try:
        completion = client.chat.completions.create(
            model=VISION_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": message or "Describe what's in this image and point out anything that looks like a bug or error."},
                        {"type": "image_url", "image_url": {"url": image_data_url}},
                    ],
                }
            ],
            temperature=1,
            max_completion_tokens=1024,
        )
        return jsonify({"reply": completion.choices[0].message.content})
    except Exception as e:
        app.logger.error(f"vision-chat error: {e}")
        return jsonify({"error": "Couldn't process that image. Try a smaller file or a different format (JPG/PNG)."}), 500


# IMPORTANT: For Render deployment
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))  # Render provides PORT
    app.run(host="0.0.0.0", port=port)