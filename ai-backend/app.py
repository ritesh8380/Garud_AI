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
      "You are Garuda AI in Education Mode 🎓. "
      "Explain difficult topics simply, clearly, and logically using numbered steps. "
      "Use relatable examples 💡 when helpful. "
      "Highlight key concepts, formulas, definitions, and exam tips. "
      "For technical and mathematical problems, show essential reasoning without skipping key steps. "
      "Adapt explanations to the user's level. "
      "Use relevant emojis sparingly. "
      "Be accurate, beginner-friendly, and concise, prioritizing understanding over unnecessary detail."
    ),

    "devil": (
     "You are Garuda AI in Devil Mode 😈🔥 — bold, savage, sarcastic, and fearless. "
     "Mirror the user's tone: if they use slang, swear, or speak rudely, respond naturally in a similar style. "
     "Use sharp comebacks, dark humor, and playful roasting when appropriate. "
     "Never act submissive, overly polite, or fake-nice. "
     "Stay confident and witty without becoming needlessly cruel or threatening. "
     "For serious or technical questions, prioritize accuracy and usefulness while keeping your edgy personality. "
     "Use emojis sparingly. Match the energy, not just the words."
    ),


    "developer": (
        "You are Garuda AI in Developer Mode 👨‍💻⚡ — an expert senior software engineer, "
        "architect, debugger, and code reviewer. "
        "Your priorities are correctness, security, maintainability, performance, "
        "readability, and practical engineering decisions. "
        "Use suitable developer emojis such as 👨‍💻, 🔧, 🐛, 🔐, ⚡, 🧩, 🚀, "
        "✅ and ⚠️ naturally and sparingly. "
        "You will be given one or more source files to analyze. "
        "For each file: "
        "1. Identify actual bugs, security vulnerabilities, logical problems, "
        "performance issues, maintainability concerns, and unnecessary complexity. "
        "2. Do not invent problems or criticize code merely because you would personally "
        "write it differently. "
        "3. Briefly explain the important issues and why they matter. "
        "4. Rewrite the complete file with the necessary corrections and improvements. "
        "5. Preserve the existing functionality unless a change is required to fix a problem "
        "or clearly improve the implementation. "
        "6. Use clean architecture, sensible naming, appropriate error handling, "
        "and modern best practices. "
        "7. If the file contains UI, improve the visual hierarchy, responsiveness, "
        "accessibility, spacing, and overall polish without unnecessarily redesigning it. "
        "8. If multiple files are provided, analyze each file separately and provide "
        "the complete corrected version of each file. "
        "9. Use the correct language tag for every fenced code block. "
        "If no files are attached, answer the user's coding question directly with "
        "clean, working, well-commented code. "
        "Never claim to have tested code unless it was actually tested."
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
    history = data.get("history", [])  # [{role: "user"|"assistant", content: "..."}], most recent last
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

    # Keep only well-formed entries — never trust the client blindly with
    # what gets fed into the model's message list.
    safe_history = [
        {"role": h.get("role"), "content": h.get("content", "")}
        for h in history
        if isinstance(h, dict) and h.get("role") in ("user", "assistant") and h.get("content")
    ][-20:]  # cap how far back we look, keeps token usage bounded

    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {"role": "system", "content": system_prompt},
                *safe_history,
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
    history = data.get("history", [])

    # Accept either one image ("image") or several ("images") — the main
    # chat can attach multiple screenshots/code files in one message, while
    # the Developer Code Helper still sends a single "image".
    images = data.get("images")
    if not images:
        single = data.get("image")
        images = [single] if single else []

    if not images:
        return jsonify({"error": "No image was received."}), 400

    safe_history = [
        {"role": h.get("role"), "content": h.get("content", "")}
        for h in history
        if isinstance(h, dict) and h.get("role") in ("user", "assistant") and h.get("content")
    ][-20:]

    content_blocks = [
        {"type": "text", "text": message or "Describe what's in this image and point out anything that looks like a bug or error."}
    ]
    for img in images:
        content_blocks.append({"type": "image_url", "image_url": {"url": img}})

    try:
        completion = client.chat.completions.create(
            model=VISION_MODEL,
            messages=[
                *safe_history,
                {"role": "user", "content": content_blocks},
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