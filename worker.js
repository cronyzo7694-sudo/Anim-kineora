// Cloudflare Worker for BhashaSetu — 100% Serverless Universal DM Room
// Live compiled on 2026-08-05

// In-Memory storage for messages (Preserved across requests in the same isolate)
let messages = [
  {
    "id": "msg_1",
    "sender": "Toofani Panda 🐼",
    "avatar": "🐼",
    "text": "नमस्ते दोस्तो! इस मंच पर आपका स्वागत है। आप यहाँ बिना किसी अकाउंट के अपनी भाषा में लिख सकते हैं और यह सबके लिए तुरंत अनुवादित हो जाएगा।",
    "original_lang": "hi",
    "original_lang_name": "Hindi",
    "timestamp": "2026-08-05 15:35:10"
  },
  {
    "id": "msg_2",
    "sender": "Shanti Fox 🦊",
    "avatar": "🦊",
    "text": "¡Hola a todos! Esta es una aplicación increíble. ¡La traducción en tiempo real es extremadamente rápida और no cambia el significado original!",
    "original_lang": "es",
    "original_lang_name": "Spanish",
    "timestamp": "2026-08-05 15:36:20"
  },
  {
    "id": "msg_3",
    "sender": "Smart Dolphin 🐬",
    "avatar": "🐬",
    "text": "Bonjour du monde entier ! C'est magique de pouvoir communiquer sans aucune barrière linguistique. Essayez de choisir votre langue en haut !",
    "original_lang": "fr",
    "original_lang_name": "French",
    "timestamp": "2026-08-05 15:37:45"
  },
  {
    "id": "msg_4",
    "sender": "Jugaadi Dinosaur 🦕",
    "avatar": "🦕",
    "text": "こんにちは！世界中の人々とお互いの母国語でリアルタイムに話せるなんて、本当に素晴らしい技術ですね！",
    "original_lang": "ja",
    "original_lang_name": "Japanese",
    "timestamp": "2026-08-05 15:39:00"
  }
];

// In-Memory cache for computed translations to maintain 0ms speed
const translationCache = {};

// In-Memory IP tracking map for spam rate-limiting on Cloudflare Workers
const ipPostHistory = {};

// Strict caps for system health and spam prevention
const MAX_MESSAGES_CAP = 100;       // Keep only the last 100 messages to prevent memory bloat
const MAX_TEXT_LENGTH = 500;        // Max 500 characters per message
const MAX_SENDER_LENGTH = 40;       // Max 40 characters for sender name
const RATE_LIMIT_POSTS = 5;         // Max 5 posts...
const RATE_LIMIT_WINDOW = 30;       // ...per 30 seconds

// HTML Sanitization helper to secure against XSS injection
function sanitizeHTML(str) {
  return str.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
}

// Languages supported by Google Translate
const SUPPORTED_LANGUAGES = {
  "afrikaans": "af", "albanian": "sq", "amharic": "am", "arabic": "ar", "armenian": "hy", "assamese": "as", 
  "azerbaijani": "az", "basque": "eu", "belarusian": "be", "bengali": "bn", "bosnian": "bs", "bulgarian": "bg", 
  "catalan": "ca", "cebuano": "ceb", "chinese (simplified)": "zh-CN", "chinese (traditional)": "zh-TW", 
  "croatian": "hr", "czech": "cs", "danish": "da", "dutch": "nl", "english": "en", "esperanto": "eo", 
  "estonian": "et", "finnish": "fi", "french": "fr", "galician": "gl", "georgian": "ka", "german": "de", 
  "greek": "el", "gujarati": "gu", "haitian creole": "ht", "hausa": "ha", "hawaiian": "haw", "hebrew": "he", 
  "hindi": "hi", "hmong": "hmn", "hungarian": "hu", "icelandic": "is", "igbo": "ig", "indonesian": "id", 
  "irish": "ga", "italian": "it", "japanese": "ja", "javanese": "jw", "kannada": "kn", "kazakh": "kk", 
  "khmer": "km", "korean": "ko", "kurdish": "ku", "kyrgyz": "ky", "lao": "lo", "latin": "la", "latvian": "lv", 
  "lithuanian": "lt", "luxembourgish": "lb", "macedonian": "mk", "malagasy": "mg", "malay": "ms", "malayalam": "ml", 
  "maltese": "mt", "maori": "mi", "marathi": "mr", "mongolian": "mn", "myanmar (burmese)": "my", "nepali": "ne", 
  "norwegian": "no", "nyanja (chichewa)": "ny", "oriya": "or", "pashto": "ps", "persian": "fa", "polish": "pl", 
  "portuguese": "pt", "punjabi": "pa", "romanian": "ro", "russian": "ru", "samoan": "sm", "scots gaelic": "gd", 
  "serbian": "sr", "sesotho": "st", "shona": "sn", "sindhi": "sd", "sinhala (sinhalese)": "si", "slovak": "sk", 
  "slovenian": "sl", "somali": "so", "spanish": "es", "sundanese": "su", "swahili": "sw", "swedish": "sv", 
  "tagalog (filipino)": "tl", "tajik": "tg", "tamil": "ta", "telugu": "te", "thai": "th", "turkish": "tr", 
  "ukrainian": "uk", "urdu": "ur", "uzbek": "uz", "vietnamese": "vi", "welsh": "cy", "xhosa": "xh", "yiddish": "yi", 
  "yoruba": "yo", "zulu": "zu"
};

const LANG_CODE_TO_NAME = {};
for (const [name, code] of Object.entries(SUPPORTED_LANGUAGES)) {
  LANG_CODE_TO_NAME[code] = name.charAt(0).toUpperCase() + name.slice(1);
}

// Common greetings
const GREETING_LANGUAGE_MAP = {
  "namaste": "hi", "namaskar": "hi", "kya haal": "hi", "kaise ho": "hi", "hola": "es", "gracias": "es",
  "bonjour": "fr", "merci": "fr", "hallo": "de", "danke": "de", "ciao": "it", "grazie": "it",
  "ni hao": "zh-CN", "xie xie": "zh-CN", "konnichiwa": "ja", "arigatou": "ja", "hello": "en", "thanks": "en"
};

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Handle CORS Preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      }
    });
  }

  // 1. Serve frontend HTML page
  if (path === "/" || path === "/index.html") {
    return new Response(HTML_CONTENT, {
      headers: { 
        "Content-Type": "text/html; charset=utf-8",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  // 2. Serve style.css
  if (path === "/style.css") {
    return new Response(STYLE_CONTENT, {
      headers: { 
        "Content-Type": "text/css; charset=utf-8",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  // 3. Serve app.js
  if (path === "/app.js") {
    return new Response(JS_CONTENT, {
      headers: { 
        "Content-Type": "application/javascript; charset=utf-8",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  // 4. Serve chat-pattern.svg
  if (path === "/chat-pattern.svg") {
    return new Response(SVG_CONTENT, {
      headers: { 
        "Content-Type": "image/svg+xml",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  // 5. GET API: Fetch supported languages
  if (path === "/api/languages") {
    const sortedLangs = Object.entries(SUPPORTED_LANGUAGES).map(([name, code]) => ({
      code,
      name: name.charAt(0).toUpperCase() + name.slice(1)
    })).sort((a, b) => a.name.localeCompare(b.name));

    return new Response(JSON.stringify({ languages: sortedLangs }), {
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  // 6. GET API: AI Search and Language Suggestion
  if (path === "/api/suggest-language") {
    const q = (url.searchParams.get("q") || "").trim().toLowerCase();
    if (!q) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const suggestions = [];

    // Simple Name lookup
    for (const [name, code] of Object.entries(SUPPORTED_LANGUAGES)) {
      if (name.includes(q)) {
        suggestions.push({ code, name: name.charAt(0).toUpperCase() + name.slice(1), reason: "Matching language name" });
      }
    }

    // Greeting matching
    for (const [greeting, code] of Object.entries(GREETING_LANGUAGE_MAP)) {
      if (q === greeting || (q.length >= 3 && greeting.includes(q))) {
        const langName = LANG_CODE_TO_NAME[code] || "Unknown";
        if (!suggestions.some(s => s.code === code)) {
          suggestions.unshift({ code, name: langName, reason: `AI Greeting Match (e.g. '${greeting}')` });
        }
      }
    }

    // Call Google Single Translation to detect language
    if (q.length >= 4) {
      try {
        const detectUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(q)}`;
        const res = await fetch(detectUrl);
        const json = await res.json();
        const detectedCode = json[2];
        
        if (detectedCode && LANG_CODE_TO_NAME[detectedCode]) {
          const langName = LANG_CODE_TO_NAME[detectedCode];
          if (!suggestions.some(s => s.code === detectedCode)) {
            suggestions.unshift({ code: detectedCode, name: langName, reason: `AI Detected from text` });
          }
        }
      } catch (err) {}
    }

    return new Response(JSON.stringify({ suggestions: suggestions.slice(0, 6) }), {
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  // 7. GET API: Retrieve all messages (Translating in real-time)
  if (path === "/api/messages") {
    const targetLang = url.searchParams.get("lang") || "en";
    
    // Translate all messages in parallel using Promise.all inside Cloudflare Edge Network (Ultra-fast!)
    const responseMessages = await Promise.all(messages.map(async (msg) => {
      if (msg.original_lang === targetLang) {
        return {
          id: msg.id,
          sender: msg.sender,
          avatar: msg.avatar,
          original_text: msg.text,
          original_lang: msg.original_lang,
          original_lang_name: msg.original_lang_name,
          translated_text: msg.text,
          timestamp: msg.timestamp
        };
      }

      const cacheKey = `${msg.id}_${targetLang}`;
      if (translationCache[cacheKey]) {
        return {
          id: msg.id,
          sender: msg.sender,
          avatar: msg.avatar,
          original_text: msg.text,
          original_lang: msg.original_lang,
          original_lang_name: msg.original_lang_name,
          translated_text: translationCache[cacheKey],
          timestamp: msg.timestamp
        };
      }

      // Live keyless translation (Multi-sentence safe!)
      let translatedText = msg.text;
      try {
        const transUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(msg.text)}`;
        const transRes = await fetch(transUrl);
        const transJson = await transRes.json();
        if (transJson && transJson[0]) {
          translatedText = transJson[0].map(s => s && s[0] ? s[0] : "").join("");
        }
        
        // Cache it ONLY if translation didn't fail with HTML or Error Block page
        const transLower = translatedText.toLowerCase();
        if (!transLower.includes("<html") && !transLower.includes("error 500") && !transLower.includes("that’s an error")) {
          translationCache[cacheKey] = translatedText;
        } else {
          translatedText = msg.text; // Fallback to original on block
        }
      } catch (err) {
        console.error("Worker Translate Error:", err);
      }

      return {
        id: msg.id,
        sender: msg.sender,
        avatar: msg.avatar,
        original_text: msg.text,
        original_lang: msg.original_lang,
        original_lang_name: msg.original_lang_name,
        translated_text: translatedText,
        timestamp: msg.timestamp
      };
    }));

    const currentLangName = LANG_CODE_TO_NAME[targetLang] || "English";

    return new Response(JSON.stringify({ messages: responseMessages, current_language: currentLangName }), {
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  // 8. POST API: Send a new message (Auto-detects language, with Rate Limits & Sanitization)
  if (path === "/api/messages" && request.method === "POST") {
    try {
      const clientIP = request.headers.get("CF-Connecting-IP") || "unknown-ip";
      const now = Date.now() / 1000;

      // Rate limit check
      if (!ipPostHistory[clientIP]) {
        ipPostHistory[clientIP] = [];
      }
      ipPostHistory[clientIP] = ipPostHistory[clientIP].filter(ts => now - ts < RATE_LIMIT_WINDOW);

      if (ipPostHistory[clientIP].length >= RATE_LIMIT_POSTS) {
        return new Response(JSON.stringify({ 
          detail: `Too many requests! Spam protection active. Please wait ${Math.ceil(RATE_LIMIT_WINDOW - (now - ipPostHistory[clientIP][0]))}s.` 
        }), {
          status: 429,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }

      const body = await request.json();
      let text = (body.text || "").trim();
      let sender = (body.sender || "").trim() || "Anonymous User";
      const avatar = body.avatar || "🦁";

      if (!text) {
        return new Response(JSON.stringify({ detail: "Message cannot be empty" }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }

      // Enforce strict size limits
      if (text.length > MAX_TEXT_LENGTH) {
        text = text.substring(0, MAX_TEXT_LENGTH) + "...";
      }
      if (sender.length > MAX_SENDER_LENGTH) {
        sender = sender.substring(0, MAX_SENDER_LENGTH);
      }

      // Sanitize inputs to prevent HTML/XSS injection
      const sanitizedText = sanitizeHTML(text);
      const sanitizedSender = sanitizeHTML(sender);

      // Auto-detect language via Google Single API
      let detectedLang = "en";
      try {
        const detectUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(sanitizedText)}`;
        const res = await fetch(detectUrl);
        const json = await res.json();
        detectedLang = json[2] || "en";
      } catch (e) {}

      const detectedLangName = LANG_CODE_TO_NAME[detectedLang] || "English";
      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const msgId = `msg_${Date.now()}`;

      const newMsg = {
        id: msgId,
        sender: sanitizedSender,
        avatar,
        text: sanitizedText,
        original_lang: detectedLang,
        original_lang_name: detectedLangName,
        timestamp
      };

      messages.push(newMsg);
      
      // Enforce Message Caps (Last 100 messages) to prevent memory leak / storage issues
      if (messages.length > MAX_MESSAGES_CAP) {
        const removed = messages.shift();
        // Clean translation cache for removed messages
        const cacheKeys = Object.keys(translationCache);
        for (const key of cacheKeys) {
          if (key.startsWith(`${removed.id}_`)) {
            delete translationCache[key];
          }
        }
      }

      // Track timestamp
      ipPostHistory[clientIP].push(now);

      // Cache translation in its own language
      translationCache[`${msgId}_${detectedLang}`] = sanitizedText;

      return new Response(JSON.stringify(newMsg), {
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    } catch (err) {
      return new Response(JSON.stringify({ detail: "Internal Server Error" }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
  }

  // Endpoint 404 handler
  return new Response("Not Found", { status: 404 });
}

// Embedded Static Assets
const HTML_CONTENT = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BhashaSetu — Premium Universal Chat Room</title>
    <!-- Google Fonts for Inter typography -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <!-- FontAwesome for neat icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <!-- Linked Custom Stylesheet with Cache Buster -->
    <link rel="stylesheet" href="style.css?v=2.3">
</head>
<body>

    <!-- Full Screen Blazing Fire Overlay (Triggered on high-speed swipe) -->
    <div id="fire-overlay" class="fire-screen-overlay" aria-hidden="true">
        <!-- Canvas to draw realistic climbing fire flames -->
        <canvas id="flames-canvas" class="climbing-flames-canvas"></canvas>
    </div>

    <!-- Floating "New Messages" Alert Dock (Click to scroll down) -->
    <button id="new-messages-dock" class="new-messages-dock-btn" aria-label="Scroll to new messages">
        <i class="fa-solid fa-arrow-down"></i>
        <span>New Messages</span>
    </button>

    <!-- App Container -->
    <div class="app-container" id="app-container">

        <!-- ==========================================
             CHAT WINDOW MAIN COLUMN (100% Width Layout)
             ========================================== -->
        <main class="chat-window" id="chat-window" role="log" aria-label="Chat Log">

            <!-- Chat Header -->
            <header class="chat-header" role="banner">
                <div class="header-left">
                    <div class="header-avatar" aria-hidden="true">🌐</div>
                    <div class="header-details">
                        <h2 class="header-title">BhashaSetu Global Chat</h2>
                        <div class="header-subtitle-row">
                            <!-- Connection Status Dot Indicator (Quiet, Non-blinking) -->
                            <span id="status-indicator-dot" class="status-dot connected" aria-hidden="true"></span>
                            <p id="status-indicator-text" class="header-subtitle">Connected</p>
                        </div>
                    </div>
                </div>

                <!-- Header Actions Panel -->
                <div class="header-actions">
                    <!-- Manual Sync -->
                    <button id="manual-refresh-btn" class="header-icon-btn" aria-label="Sync Chat Feed" title="Sync Feed">
                        <i class="fa-solid fa-rotate-right"></i>
                    </button>
                    <!-- Language Selection Trigger -->
                    <button id="open-lang-modal-btn" class="header-btn" aria-haspopup="dialog" aria-expanded="false" aria-label="Choose Translation Language" title="Choose Language">
                        <i class="fa-solid fa-language"></i>
                        <span id="current-lang-text">English (en)</span>
                    </button>
                </div>
            </header>

            <!-- Scrollable Messages Container with Vector SVG Wallpaper -->
            <section class="chat-messages-container custom-scroll" id="messages-container" aria-live="polite">
                <!-- Chat bubbles are injected here dynamically by app.js -->
            </section>

            <!-- Bottom Sticky Chat Footer Area -->
            <footer class="chat-footer" role="contentinfo">
                <div class="input-row">
                    
                    <!-- Quick Identity Indicator & Dice Shuffle -->
                    <button type="button" id="shuffle-identity-btn" class="identity-badge" aria-label="Randomize Nickname Tag" title="Randomize Nickname">
                        <span id="avatar-preview" class="identity-avatar" aria-hidden="true">🦁</span>
                        <span id="sender-display" class="identity-name">User #-----</span>
                    </button>
                    
                    <!-- Unified Input Container -->
                    <div class="footer-input-container">
                        <!-- Hidden Identity Credentials -->
                        <input type="hidden" id="post-avatar" value="🦁">
                        <input type="hidden" id="post-sender" value="🦁 Anonymous">

                        <!-- Multi-line Textarea supporting Enter-to-Send & Shift+Enter-to-Newline -->
                        <textarea id="post-text" class="message-input custom-scroll" rows="1" aria-label="Type your message" placeholder="Type message in any language..."></textarea>
                        
                        <!-- 🚀 Revolutionary SWIPE-TO-SEND ROCKET Channel -->
                        <div id="swipe-channel" class="swipe-send-channel" aria-hidden="true" title="Swipe rocket right to send!">
                            <!-- Bouncing Tutorial Arrow Guide -->
                            <div id="swipe-guide" class="swipe-guide-arrow">
                                <i class="fa-solid fa-angles-left"></i> Swipe
                            </div>
                            
                            <!-- Grabbable Rocket handle button -->
                            <div id="swipe-rocket" class="swipe-rocket-btn" role="button" aria-label="Swipe to Send Rocket" tabindex="0">
                                <i class="fa-solid fa-rocket"></i>
                                <!-- Embedded Fire exhaust trail -->
                                <span id="fire-trail" class="rocket-fire-trail">🔥</span>
                            </div>
                        </div>
                    </div>

                </div>
            </footer>

        </main>

    </div>

    <!-- ==========================================
         LANGUAGE SELECTOR POPUP MODAL
         ========================================== -->
    <div id="lang-modal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title-id">
        <div class="modal-card">
            <!-- Header -->
            <div class="modal-header">
                <h3 class="modal-title" id="modal-title-id">Select Chat Language</h3>
                <button id="close-lang-modal-btn" class="modal-close-btn" aria-label="Close Language Modal">Close</button>
            </div>

            <!-- Search Field -->
            <div class="modal-search-box">
                <div class="search-wrapper">
                    <i class="fa-solid fa-magnifying-glass search-icon"></i>
                    <input type="text" id="lang-search-input" class="search-input" aria-label="Search languages" placeholder="Search language or type greeting (e.g. 'Bonjour')...">
                </div>
                
                <!-- AI suggestion box -->
                <div id="ai-suggestion-box" class="ai-suggest-container mt-2.5 hidden">
                    <span class="modal-sub-title"><i class="fa-solid fa-wand-magic-sparkles"></i> AI Suggested:</span>
                    <div id="ai-suggestion-list" class="ai-suggest-chips">
                        <!-- AI suggestions -->
                    </div>
                </div>
            </div>

            <!-- Body grid list -->
            <div class="modal-body custom-scroll">
                
                <!-- Recent Languages -->
                <div id="recent-languages-section" class="hidden">
                    <h4 class="modal-sub-title">Recent Languages</h4>
                    <div class="lang-grid" id="recent-languages-grid">
                        <!-- Recent buttons -->
                    </div>
                </div>

                <!-- Device & Auto-detect Language -->
                <div>
                    <h4 class="modal-sub-title">Suggested & System</h4>
                    <div class="lang-grid" id="system-languages-grid">
                        <!-- Device and Auto buttons -->
                    </div>
                </div>

                <!-- Popular list -->
                <div>
                    <h4 class="modal-sub-title">Popular Languages</h4>
                    <div class="lang-grid" id="popular-languages-grid">
                        <!-- Popular buttons -->
                    </div>
                </div>

                <!-- All list -->
                <div>
                    <h4 class="modal-sub-title" id="all-langs-header">All Languages</h4>
                    <div class="lang-grid" id="all-languages-grid">
                        <!-- All buttons -->
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Linked JS App Logic with Cache Buster -->
    <script src="app.js?v=2.3"></script>
</body>
</html>
`;
const STYLE_CONTENT = `/* 
========================================================
BhashaSetu — Premium Dark Theme Chat Stylesheet
Production-Ready CSS conforming to strict guidelines
========================================================
*/

:root {
    /* Color Palette */
    --bg-color: #0F1115;
    --bg-surface: #171A21;
    --bg-header: #12151B;
    --bg-input: #1C1F26;
    --bg-bubble-incoming: #1E222B;
    --bg-bubble-outgoing: #4F8CFF;
    
    /* Accents & Borders */
    --accent-color: #4F8CFF;
    --accent-hover: #357AE8;
    --border-color: rgba(255, 255, 255, 0.06);
    --border-color-focus: rgba(79, 140, 255, 0.4);
    
    /* Text Colors */
    --text-primary: #F5F5F5;
    --text-secondary: #A5A5A5;
    --text-muted: #7A7A7A;
    
    /* Typography Font Sizes */
    --font-chat-desktop: 16px;
    --font-chat-mobile: 15px;
    --font-time: 12px;
    --font-sidebar: 15px;
    --font-search: 15px;
    --font-input: 16px;
    --font-title: 17px;
    --font-subtitle: 13px;
    
    /* Layout Sizing */
    --header-height-desktop: 64px;
    --header-height-mobile: 56px;
    --input-height-desktop: 60px;
    --input-height-mobile: 56px;
    
    /* Radii */
    --border-radius: 12px;
    --bubble-radius: 18px;
    --input-radius: 28px;
    
    /* Animations & Transitions */
    --transition-speed: 200ms;
    --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

/* ========================================================
   1. CORE RESET & BODY STYLES
   ======================================================== */
* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body, html {
    width: 100%;
    height: 100%;
    background-color: var(--bg-color);
    color: var(--text-primary);
    font-family: var(--font-family);
    overflow: hidden;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

/* App Master Layout */
.app-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    position: relative;
    background-color: var(--bg-color);
}

/* Custom Thin & Auto-hiding Scrollbar */
.custom-scroll {
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
}

.custom-scroll::-webkit-scrollbar {
    width: 4px;
    height: 4px;
}

.custom-scroll::-webkit-scrollbar-track {
    background: transparent;
}

.custom-scroll::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    transition: background var(--transition-speed);
}

.custom-scroll::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.2);
}

/* Keyboard Accessibility Focus styles */
*:focus-visible {
    outline: 2px solid var(--accent-color);
    outline-offset: 2px;
}

/* ========================================================
   2. HEADER CONTAINER (64px Desktop / 56px Mobile)
   ======================================================== */
.chat-header {
    height: var(--header-height-desktop);
    background-color: var(--bg-header);
    border-bottom: 1px solid var(--border-color);
    padding: 0 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    z-index: 30;
    user-select: none;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
}

.header-avatar {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background: linear-gradient(135deg, #0084ff 0%, #1877f2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: bold;
    color: #ffffff;
    flex-shrink: 0;
}

.header-details {
    min-width: 0;
}

.header-title {
    font-size: var(--font-title);
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.header-subtitle-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 1px;
}

/* Connection Status Dot (No blinking, highly professional) */
.status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    display: inline-block;
    transition: background-color var(--transition-speed);
}

.status-dot.connected {
    background-color: #2ec4b6; /* Green */
}

.status-dot.syncing {
    background-color: #ffb703; /* Orange */
    animation: statusPulse 1s infinite alternate;
}

.status-dot.offline {
    background-color: #e63946; /* Red */
}

@keyframes statusPulse {
    0% { opacity: 0.4; }
    100% { opacity: 1; }
}

.header-subtitle {
    font-size: var(--font-subtitle);
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* Header Actions Panel */
.header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
}

.header-btn {
    background-color: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    font-size: 11px;
    font-weight: 600;
    padding: 6px 14px;
    border-radius: 16px;
    cursor: pointer;
    transition: background-color var(--transition-speed), border-color var(--transition-speed);
    display: flex;
    align-items: center;
    gap: 6px;
    outline: none;
}

.header-btn:hover {
    background-color: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.12);
}

.header-icon-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 15px;
    cursor: pointer;
    padding: 6px;
    border-radius: 50%;
    transition: color var(--transition-speed), background-color var(--transition-speed);
    width: 34px;
    height: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    outline: none;
}

.header-icon-btn:hover {
    color: var(--text-primary);
    background-color: rgba(255, 255, 255, 0.04);
}

/* ========================================================
   3. CHAT CANVAS & VECTOR SVG PATTERN WALLPAPER
   ======================================================== */
.chat-window {
    flex-grow: 1;
    width: 100%;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.chat-messages-container {
    flex-grow: 1;
    width: 100%;
    overflow-y: auto;
    position: relative;
    
    /* 100% Seamless Repeating Vector SVG Doodle Pattern */
    background-image: url('chat-pattern.svg');
    background-repeat: repeat;
    background-size: 420px;
    
    padding: 24px;
    padding-bottom: 92px; /* Prevent floating input overlap */
    scroll-behavior: smooth;
}

.chat-messages-inner {
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 8px; /* Strict 8px space between messages */
}

/* ========================================================
   4. MESSAGE BUBBLES LAYOUT & STATUS STATES
   ======================================================== */
.message-row {
    width: 100%;
    display: flex;
    flex-direction: column;
    margin-bottom: 2px;
}

/* Message Fade-In Slide-Up (Strict 200ms) */
.message-row.animate-in {
    animation: messageAppear 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes messageAppear {
    0% {
        opacity: 0;
        transform: translateY(12px);
    }
    100% {
        opacity: 1;
        transform: translateY(0);
    }
}

.message-row.incoming {
    align-items: flex-start;
}

.message-row.outgoing {
    align-items: flex-end;
}

/* Alignment Row for Name and Avatar */
.message-header-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 3px;
    margin-left: 6px;
    user-select: none;
}

.message-sender-avatar {
    width: 18px;
    height: 18px;
    font-size: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.message-sender-name {
    font-size: 11px;
    font-weight: 700;
    color: var(--text-secondary);
}

/* Message Bubble */
.message-bubble {
    padding: 12px 16px; /* Strict guidelines */
    border-radius: var(--bubble-radius); /* Strict 18px radius */
    font-size: var(--font-chat-desktop);
    line-height: 1.5;
    position: relative;
    word-wrap: break-word;
    word-break: break-word;
    display: flex;
    flex-direction: column;
    gap: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Width limits (72% Desktop / 82% Mobile) */
.message-row.incoming .message-bubble {
    max-width: 72%;
    background-color: var(--bg-surface);
    color: var(--text-primary);
    border-top-left-radius: 4px;
    border: 1px solid var(--bubble-incoming-border);
}

.message-row.outgoing .message-bubble {
    max-width: 72%;
    background-color: var(--bg-bubble-outgoing);
    color: #ffffff;
    border-top-right-radius: 4px;
}

/* Text Formatting (Code Blocks, Clickable Links) */
.message-text-content a {
    color: #89afff;
    text-decoration: underline;
}

.message-row.outgoing .message-text-content a {
    color: #ffffff;
    text-decoration: underline;
}

.message-code-block {
    background-color: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.05);
    padding: 8px 12px;
    border-radius: 6px;
    font-family: monospace;
    font-size: 13px;
    white-space: pre-wrap;
    margin: 4px 0;
    color: #ffd166;
}

/* Interactive Translation Toggle Link */
.translation-toggle-link {
    font-size: 10px;
    font-weight: 700;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background: none;
    border: none;
    outline: none;
    text-align: left;
    margin-top: 2px;
    display: inline-block;
    transition: opacity var(--transition-speed);
}

.translation-toggle-link:hover {
    opacity: 0.8;
}

.message-row.incoming .translation-toggle-link {
    color: var(--accent-color);
}

.message-row.outgoing .translation-toggle-link {
    color: rgba(255, 255, 255, 0.9);
}

/* Collapsible Translation Segment */
.translation-box {
    margin-top: 4px;
    padding-top: 6px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    font-size: 13px;
    opacity: 0.95;
    line-height: 1.4;
}

.message-row.incoming .translation-box {
    color: var(--text-secondary);
}

.message-row.outgoing .translation-box {
    color: rgba(255, 255, 255, 0.85);
}

/* Bubble Metadata row (Time + State Checkmark) */
.message-meta-row {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    font-size: var(--font-time);
    margin-top: 2px;
    user-select: none;
}

.message-row.incoming .message-meta-row {
    color: var(--text-secondary);
}

.message-row.outgoing .message-meta-row {
    color: rgba(255, 255, 255, 0.7);
}

/* Detailed Message Status Indicators */
.message-status-icon {
    font-size: 10px;
    display: inline-flex;
    align-items: center;
}

.status-failed-indicator {
    color: #e63946;
    cursor: pointer;
    font-weight: bold;
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 10px;
    text-transform: uppercase;
}

/* ========================================================
   5. FLOATING DOCK DYNAMIC INPUT FOOTER (iOS/Instagram)
   ======================================================== */
.chat-footer {
    height: var(--input-height-desktop);
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    background: rgba(15, 17, 21, 0.75) !important;
    backdrop-filter: blur(20px) !important;
    -webkit-backdrop-filter: blur(20px) !important;
    border-top: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 16px;
    flex-shrink: 0;
    z-index: 25;
}

.input-row {
    width: 100%;
    max-width: 800px;
    display: flex;
    align-items: center;
    gap: 12px;
}

.identity-badge {
    background-color: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border-color);
    padding: 8px 14px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: default;
    user-select: none;
    shrink: 0;
    outline: none;
}

.identity-avatar { font-size: 14px; }
.identity-name { font-size: 11px; font-weight: 700; color: var(--text-primary); }

.footer-input-container {
    flex-grow: 1;
    display: flex;
    align-items: center;
    background-color: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: var(--input-radius); /* Strict 28px radius */
    padding: 4px 6px 4px 18px;
    gap: 8px;
    transition: border-color var(--transition-speed);
}

.footer-input-container:focus-within {
    border-color: var(--border-color-focus);
}

/* Responsive Auto-resizing Textarea (Supporting Shift+Enter) */
.message-input {
    flex-grow: 1;
    height: 38px;
    max-height: 100px;
    background: none;
    border: none;
    color: var(--text-primary);
    font-size: var(--font-input);
    outline: none;
    resize: none; /* Disables manual resizing */
    padding-top: 9px;
    font-family: inherit;
    line-height: 1.4;
}

/* Swipe-to-Send Channel Area */
.swipe-send-channel {
    position: relative;
    width: 130px;
    height: 42px;
    background-color: rgba(0, 0, 0, 0.35);
    border-radius: 21px;
    border: 1px solid rgba(255, 255, 255, 0.04);
    display: flex;
    align-items: center;
    padding: 0 2px;
    user-select: none;
    overflow: visible;
    shrink: 0;
}

/* Bouncing Swipe Guide Arrow */
.swipe-guide-arrow {
    position: absolute;
    right: 50px;
    color: var(--accent-color);
    font-size: 11px;
    font-weight: 800;
    opacity: 0;
    pointer-events: none;
    transition: opacity 250ms ease;
    white-space: nowrap;
}

.swipe-guide-arrow.visible {
    opacity: 0.8;
    animation: arrowBounce 1.2s infinite ease-in-out;
}

@keyframes arrowBounce {
    0%, 100% { transform: translateX(0); }
    50% { transform: translateX(-4px); }
}

/* Swipe Rocket Grab Button */
.swipe-rocket-btn {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: linear-gradient(135deg, #0084ff 0%, #1877f2 100%);
    color: #ffffff;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: grab;
    user-select: none;
    position: absolute;
    left: 2px;
    transition: transform 100ms cubic-bezier(0.175, 0.885, 0.32, 1.1), background-color var(--transition-speed);
    box-shadow: 0 4px 10px rgba(0, 132, 255, 0.3);
    z-index: 5;
    outline: none;
}

.swipe-rocket-btn:active {
    cursor: grabbing;
}

/* Fire trail exhaust effects on drag */
.rocket-fire-trail {
    position: absolute;
    left: -12px;
    font-size: 10px;
    opacity: 0;
    pointer-events: none;
    transform: rotate(90deg);
    transition: opacity 100ms;
}

.rocket-fire-trail.active {
    opacity: 0.9;
    animation: fireFlicker 150ms infinite alternate;
}

@keyframes fireFlicker {
    0% { transform: rotate(90deg) scale(0.9); }
    100% { transform: rotate(90deg) scale(1.2) translateY(1px); }
}

/* ========================================================
   6. FLOATING HUD NOTIFICATIONS & FLOATING BUTTONS
   ======================================================== */

/* Scroll-to-bottom / "New Messages" Alert Floating Dock */
.new-messages-dock-btn {
    position: fixed;
    bottom: 96px; /* Sits perfectly above input bar */
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    z-index: 20;
    background-color: var(--accent-color);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #ffffff;
    font-size: 11px;
    font-weight: 700;
    padding: 8px 18px;
    border-radius: 20px;
    cursor: pointer;
    box-shadow: 0 8px 24px rgba(79, 140, 255, 0.4);
    display: flex;
    align-items: center;
    gap: 6px;
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--transition-speed) ease, transform var(--transition-speed) ease;
    outline: none;
}

.new-messages-dock-btn.visible {
    opacity: 1;
    pointer-events: auto;
    transform: translateX(-50%) translateY(0);
}

.new-messages-dock-btn:hover {
    background-color: var(--accent-hover);
}

.new-messages-dock-btn:active {
    transform: translateX(-50%) scale(0.96);
}

/* Full Screen Blazing Fire Overlay (Triggered on high-speed swipe) */
.fire-screen-overlay {
    position: fixed;
    inset: 0;
    z-index: 999;
    pointer-events: none;
    opacity: 0;
    background: radial-gradient(circle, rgba(255,69,0,0.15) 0%, rgba(255,0,0,0.3) 70%, rgba(0,0,0,0.7) 100%);
    box-shadow: inset 0 0 100px rgba(255,0,0,0.8);
    transition: opacity 100ms ease-out;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    overflow: hidden;
}

.fire-screen-overlay.active {
    opacity: 1;
    animation: screenShake 300ms linear;
}

@keyframes screenShake {
    0%, 100% { transform: translate(0, 0); }
    10%, 90% { transform: translate(-4px, 2px); }
    30%, 70% { transform: translate(4px, -2px); }
    50% { transform: translate(-2px, -4px); }
}

.climbing-flames-canvas {
    width: 100%;
    height: 180px;
    opacity: 0.9;
}

/* ========================================================
   7. LANGUAGE SELECTOR MODAL (Telegram/Whatsapp Styled Popup)
   ======================================================== */
.modal-overlay {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.7);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    opacity: 0;
    visibility: hidden;
    transition: opacity var(--transition-speed) ease, visibility var(--transition-speed) ease;
}

.modal-overlay.active {
    opacity: 1;
    visibility: visible;
}

.modal-card {
    background-color: var(--bg-surface);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    width: 100%;
    max-width: 440px;
    max-height: 75vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    transform: scale(0.95);
    transition: transform var(--transition-speed) cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-overlay.active .modal-card {
    transform: scale(1);
}

.modal-header {
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.modal-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary);
}

.modal-close-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 11px;
    font-weight: bold;
    cursor: pointer;
    outline: none;
    padding: 4px 8px;
    border-radius: 4px;
}

.modal-close-btn:hover {
    color: var(--text-primary);
    background-color: rgba(255, 255, 255, 0.05);
}

/* Modal Search input */
.modal-search-box {
    padding: 12px 20px;
    border-bottom: 1px solid var(--border-color);
    background-color: var(--bg-header);
}

.search-wrapper {
    position: relative;
    width: 100%;
    height: 38px;
}

.search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-secondary);
    font-size: 13px;
    pointer-events: none;
}

.search-input {
    width: 100%;
    height: 100%;
    background-color: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: 20px;
    padding-left: 36px;
    padding-right: 16px;
    color: var(--text-primary);
    font-size: var(--font-subtitle);
    outline: none;
    transition: border-color var(--transition-speed);
}

.search-input:focus {
    border-color: var(--accent-color);
}

/* Language grids scroll panel */
.modal-body {
    flex-grow: 1;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 18px;
}

.modal-sub-title {
    font-size: 11px;
    font-weight: 800;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
}

.lang-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
}

.lang-btn {
    background-color: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    padding: 8px 12px;
    color: var(--text-primary);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    text-align: left;
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: background-color var(--transition-speed), border-color var(--transition-speed);
    outline: none;
}

.lang-btn:hover {
    background-color: rgba(255, 255, 255, 0.03);
}

.lang-btn.active {
    border-color: var(--accent-color);
    background-color: rgba(79, 140, 255, 0.1);
}

/* Keyboard navigable active focus style on grid buttons */
.lang-btn.focus-highlight {
    outline: 2px solid var(--accent-color);
    outline-offset: -1px;
}

.lang-code {
    font-size: 10px;
    color: var(--accent-color);
    font-family: monospace;
}

/* AI suggestions container inside modal */
.ai-suggest-container {
    display: flex;
    flex-direction: column;
}

.ai-suggest-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.ai-chip {
    background-color: rgba(79, 140, 255, 0.08);
    border: 1px solid rgba(79, 140, 255, 0.2);
    color: #8cafff;
    font-size: 11px;
    font-weight: 700;
    padding: 5px 12px;
    border-radius: 12px;
    cursor: pointer;
    transition: all var(--transition-speed);
}

.ai-chip:hover {
    background-color: var(--accent-color);
    color: #ffffff;
    border-color: var(--accent-color);
}

.ai-chip.focus-highlight {
    outline: 2px solid var(--accent-color);
}

/* Skeleton Loading Shimmer effects */
.skeleton-row {
    width: 100%;
    display: flex;
    flex-direction: column;
    margin-bottom: 8px;
}

.skeleton-bubble {
    width: 60%;
    height: 60px;
    background: linear-gradient(90deg, #1e222b 25%, #2a2e38 50%, #1e222b 75%);
    background-size: 200% 100%;
    border-radius: var(--bubble-radius);
    animation: shimmer 1.5s infinite linear;
}

@keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}

/* ========================================================
   8. RESPONSIVE MEDIA QUERIES (Desktop, Tablet, Mobile)
   ======================================================== */
@media (max-width: 767px) {
    :root {
        --header-height-mobile: 56px;
        --input-height-mobile: 72px;
        --font-chat-desktop: var(--font-chat-mobile);
    }
    
    .chat-header {
        height: var(--header-height-mobile);
        padding: 0 12px;
    }
    
    .chat-footer {
        height: var(--input-height-mobile);
        padding: 0 10px;
    }
    
    .identity-badge {
        padding: 6px 10px;
    }
    
    /* Strict mobile bubble maximum width constraint */
    .message-row.incoming .message-bubble,
    .message-row.outgoing .message-bubble {
        max-width: 82%; /* Strict 82% mobile maximum width constraint */
    }
    
    .lang-grid {
        grid-template-columns: 1fr; /* Single column on mobile */
    }
    
    .new-messages-dock-btn {
        bottom: 88px;
    }
}
`;
const JS_CONTENT = `/**
 * ========================================================
 * BhashaSetu — Immersive Gamified Chat Application
 * Production-ready Vanilla JS ES6 with SWR & Sequence Recovery
 * Arch-Certified Quality conforming to strict guidelines
 * ========================================================
 */

// Core App Configuration
const CONFIG = {
    syncInterval: 5000,     // 5s background poll fallback
    maxMessagesCap: 150,
    popularCodes: ["hi", "es", "en", "fr", "ar", "de", "ru", "pt", "ja", "zh-CN"]
};

// ========================================================
// 🛡️ DURABLE CLIENT STORAGE & OFFLINE QUEUE MANAGER
// ========================================================
class DurableStore {
    static getLanguage() {
        return localStorage.getItem("selectedLanguageCode") || "en";
    }
    static getLanguageName() {
        return localStorage.getItem("selectedLanguageName") || "English";
    }
    static getRecentLanguages() {
        return JSON.parse(localStorage.getItem("recentLanguages")) || [];
    }
    static getUserTag() {
        return sessionStorage.getItem("user_tag") || "";
    }
    static getLastSequence() {
        return parseInt(localStorage.getItem("last_received_sequence") || "0", 10);
    }
    static setLastSequence(seq) {
        localStorage.setItem("last_received_sequence", seq.toString());
    }
    static getPendingQueue() {
        return JSON.parse(localStorage.getItem("offline_pending_queue")) || [];
    }
    static savePendingQueue(queue) {
        localStorage.setItem("offline_pending_queue", JSON.stringify(queue));
    }
}

// Initializing Session Identity
if (!DurableStore.getUserTag()) {
    const uniqueNum = Math.floor(Math.random() * 90000) + 10000;
    sessionStorage.setItem("user_tag", \`#\${uniqueNum}\`);
}

// ========================================================
// 📊 GLOBAL STATE REGISTER
// ========================================================
const STATE = {
    selectedLanguage: DurableStore.getLanguage(),
    selectedLanguageName: DurableStore.getLanguageName(),
    languages: [],
    messagesData: [], // All processed messages in memory
    clientTranslationCache: {}, // Local SWR Cache
    recentLanguages: DurableStore.getRecentLanguages(),
    renderedMessageIds: new Set(),
    
    // Connection and Sync states
    connectionMode: "offline", // "websocket", "polling", "offline"
    lastSequence: DurableStore.getLastSequence(),
    isSyncing: false,
    unreadCount: 0,
    isUserAtBottom: true,
    
    // Identity
    userNumberTag: DurableStore.getUserTag(),
    currentAvatar: localStorage.getItem("chatSenderAvatar") || "🦁"
};

// DOM Elements Registry
const DOM = {
    appContainer: document.getElementById("app-container"),
    openModalBtn: document.getElementById("open-lang-modal-btn"),
    closeModalBtn: document.getElementById("close-lang-modal-btn"),
    langModal: document.getElementById("lang-modal"),
    langSearchInput: document.getElementById("lang-search-input"),
    aiSuggestionBox: document.getElementById("ai-suggestion-box"),
    aiSuggestionList: document.getElementById("ai-suggestion-list"),
    popularLangsGrid: document.getElementById("popular-languages-grid"),
    recentLangsSection: document.getElementById("recent-languages-section"),
    recentLangsGrid: document.getElementById("recent-languages-grid"),
    systemLangsGrid: document.getElementById("system-languages-grid"),
    allLangsGrid: document.getElementById("all-languages-grid"),
    currentLangText: document.getElementById("current-lang-text"),
    
    messageForm: document.getElementById("message-form"),
    postAvatar: document.getElementById("post-avatar"),
    postSender: document.getElementById("post-sender"),
    avatarPreview: document.getElementById("avatar-preview"),
    senderDisplay: document.getElementById("sender-display"),
    postText: document.getElementById("post-text"),
    shuffleIdentityBtn: document.getElementById("shuffle-identity-btn"),
    
    messagesContainer: document.getElementById("messages-container"),
    manualRefreshBtn: document.getElementById("manual-refresh-btn"),
    newMessagesDock: document.getElementById("new-messages-dock"),
    statusIndicatorDot: document.getElementById("status-indicator-dot"),
    statusIndicatorText: document.getElementById("status-indicator-text"),
    
    swipeChannel: document.getElementById("swipe-channel"),
    swipeRocket: document.getElementById("swipe-rocket"),
    fireTrail: document.getElementById("fire-trail"),
    swipeGuide: document.getElementById("swipe-guide"),
    
    fireOverlay: document.getElementById("fire-overlay"),
    flamesCanvas: document.getElementById("flames-canvas"),
    canvasCtx: document.getElementById("flames-canvas").getContext("2d")
};

// Set up Avatar Identity
function setIdentity(avatar) {
    STATE.currentAvatar = avatar;
    localStorage.setItem("chatSenderAvatar", avatar);
    DOM.postAvatar.value = avatar;
    const fullSenderName = \`User \${STATE.userNumberTag}\`;
    DOM.postSender.value = \`\${avatar} \${fullSenderName}\`;
    DOM.avatarPreview.textContent = avatar;
    DOM.senderDisplay.textContent = fullSenderName;
}

setIdentity(STATE.currentAvatar);

DOM.shuffleIdentityBtn.addEventListener("click", () => {
    const avatarsList = ["🦁", "🐯", "🐼", "🦊", "🐸", "🐨", "🐵", "🦄", "🐙", "🦕", "🦥", "🦉", "🦚", "🐬"];
    const randomAvatar = avatarsList[Math.floor(Math.random() * avatarsList.length)];
    setIdentity(randomAvatar);
    DOM.shuffleIdentityBtn.classList.add("scale-95");
    setTimeout(() => DOM.shuffleIdentityBtn.classList.remove("scale-95"), 100);
});

// ========================================================
// 🔊 REAL-TIME SOUND SYNTHESIZER
// ========================================================
function playRocketLaunchSound(isHighSpeed = false) {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        
        const duration = isHighSpeed ? 0.35 : 0.65;
        const startFreq = isHighSpeed ? 140 : 80;
        const endFreq = isHighSpeed ? 1600 : 900;
        const volume = isHighSpeed ? 0.45 : 0.25;
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(250, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + duration);
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + duration);
        
        gainNode.gain.setValueAtTime(volume, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        
        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start();
        osc.stop(ctx.currentTime + duration);
    } catch (err) {}
}

function playFireRoarSound() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const bufferSize = ctx.sampleRate * 0.3;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = data[i];
            data[i] *= 4.5;
        }
        
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 180;
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start();
    } catch(e) {}
}

// ========================================================
// 🔥 CANVAS BLAZING FIRE ANIMATION LOOP (300ms)
// ========================================================
let flameParticles = [];
let flameAnimationId = null;

function resizeFlamesCanvas() {
    DOM.flamesCanvas.width = window.innerWidth;
    DOM.flamesCanvas.height = 180;
}
window.addEventListener("resize", resizeFlamesCanvas);
resizeFlamesCanvas();

class FlameParticle {
    constructor(canvasWidth) {
        this.x = Math.random() * canvasWidth;
        this.y = 180;
        this.speedX = (Math.random() - 0.5) * 6;
        this.speedY = -(Math.random() * 8 + 4);
        this.radius = Math.random() * 24 + 10;
        const colors = [
            "rgba(255, 69, 0, 0.7)",  
            "rgba(255, 140, 0, 0.6)", 
            "rgba(255, 215, 0, 0.8)",   
            "rgba(255, 0, 0, 0.4)"     
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.life = 1.0;
        this.decay = Math.random() * 0.08 + 0.04;
    }
    
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= this.decay;
        if (this.radius > 1) this.radius -= 0.6;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 30;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.restore();
    }
}

function animateFlames() {
    DOM.canvasCtx.clearRect(0, 0, DOM.flamesCanvas.width, DOM.flamesCanvas.height);
    for (let i = 0; i < 15; i++) {
        flameParticles.push(new FlameParticle(DOM.flamesCanvas.width));
    }
    
    flameParticles.forEach((p, idx) => {
        p.update();
        p.draw(DOM.canvasCtx);
        if (p.life <= 0 || p.radius <= 0) {
            flameParticles.splice(idx, 1);
        }
    });
    
    flameAnimationId = requestAnimationFrame(animateFlames);
}

function triggerFireScreenOverlay() {
    flameParticles = [];
    DOM.fireOverlay.classList.add("active");
    animateFlames();
    playFireRoarSound();
    
    setTimeout(() => {
        DOM.fireOverlay.classList.remove("active");
        cancelAnimationFrame(flameAnimationId);
        DOM.canvasCtx.clearRect(0, 0, DOM.flamesCanvas.width, DOM.flamesCanvas.height);
    }, 300);
}

// ========================================================
// ⌨️ INPUT DYNAMIC TEXTAREA RESIZING
// ========================================================
function autoResizeInput() {
    DOM.postText.style.height = "auto";
    DOM.postText.style.height = (DOM.postText.scrollHeight - 4) + "px";
}
DOM.postText.addEventListener("input", autoResizeInput);

function escapeHTML(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function formatMessageText(text) {
    let formatted = escapeHTML(text);
    formatted = formatted.replace(/\`([^\`]+)\`/g, '<code class="message-code-block">$1</code>');
    const urlPattern = /(\\b(https?|ftp|file):\\/\\/[-A-Z0-9+&@#\\/%?=~_|!:,.;]*[-A-Z0-9+&@#\\/%=~_|])/ig;
    formatted = formatted.replace(urlPattern, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    return formatted;
}

// ========================================================
// 🚀 SWIPE-TO-SEND DRAGGABLE ROCKET LOGIC
// ========================================================
let isDragging = false;
let startX = 0;
let dragOffset = 0;
let swipeStartTime = 0;
const maxOffset = 88;

function checkSwipeGuide() {
    const hasSwiped = localStorage.getItem("hasSwipedBefore") === "true";
    if (!hasSwiped && DOM.postText.value.trim().length > 0) {
        DOM.swipeGuide.classList.add("visible");
    } else {
        DOM.swipeGuide.classList.remove("visible");
    }
}
DOM.postText.addEventListener("input", checkSwipeGuide);

function startDrag(e) {
    isDragging = true;
    startX = e.clientX || (e.touches && e.touches[0].clientX);
    swipeStartTime = Date.now();
    DOM.fireTrail.classList.add("active");
    DOM.swipeRocket.style.transition = "none";
    DOM.swipeGuide.classList.remove("visible");
}

function handleDrag(e) {
    if (!isDragging) return;
    const currentX = e.clientX || (e.touches && e.touches[0].clientX);
    dragOffset = currentX - startX;
    
    if (dragOffset < 0) dragOffset = 0;
    if (dragOffset > maxOffset) dragOffset = maxOffset;
    
    DOM.swipeRocket.style.transform = \`translateX(\${dragOffset}px)\`;
}

async function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    DOM.fireTrail.classList.remove("active");
    const swipeEndTime = Date.now();
    const swipeDuration = swipeEndTime - swipeStartTime;
    
    if (dragOffset >= 80) {
        const text = DOM.postText.value.trim();
        if (text) {
            const isHighSpeed = swipeDuration < 160;
            playRocketLaunchSound(isHighSpeed);
            if (isHighSpeed) {
                triggerFireScreenOverlay();
            }
            localStorage.setItem("hasSwipedBefore", "true");
            await sendChatMessage(text);
        } else {
            snapRocketBack();
        }
    } else {
        snapRocketBack();
    }
}

function snapRocketBack() {
    DOM.swipeRocket.style.transition = "transform 250ms cubic-bezier(0.175, 0.885, 0.32, 1.25)";
    DOM.swipeRocket.style.transform = "translateX(0px)";
    dragOffset = 0;
    checkSwipeGuide();
}

DOM.swipeRocket.addEventListener("mousedown", startDrag);
window.addEventListener("mousemove", handleDrag);
window.addEventListener("mouseup", endDrag);

DOM.swipeRocket.addEventListener("touchstart", startDrag, { passive: true });
window.addEventListener("touchmove", handleDrag, { passive: false });
window.addEventListener("touchend", endDrag);

// Rocket CLICK to Send (NO FIRE, NO LOUD LAUNCH SOUND)
DOM.swipeRocket.addEventListener("click", async () => {
    if (dragOffset < 5) {
        const text = DOM.postText.value.trim();
        if (!text) return;
        localStorage.setItem("hasSwipedBefore", "true");
        DOM.swipeGuide.classList.remove("visible");
        DOM.swipeRocket.style.transition = "transform 180ms ease-in-out";
        DOM.swipeRocket.style.transform = \`translateX(\${maxOffset}px)\`;
        await sendChatMessage(text);
        setTimeout(snapRocketBack, 250);
    }
});

// ENTER Key Press Submit flow (NO FIRE, NO LOUD SOUND)
DOM.postText.addEventListener("keydown", async (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const text = DOM.postText.value.trim();
        if (!text) return;
        localStorage.setItem("hasSwipedBefore", "true");
        DOM.swipeGuide.classList.remove("visible");
        DOM.swipeRocket.style.transition = "transform 180ms ease-in-out";
        DOM.swipeRocket.style.transform = \`translateX(\${maxOffset}px)\`;
        await sendChatMessage(text);
        setTimeout(snapRocketBack, 250);
    }
});

// ========================================================
// 🔌 HIGH-PERFORMANCE WEBSOCKET GATEWAY MANAGER
// ========================================================
class RealtimeConnectionManager {
    constructor() {
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectDelay = 16000;
        this.heartbeatInterval = null;
    }

    getWsUrl() {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = window.location.host;
        if (host.includes("e2b.app")) {
            return \`\${protocol}//8000-\${host.split("-")[1]}/ws\`;
        }
        return \`\${protocol}//\${host}/ws\`;
    }

    connect() {
        if (this.socket) {
            try { this.socket.close(); } catch(e) {}
        }
        
        setConnectionStatus("syncing");
        const url = this.getWsUrl();
        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
            setConnectionStatus("connected");
            STATE.connectionMode = "websocket";
            this.reconnectAttempts = 0;
            
            // 1. Send Handshake CONNECT package with sequence number and active language!
            this.socket.send(JSON.stringify({
                type: "CONNECT",
                lastSequence: STATE.lastSequence,
                lang: STATE.selectedLanguage
            }));
            
            this.startHeartbeat();
            this.drainDurablePendingQueue();
        };

        this.socket.onmessage = (event) => {
            try {
                const packet = JSON.parse(event.data);
                this.handleWsPacket(packet);
            } catch(e) {
                console.error("WS parse error:", e);
            }
        };

        this.socket.onclose = () => {
            this.stopHeartbeat();
            this.handleDisconnect();
        };

        this.socket.onerror = (err) => {
            console.error("WS error:", err);
            this.socket.close();
        };
    }

    startHeartbeat() {
        this.stopHeartbeat();
        this.heartbeatInterval = setInterval(() => {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({ type: "PING" }));
            }
        }, 10000); // 10s PING
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
    }

    handleDisconnect() {
        STATE.connectionMode = "offline";
        setConnectionStatus("offline");
        
        const delay = Math.min(Math.pow(2, this.reconnectAttempts) * 1000, this.maxReconnectDelay);
        this.reconnectAttempts++;
        setTimeout(() => {
            this.connect();
        }, delay);
    }

    handleWsPacket(packet) {
        const type = packet.type;
        
        if (type === "NEW_MESSAGE") {
            const msg = packet.message;
            
            if (msg.sequenceNumber > STATE.lastSequence) {
                STATE.lastSequence = msg.sequenceNumber;
                DurableStore.setLastSequence(msg.sequenceNumber);
            }

            const exists = STATE.messagesData.some(m => m.id === msg.id || (m.clientMessageId && m.clientMessageId === msg.clientMessageId));
            if (!exists) {
                STATE.messagesData.push(msg);
                renderSingleMessageBubble(msg, true);
                
                if (!STATE.isUserAtBottom) {
                    STATE.unreadCount++;
                    DOM.newMessagesDock.querySelector("span").textContent = \`\${STATE.unreadCount} New Messages\`;
                    DOM.newMessagesDock.classList.add("visible");
                } else {
                    scrollToBottom();
                }
            }
        } 
        else if (type === "ACK") {
            const clientMsgId = packet.clientMessageId;
            const realId = packet.id;
            const seqNum = packet.sequenceNumber;
            const time = packet.timestamp;

            const idx = STATE.messagesData.findIndex(m => m.clientMessageId === clientMsgId || m.id === clientMsgId);
            if (idx !== -1) {
                STATE.messagesData[idx].id = realId;
                STATE.messagesData[idx].sequenceNumber = seqNum;
                STATE.messagesData[idx].timestamp = time;
                STATE.messagesData[idx].isPending = false;
                STATE.messagesData[idx].isFailed = false;

                const tempBubbleRow = document.getElementById(\`msg-row-\${clientMsgId}\`);
                if (tempBubbleRow) tempBubbleRow.remove();
                STATE.renderedMessageIds.delete(clientMsgId);

                renderSingleMessageBubble(STATE.messagesData[idx], false);
                
                if (seqNum > STATE.lastSequence) {
                    STATE.lastSequence = seqNum;
                    DurableStore.setLastSequence(seqNum);
                }
            }
            
            let queue = DurableStore.getPendingQueue();
            queue = queue.filter(item => item.clientMessageId !== clientMsgId);
            DurableStore.savePendingQueue(queue);
        }
        else if (type === "TRANSLATION_UPDATED") {
            const msgId = packet.id;
            const targetLang = packet.targetLang;
            const translatedText = packet.translatedText;

            const idx = STATE.messagesData.findIndex(m => m.id === msgId);
            if (idx !== -1) {
                if (targetLang === STATE.selectedLanguage) {
                    STATE.messagesData[idx].translated_text = translatedText;
                    
                    const textSpan = document.getElementById(\`text-body-\${msgId}\`);
                    if (textSpan) {
                        textSpan.innerHTML = formatMessageText(translatedText);
                    }
                }
            }
        }
    }

    send(packet) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(packet));
            return true;
        }
        return false;
    }

    async drainDurablePendingQueue() {
        const queue = DurableStore.getPendingQueue();
        if (queue.length === 0) return;

        for (const item of queue) {
            const sent = this.send({
                type: "SEND_MESSAGE",
                clientMessageId: item.clientMessageId,
                sender: item.sender,
                avatar: item.avatar,
                text: item.text
            });
            
            if (!sent) {
                try {
                    await fetch("/api/messages", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(item)
                    });
                } catch(e) {}
            }
        }
    }
}

const RealtimeGateway = new RealtimeConnectionManager();

// ========================================================
// 🔌 HTTP REST CONNECTION FALLBACKS
// ========================================================
async function fetchMessages(forceScroll = false) {
    if (STATE.isSyncing) return;
    STATE.isSyncing = true;
    
    if (STATE.clientTranslationCache[STATE.selectedLanguage]) {
        STATE.messagesData = STATE.clientTranslationCache[STATE.selectedLanguage];
        if (STATE.renderedMessageIds.size === 0) {
            renderAllMessagesFeed(forceScroll);
        }
    }

    try {
        setConnectionStatus("syncing");
        const res = await fetch(\`/api/messages?lang=\${STATE.selectedLanguage}\`);
        const data = await res.json();
        setConnectionStatus("connected");
        
        const freshMessages = data.messages;
        
        let isNewInserted = false;
        freshMessages.forEach(newMsg => {
            const exists = STATE.messagesData.some(m => m.id === newMsg.id || (m.clientMessageId && m.clientMessageId === newMsg.clientMessageId));
            if (!exists) {
                STATE.messagesData.push(newMsg);
                renderSingleMessageBubble(newMsg, true);
                isNewInserted = true;
                
                if (newMsg.sequenceNumber > STATE.lastSequence) {
                    STATE.lastSequence = newMsg.sequenceNumber;
                    DurableStore.setLastSequence(newMsg.sequenceNumber);
                }
                
                if (!STATE.isUserAtBottom) {
                    STATE.unreadCount++;
                }
            }
        });

        STATE.messagesData = freshMessages;
        STATE.clientTranslationCache[STATE.selectedLanguage] = STATE.messagesData;
        
        if (STATE.unreadCount > 0 && !STATE.isUserAtBottom) {
            DOM.newMessagesDock.querySelector("span").textContent = \`\${STATE.unreadCount} New Messages\`;
            DOM.newMessagesDock.classList.add("visible");
        }

        if (isNewInserted && STATE.isUserAtBottom) {
            scrollToBottom();
        } else if (forceScroll) {
            scrollToBottom();
        }
    } catch (err) {
        console.error("HTTP Fetch fallback error:", err);
        setConnectionStatus("offline");
    } finally {
        STATE.isSyncing = false;
    }
}

// ========================================================
// 📩 SEND MESSAGE AND OFFLINE DURABLE QUEUE HANDLERS
// ========================================================
async function sendChatMessage(text) {
    const clientMsgId = \`cli_\${Date.now()}\`;
    DOM.postText.value = "";
    autoResizeInput();
    snapRocketBack();
    
    const optimisticMsg = {
        id: clientMsgId,
        clientMessageId: clientMsgId,
        sender: \`\${STATE.currentAvatar} User \${STATE.userNumberTag}\`,
        avatar: STATE.currentAvatar,
        text: text,
        original_text: text,
        original_lang: STATE.selectedLanguage,
        original_lang_name: STATE.selectedLanguageName,
        translated_text: text,
        timestamp: "sending...",
        isPending: true,
        isFailed: false
    };
    
    STATE.messagesData.push(optimisticMsg);
    renderSingleMessageBubble(optimisticMsg, true);
    
    if (STATE.isUserAtBottom) {
        scrollToBottom();
    }

    const queue = DurableStore.getPendingQueue();
    queue.push({
        clientMessageId: clientMsgId,
        sender: \`\${STATE.currentAvatar} User \${STATE.userNumberTag}\`,
        avatar: STATE.currentAvatar,
        text: text
    });
    DurableStore.savePendingQueue(queue);

    const sent = RealtimeGateway.send({
        type: "SEND_MESSAGE",
        clientMessageId: clientMsgId,
        sender: \`\${STATE.currentAvatar} User \${STATE.userNumberTag}\`,
        avatar: STATE.currentAvatar,
        text: text
    });

    if (!sent) {
        try {
            const response = await fetch("/api/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clientMessageId: clientMsgId,
                    sender: \`\${STATE.currentAvatar} User \${STATE.userNumberTag}\`,
                    avatar: STATE.currentAvatar,
                    text: text
                })
            });
            
            if (response.ok) {
                const serverMsg = await response.json();
                
                const idx = STATE.messagesData.findIndex(m => m.clientMessageId === clientMsgId);
                if (idx !== -1) {
                    STATE.messagesData[idx].id = serverMsg.id;
                    STATE.messagesData[idx].sequenceNumber = serverMsg.sequenceNumber;
                    STATE.messagesData[idx].timestamp = serverMsg.timestamp;
                    STATE.messagesData[idx].isPending = false;
                    STATE.messagesData[idx].isFailed = false;

                    const tempBubbleRow = document.getElementById(\`msg-row-\${clientMsgId}\`);
                    if (tempBubbleRow) tempBubbleRow.remove();
                    STATE.renderedMessageIds.delete(clientMsgId);

                    renderSingleMessageBubble(STATE.messagesData[idx], false);
                    
                    if (serverMsg.sequenceNumber > STATE.lastSequence) {
                        STATE.lastSequence = serverMsg.sequenceNumber;
                        DurableStore.setLastSequence(serverMsg.sequenceNumber);
                    }
                }
                
                let q = DurableStore.getPendingQueue();
                q = q.filter(item => item.clientMessageId !== clientMsgId);
                DurableStore.savePendingQueue(q);
            } else {
                markMessageFailed(clientMsgId);
            }
        } catch (err) {
            console.error("HTTP POST fallback error:", err);
            markMessageFailed(clientMsgId);
        }
    }
}

function markMessageFailed(clientMsgId) {
    setConnectionStatus("offline");
    const idx = STATE.messagesData.findIndex(m => m.clientMessageId === clientMsgId);
    if (idx !== -1) {
        STATE.messagesData[idx].isPending = false;
        STATE.messagesData[idx].isFailed = true;
        
        const wrapper = document.getElementById(\`msg-bubble-\${clientMsgId}\`);
        if (wrapper) {
            updateMessageBubbleStatus(wrapper, STATE.messagesData[idx]);
        }
    }
}

window.retryMessageDelivery = async function(clientMsgId, text) {
    const idx = STATE.messagesData.findIndex(m => m.clientMessageId === clientMsgId);
    if (idx !== -1) {
        STATE.messagesData[idx].isPending = true;
        STATE.messagesData[idx].isFailed = false;
        const wrapper = document.getElementById(\`msg-bubble-\${clientMsgId}\`);
        if (wrapper) {
            updateMessageBubbleStatus(wrapper, STATE.messagesData[idx]);
        }
    }
    
    const sent = RealtimeGateway.send({
        type: "SEND_MESSAGE",
        clientMessageId: clientMsgId,
        sender: \`\${STATE.currentAvatar} User \${STATE.userNumberTag}\`,
        avatar: STATE.currentAvatar,
        text: text
    });

    if (!sent) {
        try {
            const response = await fetch("/api/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clientMessageId: clientMsgId,
                    sender: \`\${STATE.currentAvatar} User \${STATE.userNumberTag}\`,
                    avatar: STATE.currentAvatar,
                    text: text
                })
            });
            if (response.ok) {
                const serverMsg = await response.json();
                const i = STATE.messagesData.findIndex(m => m.clientMessageId === clientMsgId);
                if (i !== -1) {
                    STATE.messagesData[i].id = serverMsg.id;
                    STATE.messagesData[i].sequenceNumber = serverMsg.sequenceNumber;
                    STATE.messagesData[i].timestamp = serverMsg.timestamp;
                    STATE.messagesData[i].isPending = false;
                    STATE.messagesData[i].isFailed = false;
                    
                    const tempRow = document.getElementById(\`msg-row-\${clientMsgId}\`);
                    if (tempRow) tempRow.remove();
                    STATE.renderedMessageIds.delete(clientMsgId);
                    renderSingleMessageBubble(STATE.messagesData[i], false);
                }
                let q = DurableStore.getPendingQueue();
                q = q.filter(item => item.clientMessageId !== clientMsgId);
                DurableStore.savePendingQueue(q);
            } else {
                markMessageFailed(clientMsgId);
            }
        } catch(e) {
            markMessageFailed(clientMsgId);
        }
    }
};

// ========================================================
// 🔌 CONNECTION HUD GRAPHICS
// ========================================================
function setConnectionStatus(state) {
    if (state === "connected") {
        DOM.statusIndicatorDot.className = "status-dot connected";
        DOM.statusIndicatorText.textContent = "Connected";
        STATE.isOffline = false;
    } else if (state === "syncing") {
        DOM.statusIndicatorDot.className = "status-dot syncing";
        DOM.statusIndicatorText.textContent = "Syncing...";
    } else if (state === "offline") {
        DOM.statusIndicatorDot.className = "status-dot offline";
        DOM.statusIndicatorText.textContent = "Offline";
        STATE.isOffline = true;
    }
}

function checkScrollPosition() {
    const threshold = 120;
    const totalHeight = DOM.messagesContainer.scrollHeight;
    const currentScroll = DOM.messagesContainer.scrollTop + DOM.messagesContainer.clientHeight;
    
    STATE.isUserAtBottom = (totalHeight - currentScroll) <= threshold;
    if (STATE.isUserAtBottom) {
        DOM.newMessagesDock.classList.remove("visible");
        STATE.unreadCount = 0;
    }
}

DOM.messagesContainer.addEventListener("scroll", checkScrollPosition);

DOM.newMessagesDock.addEventListener("click", () => {
    STATE.isUserAtBottom = true;
    DOM.newMessagesDock.classList.remove("visible");
    STATE.unreadCount = 0;
    scrollToBottom();
});

// Render individual message bubble incrementally
function renderSingleMessageBubble(msg, animate = false) {
    if (STATE.renderedMessageIds.has(msg.id)) {
        const bubble = document.getElementById(\`msg-bubble-\${msg.id}\`);
        if (bubble) updateMessageBubbleStatus(bubble, msg);
        return;
    }

    const isMe = msg.sender.includes(\`User \${STATE.userNumberTag}\`);
    const row = document.createElement("div");
    row.className = \`message-row \${isMe ? 'outgoing' : 'incoming'}\`;
    row.id = \`msg-row-\${msg.id}\`;
    
    if (animate) {
        row.classList.add("animate-in");
    }

    const formattedText = formatMessageText(msg.translated_text || msg.original_text || msg.text);
    const isOriginal = msg.original_lang === STATE.selectedLanguage;
    
    const bubbleStyle = isMe
        ? "bg-gradient-to-tr from-[#0084ff] to-[#1877f2] text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-[15px] font-medium leading-relaxed border border-blue-600/30 shadow-sm"
        : "bg-white text-neutral-800 rounded-2xl rounded-tl-sm px-4 py-2.5 text-[15px] font-medium border border-neutral-300 shadow-sm leading-relaxed";

    let metaString = "";
    if (!isOriginal) {
        metaString = \`Translated from \${msg.original_lang_name}\`;
    } else {
        metaString = \`Original: \${msg.original_lang_name}\`;
    }

    const toggleBtnHtml = !isOriginal
        ? \`<button onclick="toggleSingleBubbleTranslation('\${msg.id}')" id="btn-trans-toggle-\${msg.id}" class="translation-toggle-link">Show Original</button>\`
        : '';

    const statusHtml = msg.isPending 
        ? \`<span class="animate-pulse"><i class="fa-regular fa-clock"></i> sending...</span>\`
        : \`<span>\${msg.timestamp.split(" ")[1] ? msg.timestamp.split(" ")[1].substring(0, 5) : msg.timestamp}</span>\`;

    row.innerHTML = \`
        <!-- Sender Name (ENLARGED, Font-ExtraBold) -->
        \${!isMe ? \`
            <div class="message-header-row">
                <span class="message-sender-avatar">\${msg.avatar || "🦁"}</span>
                <span class="message-sender-name">\${msg.sender}</span>
            </div>
        \` : ''}
        <div class="message-bubble-wrapper max-w-[80%] md:max-w-[70%] flex flex-col \${isMe ? 'items-end' : 'items-start'}" id="msg-bubble-\${msg.id}">
            <div class="\${bubbleStyle} break-words w-full message-text-content">
                <span id="text-body-\${msg.id}">\${formattedText}</span>
                \${!isOriginal ? \`
                    <div id="box-translation-\${msg.id}" class="translation-box hidden">
                        Original: "\${escapeHTML(msg.original_text || msg.text)}"
                    </div>
                \` : ''}
            </div>
            <div class="message-meta-row">
                <span id="status-time-\${msg.id}">\${statusHtml}</span>
                <span>•</span>
                <span id="status-lang-\${msg.id}">\${metaString}</span>
                \${toggleBtnHtml ? \`<span>•</span> \${toggleBtnHtml}\` : ''}
                <span id="status-tick-\${msg.id}" class="message-status-icon ml-1"></span>
            </div>
        </div>
    \`;

    let innerContainer = DOM.messagesContainer.querySelector(".chat-messages-inner");
    if (!innerContainer) {
        DOM.messagesContainer.innerHTML = '<div class="chat-messages-inner"></div>';
        innerContainer = DOM.messagesContainer.querySelector(".chat-messages-inner");
    }
    
    innerContainer.appendChild(row);
    STATE.renderedMessageIds.add(msg.id);
    
    const wrapper = row.querySelector(".message-bubble-wrapper");
    updateMessageBubbleStatus(wrapper, msg);
}

function updateMessageBubbleStatus(wrapper, msg) {
    const tickSpan = wrapper.querySelector('[id^="status-tick-"]');
    if (!tickSpan) return;

    if (msg.isPending) {
        tickSpan.innerHTML = '<i class="fa-regular fa-clock text-[#A5A5A5] animate-pulse" title="Sending..."></i>';
    } else if (msg.isFailed) {
        tickSpan.innerHTML = \`<span onclick="retryMessageDelivery('\${msg.clientMessageId || msg.id}', '\${escapeHTML(msg.original_text || msg.text)}')" class="status-failed-indicator" title="Failed. Click to retry!"><i class="fa-solid fa-circle-exclamation"></i> Retry</span>\`;
    } else {
        tickSpan.innerHTML = '<i class="fa-solid fa-check text-emerald-500" title="Sent ✓"></i>';
    }
}

window.toggleSingleBubbleTranslation = function(msgId) {
    const box = document.getElementById(\`box-translation-\${msgId}\`);
    const btn = document.getElementById(\`btn-trans-toggle-\${msgId}\`);
    if (!box || !btn) return;

    if (box.classList.contains("hidden")) {
        box.classList.remove("hidden");
        btn.textContent = "Hide Original";
    } else {
        box.classList.add("hidden");
        btn.textContent = "Show Original";
    }
    if (STATE.isUserAtBottom) scrollToBottom();
};

function renderAllMessagesFeed(forceScroll = false) {
    DOM.messagesContainer.innerHTML = '<div class="chat-messages-inner"></div>';
    STATE.renderedMessageIds.clear();
    
    if (STATE.messagesData.length === 0) {
        DOM.messagesContainer.innerHTML = \`
            <div class="h-full flex flex-col items-center justify-center text-center text-xs text-neutral-400 p-6">
                <i class="fa-regular fa-comment-dots text-3xl text-neutral-600 mb-2"></i>
                <h4 class="font-bold text-neutral-300 text-sm">No Messages yet</h4>
                <p class="max-w-xs mt-1 text-neutral-500">Be the first to join the chat and write a message in any language!</p>
            </div>
        \`;
        return;
    }

    STATE.messagesData.forEach(msg => {
        renderSingleMessageBubble(msg, false);
    });
    if (forceScroll) scrollToBottom();
}

// ========================================================
// 🌍 LANGUAGE SELECT MODAL LOGIC WITH KEYBOARD ACTIONS
// ========================================================
async function fetchLanguages() {
    try {
        const res = await fetch("/api/languages");
        const data = await res.json();
        STATE.languages = data.languages;
        renderLanguages();
    } catch (err) {
        console.error("Languages load error:", err);
    }
}

function renderLanguages(filter = "") {
    const cleanFilter = filter.toLowerCase().trim();
    DOM.popularLangsGrid.innerHTML = "";
    DOM.allLangsGrid.innerHTML = "";
    DOM.recentLangsGrid.innerHTML = "";
    DOM.systemLangsGrid.innerHTML = "";
    
    let matchCount = 0;

    const deviceLangCode = (navigator.language || "en").split("-")[0];
    const deviceLangName = LANG_CODE_TO_NAME[deviceLangCode] || "Device Language";
    
    // Auto Detect
    const autoBtn = document.createElement("button");
    autoBtn.type = "button";
    autoBtn.className = STATE.selectedLanguage === "auto" ? "lang-btn active" : "lang-btn";
    autoBtn.innerHTML = \`<span>Auto Detect</span><span class="lang-code">auto</span>\`;
    autoBtn.onclick = () => selectLanguage("auto", "Auto Detect");
    DOM.systemLangsGrid.appendChild(autoBtn);

    // Device Language
    const deviceBtn = document.createElement("button");
    deviceBtn.type = "button";
    deviceBtn.className = STATE.selectedLanguage === deviceLangCode ? "lang-btn active" : "lang-btn";
    deviceBtn.innerHTML = \`<span>System (\${deviceLangName})</span><span class="lang-code">\${deviceLangCode}</span>\`;
    deviceBtn.onclick = () => selectLanguage(deviceLangCode, deviceLangName);
    DOM.systemLangsGrid.appendChild(deviceBtn);

    // Recent Languages
    if (STATE.recentLanguages.length > 0 && !cleanFilter) {
        DOM.recentLangsSection.classList.remove("hidden");
        STATE.recentLanguages.forEach(code => {
            const name = LANG_CODE_TO_NAME[code];
            if (name) {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = STATE.selectedLanguage === code ? "lang-btn active" : "lang-btn";
                btn.innerHTML = \`<span>\${name}</span><span class="lang-code">\${code}</span>\`;
                btn.onclick = () => selectLanguage(code, name);
                DOM.recentLangsGrid.appendChild(btn);
            }
        });
    } else {
        DOM.recentLangsSection.classList.add("hidden");
    }

    STATE.languages.forEach(lang => {
        const name = lang.name;
        const code = lang.code;
        const isSelected = STATE.selectedLanguage === code;
        
        const matches = name.toLowerCase().includes(cleanFilter) || code.toLowerCase().includes(cleanFilter);
        const btnClass = isSelected ? "lang-btn active" : "lang-btn";

        if (CONFIG.popularCodes.includes(code) && !cleanFilter) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = btnClass;
            btn.innerHTML = \`<span>\${name}</span><span class="lang-code">\${code}</span>\`;
            btn.onclick = () => selectLanguage(code, name);
            DOM.popularLangsGrid.appendChild(btn);
        }

        if (matches) {
            matchCount++;
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = btnClass;
            btn.innerHTML = \`<span>\${name}</span><span class="lang-code">\${code}</span>\`;
            btn.onclick = () => selectLanguage(code, name);
            DOM.allLangsGrid.appendChild(btn);
        }
    });

    if (cleanFilter) {
        document.getElementById("all-langs-header").textContent = \`Search Results (\${matchCount})\`;
    } else {
        document.getElementById("all-langs-header").textContent = "All Languages";
    }
}

async function runAISuggestion(q) {
    if (!q || q.trim().length < 2) {
        DOM.aiSuggestionBox.classList.add("hidden");
        return;
    }
    try {
        const res = await fetch(\`/api/suggest-language?q=\${encodeURIComponent(q)}\`);
        const data = await res.json();
        
        if (data.suggestions && data.suggestions.length > 0) {
            DOM.aiSuggestionBox.classList.remove("hidden");
            DOM.aiSuggestionList.innerHTML = "";
            
            data.suggestions.forEach(s => {
                const chip = document.createElement("button");
                chip.type = "button";
                chip.className = "ai-chip";
                chip.innerHTML = \`\${s.name} <span class="text-[8px] opacity-60 font-mono">\${s.code}</span>\`;
                chip.onclick = () => selectLanguage(s.code, s.name);
                DOM.aiSuggestionList.appendChild(chip);
            });
        } else {
            DOM.aiSuggestionBox.classList.add("hidden");
        }
    } catch (err) {
        console.error("AI Suggestion error:", err);
    }
}

DOM.langSearchInput.addEventListener("input", (e) => {
    const q = e.target.value;
    renderLanguages(q);
    runAISuggestion(q);
});

function selectLanguage(code, name) {
    STATE.selectedLanguage = code;
    STATE.selectedLanguageName = name;
    localStorage.setItem("selectedLanguageCode", code);
    localStorage.setItem("selectedLanguageName", name);
    
    if (!STATE.recentLanguages.includes(code) && code !== "auto") {
        STATE.recentLanguages.unshift(code);
        if (STATE.recentLanguages.length > 4) {
            STATE.recentLanguages.pop();
        }
        localStorage.setItem("recentLanguages", JSON.stringify(STATE.recentLanguages));
    }
    
    DOM.currentLangText.textContent = name;

    // Send language change event to active WebSocket so background translator prioritizes it!
    RealtimeGateway.send({
        type: "CHANGE_LANGUAGE",
        lang: code
    });
    
    // Clear and full redraw on explicit language selection
    renderAllMessagesFeed(true);
    fetchMessages(true);
    closeLanguageModal();
}

function openLanguageModal() {
    DOM.langModal.classList.add("active");
    DOM.langSearchInput.value = "";
    renderLanguages("");
    DOM.aiSuggestionBox.classList.add("hidden");
    DOM.langSearchInput.focus();
}

function closeLanguageModal() {
    DOM.langModal.classList.remove("active");
    DOM.postText.focus();
}

DOM.openModalBtn.addEventListener("click", openLanguageModal);
DOM.closeModalBtn.addEventListener("click", closeLanguageModal);

window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && DOM.langModal.classList.contains("active")) {
        closeLanguageModal();
    }
});

DOM.langModal.addEventListener("keydown", (e) => {
    if (!DOM.langModal.classList.contains("active")) return;
    const activeBtn = document.activeElement;
    if (!activeBtn || (!activeBtn.classList.contains("lang-btn") && !activeBtn.classList.contains("ai-chip") && activeBtn !== DOM.langSearchInput)) return;
    const focusable = Array.from(DOM.langModal.querySelectorAll("button, input"));
    const idx = focusable.indexOf(activeBtn);
    
    if (e.key === "ArrowDown") {
        e.preventDefault();
        const nextIdx = (idx + 1) % focusable.length;
        focusable[nextIdx].focus();
    } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prevIdx = (idx - 1 + focusable.length) % focusable.length;
        focusable[prevIdx].focus();
    }
});

DOM.langModal.addEventListener("click", (e) => {
    if (e.target === DOM.langModal) closeLanguageModal();
});

function scrollToBottom() {
    setTimeout(() => {
        DOM.messagesContainer.scrollTo({
            top: DOM.messagesContainer.scrollHeight,
            behavior: 'smooth'
        });
    }, 50);
}

// ========================================================
// 📦 BOOTSTRAP INITIALIZATION
// ========================================================
(async function init() {
    DOM.currentLangText.textContent = STATE.selectedLanguageName;
    
    // 1. Establish persistent real-time WebSocket connection gateway!
    RealtimeGateway.connect();
    
    // 2. Fetch language options
    try {
        await fetchLanguages();
    } catch(err) {
        console.error("Bootstrap language fetch error:", err);
    }

    // 3. Sync initial messages cleanly
    try {
        await fetchMessages(true);
    } catch(err) {
        console.error("Bootstrap message fetch error:", err);
    }
    
    // 4. Polling Fallback Timer
    setInterval(() => {
        if (STATE.connectionMode !== "websocket") {
            fetchMessages();
        }
    }, CONFIG.syncInterval);
})();
`;
const SVG_CONTENT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 420" width="420" height="420">
  <g transform="translate(157.5, 276.6) rotate(25)">
    <path d="M -8,-5 H 2 V 5 H -8 Z M 2,-2 L 7,-5 V 5 L 2,2" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(358.8, 399.8) rotate(15)">
    <path d="M -6,-8 H 6 V 6 H -6 Z M -6,6 C -4,6 -4,8 -6,8 Z M -6,8 H 6 M -2,-5 H 4" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(318.0, 192.1) rotate(-29)">
    <path d="M 0,9 C 4,9 7,6 7,2 C 7,-3 2,-9 0,-10 C -2,-9 -7,-3 -7,2 C -7,6 -4,9 0,9 Z M -3,2 C -3,0 0,-4 0,-4 C 0,-4 3,0 3,2 C 3,4 0,6 -1,6 C -2,6 -3,4 -3,2 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(96.7, 54.1) rotate(-6)">
    <path d="M -6,-8 H 6 V 6 H -6 Z M -6,6 C -4,6 -4,8 -6,8 Z M -6,8 H 6 M -2,-5 H 4" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(115.2, 243.6) rotate(16)">
    <path d="M -5,-2 V -5 A 5,5 0 0 1 5,-5 V -2 M -7,-2 H 7 V 8 H -7 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(44.9, 172.4) rotate(-30)">
    <path d="M 0,9 C 4,9 7,6 7,2 C 7,-3 2,-9 0,-10 C -2,-9 -7,-3 -7,2 C -7,6 -4,9 0,9 Z M -3,2 C -3,0 0,-4 0,-4 C 0,-4 3,0 3,2 C 3,4 0,6 -1,6 C -2,6 -3,4 -3,2 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(250.8, 312.0) rotate(-1)">
    <path d="M -3,-2 A 3,3 0 1 1 -3,-8 M -9,8 C -9,5 -6,3 -3,3 C 0,3 3,5 3,8 M 4,-2 A 3,3 0 1 1 4,-8 M 1,8 C 1,5 4,3 7,3 C 10,3 10,5 10,8" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(393.9, 45.2) rotate(-28)">
    <path d="M -5,-2 V -5 A 5,5 0 0 1 5,-5 V -2 M -7,-2 H 7 V 8 H -7 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(267.3, 353.2) rotate(-10)">
    <path d="M 0,-8 A 8,8 0 1 1 0,8 A 8,8 0 1 1 0,-8 Z M -8,0 H 8 M 0,-8 C 3,-4 3,4 0,8 M 0,-8 C -3,-4 -3,4 0,8" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(274.6, 182.7) rotate(-13)">
    <path d="M -6,-4 H 6 V 4 A 4,4 0 0 1 2,8 H -2 A 4,4 0 0 1 -6,4 Z M 6,-2 H 8 A 2,2 0 0 1 10,0 V 2 A 2,2 0 0 1 8,4 H 6" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(256.4, 157.8) rotate(-32)">
    <path d="M 0,8 C -6,3 -10,-2 -10,-6 A 4,4 0 0 1 -2,-10 C 0,-8 0,-8 0,-8 C 0,-8 0,-8 2,-10 A 4,4 0 0 1 10,-6 C 10,-2 6,3 0,8 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(232.9, 248.7) rotate(17)">
    <path d="M -6,-9 H 6 A 2,2 0 0 1 8,-7 V 7 A 2,2 0 0 1 6,9 H -6 A 2,2 0 0 1 -8,7 V -7 A 2,2 0 0 1 -6,-9 Z M -2,6 H 2" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(344.6, 186.6) rotate(-25)">
    <path d="M -3,-6 V 2 C -3,4 3,4 3,2 V -6 C 3,-8 -3,-8 -3,-6 Z M -6,0 A 6,6 0 0 0 6,0 M 0,6 V 9" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(217.7, 163.0) rotate(-32)">
    <path d="M -8,-6 H 8 A 2,2 0 0 1 10,-4 V 4 A 2,2 0 0 1 8,6 H -8 A 2,2 0 0 1 -10,4 V -4 A 2,2 0 0 1 -8,-6 Z M -10,-4 L 0,1 L 10,-4" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(169.3, 162.9) rotate(13)">
    <path d="M 0,-8 C -4,-8 -7,-4 -7,0 C -7,5 0,10 0,10 C 0,10 7,5 7,0 C 7,-4 4,-8 0,-8 Z M 0,-2 A 2,2 0 1 1 0,-1.9" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(138.7, 187.2) rotate(-1)">
    <path d="M 0,-10 C 2,-4 5,0 5,6 L 3,8 L 0,5 L -3,8 L -5,6 C -5,0 -2,-4 0,-10 Z M -3,8 L -6,10 L -5,6 M 3,8 L 6,10 L 5,6" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(384.0, 204.9) rotate(-29)">
    <path d="M -8,-4 A 11,11 0 0 1 8,-4 M -5,-1 A 7,7 0 0 1 5,-1 M -2,2 A 3,3 0 0 1 2,2 M 0,5 A 1,1 0 1 1 0,5.1" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(82.4, 387.4) rotate(17)">
    <path d="M 0,-8 L 6,-2 H 4 L 8,3 H -8 L -4,-2 H -6 Z M 0,3 V 8" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(161.5, 327.0) rotate(12)">
    <path d="M -2,-8 H 2 L -3,-5 M 0,-3 A 3,3 0 1 1 0,3" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(50.1, 342.4) rotate(34)">
    <path d="M 0,-8 C 3,-8 5,-6 5,-3 C 5,1 0,8 0,8 C 0,8 -5,1 -5,-3 C -5,-6 -3,-8 0,-8 Z M -2,-3 A 2,2 0 1 1 2,-3" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(91.1, 323.8) rotate(-19)">
    <path d="M -3,-9 A 9,9 0 0 0 6,6 A 7,7 0 1 1 -3,-9 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(296.2, 37.8) rotate(7)">
    <path d="M -8,-6 H 8 A 2,2 0 0 1 10,-4 V 4 A 2,2 0 0 1 8,6 H -2 L -6,10 V 6 H -8 A 2,2 0 0 1 -10,4 V -4 A 2,2 0 0 1 -8,-6 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(108.0, 351.1) rotate(-34)">
    <path d="M -10,-10 L 10,0 L -10,10 L -4,2 L -10,-10 Z M -4,2 L 10,0" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(139.1, 245.5) rotate(33)">
    <path d="M -3,-6 V 2 C -3,4 3,4 3,2 V -6 C 3,-8 -3,-8 -3,-6 Z M -6,0 A 6,6 0 0 0 6,0 M 0,6 V 9" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(178.0, 38.3) rotate(-14)">
    <path d="M -6,-8 H 2 L 6,-4 V 8 H -6 Z M 2,-8 V -4 H 6" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(323.2, 270.1) rotate(16)">
    <path d="M 0,-8 C -4,-8 -7,-4 -7,0 C -7,5 0,10 0,10 C 0,10 7,5 7,0 C 7,-4 4,-8 0,-8 Z M 0,-2 A 2,2 0 1 1 0,-1.9" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(211.2, 236.2) rotate(-9)">
    <path d="M -9,-4 H 9 V 4 H -9 Z M -6,0 H -2 M -4,-2 V 2 M 4,0 A 1,1 0 1 1 4,0.1" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(354.7, 245.6) rotate(-15)">
    <path d="M 0,-2 A 2,2 0 1 1 0,2 Z M 0,-2 C 0,-6 4,-6 0,-2 Z M 0,2 C 0,6 -4,6 0,2 Z M -2,0 C -6,0 -6,-4 -2,0 Z M 2,0 C 6,0 6,4 2,0 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(93.8, 179.6) rotate(-31)">
    <path d="M 0,-8 A 8,8 0 1 1 0,8 A 8,8 0 1 1 0,-8 Z M -8,0 H 8 M 0,-8 C 3,-4 3,4 0,8 M 0,-8 C -3,-4 -3,4 0,8" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(117.6, 98.5) rotate(-7)">
    <path d="M -8,-3 H -5 L -3,-6 H 3 L 5,-3 H 8 A 2,2 0 0 1 10,-1 V 7 A 2,2 0 0 1 8,9 H -8 A 2,2 0 0 1 -10,7 V -1 A 2,2 0 0 1 -8,-3 Z M 0,3 A 3,3 0 1 1 0,3.1" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(80.5, 20.4) rotate(11)">
    <path d="M 0,-2 A 4,4 0 1 1 0,-10 A 4,4 0 1 1 0,-2 Z M -8,8 C -8,4 -4,2 0,2 C 4,2 8,4 8,8" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(300.9, 279.0) rotate(20)">
    <path d="M 0,-8 C -4,-8 -7,-4 -7,0 C -7,5 0,10 0,10 C 0,10 7,5 7,0 C 7,-4 4,-8 0,-8 Z M 0,-2 A 2,2 0 1 1 0,-1.9" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(212.2, 83.7) rotate(3)">
    <path d="M -6,-8 H 6 V 8 L 0,3 L -6,8 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(23.9, 182.6) rotate(8)">
    <path d="M -6,-8 H 2 L 6,-4 V 8 H -6 Z M 2,-8 V -4 H 6" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(353.9, 132.1) rotate(-23)">
    <path d="M 0,-8 L 6,-2 H 4 L 8,3 H -8 L -4,-2 H -6 Z M 0,3 V 8" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(141.1, 123.5) rotate(20)">
    <path d="M 0,-8 L 6,-2 H 4 L 8,3 H -8 L -4,-2 H -6 Z M 0,3 V 8" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(49.1, 81.3) rotate(11)">
    <path d="M -6,-8 H 6 V 8 L 0,3 L -6,8 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(137.4, 360.1) rotate(-25)">
    <path d="M -4,5 A 5,5 0 0 0 4,5 M -6,5 H 6 M -2,7 A 2,2 0 0 1 2,7" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(188.7, 212.9) rotate(-3)">
    <path d="M -9,-4 H 9 V 4 H -9 Z M -6,0 H -2 M -4,-2 V 2 M 4,0 A 1,1 0 1 1 4,0.1" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(289.1, 300.8) rotate(30)">
    <path d="M 0,9 C 4,9 7,6 7,2 C 7,-3 2,-9 0,-10 C -2,-9 -7,-3 -7,2 C -7,6 -4,9 0,9 Z M -3,2 C -3,0 0,-4 0,-4 C 0,-4 3,0 3,2 C 3,4 0,6 -1,6 C -2,6 -3,4 -3,2 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(367.2, 283.6) rotate(-15)">
    <path d="M 0,-8 A 8,8 0 1 1 0,8 A 8,8 0 1 1 0,-8 Z M -8,0 H 8 M 0,-8 C 3,-4 3,4 0,8 M 0,-8 C -3,-4 -3,4 0,8" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(231.6, 125.0) rotate(11)">
    <path d="M 0,-8 C 3,-8 5,-6 5,-3 C 5,1 0,8 0,8 C 0,8 -5,1 -5,-3 C -5,-6 -3,-8 0,-8 Z M -2,-3 A 2,2 0 1 1 2,-3" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(209.1, 335.4) rotate(6)">
    <path d="M 0,-8 L 6,-2 H 4 L 8,3 H -8 L -4,-2 H -6 Z M 0,3 V 8" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(390.2, 262.9) rotate(12)">
    <path d="M -10,-10 L 10,0 L -10,10 L -4,2 L -10,-10 Z M -4,2 L 10,0" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(75.1, 77.8) rotate(-35)">
    <path d="M -7,-3 H 7 V 7 H -7 Z M -8,-6 H 8 V -3 H -8 Z M 0,-6 C -2,-10 -5,-10 -5,-6 Z M 0,-6 C 2,-10 5,-10 5,-6 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(354.8, 218.4) rotate(-16)">
    <path d="M -3,-2 A 3,3 0 1 1 -3,-8 M -9,8 C -9,5 -6,3 -3,3 C 0,3 3,5 3,8 M 4,-2 A 3,3 0 1 1 4,-8 M 1,8 C 1,5 4,3 7,3 C 10,3 10,5 10,8" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(233.3, 52.6) rotate(17)">
    <path d="M -7,-3 H 7 V 7 H -7 Z M -8,-6 H 8 V -3 H -8 Z M 0,-6 C -2,-10 -5,-10 -5,-6 Z M 0,-6 C 2,-10 5,-10 5,-6 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(137.6, 335.0) rotate(-26)">
    <path d="M -3,-9 A 9,9 0 0 0 6,6 A 7,7 0 1 1 -3,-9 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(371.8, 169.7) rotate(15)">
    <path d="M -6,-8 H 6 V 6 H -6 Z M -6,6 C -4,6 -4,8 -6,8 Z M -6,8 H 6 M -2,-5 H 4" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(25.3, 269.4) rotate(7)">
    <path d="M 0,-10 C 2,-4 5,0 5,6 L 3,8 L 0,5 L -3,8 L -5,6 C -5,0 -2,-4 0,-10 Z M -3,8 L -6,10 L -5,6 M 3,8 L 6,10 L 5,6" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(41.4, 380.5) rotate(8)">
    <path d="M -4,5 A 5,5 0 0 0 4,5 M -6,5 H 6 M -2,7 A 2,2 0 0 1 2,7" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(40.3, 103.3) rotate(-8)">
    <path d="M 0,-10 C 2,-4 5,0 5,6 L 3,8 L 0,5 L -3,8 L -5,6 C -5,0 -2,-4 0,-10 Z M -3,8 L -6,10 L -5,6 M 3,8 L 6,10 L 5,6" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(50.8, 34.0) rotate(31)">
    <path d="M 0,-8 A 8,8 0 1 1 0,8 A 8,8 0 1 1 0,-8 Z M -3,-3 A 1,1 0 1 1 -3,-2.9 M 3,-3 A 1,1 0 1 1 3,-2.9 M -4,2 C -2,5 2,5 4,2" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(206.0, 25.3) rotate(2)">
    <path d="M 0,-10 L 3,-3 L 10,-2 L 5,3 L 7,10 L 0,6 L -7,10 L -5,3 L -10,-2 L -3,-3 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(27.6, 245.3) rotate(15)">
    <path d="M -5,4 C -8,4 -9,1 -7,-1 C -7,-5 -3,-7 0,-5 C 2,-8 7,-6 6,-2 C 8,-2 9,1 7,4 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(169.6, 199.4) rotate(-34)">
    <path d="M -3,-9 A 9,9 0 0 0 6,6 A 7,7 0 1 1 -3,-9 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(398.2, 157.3) rotate(4)">
    <path d="M -8,-6 H 8 A 2,2 0 0 1 10,-4 V 4 A 2,2 0 0 1 8,6 H -8 A 2,2 0 0 1 -10,4 V -4 A 2,2 0 0 1 -8,-6 Z M -10,-4 L 0,1 L 10,-4" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(162.7, 71.2) rotate(-6)">
    <path d="M -6,-8 H 2 L 6,-4 V 8 H -6 Z M 2,-8 V -4 H 6" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(56.2, 200.8) rotate(18)">
    <path d="M 0,-8 A 8,8 0 1 1 0,8 A 8,8 0 1 1 0,-8 Z M 0,0 V -4 M 0,0 H 3" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(204.0, 310.4) rotate(4)">
    <path d="M -8,-4 A 11,11 0 0 1 8,-4 M -5,-1 A 7,7 0 0 1 5,-1 M -2,2 A 3,3 0 0 1 2,2 M 0,5 A 1,1 0 1 1 0,5.1" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(245.8, 213.4) rotate(-34)">
    <path d="M 0,-8 C 3,-8 5,-6 5,-3 C 5,1 0,8 0,8 C 0,8 -5,1 -5,-3 C -5,-6 -3,-8 0,-8 Z M -2,-3 A 2,2 0 1 1 2,-3" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(58.2, 307.8) rotate(15)">
    <path d="M 0,-10 L 3,-3 L 10,-2 L 5,3 L 7,10 L 0,6 L -7,10 L -5,3 L -10,-2 L -3,-3 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(376.7, 343.8) rotate(-22)">
    <path d="M 0,-4 A 4,4 0 1 1 0,4 A 4,4 0 1 1 0,-4 M 0,-8 V -10 M 0,8 V 10 M -8,0 H -10 M 8,0 H 10" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(381.2, 317.2) rotate(-27)">
    <path d="M 0,-2 A 4,4 0 1 1 0,-10 A 4,4 0 1 1 0,-2 Z M -8,8 C -8,4 -4,2 0,2 C 4,2 8,4 8,8" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(150.5, 37.4) rotate(-14)">
    <path d="M -4,5 A 5,5 0 0 0 4,5 M -6,5 H 6 M -2,7 A 2,2 0 0 1 2,7" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(188.5, 388.3) rotate(-34)">
    <path d="M -7,4 V 0 A 7,7 0 0 1 7,0 V 4" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(112.3, 387.0) rotate(20)">
    <path d="M 0,-2 A 2,2 0 1 1 0,2 Z M 0,-2 C 0,-6 4,-6 0,-2 Z M 0,2 C 0,6 -4,6 0,2 Z M -2,0 C -6,0 -6,-4 -2,0 Z M 2,0 C 6,0 6,4 2,0 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(164.6, 125.0) rotate(26)">
    <path d="M -8,-6 H 8 A 2,2 0 0 1 10,-4 V 4 A 2,2 0 0 1 8,6 H -8 A 2,2 0 0 1 -10,4 V -4 A 2,2 0 0 1 -8,-6 Z M -10,-4 L 0,1 L 10,-4" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(390.9, 99.0) rotate(19)">
    <path d="M -5,-2 V -5 A 5,5 0 0 1 5,-5 V -2 M -7,-2 H 7 V 8 H -7 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(344.5, 367.6) rotate(-19)">
    <path d="M -6,-4 H 6 V 4 A 4,4 0 0 1 2,8 H -2 A 4,4 0 0 1 -6,4 Z M 6,-2 H 8 A 2,2 0 0 1 10,0 V 2 A 2,2 0 0 1 8,4 H 6" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(302.9, 110.9) rotate(-3)">
    <path d="M 0,-8 A 8,8 0 1 1 0,8 A 8,8 0 1 1 0,-8 Z M -3,-3 A 1,1 0 1 1 -3,-2.9 M 3,-3 A 1,1 0 1 1 3,-2.9 M -4,2 C -2,5 2,5 4,2" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(63.9, 99.5) rotate(30)">
    <path d="M -6,-4 H 6 V 4 A 4,4 0 0 1 2,8 H -2 A 4,4 0 0 1 -6,4 Z M 6,-2 H 8 A 2,2 0 0 1 10,0 V 2 A 2,2 0 0 1 8,4 H 6" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(260.3, 68.0) rotate(-20)">
    <path d="M -3,-6 V 2 C -3,4 3,4 3,2 V -6 C 3,-8 -3,-8 -3,-6 Z M -6,0 A 6,6 0 0 0 6,0 M 0,6 V 9" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(284.9, 245.0) rotate(16)">
    <path d="M -7,-3 H 7 V 7 H -7 Z M -8,-6 H 8 V -3 H -8 Z M 0,-6 C -2,-10 -5,-10 -5,-6 Z M 0,-6 C 2,-10 5,-10 5,-6 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(352.3, 57.9) rotate(6)">
    <path d="M -8,-6 H 8 A 2,2 0 0 1 10,-4 V 4 A 2,2 0 0 1 8,6 H -8 A 2,2 0 0 1 -10,4 V -4 A 2,2 0 0 1 -8,-6 Z M -10,-4 L 0,1 L 10,-4" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(332.8, 237.1) rotate(0)">
    <path d="M -5,4 C -8,4 -9,1 -7,-1 C -7,-5 -3,-7 0,-5 C 2,-8 7,-6 6,-2 C 8,-2 9,1 7,4 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(99.2, 216.8) rotate(0)">
    <path d="M -3,-9 A 9,9 0 0 0 6,6 A 7,7 0 1 1 -3,-9 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(368.4, 39.2) rotate(2)">
    <path d="M 0,-2 A 2,2 0 1 1 0,2 Z M 0,-2 C 0,-6 4,-6 0,-2 Z M 0,2 C 0,6 -4,6 0,2 Z M -2,0 C -6,0 -6,-4 -2,0 Z M 2,0 C 6,0 6,4 2,0 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(208.9, 185.4) rotate(-31)">
    <path d="M -8,-4 H 6 V 4 H -8 Z M 6,-2 H 8 V 2 H 6 M -5,-2 H -2 V 2 H -5" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(180.2, 269.4) rotate(-4)">
    <path d="M -3,-9 A 9,9 0 0 0 6,6 A 7,7 0 1 1 -3,-9 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(24.9, 209.9) rotate(25)">
    <path d="M -8,-5 H 2 V 5 H -8 Z M 2,-2 L 7,-5 V 5 L 2,2" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(28.0, 43.7) rotate(3)">
    <path d="M -6,-9 H 6 A 2,2 0 0 1 8,-7 V 7 A 2,2 0 0 1 6,9 H -6 A 2,2 0 0 1 -8,7 V -7 A 2,2 0 0 1 -6,-9 Z M -2,6 H 2" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(282.8, 133.2) rotate(-19)">
    <path d="M -6,-8 H 6 V 8 L 0,3 L -6,8 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(249.0, 286.9) rotate(35)">
    <path d="M -7,4 V 0 A 7,7 0 0 1 7,0 V 4" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(96.3, 299.8) rotate(5)">
    <path d="M -3,-6 V 2 C -3,4 3,4 3,2 V -6 C 3,-8 -3,-8 -3,-6 Z M -6,0 A 6,6 0 0 0 6,0 M 0,6 V 9" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(263.1, 229.5) rotate(-31)">
    <path d="M -8,-3 H -5 L -3,-6 H 3 L 5,-3 H 8 A 2,2 0 0 1 10,-1 V 7 A 2,2 0 0 1 8,9 H -8 A 2,2 0 0 1 -10,7 V -1 A 2,2 0 0 1 -8,-3 Z M 0,3 A 3,3 0 1 1 0,3.1" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(156.7, 103.2) rotate(-28)">
    <path d="M -8,-6 H -3 L -1,-3 H 8 V 6 H -8 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(153.1, 377.2) rotate(11)">
    <path d="M -8,-4 A 11,11 0 0 1 8,-4 M -5,-1 A 7,7 0 0 1 5,-1 M -2,2 A 3,3 0 0 1 2,2 M 0,5 A 1,1 0 1 1 0,5.1" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(113.5, 156.7) rotate(5)">
    <path d="M 0,-4 A 4,4 0 1 1 0,4 A 4,4 0 1 1 0,-4 M 0,-8 V -10 M 0,8 V 10 M -8,0 H -10 M 8,0 H 10" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(145.5, 147.6) rotate(19)">
    <path d="M -7,-3 H 7 V 7 H -7 Z M -8,-6 H 8 V -3 H -8 Z M 0,-6 C -2,-10 -5,-10 -5,-6 Z M 0,-6 C 2,-10 5,-10 5,-6 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(237.8, 77.5) rotate(5)">
    <path d="M 0,-10 C 2,-4 5,0 5,6 L 3,8 L 0,5 L -3,8 L -5,6 C -5,0 -2,-4 0,-10 Z M -3,8 L -6,10 L -5,6 M 3,8 L 6,10 L 5,6" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(389.4, 386.0) rotate(-21)">
    <path d="M 0,-2 A 2,2 0 1 1 0,2 Z M 0,-2 C 0,-6 4,-6 0,-2 Z M 0,2 C 0,6 -4,6 0,2 Z M -2,0 C -6,0 -6,-4 -2,0 Z M 2,0 C 6,0 6,4 2,0 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(205.5, 49.7) rotate(-25)">
    <path d="M -5,-2 V -5 A 5,5 0 0 1 5,-5 V -2 M -7,-2 H 7 V 8 H -7 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(190.2, 130.4) rotate(3)">
    <path d="M -6,-7 H 6 V 0 C 6,4 3,7 0,9 C -3,7 -6,4 -6,0 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(74.5, 253.8) rotate(19)">
    <path d="M -6,-4 H 6 V 4 A 4,4 0 0 1 2,8 H -2 A 4,4 0 0 1 -6,4 Z M 6,-2 H 8 A 2,2 0 0 1 10,0 V 2 A 2,2 0 0 1 8,4 H 6" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(175.9, 232.6) rotate(-10)">
    <path d="M -3,-9 A 9,9 0 0 0 6,6 A 7,7 0 1 1 -3,-9 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(315.7, 309.7) rotate(-26)">
    <path d="M -4,6 V -6 L 6,-9 V 3 M -4,-2 L 6,-5 M -7,6 A 3,2 0 1 1 -4,4 M 3,3 A 3,2 0 1 1 6,1" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(224.5, 286.9) rotate(-27)">
    <path d="M -9,-4 H 9 V 4 H -9 Z M -6,0 H -2 M -4,-2 V 2 M 4,0 A 1,1 0 1 1 4,0.1" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(309.4, 157.8) rotate(1)">
    <path d="M 0,-8 A 8,8 0 1 1 0,8 A 8,8 0 1 1 0,-8 Z M 0,0 V -4 M 0,0 H 3" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(316.0, 372.3) rotate(5)">
    <path d="M -4,5 A 5,5 0 0 0 4,5 M -6,5 H 6 M -2,7 A 2,2 0 0 1 2,7" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(272.4, 45.9) rotate(33)">
    <path d="M -8,-4 A 11,11 0 0 1 8,-4 M -5,-1 A 7,7 0 0 1 5,-1 M -2,2 A 3,3 0 0 1 2,2 M 0,5 A 1,1 0 1 1 0,5.1" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(350.6, 82.5) rotate(-14)">
    <path d="M 0,9 C 4,9 7,6 7,2 C 7,-3 2,-9 0,-10 C -2,-9 -7,-3 -7,2 C -7,6 -4,9 0,9 Z M -3,2 C -3,0 0,-4 0,-4 C 0,-4 3,0 3,2 C 3,4 0,6 -1,6 C -2,6 -3,4 -3,2 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(285.7, 380.9) rotate(3)">
    <path d="M 0,-8 L 6,-2 H 4 L 8,3 H -8 L -4,-2 H -6 Z M 0,3 V 8" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(37.9, 126.5) rotate(-32)">
    <path d="M -8,-3 H -5 L -3,-6 H 3 L 5,-3 H 8 A 2,2 0 0 1 10,-1 V 7 A 2,2 0 0 1 8,9 H -8 A 2,2 0 0 1 -10,7 V -1 A 2,2 0 0 1 -8,-3 Z M 0,3 A 3,3 0 1 1 0,3.1" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(74.6, 281.4) rotate(34)">
    <path d="M 0,9 C 4,9 7,6 7,2 C 7,-3 2,-9 0,-10 C -2,-9 -7,-3 -7,2 C -7,6 -4,9 0,9 Z M -3,2 C -3,0 0,-4 0,-4 C 0,-4 3,0 3,2 C 3,4 0,6 -1,6 C -2,6 -3,4 -3,2 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(76.0, 215.4) rotate(12)">
    <path d="M 0,-8 C 3,-8 5,-6 5,-3 C 5,1 0,8 0,8 C 0,8 -5,1 -5,-3 C -5,-6 -3,-8 0,-8 Z M -2,-3 A 2,2 0 1 1 2,-3" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(209.4, 107.9) rotate(6)">
    <path d="M -5,-2 V -5 A 5,5 0 0 1 5,-5 V -2 M -7,-2 H 7 V 8 H -7 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(222.8, 367.6) rotate(-29)">
    <path d="M -4,5 A 5,5 0 0 0 4,5 M -6,5 H 6 M -2,7 A 2,2 0 0 1 2,7" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(349.6, 333.1) rotate(23)">
    <path d="M -10,-10 L 10,0 L -10,10 L -4,2 L -10,-10 Z M -4,2 L 10,0" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(389.4, 290.9) rotate(26)">
    <path d="M -8,-6 H -3 L -1,-3 H 8 V 6 H -8 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(22.1, 359.0) rotate(-28)">
    <path d="M -8,-6 H 8 A 2,2 0 0 1 10,-4 V 4 A 2,2 0 0 1 8,6 H -2 L -6,10 V 6 H -8 A 2,2 0 0 1 -10,4 V -4 A 2,2 0 0 1 -8,-6 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(381.4, 73.0) rotate(19)">
    <path d="M 0,-10 L 3,-3 L 10,-2 L 5,3 L 7,10 L 0,6 L -7,10 L -5,3 L -10,-2 L -3,-3 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(318.4, 30.4) rotate(22)">
    <path d="M 0,-4 A 4,4 0 1 1 0,4 A 4,4 0 1 1 0,-4 M 0,-8 V -10 M 0,8 V 10 M -8,0 H -10 M 8,0 H 10" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(185.2, 343.9) rotate(-10)">
    <path d="M -4,5 A 5,5 0 0 0 4,5 M -6,5 H 6 M -2,7 A 2,2 0 0 1 2,7" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(105.0, 79.0) rotate(-30)">
    <path d="M -7,4 V 0 A 7,7 0 0 1 7,0 V 4" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(353.2, 105.6) rotate(23)">
    <path d="M -6,-9 H 6 A 2,2 0 0 1 8,-7 V 7 A 2,2 0 0 1 6,9 H -6 A 2,2 0 0 1 -8,7 V -7 A 2,2 0 0 1 -6,-9 Z M -2,6 H 2" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(85.1, 130.8) rotate(-28)">
    <path d="M 0,-8 L 6,-2 H 4 L 8,3 H -8 L -4,-2 H -6 Z M 0,3 V 8" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(52.6, 144.6) rotate(-27)">
    <path d="M -7,-5 H 7 V 7 H -7 Z M -4,-7 V -5 M 4,-7 V -5 M -7,0 H 7" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(252.5, 387.6) rotate(-30)">
    <path d="M -6,-8 H 6 V 6 H -6 Z M -6,6 C -4,6 -4,8 -6,8 Z M -6,8 H 6 M -2,-5 H 4" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(92.0, 104.2) rotate(23)">
    <path d="M 0,-2 A 2,2 0 1 1 0,2 Z M 0,-2 C 0,-6 4,-6 0,-2 Z M 0,2 C 0,6 -4,6 0,2 Z M -2,0 C -6,0 -6,-4 -2,0 Z M 2,0 C 6,0 6,4 2,0 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(162.4, 355.4) rotate(-24)">
    <path d="M -6,-8 H 6 V 6 H -6 Z M -6,6 C -4,6 -4,8 -6,8 Z M -6,8 H 6 M -2,-5 H 4" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(263.0, 268.4) rotate(21)">
    <path d="M -6,-8 H 6 V 6 H -6 Z M -6,6 C -4,6 -4,8 -6,8 Z M -6,8 H 6 M -2,-5 H 4" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(60.4, 365.2) rotate(-30)">
    <path d="M -7,-5 H 7 V 7 H -7 Z M -4,-7 V -5 M 4,-7 V -5 M -7,0 H 7" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(293.9, 341.6) rotate(34)">
    <path d="M -6,-4 H 6 V 4 A 4,4 0 0 1 2,8 H -2 A 4,4 0 0 1 -6,4 Z M 6,-2 H 8 A 2,2 0 0 1 10,0 V 2 A 2,2 0 0 1 8,4 H 6" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(328.2, 93.8) rotate(29)">
    <path d="M 0,-8 C 3,-8 5,-6 5,-3 C 5,1 0,8 0,8 C 0,8 -5,1 -5,-3 C -5,-6 -3,-8 0,-8 Z M -2,-3 A 2,2 0 1 1 2,-3" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(125.2, 266.9) rotate(-10)">
    <path d="M -6,-8 H 6 V 6 H -6 Z M -6,6 C -4,6 -4,8 -6,8 Z M -6,8 H 6 M -2,-5 H 4" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(123.2, 30.8) rotate(-8)">
    <path d="M -10,-10 L 10,0 L -10,10 L -4,2 L -10,-10 Z M -4,2 L 10,0" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(327.9, 120.2) rotate(25)">
    <path d="M -8,-4 A 11,11 0 0 1 8,-4 M -5,-1 A 7,7 0 0 1 5,-1 M -2,2 A 3,3 0 0 1 2,2 M 0,5 A 1,1 0 1 1 0,5.1" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(286.0, 212.2) rotate(-14)">
    <path d="M -6,-8 H 6 V 8 L 0,3 L -6,8 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(304.5, 84.8) rotate(-8)">
    <path d="M -6,-4 H 6 V 4 A 4,4 0 0 1 2,8 H -2 A 4,4 0 0 1 -6,4 Z M 6,-2 H 8 A 2,2 0 0 1 10,0 V 2 A 2,2 0 0 1 8,4 H 6" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(25.9, 20.8) rotate(-16)">
    <path d="M -8,-5 H 2 V 5 H -8 Z M 2,-2 L 7,-5 V 5 L 2,2" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(385.5, 23.2) rotate(6)">
    <path d="M -6,-8 H 6 V 6 H -6 Z M -6,6 C -4,6 -4,8 -6,8 Z M -6,8 H 6 M -2,-5 H 4" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(129.0, 305.3) rotate(3)">
    <path d="M -7,4 V 0 A 7,7 0 0 1 7,0 V 4 M -8,4 H -5 V 7 H -8 Z M 5,4 H 8 V 7 H 5 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(136.9, 67.3) rotate(25)">
    <path d="M 0,-10 L 3,-3 L 10,-2 L 5,3 L 7,10 L 0,6 L -7,10 L -5,3 L -10,-2 L -3,-3 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(47.9, 264.0) rotate(7)">
    <path d="M 0,-8 C 3,-8 5,-6 5,-3 C 5,1 0,8 0,8 C 0,8 -5,1 -5,-3 C -5,-6 -3,-8 0,-8 Z M -2,-3 A 2,2 0 1 1 2,-3" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(322.3, 334.6) rotate(-20)">
    <path d="M -7,-3 H 7 V 7 H -7 Z M -8,-6 H 8 V -3 H -8 Z M 0,-6 C -2,-10 -5,-10 -5,-6 Z M 0,-6 C 2,-10 5,-10 5,-6 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(180.1, 105.1) rotate(-31)">
    <path d="M -8,-6 H 8 A 2,2 0 0 1 10,-4 V 4 A 2,2 0 0 1 8,6 H -8 A 2,2 0 0 1 -10,4 V -4 A 2,2 0 0 1 -8,-6 Z M -10,-4 L 0,1 L 10,-4" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(234.2, 29.6) rotate(3)">
    <path d="M -2,-8 H 2 L -3,-5 M 0,-3 A 3,3 0 1 1 0,3" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(395.5, 229.6) rotate(27)">
    <path d="M -3,-9 A 9,9 0 0 0 6,6 A 7,7 0 1 1 -3,-9 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(57.0, 233.7) rotate(12)">
    <path d="M 0,-2 A 4,4 0 1 1 0,-10 A 4,4 0 1 1 0,-2 Z M -8,8 C -8,4 -4,2 0,2 C 4,2 8,4 8,8" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(66.2, 56.0) rotate(-18)">
    <path d="M 0,-8 C -4,-8 -7,-4 -7,0 C -7,5 0,10 0,10 C 0,10 7,5 7,0 C 7,-4 4,-8 0,-8 Z M 0,-2 A 2,2 0 1 1 0,-1.9" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(329.5, 395.2) rotate(-28)">
    <path d="M -3,-9 A 9,9 0 0 0 6,6 A 7,7 0 1 1 -3,-9 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(26.5, 149.7) rotate(-6)">
    <path d="M -7,4 V 0 A 7,7 0 0 1 7,0 V 4 M -8,4 H -5 V 7 H -8 Z M 5,4 H 8 V 7 H 5 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(379.9, 119.3) rotate(-6)">
    <path d="M 0,-4 A 4,4 0 1 1 0,4 A 4,4 0 1 1 0,-4 M 0,-8 V -10 M 0,8 V 10 M -8,0 H -10 M 8,0 H 10" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(253.7, 99.7) rotate(-8)">
    <path d="M -5,-2 V -5 A 5,5 0 0 1 5,-5 V -2 M -7,-2 H 7 V 8 H -7 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(345.9, 25.5) rotate(-15)">
    <path d="M 0,9 C 4,9 7,6 7,2 C 7,-3 2,-9 0,-10 C -2,-9 -7,-3 -7,2 C -7,6 -4,9 0,9 Z M -3,2 C -3,0 0,-4 0,-4 C 0,-4 3,0 3,2 C 3,4 0,6 -1,6 C -2,6 -3,4 -3,2 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(191.0, 72.6) rotate(22)">
    <path d="M 0,8 C -6,3 -10,-2 -10,-6 A 4,4 0 0 1 -2,-10 C 0,-8 0,-8 0,-8 C 0,-8 0,-8 2,-10 A 4,4 0 0 1 10,-6 C 10,-2 6,3 0,8 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(23.4, 69.2) rotate(-6)">
    <path d="M -6,-7 H 6 V 0 C 6,4 3,7 0,9 C -3,7 -6,4 -6,0 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(283.8, 96.3) rotate(-24)">
    <path d="M -6,-9 H 6 A 2,2 0 0 1 8,-7 V 7 A 2,2 0 0 1 6,9 H -6 A 2,2 0 0 1 -8,7 V -7 A 2,2 0 0 1 -6,-9 Z M -2,6 H 2" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(239.5, 341.5) rotate(-1)">
    <path d="M 0,-8 A 8,8 0 1 1 0,8 A 8,8 0 1 1 0,-8 Z M -3,-3 A 1,1 0 1 1 -3,-2.9 M 3,-3 A 1,1 0 1 1 3,-2.9 M -4,2 C -2,5 2,5 4,2" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(347.4, 161.6) rotate(2)">
    <path d="M -8,-6 H -3 L -1,-3 H 8 V 6 H -8 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(212.8, 395.4) rotate(26)">
    <path d="M -3,-2 A 3,3 0 1 1 -3,-8 M -9,8 C -9,5 -6,3 -3,3 C 0,3 3,5 3,8 M 4,-2 A 3,3 0 1 1 4,-8 M 1,8 C 1,5 4,3 7,3 C 10,3 10,5 10,8" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(143.2, 210.9) rotate(-12)">
    <path d="M -9,-4 H 9 V 4 H -9 Z M -6,0 H -2 M -4,-2 V 2 M 4,0 A 1,1 0 1 1 4,0.1" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(237.8, 184.4) rotate(24)">
    <path d="M -3,-2 A 3,3 0 1 1 -3,-8 M -9,8 C -9,5 -6,3 -3,3 C 0,3 3,5 3,8 M 4,-2 A 3,3 0 1 1 4,-8 M 1,8 C 1,5 4,3 7,3 C 10,3 10,5 10,8" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(20.8, 317.2) rotate(16)">
    <path d="M -5,4 C -8,4 -9,1 -7,-1 C -7,-5 -3,-7 0,-5 C 2,-8 7,-6 6,-2 C 8,-2 9,1 7,4 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(398.3, 183.3) rotate(13)">
    <path d="M -5,-2 V -5 A 5,5 0 0 1 5,-5 V -2 M -7,-2 H 7 V 8 H -7 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(97.7, 273.8) rotate(25)">
    <path d="M -4,5 A 5,5 0 0 0 4,5 M -6,5 H 6 M -2,7 A 2,2 0 0 1 2,7" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(168.8, 299.8) rotate(-33)">
    <path d="M 0,-10 C 2,-4 5,0 5,6 L 3,8 L 0,5 L -3,8 L -5,6 C -5,0 -2,-4 0,-10 Z M -3,8 L -6,10 L -5,6 M 3,8 L 6,10 L 5,6" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(300.4, 399.1) rotate(27)">
    <path d="M -10,-10 L 10,0 L -10,10 L -4,2 L -10,-10 Z M -4,2 L 10,0" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(399.5, 339.2) rotate(1)">
    <path d="M 0,-8 A 8,8 0 1 1 0,8 A 8,8 0 1 1 0,-8 Z M -3,-3 A 1,1 0 1 1 -3,-2.9 M 3,-3 A 1,1 0 1 1 3,-2.9 M -4,2 C -2,5 2,5 4,2" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(84.9, 352.9) rotate(14)">
    <path d="M 0,8 C -6,3 -10,-2 -10,-6 A 4,4 0 0 1 -2,-10 C 0,-8 0,-8 0,-8 C 0,-8 0,-8 2,-10 A 4,4 0 0 1 10,-6 C 10,-2 6,3 0,8 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(272.3, 20.9) rotate(31)">
    <path d="M -9,-4 H 9 V 4 H -9 Z M -6,0 H -2 M -4,-2 V 2 M 4,0 A 1,1 0 1 1 4,0.1" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(308.0, 249.4) rotate(-17)">
    <path d="M 0,-8 A 8,8 0 1 1 0,8 A 8,8 0 1 1 0,-8 Z M 0,0 V -4 M 0,0 H 3" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(85.0, 157.9) rotate(-7)">
    <path d="M -3,-2 A 3,3 0 1 1 -3,-8 M -9,8 C -9,5 -6,3 -3,3 C 0,3 3,5 3,8 M 4,-2 A 3,3 0 1 1 4,-8 M 1,8 C 1,5 4,3 7,3 C 10,3 10,5 10,8" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(194.5, 165.3) rotate(21)">
    <path d="M 0,9 C 4,9 7,6 7,2 C 7,-3 2,-9 0,-10 C -2,-9 -7,-3 -7,2 C -7,6 -4,9 0,9 Z M -3,2 C -3,0 0,-4 0,-4 C 0,-4 3,0 3,2 C 3,4 0,6 -1,6 C -2,6 -3,4 -3,2 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(349.8, 304.5) rotate(-17)">
    <path d="M 0,-8 A 8,8 0 1 1 0,8 A 8,8 0 1 1 0,-8 Z M -3,-3 A 1,1 0 1 1 -3,-2.9 M 3,-3 A 1,1 0 1 1 3,-2.9 M -4,2 C -2,5 2,5 4,2" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(56.8, 398.0) rotate(4)">
    <path d="M 0,-10 C 2,-4 5,0 5,6 L 3,8 L 0,5 L -3,8 L -5,6 C -5,0 -2,-4 0,-10 Z M -3,8 L -6,10 L -5,6 M 3,8 L 6,10 L 5,6" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(113.3, 195.4) rotate(33)">
    <path d="M -10,-10 L 10,0 L -10,10 L -4,2 L -10,-10 Z M -4,2 L 10,0" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(257.9, 126.9) rotate(22)">
    <path d="M -3,-2 A 3,3 0 1 1 -3,-8 M -9,8 C -9,5 -6,3 -3,3 C 0,3 3,5 3,8 M 4,-2 A 3,3 0 1 1 4,-8 M 1,8 C 1,5 4,3 7,3 C 10,3 10,5 10,8" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(218.6, 207.5) rotate(35)">
    <path d="M -5,-2 V -5 A 5,5 0 0 1 5,-5 V -2 M -7,-2 H 7 V 8 H -7 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(24.4, 293.7) rotate(-6)">
    <path d="M -6,-4 H 6 V 4 A 4,4 0 0 1 2,8 H -2 A 4,4 0 0 1 -6,4 Z M 6,-2 H 8 A 2,2 0 0 1 10,0 V 2 A 2,2 0 0 1 8,4 H 6" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(195.7, 365.9) rotate(-29)">
    <path d="M 0,-10 C 2,-4 5,0 5,6 L 3,8 L 0,5 L -3,8 L -5,6 C -5,0 -2,-4 0,-10 Z M -3,8 L -6,10 L -5,6 M 3,8 L 6,10 L 5,6" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(329.3, 54.8) rotate(-9)">
    <path d="M -7,-5 H 7 V 7 H -7 Z M -4,-7 V -5 M 4,-7 V -5 M -7,0 H 7" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(283.8, 157.0) rotate(18)">
    <path d="M 0,-8 A 8,8 0 1 1 0,8 A 8,8 0 1 1 0,-8 Z M 0,0 V -4 M 0,0 H 3" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(374.2, 144.1) rotate(-15)">
    <path d="M -3,-2 A 3,3 0 1 1 -3,-8 M -9,8 C -9,5 -6,3 -3,3 C 0,3 3,5 3,8 M 4,-2 A 3,3 0 1 1 4,-8 M 1,8 C 1,5 4,3 7,3 C 10,3 10,5 10,8" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(135.3, 395.1) rotate(-22)">
    <path d="M 0,-4 A 4,4 0 1 1 0,4 A 4,4 0 1 1 0,-4 M 0,-8 V -10 M 0,8 V 10 M -8,0 H -10 M 8,0 H 10" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(106.9, 123.2) rotate(7)">
    <path d="M -6,-8 H 2 L 6,-4 V 8 H -6 Z M 2,-8 V -4 H 6" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(285.1, 70.8) rotate(11)">
    <path d="M -8,-6 H -3 L -1,-3 H 8 V 6 H -8 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(347.4, 270.2) rotate(31)">
    <path d="M -7,4 V 0 A 7,7 0 0 1 7,0 V 4 M -8,4 H -5 V 7 H -8 Z M 5,4 H 8 V 7 H 5 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(198.2, 287.6) rotate(-28)">
    <path d="M -4,6 V -6 L 6,-9 V 3 M -4,-2 L 6,-5 M -7,6 A 3,2 0 1 1 -4,4 M 3,3 A 3,2 0 1 1 6,1" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(326.4, 214.4) rotate(6)">
    <path d="M 0,8 C -6,3 -10,-2 -10,-6 A 4,4 0 0 1 -2,-10 C 0,-8 0,-8 0,-8 C 0,-8 0,-8 2,-10 A 4,4 0 0 1 10,-6 C 10,-2 6,3 0,8 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(208.5, 261.1) rotate(-10)">
    <path d="M -8,-4 H 6 V 4 H -8 Z M 6,-2 H 8 V 2 H 6 M -5,-2 H -2 V 2 H -5" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(62.0, 123.3) rotate(-27)">
    <path d="M -6,-8 H 6 V 8 L 0,3 L -6,8 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(228.8, 319.1) rotate(-1)">
    <path d="M -7,4 V 0 A 7,7 0 0 1 7,0 V 4" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(373.7, 366.7) rotate(-2)">
    <path d="M -3,-2 A 3,3 0 1 1 -3,-8 M -9,8 C -9,5 -6,3 -3,3 C 0,3 3,5 3,8 M 4,-2 A 3,3 0 1 1 4,-8 M 1,8 C 1,5 4,3 7,3 C 10,3 10,5 10,8" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(307.8, 134.5) rotate(-22)">
    <path d="M -4,5 A 5,5 0 0 0 4,5 M -6,5 H 6 M -2,7 A 2,2 0 0 1 2,7" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(274.3, 322.7) rotate(32)">
    <path d="M 0,8 C -6,3 -10,-2 -10,-6 A 4,4 0 0 1 -2,-10 C 0,-8 0,-8 0,-8 C 0,-8 0,-8 2,-10 A 4,4 0 0 1 10,-6 C 10,-2 6,3 0,8 Z" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="translate(160.8, 253.4) rotate(-26)">
    <path d="M -8,-5 H 2 V 5 H -8 Z M 2,-2 L 7,-5 V 5 L 2,2" stroke="#F5F5F5" stroke-width="1.4" fill="none" opacity="0.06" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;
