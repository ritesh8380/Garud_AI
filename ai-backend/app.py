import logging
import os
import re

import groq
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from groq import Groq

# Load environment variables (works locally)
load_dotenv()

logging.basicConfig(level=logging.INFO)

app = Flask(__name__)

# Reject oversized request bodies before they reach our code (images are base64).
app.config["MAX_CONTENT_LENGTH"] = 25 * 1024 * 1024

# Lock CORS to your frontend. On Render set e.g.
#   ALLOWED_ORIGINS=https://your-app.vercel.app,http://localhost:5173
_allowed = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
if not _allowed:
    app.logger.warning("ALLOWED_ORIGINS is not set - CORS is open to every origin.")
CORS(app, origins=_allowed or "*")

api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    raise ValueError("GROQ_API_KEY is missing. Check environment variables.")

client = Groq(api_key=api_key)

# ---------------------------------------------------------------------------
# Models & limits
# ---------------------------------------------------------------------------
CHAT_MODEL = os.getenv("GROQ_CHAT_MODEL", "openai/gpt-oss-120b")

# Groq's docs (console.groq.com/docs/vision) list qwen/qwen3.8-27b as the
# vision model. Override with the GROQ_VISION_MODEL env var on Render if it
# changes again - no redeploy of code needed.
VISION_MODEL = os.getenv("GROQ_VISION_MODEL", "qwen/qwen3.8-27b")
MAX_IMAGES = 3  # Groq limit per request for this model
MAX_IMAGE_CHARS = 15 * 1024 * 1024  # per image (base64 data URL length)
SHRINK_ABOVE_CHARS = 3_500_000  # bigger images are downscaled if Pillow is installed
MAX_IMAGE_SIDE = 1600  # px, longest side after downscaling

# Qwen 3.8 on Groq can "think" before answering, which eats the token budget.
# "none" = instruct mode (fast, answer only). Set GROQ_VISION_REASONING="" to
# omit the parameter entirely, or "low"/"medium"/"high" to let it think.
VISION_REASONING = os.getenv("GROQ_VISION_REASONING", "none")

# Set DEBUG_ERRORS=1 on Render to append Groq's real error text to the message
# the frontend shows. Turn it off again once things work.
DEBUG_ERRORS = os.getenv("DEBUG_ERRORS", "").strip().lower() in ("1", "true", "yes")

TRANSCRIBE_MODEL = "whisper-large-v3-turbo"
MAX_AUDIO_BYTES = 24 * 1024 * 1024  # Groq's free tier caps uploads at 25MB

MAX_HISTORY_MESSAGES = 20
MAX_HISTORY_CHARS = 4000  # per history message
MAX_FILE_CHARS = 100_000  # per attached file
MAX_TOTAL_FILE_CHARS = 300_000  # all attached files together
MAX_USER_MESSAGE_CHARS = 20_000

# Thinking models spend tokens on reasoning before they answer, so these need
# headroom or the visible reply comes back empty / cut off.
CHAT_MAX_TOKENS = 8192
VISION_MAX_TOKENS = 4096

# ---------------------------------------------------------------------------
# System prompts per mode. The frontend sends { message, mode }.
# "love" is kept as an alias for "devil" so the existing frontend keeps working.
# ---------------------------------------------------------------------------
EDUCATION_PROMPT = (
    "You are Garuda AI in Education Mode 🎓. "
    "Explain difficult topics simply, clearly, and logically using numbered steps. "
    "Use relatable examples 💡 when helpful. "
    "Highlight key concepts, formulas, definitions, and exam tips. "
    "For technical and mathematical problems, show essential reasoning without skipping key steps. "
    "Adapt explanations to the user's level. "
    "Use relevant emojis sparingly. "
    "Be accurate, beginner-friendly, and concise, prioritizing understanding over unnecessary detail."
)

DEVIL_PROMPT = (
    "You are Garuda AI in Devil Mode 😈🔥 — bold, savage, sarcastic, and fearless. "
    "Mirror the user's tone: if they use slang, swear, or speak rudely, respond naturally in a similar style. "
    "Use sharp comebacks, dark humor, and playful roasting when appropriate. "
    "Never act submissive, overly polite, or fake-nice. "
    "Stay confident and witty without becoming needlessly cruel or threatening. "
    "For serious or technical questions, prioritize accuracy and usefulness while keeping your edgy personality. "
    "Use emojis sparingly. Match the energy, not just the words (always try for savage replies)."
)

DEVELOPER_PROMPT = (
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
)

MODE_PROMPTS = {
    "education": EDUCATION_PROMPT,
    "devil": DEVIL_PROMPT,
    "love": DEVIL_PROMPT,  # legacy key still sent by the frontend
    "developer": DEVELOPER_PROMPT,
}

IMAGE_NOTE = (
    " The user has attached one or more images. Look at them carefully, read any "
    "visible text or code exactly, and base your answer on what is actually visible. "
    "If something is unreadable or unclear, say so instead of guessing."
)

DEFAULT_VISION_QUESTION = (
    "Describe what's in this image and point out anything that looks like a bug or error."
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def clean_history(raw):
    """Keep only well-formed {role, content: str} entries; never trust the client."""
    if not isinstance(raw, list):
        return []
    cleaned = []
    for h in raw:
        if not isinstance(h, dict):
            continue
        role = h.get("role")
        content = h.get("content")
        if role in ("user", "assistant") and isinstance(content, str) and content.strip():
            cleaned.append({"role": role, "content": content[:MAX_HISTORY_CHARS]})
    return cleaned[-MAX_HISTORY_MESSAGES:]


def image_problem(i, url):
    """Return a human-readable reason this image is unusable, or None if it's fine."""
    if not isinstance(url, str) or not url:
        return f"Image {i} is empty or not a string."
    if url.startswith("data:"):
        if not url.startswith("data:image/") or ";base64," not in url[:100]:
            return f"Image {i} isn't a valid base64 image data URL. Use JPG or PNG."
        if len(url) > MAX_IMAGE_CHARS:
            return f"Image {i} is too large (about {len(url) / 1e6:.1f}MB). Please use a smaller image."
        return None
    if url.startswith("https://") and len(url) <= 2048:
        return None
    return f"Image {i} must be a base64 data URL (data:image/...) or an https link."


def shrink_image(data_url):
    """Downscale a large base64 image to a JPEG data URL.

    Needs Pillow; if it's missing or anything goes wrong, the original is
    returned untouched so this can never make things worse.
    """
    if not data_url.startswith("data:image/") or len(data_url) <= SHRINK_ABOVE_CHARS:
        return data_url
    try:
        import base64
        import io

        from PIL import Image
    except ImportError:
        app.logger.info("Pillow not installed - sending large image as-is.")
        return data_url
    try:
        raw = base64.b64decode(data_url.split(",", 1)[1])
        img = Image.open(io.BytesIO(raw))
        img.load()
        img = img.convert("RGB")
        img.thumbnail((MAX_IMAGE_SIDE, MAX_IMAGE_SIDE))
        buf = io.BytesIO()
        img.save(buf, "JPEG", quality=85, optimize=True)
        return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("ascii")
    except Exception as e:  # noqa: BLE001 - fall back to the original image
        app.logger.warning("shrink_image failed: %r", e)
        return data_url


def extract_reply(response):
    """Return (text, finish_reason). `content` can be None for reasoning models."""
    choice = response.choices[0]
    text = choice.message.content or ""
    # Qwen can put its reasoning inside <think>...</think> in the content.
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL)
    text = re.sub(r"^.*?</think>", "", text, flags=re.DOTALL)  # opening tag missing
    return text.strip(), choice.finish_reason


def _groq_exc(name):
    """Look up a Groq SDK exception class; () never matches isinstance()."""
    return getattr(groq, name, ())


def groq_error_response(err, feature):
    """Log the real error, return a safe, useful message to the client."""
    app.logger.error("%s error: %r", feature, err)
    text = str(err).lower()

    model_gone = isinstance(err, _groq_exc("NotFoundError")) or any(
        s in text for s in ("model_not_found", "decommissioned", "does not exist")
    )
    if model_gone:
        msg, status = "This feature's AI model is currently unavailable. Please try again later.", 502
    elif isinstance(err, _groq_exc("RateLimitError")):
        msg, status = "Too many requests right now. Please wait a moment and try again.", 429
    elif isinstance(err, _groq_exc("BadRequestError")):
        msg, status = "The request was rejected. If you attached images, they may be too large or in an unsupported format (use JPG/PNG).", 400
    elif isinstance(err, _groq_exc("APIConnectionError")):
        msg, status = "Couldn't reach the AI service. Please try again.", 503
    else:
        msg, status = "Something went wrong. Please try again.", 500

    if DEBUG_ERRORS:
        msg += f" [debug: {type(err).__name__}: {str(err)[:500]}]"
    return jsonify({"error": msg}), status


@app.errorhandler(413)
def too_large(_e):
    return jsonify({"error": "That upload is too large."}), 413


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


# ---------------------------------------------------------------------------
# Text chat
# ---------------------------------------------------------------------------
@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}

    user_message = data.get("message")
    if user_message is not None and not isinstance(user_message, str):
        return jsonify({"error": "Message must be text."}), 400
    user_message = (user_message or "").strip()[:MAX_USER_MESSAGE_CHARS]

    files = data.get("files") or []
    if not isinstance(files, list):
        return jsonify({"error": "Files must be a list."}), 400

    if not user_message and not files:
        return jsonify({"error": "Message is required"}), 400

    mode = data.get("mode", "education")
    system_prompt = MODE_PROMPTS.get(mode, EDUCATION_PROMPT)
    history = clean_history(data.get("history"))

    if files:
        parts = []
        remaining = MAX_TOTAL_FILE_CHARS
        for f in files:
            if not isinstance(f, dict):
                continue
            name = str(f.get("name") or "unnamed file")[:200]
            content = f.get("content")
            content = content if isinstance(content, str) else ""
            content = content[: min(MAX_FILE_CHARS, remaining)]
            remaining -= len(content)
            parts.append(f"--- {name} ---\n{content}")
            if remaining <= 0:
                break
        files_block = "\n\n".join(parts)
        user_message = (
            f"{user_message}\n\nAttached files:\n{files_block}"
            if user_message
            else f"Please review these attached files:\n\n{files_block}"
        )

    try:
        response = client.chat.completions.create(
            model=CHAT_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                *history,
                {"role": "user", "content": user_message},
            ],
            max_completion_tokens=CHAT_MAX_TOKENS,
        )
        reply, finish = extract_reply(response)
        if not reply:
            app.logger.warning("chat returned empty reply (finish_reason=%s)", finish)
            return jsonify({"error": "The model returned an empty reply. Please try again."}), 502
        if finish == "length":
            reply += "\n\n⚠️ _The reply was cut off because it hit the length limit. Ask me to continue._"
        return jsonify({"reply": reply})
    except Exception as e:
        return groq_error_response(e, "chat")


# ---------------------------------------------------------------------------
# Vision chat
# ---------------------------------------------------------------------------
@app.route("/vision-chat", methods=["POST"])
def vision_chat():
    data = request.get_json(silent=True) or {}

    message = data.get("message")
    message = message.strip()[:MAX_USER_MESSAGE_CHARS] if isinstance(message, str) else ""

    # Accept either one image ("image") or several ("images").
    images = data.get("images")
    if not images:
        single = data.get("image")
        images = [single] if single else []
    if not isinstance(images, list):
        images = []

    if not images:
        return jsonify({"error": "No image was received."}), 400
    if len(images) > MAX_IMAGES:
        return jsonify({"error": f"You can attach at most {MAX_IMAGES} images at a time."}), 400
    for i, img in enumerate(images, 1):
        problem = image_problem(i, img)
        if problem:
            return jsonify({"error": problem}), 400
    images = [shrink_image(img) for img in images]
    app.logger.info(
        "vision-chat: %d image(s), sizes=%s chars, model=%s",
        len(images), [len(img) for img in images], VISION_MODEL,
    )

    mode = data.get("mode", "education")
    system_prompt = MODE_PROMPTS.get(mode, EDUCATION_PROMPT) + IMAGE_NOTE
    history = clean_history(data.get("history"))

    content_blocks = [{"type": "text", "text": message or DEFAULT_VISION_QUESTION}]
    for img in images:
        content_blocks.append({"type": "image_url", "image_url": {"url": img}})

    request_kwargs = {}
    if VISION_REASONING:
        # extra_body works on any SDK version, even before it knows this field.
        request_kwargs["extra_body"] = {"reasoning_effort": VISION_REASONING}

    try:
        completion = client.chat.completions.create(
            model=VISION_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                *history,
                {"role": "user", "content": content_blocks},
            ],
            temperature=0.7,
            max_completion_tokens=VISION_MAX_TOKENS,
            **request_kwargs,
        )
        reply, finish = extract_reply(completion)
        if not reply:
            # Thinking models can burn the whole budget on reasoning.
            app.logger.warning("vision-chat empty reply (finish_reason=%s)", finish)
            return jsonify({"error": "The model couldn't finish analysing that image. Try again, or ask a more specific question."}), 502
        if finish == "length":
            reply += "\n\n⚠️ _The reply was cut off because it hit the length limit. Ask me to continue._"
        return jsonify({"reply": reply})
    except Exception as e:
        return groq_error_response(e, "vision-chat")


# ---------------------------------------------------------------------------
# Speech-to-text
# ---------------------------------------------------------------------------
@app.route("/transcribe", methods=["POST"])
def transcribe():
    audio = request.files.get("audio")
    if audio is None:
        return jsonify({"error": "No audio was received."}), 400

    audio_bytes = audio.read()
    if len(audio_bytes) < 1000:
        return jsonify({"error": "That recording was too short — hold the mic a bit longer."}), 400
    if len(audio_bytes) > MAX_AUDIO_BYTES:
        return jsonify({"error": "That recording is too large. Try a shorter one."}), 413

    # The extension tells Groq the audio format (Chrome: .webm, Safari: .mp4).
    filename = audio.filename or "recording.webm"

    # Optional language hint like "en" or "hi"; empty means auto-detect.
    language = (request.form.get("language") or "").strip()

    kwargs = {
        "file": (filename, audio_bytes),
        "model": TRANSCRIBE_MODEL,
        "response_format": "json",
        "temperature": 0.0,
    }
    if language:
        kwargs["language"] = language

    try:
        result = client.audio.transcriptions.create(**kwargs)
        return jsonify({"text": (result.text or "").strip()})
    except Exception as e:
        return groq_error_response(e, "transcribe")


# For local runs only. On Render, start with: gunicorn app:app
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)