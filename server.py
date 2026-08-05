import os
import json
import uuid
import datetime
from concurrent.futures import ThreadPoolExecutor
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from langdetect import detect
from deep_translator import GoogleTranslator

# Initialize FastAPI App
app = FastAPI(title="Real-time Universal Multi-lingual Message Board")

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

# Load supported languages from GoogleTranslator
try:
    SUPPORTED_LANGUAGES = GoogleTranslator().get_supported_languages(as_dict=True)
except Exception:
    # Fallback popular languages if offline or error
    SUPPORTED_LANGUAGES = {
        "english": "en", "hindi": "hi", "spanish": "es", "french": "fr", "german": "de",
        "arabic": "ar", "chinese (simplified)": "zh-CN", "chinese (traditional)": "zh-TW",
        "russian": "ru", "portuguese": "pt", "japanese": "ja", "korean": "ko", "italian": "it",
        "turkish": "tr", "vietnamese": "vi", "bengali": "bn", "punjabi": "pa", "gujarati": "gu",
        "marathi": "mr", "tamil": "ta", "telugu": "te", "urdu": "ur", "kannada": "kn", "malayalam": "ml"
    }

LANG_CODE_TO_NAME = {code: name.capitalize() for name, code in SUPPORTED_LANGUAGES.items()}

# Common multilingual greeting words mapping for smart suggestion
GREETING_LANGUAGE_MAP = {
    "namaste": "hi", "namaskar": "hi", "kya haal": "hi", "kaise ho": "hi", "dosto": "hi", "shukriya": "hi",
    "hola": "es", "adios": "es", "gracias": "es", "amigo": "es", "como estas": "es",
    "bonjour": "fr", "salut": "fr", "merci": "fr", "comment ca va": "fr",
    "hallo": "de", "danke": "de", "wie geht": "de",
    "ciao": "it", "grazie": "it",
    "marhaban": "ar", "shukran": "ar", "salam": "ar",
    "konnichiwa": "ja", "arigatou": "ja", "moshi moshi": "ja",
    "ni hao": "zh-CN", "xie xie": "zh-CN",
    "privet": "ru", "spasibo": "ru",
    "hello": "en", "hi": "en", "thanks": "en", "how are you": "en"
}

# Request schema for posting message
class MessagePost(BaseModel):
    sender: str
    avatar: str
    text: str

# Thread pool executor for parallel translations
executor = ThreadPoolExecutor(max_workers=10)

def translate_single_message(msg_id, original_text, original_lang, target_lang):
    """
    Translates a single message and caches it.
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
            # If Google returns its standard HTML error pages or rate limit messages
            if "error 500" in translated_lower or "that’s an error" in translated_lower or "server error" in translated_lower:
                return original_text
                
            if msg_id not in translations_cache:
                translations_cache[msg_id] = {}
            translations_cache[msg_id][target_lang] = translated
            return translated
    except Exception as e:
        print(f"Translation error from {original_lang} to {target_lang} for msg {msg_id}: {e}")
        
    # Fallback to original text if translation fails
    return original_text

def smart_detect_language(text):
    """
    Detects language with langdetect, falling back to Google Translator's auto-detect.
    """
    text_lower = text.strip().lower()
    
    # Check simple multi-lingual word mappings first
    for word, code in GREETING_LANGUAGE_MAP.items():
        if word in text_lower:
            return code
            
    # Run langdetect
    try:
        return detect(text)
    except Exception:
        return "en" # Fallback to English

@app.get("/api/languages")
def get_languages():
    """
    Returns lists of all supported languages.
    """
    sorted_langs = sorted([{"code": code, "name": name} for name, code in SUPPORTED_LANGUAGES.items()], key=lambda x: x["name"])
    return {"languages": sorted_langs}

@app.get("/api/suggest-language")
def suggest_language(q: str = Query("", description="Query text to search or detect language")):
    """
    AI-powered Language Search and Suggestion.
    """
    q_clean = q.strip().lower()
    if not q_clean:
        return {"suggestions": []}
        
    suggestions = []
    
    # 1. Search for direct name match in supported languages list
    for name, code in SUPPORTED_LANGUAGES.items():
        if q_clean in name:
            suggestions.append({
                "code": code,
                "name": name.capitalize(),
                "reason": "Matching language name"
            })
            
    # 2. Match greetings or single phrases
    for greeting, code in GREETING_LANGUAGE_MAP.items():
        if q_clean == greeting or (len(q_clean) >= 3 and q_clean in greeting):
            lang_name = LANG_CODE_TO_NAME.get(code, "Unknown")
            # Avoid duplicate suggestions
            if not any(s["code"] == code for s in suggestions):
                suggestions.insert(0, {
                    "code": code,
                    "name": lang_name,
                    "reason": f"AI Greeting Match (e.g. '{greeting}')"
                })
                
    # 3. Running AI LangDetect on input text if query is a bit longer
    if len(q_clean) >= 4:
        try:
            detected_code = detect(q_clean)
            if detected_code in LANG_CODE_TO_NAME:
                lang_name = LANG_CODE_TO_NAME[detected_code]
                if not any(s["code"] == detected_code for s in suggestions):
                    suggestions.insert(0, {
                        "code": detected_code,
                        "name": lang_name,
                        "reason": f"AI Detected from input '{q_clean}'"
                    })
        except Exception:
            pass
            
    return {"suggestions": suggestions[:6]}

@app.post("/api/messages")
def post_message(data: MessagePost):
    """
    Posts a new message. Auto-detects the original language of the text.
    """
    if not data.text.strip():
        raise HTTPException(status_code=400, detail="Message text cannot be empty")
        
    msg_id = f"msg_{int(datetime.datetime.now().timestamp() * 1000)}"
    detected_lang = smart_detect_language(data.text)
    detected_lang_name = LANG_CODE_TO_NAME.get(detected_lang, "Unknown")
    
    new_msg = {
        "id": msg_id,
        "sender": data.sender.strip() or "Anonymous User",
        "avatar": data.avatar or "🦁",
        "text": data.text,
        "original_lang": detected_lang,
        "original_lang_name": detected_lang_name,
        "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    
    messages.append(new_msg)
    save_messages()
    
    # Pre-cache the translation in its own original language
    if msg_id not in translations_cache:
        translations_cache[msg_id] = {}
    translations_cache[msg_id][detected_lang] = data.text
    save_translations()
    
    return new_msg

@app.get("/api/messages")
def get_messages(lang: str = "en"):
    """
    Retrieves all messages, translating them to the requested target language in real-time.
    Uses in-memory cache and ThreadPool for maximum translation speed.
    """
    if lang not in LANG_CODE_TO_NAME:
        lang = "en" # Default to English if invalid language passed
        
    # Prepare all messages for response
    response_messages = []
    
    # We want to translate any messages that aren't already cached in parallel
    futures = []
    for msg in messages:
        msg_id = msg["id"]
        text = msg["text"]
        orig_lang = msg["original_lang"]
        
        # Submit single translation task to thread pool
        future = executor.submit(translate_single_message, msg_id, text, orig_lang, lang)
        futures.append((msg, future))
        
    # Gather results and build the translated list
    cache_updated = False
    for msg, future in futures:
        try:
            translated_text = future.result()
        except Exception:
            translated_text = msg["text"]
            
        # Check if the cache was updated
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

# Serve index.html directly from FastAPI
@app.get("/", response_class=HTMLResponse)
def get_index():
    if os.path.exists("./static/index.html"):
        with open("./static/index.html", "r", encoding="utf-8") as f:
            return f.read()
    return "<h3>Frontend index.html file not found in ./static</h3>"

# Mount static folder for CSS, JS, Images
os.makedirs("./static", exist_ok=True)
app.mount("/static", StaticFiles(directory="./static"), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
