import os
import json
import asyncio
import datetime
import html
import uuid
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from fastapi import FastAPI, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from langdetect import detect
from deep_translator import GoogleTranslator

# Initialize FastAPI App
app = FastAPI(title="BhashaSetu — Baap-Level Distributed Real-Time Global Backend")

# Directories for durable persistence
DATA_DIR = "./data"
os.makedirs(DATA_DIR, exist_ok=True)

MESSAGES_FILE = os.path.join(DATA_DIR, "messages.json")
TRANSLATIONS_FILE = os.path.join(DATA_DIR, "translations.json")

# Core In-Memory Database with atomic disk synchronization
messages = []
translations_cache = {}
sequence_counter = 0

# Load existing data on boot
if os.path.exists(MESSAGES_FILE):
    try:
        with open(MESSAGES_FILE, "r", encoding="utf-8") as f:
            messages = json.load(f)
            # Recover global sequence counter
            if messages:
                sequence_counter = max(msg.get("sequenceNumber", 0) for msg in messages)
    except Exception as e:
        print(f"Error loading message logs: {e}")

if os.path.exists(TRANSLATIONS_FILE):
    try:
        with open(TRANSLATIONS_FILE, "r", encoding="utf-8") as f:
            translations_cache = json.load(f)
    except Exception as e:
        print(f"Error loading translation cache: {e}")

# Thread-safe lock for disk writes
io_lock = asyncio.Lock()

async def async_save_messages():
    async with io_lock:
        temp_file = MESSAGES_FILE + ".tmp"
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(messages, f, ensure_ascii=False, indent=2)
        os.replace(temp_file, MESSAGES_FILE)

async def async_save_translations():
    async with io_lock:
        temp_file = TRANSLATIONS_FILE + ".tmp"
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(translations_cache, f, ensure_ascii=False, indent=2)
        os.replace(temp_file, TRANSLATIONS_FILE)

# Load supported languages on start
try:
    SUPPORTED_LANGUAGES = GoogleTranslator().get_supported_languages(as_dict=True)
except Exception:
    SUPPORTED_LANGUAGES = {
        "english": "en", "hindi": "hi", "spanish": "es", "french": "fr", "german": "de",
        "arabic": "ar", "chinese (simplified)": "zh-CN", "chinese (traditional)": "zh-TW",
        "russian": "ru", "portuguese": "pt", "japanese": "ja", "korean": "ko", "italian": "it"
    }
LANG_CODE_TO_NAME = {code: name.capitalize() for name, code in SUPPORTED_LANGUAGES.items()}

# Normalize old/demo messages so sequence recovery and idempotency work after restart
for idx, msg in enumerate(messages, start=1):
    msg.setdefault("sequenceNumber", idx)
    msg.setdefault("clientMessageId", msg.get("id", f"seed_{idx}"))
    msg.setdefault("original_lang", "en")
    msg.setdefault("original_lang_name", LANG_CODE_TO_NAME.get(msg.get("original_lang", "en"), "English"))
if messages:
    sequence_counter = max(msg.get("sequenceNumber", 0) for msg in messages)

# Core Multilingual Greetings
GREETING_LANGUAGE_MAP = {
    "namaste": "hi", "namaskar": "hi", "kya haal": "hi", "kaise ho": "hi", "hola": "es", "gracias": "es",
    "bonjour": "fr", "merci": "fr", "hallo": "de", "danke": "de", "ciao": "it", "grazie": "it",
    "ni hao": "zh-CN", "xie xie": "zh-CN", "konnichiwa": "ja", "arigatou": "ja", "hello": "en", "thanks": "en"
}

# ========================================================
# 🛡️ HARDENED SECURITY & LIMIT CONSTRAINTS
# ========================================================
MAX_MESSAGES_CAP = 150       # Keep last 150 messages for memory health
MAX_TEXT_LENGTH = 1000       # Allow up to 1000 characters
MAX_SENDER_LENGTH = 40
RATE_LIMIT_POSTS = 8         # Max 8 posts...
RATE_LIMIT_WINDOW = 30       # ...per 30 seconds

ip_post_history = defaultdict(list)
idempotency_keys = set() # Store clientMessageId to prevent duplicate posts entirely

class MessagePost(BaseModel):
    clientMessageId: str
    sender: str
    avatar: str
    text: str

# Parallel background translation pipeline executor
executor = ThreadPoolExecutor(max_workers=10)

# ========================================================
# 🌍 ROBUST MULTI-PROVIDER TRANSLATION FALLBACK SYSTEM
# ========================================================
def perform_translation_cascade(original_text, target_lang):
    """
    Tries multiple endpoints and fallback providers to translate text.
    Never blocks, never crashes, never corrupts cache on error.
    """
    # Provider 1: Standard Client Google single API (Fastest and highly reliable)
    try:
        import requests
        url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl={target_lang}&dt=t&q={requests.utils.quote(original_text)}"
        res = requests.get(url, timeout=3)
        if res.status_code == 200:
            json_res = res.json()
            if json_res and json_res[0]:
                translated = "".join(s[0] for s in json_res[0] if s and s[0])
                if "<html" not in translated.lower() and "error" not in translated.lower():
                    return translated, "Google_Single"
    except Exception as e:
        print(f"Provider 1 (Google_Single) failed: {e}")

    # Provider 2: deep-translator wrapper (Standard GoogleTranslator)
    try:
        translated = GoogleTranslator(source='auto', target=target_lang).translate(original_text)
        if translated:
            translated_lower = translated.lower()
            if "<html" not in translated_lower and "error 500" not in translated_lower:
                return translated, "GoogleTranslator_Lib"
    except Exception as e:
        print(f"Provider 2 (GoogleTranslator_Lib) failed: {e}")

    # Provider 3: MyMemory free translation API (Tertiary Fallback)
    try:
        import requests
        url = f"https://api.mymemory.translated.net/get?q={requests.utils.quote(original_text)}&langpair=auto|{target_lang}"
        res = requests.get(url, timeout=3)
        if res.status_code == 200:
            json_res = res.json()
            translated = json_res.get("responseData", {}).get("translatedText", "")
            if translated and "invalid" not in translated.lower() and "error" not in translated.lower():
                return translated, "MyMemory_API"
    except Exception as e:
        print(f"Provider 3 (MyMemory_API) failed: {e}")

    # Graceful Degradation: return original text if all translation channels are exhausted/down
    return original_text, "Failed_Fallback"

def smart_detect_language(text):
    text_lower = text.strip().lower()
    for word, code in GREETING_LANGUAGE_MAP.items():
        if word in text_lower:
            return code
    try:
        return detect(text)
    except Exception:
        return "en"

def translate_single_message(msg_id, original_text, original_lang, target_lang):
    """ThreadPool-safe translation helper used by GET /api/messages."""
    if not target_lang or target_lang == original_lang:
        return original_text
    if msg_id in translations_cache and target_lang in translations_cache[msg_id]:
        return translations_cache[msg_id][target_lang]
    translated, provider = perform_translation_cascade(original_text, target_lang)
    if provider != "Failed_Fallback":
        translations_cache.setdefault(msg_id, {})[target_lang] = translated
    return translated or original_text

# ========================================================
# 🔌 DISTRIBUTED WEBSOCKET REAL-TIME CONNECTION MANAGER
# ========================================================
class ConnectionManager:
    def __init__(self):
        self.active_connections = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        dead_sockets = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead_sockets.append(connection)
                
        for socket in dead_sockets:
            self.disconnect(socket)

manager = ConnectionManager()

# ========================================================
# 🛡️ DYNAMIC BACKGROUND ASYNC TRANSLATION PIPELINE
# ========================================================
async def background_translation_worker(msg_id, original_text, original_lang):
    """
    Async background worker that translates a new post into popular AND active languages.
    Triggers client broadcast patch event when finished so users get real-time translations!
    """
    # 1. Collect all active languages read by currently online WebSocket users!
    active_langs = {ws.selected_lang for ws in manager.active_connections if hasattr(ws, "selected_lang")}
    
    # 2. Merge with popular languages so pre-caching remains active
    popular_codes_set = {"hi", "es", "en", "fr", "ar", "de", "ru", "pt", "ja", "zh-CN"}
    target_languages = popular_codes_set.union(active_langs)
    
    for code in target_languages:
        if code == original_lang:
            continue
            
        # Run cascade translate inside ThreadPoolExecutor to prevent blocking async event loop
        loop = asyncio.get_event_loop()
        translated, provider = await loop.run_in_executor(
            executor, perform_translation_cascade, original_text, code
        )
        
        if provider != "Failed_Fallback":
            if msg_id not in translations_cache:
                translations_cache[msg_id] = {}
            translations_cache[msg_id][code] = translated
            
            # Broadcast update patch to active sockets!
            await manager.broadcast({
                "type": "TRANSLATION_UPDATED",
                "id": msg_id,
                "targetLang": code,
                "translatedText": translated,
                "originalLang": original_lang,
                "provider": provider
            })
            
    await async_save_translations()

# ========================================================
# 🚀 CORE MESSAGING LOGIC AND UTILITIES
# ========================================================
async def process_incoming_message(client_id, sender, avatar, text, ip_address):
    """
    Validates, sanitizes, sequences, and persists incoming posts.
    """
    global sequence_counter
    
    # 1. Idempotency validation (Strictly prevents duplicate messages on retry)
    if client_id in idempotency_keys:
        # Find and return existing message if retry was already saved
        for msg in messages:
            if msg.get("clientMessageId") == client_id:
                return msg
        return None

    # 2. Rate Limiting validation
    now_ts = datetime.datetime.now().timestamp()
    history = ip_post_history[ip_address]
    history = [ts for ts in history if now_ts - ts < RATE_LIMIT_WINDOW]
    ip_post_history[ip_address] = history
    
    if len(history) >= RATE_LIMIT_POSTS:
        raise HTTPException(status_code=429, detail="Spam protection active. Please wait.")

    # 3. Size validation & HTML XSS Sanitization
    text_stripped = text.strip()
    sender_stripped = sender.strip()
    
    if not text_stripped:
        raise HTTPException(status_code=400, detail="Empty text")
        
    if len(text_stripped) > MAX_TEXT_LENGTH:
        text_stripped = text_stripped[:MAX_TEXT_LENGTH] + "..."
    if len(sender_stripped) > MAX_SENDER_LENGTH:
        sender_stripped = sender_stripped[:MAX_SENDER_LENGTH]
        
    sanitized_text = html.escape(text_stripped)
    sanitized_sender = html.escape(sender_stripped)

    # 4. Sequence number allocation
    sequence_counter += 1
    msg_id = f"msg_{int(now_ts * 1000)}"
    detected_lang = smart_detect_language(sanitized_text)
    detected_lang_name = LANG_CODE_TO_NAME.get(detected_lang, "Unknown")
    
    new_msg = {
        "id": msg_id,
        "clientMessageId": client_id,
        "sender": sanitized_sender or "Anonymous User",
        "avatar": avatar or "🦁",
        "text": sanitized_text,
        "original_lang": detected_lang,
        "original_lang_name": detected_lang_name,
        "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "sequenceNumber": sequence_counter
    }
    
    # Storage rotation
    messages.append(new_msg)
    if len(messages) > MAX_MESSAGES_CAP:
        removed = messages.pop(0)
        if removed["id"] in translations_cache:
            del translations_cache[removed["id"]]
            
    await async_save_messages()
    
    # Save key for idempotency
    idempotency_keys.add(client_id)
    ip_post_history[ip_address].append(now_ts)
    
    # Pre-cache translation in its own language
    if msg_id not in translations_cache:
        translations_cache[msg_id] = {}
    translations_cache[msg_id][detected_lang] = sanitized_text
    await async_save_translations()

    # Trigger async background translation pipeline!
    asyncio.create_task(background_translation_worker(msg_id, sanitized_text, detected_lang))

    return new_msg

# ========================================================
# 🔌 HTTP REST ENDPOINTS (FAULT-TOLERANT FALLBACKS)
# ========================================================
@app.get("/api/languages")
def get_languages():
    sorted_langs = sorted([{"code": code, "name": name} for name, code in SUPPORTED_LANGUAGES.items()], key=lambda x: x["name"])
    return {"languages": sorted_langs}

@app.get("/api/suggest-language")
def suggest_language(q: str = Query("")):
    q_clean = q.strip().lower()
    if not q_clean:
        return {"suggestions": []}
        
    suggestions = []
    for name, code in SUPPORTED_LANGUAGES.items():
        if q_clean in name:
            suggestions.append({"code": code, "name": name.capitalize(), "reason": "Matching language name"})
            
    for greeting, code in GREETING_LANGUAGE_MAP.items():
        if q_clean == greeting or (len(q_clean) >= 3 and q_clean in greeting):
            lang_name = LANG_CODE_TO_NAME.get(code, "Unknown")
            if not any(s["code"] == code for s in suggestions):
                suggestions.insert(0, {"code": code, "name": lang_name, "reason": f"AI Greeting Match"})
                
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

@app.get("/api/messages")
async def get_messages(lang: str = "en"):
    """
    HTTP REST Sync endpoint. Dynamically translates missing messages on-the-fly inside ThreadPool!
    """
    if lang not in LANG_CODE_TO_NAME:
        lang = "en"
        
    response_messages = []
    futures = []
    
    # Submit translation requests in parallel using ThreadPoolExecutor for 0ms server latency feeling
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
            "id": msg_id,
            "sender": msg["sender"],
            "avatar": msg["avatar"],
            "original_text": msg["text"],
            "original_lang": msg["original_lang"],
            "original_lang_name": msg["original_lang_name"],
            "translated_text": translated_text,
            "timestamp": msg["timestamp"],
            "sequenceNumber": msg.get("sequenceNumber", 0)
        })
        
    if cache_updated:
        await async_save_translations()
        
    return {"messages": response_messages, "current_language": LANG_CODE_TO_NAME[lang]}

@app.post("/api/messages")
async def post_message_http(data: MessagePost, request: Request):
    """
    HTTP REST Fallback endpoint for message delivery.
    """
    client_ip = request.client.host or "unknown-ip"
    new_msg = await process_incoming_message(
        data.clientMessageId, data.sender, data.avatar, data.text, client_ip
    )
    
    if new_msg:
        # Broadcast this new message to all active WebSocket clients!
        await manager.broadcast({
            "type": "NEW_MESSAGE",
            "message": {
                "id": new_msg["id"],
                "sender": new_msg["sender"],
                "avatar": new_msg["avatar"],
                "original_text": new_msg["text"],
                "original_lang": new_msg["original_lang"],
                "original_lang_name": new_msg["original_lang_name"],
                "translated_text": new_msg["text"],
                "timestamp": new_msg["timestamp"],
                "sequenceNumber": new_msg["sequenceNumber"]
            }
        })
        return new_msg
        
    raise HTTPException(status_code=500, detail="Failed to process message")

# ========================================================
# 🔌 DISTRIBUTED HIGH-PERFORMANCE WEBSOCKET GATEWAY
# ========================================================
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    client_ip = websocket.client.host or "unknown-ip"
    try:
        while True:
            # Wait for incoming WS message packets
            data_str = await websocket.receive_text()
            packet = json.loads(data_str)
            packet_type = packet.get("type")

            if packet_type == "PING":
                await websocket.send_json({"type": "PONG", "now": datetime.datetime.now().timestamp()})
                continue

            # A. Connection Initial Sync / Reconnect Resume handshake
            if packet_type == "CONNECT":
                last_sequence = packet.get("lastSequence", 0)
                selected_lang = packet.get("lang", "en")
                
                # Associate active reading language with this active connection!
                websocket.selected_lang = selected_lang
                
                # Check for missed messages since their last sequence number (Sequence Recovery)
                missed_messages = [msg for msg in messages if msg.get("sequenceNumber", 0) > last_sequence]
                
                # Replay missed messages to this socket instantly! (Zero message loss recovery)
                for msg in missed_messages:
                    orig_lang = msg["original_lang"]
                    
                    # Pull from translation cache if exists, otherwise send original (client will request translation)
                    translated_text = msg["text"]
                    if selected_lang == orig_lang:
                        translated_text = msg["text"]
                    elif msg["id"] in translations_cache and selected_lang in translations_cache[msg["id"]]:
                        translated_text = translations_cache[msg["id"]][selected_lang]

                    await websocket.send_json({
                        "type": "NEW_MESSAGE",
                        "message": {
                            "id": msg["id"],
                            "sender": msg["sender"],
                            "avatar": msg["avatar"],
                            "original_text": msg["text"],
                            "original_lang": msg["original_lang"],
                            "original_lang_name": msg["original_lang_name"],
                            "translated_text": translated_text,
                            "timestamp": msg["timestamp"],
                            "sequenceNumber": msg["sequenceNumber"]
                        }
                    })
                    
                # Acknowledge connection
                await websocket.send_json({
                    "type": "CONNECTED",
                    "sequenceNumber": sequence_counter
                })

            # B. Real-Time Message Dispatch
            elif packet_type == "SEND_MESSAGE":
                client_id = packet.get("clientMessageId")
                sender = packet.get("sender")
                avatar = packet.get("avatar")
                text = packet.get("text")

                try:
                    new_msg = await process_incoming_message(
                        client_id, sender, avatar, text, client_ip
                    )
                    
                    if new_msg:
                        # 1. Send ACK back to sender instantly (Server Acknowledgement < 50ms)
                        await websocket.send_json({
                            "type": "ACK",
                            "clientMessageId": client_id,
                            "id": new_msg["id"],
                            "sequenceNumber": new_msg["sequenceNumber"],
                            "timestamp": new_msg["timestamp"]
                        })

                        # 2. Broadcast NEW_MESSAGE to all connected clients!
                        await manager.broadcast({
                            "type": "NEW_MESSAGE",
                            "message": {
                                "id": new_msg["id"],
                                "sender": new_msg["sender"],
                                "avatar": new_msg["avatar"],
                                "original_text": new_msg["text"],
                                "original_lang": new_msg["original_lang"],
                                "original_lang_name": new_msg["original_lang_name"],
                                "translated_text": new_msg["text"],
                                "timestamp": new_msg["timestamp"],
                                "sequenceNumber": new_msg["sequenceNumber"]
                            }
                        })
                except HTTPException as he:
                    # Send failure back to specific socket
                    await websocket.send_json({
                        "type": "ERROR",
                        "clientMessageId": client_id,
                        "detail": he.detail
                    })
                except Exception as e:
                    await websocket.send_json({
                        "type": "ERROR",
                        "clientMessageId": client_id,
                        "detail": "Internal server error"
                    })

            # C. Real-Time Language Change tracker
            elif packet_type == "CHANGE_LANGUAGE":
                selected_lang = packet.get("lang", "en")
                websocket.selected_lang = selected_lang

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WS error: {e}")
        manager.disconnect(websocket)

# ========================================================
# 🎨 STATIC FILE ROUTING
# ========================================================
@app.get("/", response_class=HTMLResponse)
def get_index():
    if os.path.exists("./static/index.html"):
        with open("./static/index.html", "r", encoding="utf-8") as f:
            return f.read()
    return "<h3>Frontend index.html file not found in ./static</h3>"

@app.get("/style.css")
def get_css():
    return FileResponse("./static/style.css", media_type="text/css")

@app.get("/app.js")
def get_js():
    return FileResponse("./static/app.js", media_type="application/javascript")

@app.get("/chat-pattern.svg")
def get_svg():
    return FileResponse("./static/chat-pattern.svg", media_type="image/svg+xml")

# Mount static folder
os.makedirs("./static", exist_ok=True)
app.mount("/static", StaticFiles(directory="./static"), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
