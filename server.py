import os
import json
import datetime
import html
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from langdetect import detect
from deep_translator import GoogleTranslator

# Initialize FastAPI App
app = FastAPI(title="BhashaSetu — Bulletproof Multi-lingual Backend")

# Directories for persistence
DATA_DIR = "./data"
os.makedirs(DATA_DIR, exist_ok=True)

MESSAGES_FILE = os.path.join(DATA_DIR, "messages.json")
TRANSLATIONS_FILE = os.path.join(DATA_DIR, "translations.json")

# In-memory storage
messages = []
translations_cache = {}

# Load existing messages and translations
if os.path.exists(MESSAGES_FILE):
    try:
        with open(MESSAGES_FILE, "r", encoding="utf-8") as f:
            messages = json.load(f)
    except Exception:
        messages = []

if os.path.exists(TRANSLATIONS_FILE):
    try:
        with open(TRANSLATIONS_FILE, "r", encoding="utf-8") as f:
            translations_cache = json.load(f)
    except Exception:
        translations_cache = {}

# Save helpers
def save_messages():
    with open(MESSAGES_FILE, "w", encoding="utf-8") as f:
        json.dump(messages, f, ensure_ascii=False, indent=2)

def save_translations():
    with open(TRANSLATIONS_FILE, "w", encoding="utf-8") as f:
        json.dump(translations_cache, f, ensure_ascii=False, indent=2)

# Load supported languages
try:
    SUPPORTED_LANGUAGES = GoogleTranslator().get_supported_languages(as_dict=True)
except Exception:
    SUPPORTED_LANGUAGES = {
        "english": "en", "hindi": "hi", "spanish": "es", "french": "fr", "german": "de",
        "arabic": "ar", "chinese (simplified)": "zh-CN", "chinese (traditional)": "zh-TW",
        "russian": "ru", "portuguese": "pt", "japanese": "ja", "korean": "ko", "italian": "it"
    }

LANG_CODE_TO_NAME = {code: name.capitalize() for name, code in SUPPORTED_LANGUAGES.items()}

# Common greetings
GREETING_LANGUAGE_MAP = {
    "namaste": "hi", "namaskar": "hi", "kya haal": "hi", "kaise ho": "hi", "hola": "es", "gracias": "es",
    "bonjour": "fr", "merci": "fr", "hallo": "de", "danke": "de", "ciao": "it", "grazie": "it",
    "ni hao": "zh-CN", "xie xie": "zh-CN", "konnichiwa": "ja", "arigatou": "ja", "hello": "en", "thanks": "en"
}

# ========================================================
// 🛡️ PRODUCTION-GRADE SECURITY & RATE LIMITING STATE
# ========================================================
# Strict caps for system health and spam prevention
MAX_MESSAGES_CAP = 100       # Keep only the last 100 messages to prevent memory bloat
MAX_TEXT_LENGTH = 500        # Max 500 characters per message
MAX_SENDER_LENGTH = 40       # Max 40 characters for sender name
RATE_LIMIT_POSTS = 5         # Max 5 posts...
RATE_LIMIT_WINDOW = 30       # ...per 30 seconds

# In-memory IP tracking dictionary for rate limits
ip_post_history = defaultdict(list)

class MessagePost(BaseModel):
    sender: str
    avatar: str
    text: str

# Thread pool executor for parallel translations
executor = ThreadPoolExecutor(max_workers=10)

def translate_single_message(msg_id, original_text, original_lang, target_lang):
    """
    Translates a single message and caches it. Rejects rate limits or HTML errors cleanly.
    """
    if target_lang == original_lang:
        return original_text
    
    # Check if already cached
    if msg_id in translations_cache and target_lang in translations_cache[msg_id]:
        return translations_cache[msg_id][target_lang]
        
    try:
        # Perform translation
        translated = GoogleTranslator(source='auto', target=target_lang).translate(original_text)
        if translated:
            translated_lower = translated.lower()
            # Catch raw HTML errors or Google Block pages cleanly
            if "<html" in translated_lower or "error 500" in translated_lower or "that’s an error" in translated_lower or "server error" in translated_lower:
                return original_text # Fallback to original text, DO NOT cache the error!
                
            if msg_id not in translations_cache:
                translations_cache[msg_id] = {}
            translations_cache[msg_id][target_lang] = translated
            return translated
    except Exception as e:
        print(f"Translation error from {original_lang} to {target_lang} for msg {msg_id}: {e}")
        
    return original_text

def smart_detect_language(text):
    text_lower = text.strip().lower()
    for word, code in GREETING_LANGUAGE_MAP.items():
        if word in text_lower:
            return code
    try:
        return detect(text)
    except Exception:
        return "en"

@app.get("/api/languages")
def get_languages():
    sorted_langs = sorted([{"code": code, "name": name} for name, code in SUPPORTED_LANGUAGES.items()], key=lambda x: x["name"])
    return {"languages": sorted_langs}

@app.get("/api/suggest-language")
def suggest_language(q: str = Query("", description="Query text to search or detect language")):
    q_clean = q.strip().lower()
    if not q_clean:
        return {"suggestions": []}
        
    suggestions = []
    
    # Name match
    for name, code in SUPPORTED_LANGUAGES.items():
        if q_clean in name:
            suggestions.append({"code": code, "name": name.capitalize(), "reason": "Matching language name"})
            
    # Greetings match
    for greeting, code in GREETING_LANGUAGE_MAP.items():
        if q_clean == greeting or (len(q_clean) >= 3 and q_clean in greeting):
            lang_name = LANG_CODE_TO_NAME.get(code, "Unknown")
            if not any(s["code"] == code for s in suggestions):
                suggestions.insert(0, {"code": code, "name": lang_name, "reason": f"AI Greeting Match"})
                
    # Running AI Detection
    if len(q_clean) >= 4:
        try:
            detected_code = detect(q_clean)
            if detected_code in LANG_CODE_TO_NAME:
                lang_name = LANG_CODE_TO_NAME[detected_code]
                if not any(s["code"] == detected_code for s in suggestions):
                    suggestions.insert(0, {"code": detected_code, "name": lang_name, "reason": "AI Detected"})
        except Exception:
            pass
            
    return {"suggestions": suggestions[:6]}

@app.post("/api/messages")
def post_message(data: MessagePost, request: Request):
    """
    Posts a new message with high-security sanitization, size validation, and IP rate-limiting!
    """
    client_ip = request.client.host or "unknown-ip"
    now_ts = datetime.datetime.now().timestamp()
    
    # 1. 🛡️ Spam Rate Limiting validation
    history = ip_post_history[client_ip]
    # Keep only timestamps within our rate limit window (last 30s)
    history = [ts for ts in history if now_ts - ts < RATE_LIMIT_WINDOW]
    ip_post_history[client_ip] = history
    
    if len(history) >= RATE_LIMIT_POSTS:
        raise HTTPException(
            status_code=429, 
            detail=f"Too many requests! Spam protection active. Please wait {int(RATE_LIMIT_WINDOW - (now_ts - history[0]))}s."
        )
        
    # 2. 🛡️ Input Truncation & Validation
    text_stripped = data.text.strip()
    sender_stripped = data.sender.strip()
    
    if not text_stripped:
        raise HTTPException(status_code=400, detail="Message text cannot be empty")
        
    # Enforce strict length caps to prevent buffer overflows or styling breakages
    if len(text_stripped) > MAX_TEXT_LENGTH:
        text_stripped = text_stripped[:MAX_TEXT_LENGTH] + "..."
        
    if len(sender_stripped) > MAX_SENDER_LENGTH:
        sender_stripped = sender_stripped[:MAX_SENDER_LENGTH]
        
    # 3. 🛡️ XSS HTML Sanitization (Escapes <script>, HTML tags, and harmful input)
    sanitized_text = html.escape(text_stripped)
    sanitized_sender = html.escape(sender_stripped)
    
    # Detect language
    detected_lang = smart_detect_language(sanitized_text)
    detected_lang_name = LANG_CODE_TO_NAME.get(detected_lang, "Unknown")
    
    msg_id = f"msg_{int(now_ts * 1000)}"
    new_msg = {
        "id": msg_id,
        "sender": sanitized_sender or "Anonymous User",
        "avatar": data.avatar or "🦁",
        "text": sanitized_text,
        "original_lang": detected_lang,
        "original_lang_name": detected_lang_name,
        "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    
    # 4. 🛡️ Storage rotation (Caps message list size at 100 to prevent file and memory bloating)
    messages.append(new_msg)
    if len(messages) > MAX_MESSAGES_CAP:
        removed = messages.pop(0)
        # Clean up corresponding translation caches to save memory
        if removed["id"] in translations_cache:
            del translations_cache[removed["id"]]
            
    save_messages()
    
    # Record the timestamp for spam protection
    ip_post_history[client_ip].append(now_ts)
    
    # Pre-cache translation in its own language
    if msg_id not in translations_cache:
        translations_cache[msg_id] = {}
    translations_cache[msg_id][detected_lang] = sanitized_text
    save_translations()
    
    return new_msg

@app.get("/api/messages")
def get_messages(lang: str = "en"):
    """
    Retrieves all messages, translating them in real-time. Extremely fast due to caching.
    """
    if lang not in LANG_CODE_TO_NAME:
        lang = "en"
        
    response_messages = []
    futures = []
    
    for msg in messages:
        msg_id = msg["id"]
        text = msg["text"]
        orig_lang = msg["original_lang"]
        
        future = executor.submit(translate_single_message, msg_id, text, orig_lang, lang)
        futures.append((msg, future))
        
    cache_updated = False
    for msg, future in futures:
        try:
            translated_text = future.result()
        except Exception:
            translated_text = msg["text"]
            
        msg_id = msg["id"]
        if msg_id in translations_cache and lang in translations_cache[msg_id]:
            cache_updated = True
            
        response_messages.append({
            "id": msg["id"],
            "sender": msg["sender"],
            "avatar": msg["avatar"],
            "original_text": msg["text"],
            "original_lang": msg["original_lang"],
            "original_lang_name": msg["original_lang_name"],
            "translated_text": translated_text,
            "timestamp": msg["timestamp"]
        })
        
    if cache_updated:
        save_translations()
        
    return {"messages": response_messages, "current_language": LANG_CODE_TO_NAME[lang]}

# Serve core index.html file
@app.get("/", response_class=HTMLResponse)
def get_index():
    if os.path.exists("./static/index.html"):
        with open("./static/index.html", "r", encoding="utf-8") as f:
            return f.read()
    return "<h3>Frontend index.html file not found in ./static</h3>"

# Explicit routes for static assets so they can be requested from root
@app.get("/style.css")
def get_css():
    return FileResponse("./static/style.css", media_type="text/css")

@app.get("/app.js")
def get_js():
    return FileResponse("./static/app.js", media_type="application/javascript")

@app.get("/chat-pattern.svg")
def get_svg():
    return FileResponse("./static/chat-pattern.svg", media_type="image/svg+xml")

# Mount static folder for fallback/other assets
os.makedirs("./static", exist_ok=True)
app.mount("/static", StaticFiles(directory="./static"), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
