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

// Common multi-lingual greetings for search bar AI suggestion
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
        
        // Cache it
        translationCache[cacheKey] = translatedText;
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

  // 8. POST API: Send a new message (Auto-detects language)
  if (path === "/api/messages" && request.method === "POST") {
    try {
      const body = await request.json();
      const text = (body.text || "").trim();
      const sender = (body.sender || "").trim() || "Anonymous User";
      const avatar = body.avatar || "🦁";

      if (!text) {
        return new Response(JSON.stringify({ detail: "Message cannot be empty" }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }

      // Auto-detect language via Google Single API
      let detectedLang = "en";
      try {
        const detectUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`;
        const res = await fetch(detectUrl);
        const json = await res.json();
        detectedLang = json[2] || "en";
      } catch (e) {}

      const detectedLangName = LANG_CODE_TO_NAME[detectedLang] || "English";
      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const msgId = `msg_${Date.now()}`;

      const newMsg = {
        id: msgId,
        sender,
        avatar,
        text,
        original_lang: detectedLang,
        original_lang_name: detectedLangName,
        timestamp
      };

      messages.push(newMsg);

      // Cache translation in its own language
      translationCache[`${msgId}_${detectedLang}`] = text;

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
    <!-- Linked Custom Stylesheet -->
    <link rel="stylesheet" href="style.css">
</head>
<body>

    <!-- Full Screen Blazing Fire Overlay (Triggered on high-speed swipe) -->
    <div id="fire-overlay" class="fire-screen-overlay">
        <!-- Canvas to draw realistic climbing fire flames -->
        <canvas id="flames-canvas" class="climbing-flames-canvas"></canvas>
    </div>

    <!-- App Container -->
    <div class="app-container" id="app-container">

        <!-- ==========================================
             CHAT WINDOW MAIN COLUMN (100% Width Layout)
             ========================================== -->
        <main class="chat-window" id="chat-window">

            <!-- Chat Header -->
            <header class="chat-header">
                <div class="header-left">
                    <div class="header-avatar">🌐</div>
                    <div class="header-details">
                        <h2 class="header-title">BhashaSetu Global Chat</h2>
                        <p class="header-subtitle">Auto Translating Group Chat Room</p>
                    </div>
                </div>

                <!-- Header Actions Panel -->
                <div class="header-actions">
                    <!-- Sync Indicator -->
                    <span class="text-[10px] text-neutral-400 font-mono hidden sm:inline" id="countdown-indicator">
                        Syncing in <span id="seconds-left">5</span>s
                    </span>
                    <!-- Manual Sync -->
                    <button id="manual-refresh-btn" class="header-icon-btn" title="Force Sync Feed">
                        <i class="fa-solid fa-rotate-right"></i>
                    </button>
                    <!-- Language Selection Trigger -->
                    <button id="open-lang-modal-btn" class="header-btn" title="Choose Translation Language">
                        <i class="fa-solid fa-language"></i>
                        <span id="current-lang-text">English (en)</span>
                    </button>
                </div>
            </header>

            <!-- Scrollable Messages Container with Vector SVG Wallpaper -->
            <section class="chat-messages-container custom-scroll" id="messages-container">
                <!-- Chat bubbles are injected here by app.js -->
            </section>

            <!-- Bottom Sticky Chat Footer Area -->
            <footer class="chat-footer">
                <div class="input-row">
                    
                    <!-- Quick Identity Indicator & Dice Shuffle -->
                    <button type="button" id="shuffle-identity-btn" class="identity-badge" title="Tap to randomize your nickname">
                        <span id="avatar-preview" class="identity-avatar">🦁</span>
                        <span id="sender-display" class="identity-name">Toofani Panda</span>
                        <i class="fa-solid fa-dice text-neutral-400 text-[10px]"></i>
                    </button>
                    
                    <!-- Unified Input Container -->
                    <div class="footer-input-container">
                        <!-- Hidden Identity Credentials -->
                        <input type="hidden" id="post-avatar" value="🦁">
                        <input type="hidden" id="post-sender" value="🦁 Anonymous">

                        <!-- Text Field -->
                        <input type="text" id="post-text" required autocomplete="off" class="message-input" placeholder="Type message in any language...">
                        
                        <!-- 🚀 Revolutionary SWIPE-TO-SEND ROCKET Channel -->
                        <div id="swipe-channel" class="swipe-send-channel" title="Swipe rocket right to send!">
                            <!-- Bouncing Tutorial Arrow Guide -->
                            <div id="swipe-guide" class="swipe-guide-arrow">
                                <i class="fa-solid fa-angles-left"></i> Swipe
                            </div>
                            
                            <!-- Grabbable Rocket handle button -->
                            <div id="swipe-rocket" class="swipe-rocket-btn">
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
    <div id="lang-modal" class="modal-overlay">
        <div class="modal-card">
            <!-- Header -->
            <div class="modal-header">
                <h3 class="modal-title">Select Chat Language</h3>
                <button id="close-lang-modal-btn" class="modal-close-btn">Close</button>
            </div>

            <!-- Search Field -->
            <div class="modal-search-box">
                <div class="search-wrapper">
                    <i class="fa-solid fa-magnifying-glass search-icon"></i>
                    <input type="text" id="lang-search-input" class="search-input" placeholder="Search language or type greeting (e.g. 'Bonjour')...">
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

    <!-- Linked JS App Logic -->
    <script src="app.js"></script>
</body>
</html>
`;
const STYLE_CONTENT = `/* 
========================================================
BhashaSetu Premium Messenger — Single-Page Chat Stylesheet
Highly polished, single-feed layout with immersive animations
========================================================
*/

:root {
    /* Colors */
    --bg-color: #0F1115;
    --bg-header: #12151B;
    --bg-input: #1B1E26;
    --accent-color: #4F8CFF;
    --accent-hover: #3b76e0;
    --text-primary: #F5F5F5;
    --text-secondary: #A5A5A5;
    --border-color: rgba(255, 255, 255, 0.06);
    --border-color-focus: rgba(79, 140, 255, 0.3);
    
    /* Bubble Colors */
    --bubble-outgoing: #4F8CFF;
    --bubble-incoming: #1E222B;
    --bubble-incoming-border: rgba(255, 255, 255, 0.03);
    
    /* Typography Font Sizes */
    --font-chat: 16px;
    --font-chat-mobile: 15px;
    --font-time: 12px;
    --font-input: 16px;
    --font-title: 17px;
    --font-subtitle: 13px;
    
    /* Sizing & Dimensions */
    --header-height-desktop: 64px;
    --header-height-mobile: 56px;
    --input-height-desktop: 76px;
    --input-height-mobile: 72px;
    
    /* Radii */
    --border-radius: 12px;
    --bubble-radius: 18px;
    --input-radius: 28px;
    
    /* Animations */
    --transition-speed: 200ms;
    --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
}

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
}

/* App Wrapper - Single Column Chat Panel */
.app-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    position: relative;
}

/* Custom Scrollbars */
.custom-scroll::-webkit-scrollbar {
    width: 5px;
}
.custom-scroll::-webkit-scrollbar-track {
    background: transparent;
}
.custom-scroll::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 10px;
}
.custom-scroll::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.15);
}

/* Header (64px Tall Desktop) */
.chat-header {
    height: var(--header-height-desktop);
    background-color: var(--bg-header);
    border-bottom: 1px solid var(--border-color);
    padding: 0 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    z-index: 15;
    user-select: none;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 12px;
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
}

.header-title {
    font-size: var(--font-title);
    font-weight: 600;
}

.header-subtitle {
    font-size: var(--font-subtitle);
    color: var(--text-secondary);
    margin-top: 1px;
}

/* Header Actions */
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
    transition: background-color var(--transition-speed);
    display: flex;
    align-items: center;
    gap: 6px;
    outline: none;
}

.header-btn:hover {
    background-color: rgba(255, 255, 255, 0.08);
}

.header-icon-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 16px;
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

/* Chat Canvas area with Repeating Doodle Vector SVG Background */
.chat-messages-container {
    height: 100%;
    width: 100%;
    overflow-y: auto;
    position: relative;
    
    /* 100% Vector SVG doodle background repeating seamless forever */
    background-image: url('chat-pattern.svg');
    background-repeat: repeat;
    background-size: 420px;
    
    padding: 24px;
    padding-bottom: 100px; /* Crucial: ensures scroll ends completely above the blurred input dock */
}

.chat-messages-inner {
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 8px; /* Strict 8px space between messages */
}

/* Message Bubble Rows */
.message-row {
    width: 100%;
    display: flex;
    flex-direction: column;
    animation: messageFadeIn 240ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes messageFadeIn {
    0% { opacity: 0; transform: translateY(8px); }
    100% { opacity: 1; transform: translateY(0); }
}

.message-row.incoming { align-items: flex-start; }
.message-row.outgoing { align-items: flex-end; }

.message-sender {
    font-size: 11px;
    font-weight: 700;
    color: var(--text-secondary);
    margin-bottom: 3px;
    margin-left: 6px;
    user-select: none;
}

.message-bubble {
    max-width: 72%;
    padding: 12px 16px;
    border-radius: var(--bubble-radius);
    font-size: var(--font-chat);
    line-height: 1.5;
    position: relative;
    word-wrap: break-word;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.message-row.incoming .message-bubble {
    background-color: var(--bubble-incoming);
    color: var(--text-primary);
    border-top-left-radius: 4px;
    border: 1px solid var(--bubble-incoming-border);
}

.message-row.outgoing .message-bubble {
    background-color: var(--bubble-outgoing);
    color: #ffffff;
    border-top-right-radius: 4px;
}

.message-meta-info {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
    font-size: var(--font-time);
    margin-top: 2px;
}

.message-row.incoming .message-meta-info { color: var(--text-secondary); }
.message-row.outgoing .message-meta-info { color: rgba(255, 255, 255, 0.7); }

.original-text-link {
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    text-decoration: underline;
    background: none;
    border: none;
    text-align: left;
    outline: none;
}

.message-row.incoming .original-text-link { color: var(--accent-color); }
.message-row.outgoing .original-text-link { color: #ffffff; }

.original-collapsible-box {
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    font-size: 13px;
    font-style: italic;
    opacity: 0.85;
}

/* ========================================================
   BOTTOM CHAT FOOTER & REVOLUTIONARY SWIPE-TO-SEND ROCKET
   ======================================================== */
.chat-footer {
    height: var(--input-height-desktop);
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    /* Transparent background with beautiful backdrop blur (prevent eye strain, very modern) */
    background: rgba(15, 17, 21, 0.65) !important;
    backdrop-filter: blur(20px) !important;
    -webkit-backdrop-filter: blur(20px) !important;
    border-top: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 16px;
    flex-shrink: 0;
    z-index: 15;
}

.input-row {
    width: 100%;
    max-width: 800px;
    display: flex;
    align-items: center;
    gap: 12px;
}

/* Identity Bubble Button */
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

/* Unified Input area covering text field + swipe channel */
.footer-input-container {
    flex-grow: 1;
    display: flex;
    align-items: center;
    background-color: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: var(--input-radius); /* Strict 28px radius */
    padding: 4px 6px 4px 18px; /* Padding for neat look */
    gap: 8px;
}

.message-input {
    flex-grow: 1;
    height: 40px;
    background: none;
    border: none;
    color: var(--text-primary);
    font-size: var(--font-input);
    outline: none;
}

/* 🚀 Swipe-to-Send Channel Area */
.swipe-send-channel {
    position: relative;
    width: 130px;
    height: 42px;
    background-color: rgba(0, 0, 0, 0.3);
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
   FULL SCREEN BLAZING FIRE SCREEN FLASH OVERLAY (0.3s)
   ======================================================== */
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

/* Climbing Fire Flames at bottom */
.climbing-flames-canvas {
    width: 100%;
    height: 180px;
    opacity: 0.9;
}

/* ========================================================
   LANGUAGE SELECTOR MODAL (Insta/Telegram Styled Popup)
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
    background-color: #15181F;
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    width: 100%;
    max-width: 400px;
    max-height: 75vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 40px rgba(0,0,0,0.4);
    transform: scale(0.95);
    transition: transform var(--transition-speed) cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-overlay.active .modal-card {
    transform: scale(1);
}

.modal-header {
    padding: 16px;
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
    padding: 12px 16px;
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
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
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

/* ========================================================
   RESPONSIVE LAYOUTS
   ======================================================== */
@media (max-width: 767px) {
    :root {
        --header-height-mobile: 56px;
        --input-height-mobile: 72px;
        --font-chat: var(--font-chat-mobile);
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
}
`;
const JS_CONTENT = `/**
 * ========================================================
 * BhashaSetu — Immersive Gamified Chat Application
 * Production-ready Vanilla JS ES6 with Swipe-to-Send & Fire
 * ========================================================
 */

// Application State
let selectedLanguage = localStorage.getItem("selectedLanguageCode") || "en";
let selectedLanguageName = localStorage.getItem("selectedLanguageName") || "English";
let languages = [];
let messagesData = [];
let refreshTimer = null;
let timeLeft = 5;

// Client-Side Cache for 0ms transitions (SWR Pattern)
const clientTranslationCache = {};

// Popular language codes for sidebar selection
const popularCodes = ["hi", "es", "en", "fr", "ar", "de", "ru", "pt", "ja", "zh-CN"];

// DOM Elements
const openModalBtn = document.getElementById("open-lang-modal-btn");
const closeModalBtn = document.getElementById("close-lang-modal-btn");
const langModal = document.getElementById("lang-modal");
const langSearchInput = document.getElementById("lang-search-input");
const aiSuggestionBox = document.getElementById("ai-suggestion-box");
const aiSuggestionList = document.getElementById("ai-suggestion-list");
const popularLangsGrid = document.getElementById("popular-languages-grid");
const allLangsGrid = document.getElementById("all-languages-grid");
const currentLangText = document.getElementById("current-lang-text");

const messageForm = document.getElementById("message-form");
const postAvatar = document.getElementById("post-avatar");
const postSender = document.getElementById("post-sender");
const avatarPreview = document.getElementById("avatar-preview");
const senderDisplay = document.getElementById("sender-display");
const postText = document.getElementById("post-text");
const shuffleIdentityBtn = document.getElementById("shuffle-identity-btn");

const messagesContainer = document.getElementById("messages-container");
const secondsLeftSpan = document.getElementById("seconds-left");
const manualRefreshBtn = document.getElementById("manual-refresh-btn");

// Drag Elements for Rocket
const swipeChannel = document.getElementById("swipe-channel");
const swipeRocket = document.getElementById("swipe-rocket");
const fireTrail = document.getElementById("fire-trail");
const swipeGuide = document.getElementById("swipe-guide");

// Full Screen Fire Elements
const fireOverlay = document.getElementById("fire-overlay");
const flamesCanvas = document.getElementById("flames-canvas");
const canvasCtx = flamesCanvas.getContext("2d");

// ========================================================
// 👤 PERSISTENT UNIQUE USER NUMBER TAGS (STRICTLY NON-REPEATING)
// ========================================================
let currentAvatar = localStorage.getItem("chatSenderAvatar") || "🦁";
let userNumberTag = sessionStorage.getItem("user_tag");

// If they don't have a unique tag inside this session, generate one!
if (!userNumberTag) {
    // Generate a highly unique 5-digit number tag (e.g. #48291)
    const uniqueNum = Math.floor(Math.random() * 90000) + 10000;
    userNumberTag = \`#\${uniqueNum}\`;
    sessionStorage.setItem("user_tag", userNumberTag);
}

// Randomize Avatar but strictly keep the persistent User Number Tag
const avatarsList = ["🦁", "🐯", "🐼", "🦊", "🐸", "🐨", "🐵", "🦄", "🐙", "🦕", "🦥", "🦉", "🦚", "🐬"];
function setIdentity(avatar) {
    currentAvatar = avatar;
    localStorage.setItem("chatSenderAvatar", avatar);
    
    postAvatar.value = avatar;
    // Strictly set their sender nickname to 'User #XXXXX'
    const fullSenderName = \`User \${userNumberTag}\`;
    postSender.value = \`\${avatar} \${fullSenderName}\`;
    
    avatarPreview.textContent = avatar;
    senderDisplay.textContent = fullSenderName;
}

// Initialize Identity with the persistent unique tag
setIdentity(currentAvatar);

// ========================================================
// 🔊 REAL-TIME AUDIO SYNTHESIZER (WEB AUDIO API - 100% OFFLINE)
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
    } catch (err) {
        console.error("Audio synthesis error:", err);
    }
}

function playFireRoarSound() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const bufferSize = ctx.sampleRate * 0.3; // 0.3s duration buffer
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
    flamesCanvas.width = window.innerWidth;
    flamesCanvas.height = 180;
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
    canvasCtx.clearRect(0, 0, flamesCanvas.width, flamesCanvas.height);
    for (let i = 0; i < 15; i++) {
        flameParticles.push(new FlameParticle(flamesCanvas.width));
    }
    
    flameParticles.forEach((p, idx) => {
        p.update();
        p.draw(canvasCtx);
        if (p.life <= 0 || p.radius <= 0) {
            flameParticles.splice(idx, 1);
        }
    });
    
    flameAnimationId = requestAnimationFrame(animateFlames);
}

function triggerFireScreenOverlay() {
    flameParticles = [];
    fireOverlay.classList.add("active");
    animateFlames();
    playFireRoarSound();
    
    setTimeout(() => {
        fireOverlay.classList.remove("active");
        cancelAnimationFrame(flameAnimationId);
        canvasCtx.clearRect(0, 0, flamesCanvas.width, flamesCanvas.height);
    }, 300);
}

// ========================================================
// 🚀 SWIPE-TO-SEND DRAGGABLE ROCKET LOGIC
// ========================================================
let isDragging = false;
let startX = 0;
let dragOffset = 0;
let swipeStartTime = 0;
const maxOffset = 88; // Slide limit inside channel

function checkSwipeGuide() {
    const hasSwiped = localStorage.getItem("hasSwipedBefore") === "true";
    if (!hasSwiped && postText.value.trim().length > 0) {
        swipeGuide.classList.add("visible");
    } else {
        swipeGuide.classList.remove("visible");
    }
}

postText.addEventListener("input", checkSwipeGuide);

// Drag Handlers
function startDrag(e) {
    if (e.target.closest('#message-form') || e.target === postText) return;
    isDragging = true;
    startX = e.clientX || (e.touches && e.touches[0].clientX);
    swipeStartTime = Date.now();
    fireTrail.classList.add("active");
    swipeRocket.style.transition = "none";
    swipeGuide.classList.remove("visible");
}

function handleDrag(e) {
    if (!isDragging) return;
    const currentX = e.clientX || (e.touches && e.touches[0].clientX);
    dragOffset = currentX - startX;
    
    if (dragOffset < 0) dragOffset = 0;
    if (dragOffset > maxOffset) dragOffset = maxOffset;
    
    swipeRocket.style.transform = \`translateX(\${dragOffset}px)\`;
}

async function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    fireTrail.classList.remove("active");
    
    const swipeEndTime = Date.now();
    const swipeDuration = swipeEndTime - swipeStartTime;
    
    if (dragOffset >= 80) {
        const text = postText.value.trim();
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
    swipeRocket.style.transition = "transform 250ms cubic-bezier(0.175, 0.885, 0.32, 1.25)";
    swipeRocket.style.transform = "translateX(0px)";
    dragOffset = 0;
    checkSwipeGuide();
}

// Bind Touch/Mouse Drag events
swipeRocket.addEventListener("mousedown", startDrag);
window.addEventListener("mousemove", handleDrag);
window.addEventListener("mouseup", endDrag);

swipeRocket.addEventListener("touchstart", startDrag, { passive: true });
window.addEventListener("touchmove", handleDrag, { passive: false });
window.addEventListener("touchend", endDrag);

// ========================================================
// ⌨️ ENTER KEY PRESS SUBMIT FLOW (WITH AUTO-SLIDE ANIMATION)
// ========================================================
postText.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        const text = postText.value.trim();
        if (!text) return;

        // Mark tutorial done
        localStorage.setItem("hasSwipedBefore", "true");
        swipeGuide.classList.remove("visible");

        // 1. Trigger Auto-Slide animation on Rocket (Rockets slides by itself!)
        swipeRocket.style.transition = "transform 180ms ease-in";
        swipeRocket.style.transform = \`translateX(\${maxOffset}px)\`;
        fireTrail.classList.add("active");

        // 2. Play synthesized launcher sound and full screen fire screen overlay!
        playRocketLaunchSound(true); // Treat Enter as high-speed instant launch
        triggerFireScreenOverlay();

        // 3. Clear text immediately and send message
        postText.value = "";
        await sendChatMessage(text);

        // 4. Snaps the rocket smoothly back after flight
        setTimeout(() => {
            fireTrail.classList.remove("active");
            snapRocketBack();
        }, 300);
    }
});

// ========================================================
// 📩 CHAT MESSAGES DISPATCH (OPTIMISTIC UI UPDATE)
// ========================================================
async function sendChatMessage(text) {
    const tempMsgId = \`temp_\${Date.now()}\`;
    const optimisticMsg = {
        id: tempMsgId,
        sender: \`\${currentAvatar} User \${userNumberTag}\`,
        avatar: currentAvatar,
        text: text,
        original_text: text,
        original_lang: selectedLanguage,
        original_lang_name: selectedLanguageName,
        translated_text: text,
        timestamp: "sending...",
        isPending: true
    };
    
    messagesData.push(optimisticMsg);
    renderMessages();
    scrollToBottom();
    
    try {
        const response = await fetch("/api/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sender: \`\${currentAvatar} User \${userNumberTag}\`, avatar: currentAvatar, text })
        });
        
        if (response.ok) {
            const serverMsg = await response.json();
            const index = messagesData.findIndex(m => m.id === tempMsgId);
            if (index !== -1) {
                messagesData[index] = {
                    id: serverMsg.id,
                    sender: serverMsg.sender,
                    avatar: serverMsg.avatar,
                    original_text: serverMsg.text,
                    original_lang: serverMsg.original_lang,
                    original_lang_name: serverMsg.original_lang_name,
                    translated_text: serverMsg.text,
                    timestamp: serverMsg.timestamp
                };
            }
            clientTranslationCache[selectedLanguage] = messagesData;
            renderMessages();
        } else {
            messagesData = messagesData.filter(m => m.id !== tempMsgId);
            renderMessages();
            alert("Message Delivery Failed");
        }
    } catch (err) {
        console.error(err);
        messagesData = messagesData.filter(m => m.id !== tempMsgId);
        renderMessages();
    }
}

// ========================================================
// 🔄 STALE-WHILE-REVALIDATE REFRESH LOOPS
// ========================================================
async function fetchMessages(forceScroll = false) {
    if (clientTranslationCache[selectedLanguage]) {
        messagesData = clientTranslationCache[selectedLanguage];
        renderMessages();
        if (forceScroll) scrollToBottom();
    }

    try {
        openModalBtn.classList.add("animate-pulse");

        const res = await fetch(\`/api/messages?lang=\${selectedLanguage}\`);
        const data = await res.json();
        
        openModalBtn.classList.remove("animate-pulse");

        const isNewMessageAdded = data.messages.length !== messagesData.length;
        messagesData = data.messages;
        
        clientTranslationCache[selectedLanguage] = messagesData;
        renderMessages();
        
        if (isNewMessageAdded || forceScroll) {
            scrollToBottom();
        }
    } catch (err) {
        console.error("Sync error:", err);
        openModalBtn.classList.remove("animate-pulse");
    }
}

function startAutoRefreshTimer() {
    if (refreshTimer) clearInterval(refreshTimer);
    timeLeft = 5;
    secondsLeftSpan.textContent = timeLeft;
    
    refreshTimer = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
            timeLeft = 5;
            fetchMessages();
        }
        secondsLeftSpan.textContent = timeLeft;
    }, 1000);
}

manualRefreshBtn.addEventListener("click", () => {
    fetchMessages(true);
    startAutoRefreshTimer();
    const icon = manualRefreshBtn.querySelector("i");
    icon.classList.add("fa-spin");
    setTimeout(() => icon.classList.remove("fa-spin"), 500);
});

// ========================================================
// 🌍 LANGUAGE SELECT MODAL LOGIC
// ========================================================
async function fetchLanguages() {
    try {
        const res = await fetch("/api/languages");
        const data = await res.json();
        languages = data.languages;
        renderLanguages();
    } catch (err) {
        console.error("Failed to load languages list:", err);
    }
}

function renderLanguages(filter = "") {
    const cleanFilter = filter.toLowerCase().trim();
    popularLangsGrid.innerHTML = "";
    allLangsGrid.innerHTML = "";
    let matchCount = 0;

    languages.forEach(lang => {
        const name = lang.name;
        const code = lang.code;
        const isSelected = selectedLanguage === code;
        
        const matches = name.toLowerCase().includes(cleanFilter) || code.toLowerCase().includes(cleanFilter);
        const btnClass = isSelected ? "lang-btn active" : "lang-btn";

        if (popularCodes.includes(code) && !cleanFilter) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = btnClass;
            btn.innerHTML = \`<span>\${name}</span><span class="lang-code">\${code}</span>\`;
            btn.onclick = () => selectLanguage(code, name);
            popularLangsGrid.appendChild(btn);
        }

        if (matches) {
            matchCount++;
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = btnClass;
            btn.innerHTML = \`<span>\${name}</span><span class="lang-code">\${code}</span>\`;
            btn.onclick = () => selectLanguage(code, name);
            allLangsGrid.appendChild(btn);
        }
    });

    const popHeading = popularLangsGrid.parentElement;
    if (cleanFilter) {
        popHeading.classList.add("hidden");
        document.getElementById("all-langs-header").textContent = \`Search Results (\${matchCount})\`;
    } else {
        popHeading.classList.remove("hidden");
        document.getElementById("all-langs-header").textContent = "All Languages";
    }
}

async function runAISuggestion(q) {
    if (!q || q.trim().length < 2) {
        aiSuggestionBox.classList.add("hidden");
        return;
    }
    try {
        const res = await fetch(\`/api/suggest-language?q=\${encodeURIComponent(q)}\`);
        const data = await res.json();
        
        if (data.suggestions && data.suggestions.length > 0) {
            aiSuggestionBox.classList.remove("hidden");
            aiSuggestionList.innerHTML = "";
            
            data.suggestions.forEach(s => {
                const chip = document.createElement("button");
                chip.type = "button";
                chip.className = "ai-chip";
                chip.innerHTML = \`\${s.name} <span class="text-[8px] opacity-60 font-mono">\${s.code}</span>\`;
                chip.onclick = () => selectLanguage(s.code, s.name);
                aiSuggestionList.appendChild(chip);
            });
        } else {
            aiSuggestionBox.classList.add("hidden");
        }
    } catch (err) {
        console.error("AI Suggestion error:", err);
    }
}

langSearchInput.addEventListener("input", (e) => {
    const q = e.target.value;
    renderLanguages(q);
    runAISuggestion(q);
});

function selectLanguage(code, name) {
    selectedLanguage = code;
    selectedLanguageName = name;
    localStorage.setItem("selectedLanguageCode", code);
    localStorage.setItem("selectedLanguageName", name);
    
    currentLangText.textContent = name;
    fetchMessages(true);
    closeLanguageModal();
}

function openLanguageModal() {
    langModal.classList.add("active");
    langSearchInput.value = "";
    renderLanguages("");
    aiSuggestionBox.classList.add("hidden");
    langSearchInput.focus();
}

function closeLanguageModal() {
    langModal.classList.remove("active");
}

openModalBtn.addEventListener("click", openLanguageModal);
closeLangModalBtn.addEventListener("click", closeLanguageModal);

window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && langModal.classList.contains("active")) closeLanguageModal();
});
langModal.addEventListener("click", (e) => {
    if (e.target === langModal) closeLanguageModal();
});

// ========================================================
// 📦 GENERAL LAYOUT INITIALIZATION
// ========================================================
function scrollToBottom() {
    setTimeout(() => {
        messagesContainer.scrollTo({
            top: messagesContainer.scrollHeight,
            behavior: 'smooth'
        });
    }, 50);
}

// Render clean premium chat bubbles with enlarged text
function renderMessages() {
    if (messagesData.length === 0) {
        messagesContainer.innerHTML = \`
            <div class="h-full flex flex-col items-center justify-center text-center text-xs text-neutral-400 p-6">
                <i class="fa-regular fa-comment-dots text-3xl text-neutral-600 mb-2"></i>
                <h4 class="font-bold text-neutral-300 text-sm">No Messages yet</h4>
                <p class="max-w-xs mt-1 text-neutral-500">Be the first to join the chat and write a message in any language!</p>
            </div>
        \`;
        return;
    }

    messagesContainer.innerHTML = "";
    
    const wrapper = document.createElement("div");
    wrapper.className = "chat-messages-inner";

    messagesData.forEach(msg => {
        const isMe = msg.sender.includes(\`User \${userNumberTag}\`);
        const isOriginal = msg.original_lang === selectedLanguage;
        
        const row = document.createElement("div");
        row.className = \`message-row \${isMe ? 'outgoing' : 'incoming'}\`;

        const bubbleStyle = isMe
            ? "bg-gradient-to-tr from-[#0084ff] to-[#1877f2] text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-[15px] font-medium leading-relaxed border border-blue-600/30 shadow-sm"
            : "bg-white text-neutral-800 rounded-2xl rounded-tl-sm px-4 py-2.5 text-[15px] font-medium border border-neutral-300 shadow-sm leading-relaxed";

        let metaString = isOriginal ? \`Original: \${msg.original_lang_name}\` : \`Translated from \${msg.original_lang_name}\`;
        const toggleBtnHtml = !isOriginal
            ? \`<button onclick="toggleOriginal('\${msg.id}')" id="btn-orig-\${msg.id}" class="original-text-link">Show Original</button>\`
            : '';

        const statusHtml = msg.isPending 
            ? \`<span class="animate-pulse"><i class="fa-regular fa-clock"></i> sending...</span>\`
            : \`<span>\${msg.timestamp.split(" ")[1] ? msg.timestamp.split(" ")[1].substring(0, 5) : msg.timestamp}</span>\`;

        row.innerHTML = \`
            \${!isMe ? \`<span class="message-sender">\${msg.sender}</span>\` : ''}
            <div class="message-bubble">
                <div>\${msg.translated_text}</div>
                
                <div class="message-meta-info">
                    \${statusHtml}
                    <span>•</span>
                    <span>\${metaString}</span>
                    \${toggleBtnHtml ? \`<span>•</span> \${toggleBtnHtml}\` : ''}
                </div>
                
                \${!isOriginal ? \`
                    <div id="box-orig-\${msg.id}" class="original-collapsible-box hidden">
                        Original: "\${msg.original_text}"
                    </div>
                \` : ''}
            </div>
        \`;
        wrapper.appendChild(row);
    });

    messagesContainer.appendChild(wrapper);
}

window.toggleOriginal = function(msgId) {
    const box = document.getElementById(\`box-orig-\${msgId}\`);
    const btn = document.getElementById(\`btn-orig-\${msgId}\`);
    if (box.classList.contains("hidden")) {
        box.classList.remove("hidden");
        btn.textContent = "Hide Original";
        scrollToBottom();
    } else {
        box.classList.add("hidden");
        btn.textContent = "Show Original";
    }
};

// ========================================================
// 🚀 BOOTSTRAP LOGIC
// ========================================================
(async function init() {
    currentLangText.textContent = selectedLanguageName;
    
    await fetchLanguages();
    await fetchMessages(true); // Initial load scroll to bottom
    startAutoRefreshTimer();
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
