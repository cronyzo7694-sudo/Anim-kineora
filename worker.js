// Cloudflare Worker for BhashaSetu — 100% Serverless Universal DM Room
// Paste this code directly into your Cloudflare Worker index.js / index.ts!

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
    "text": "¡Hola a todos! Esta es una aplicación increíble. ¡La traducción en tiempo real es extremadamente rápida y no cambia el significado original!",
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

  // 2. GET API: Fetch supported languages
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

  // 3. GET API: AI Search and Language Suggestion
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

  // 4. GET API: Retrieve all messages (Translating in real-time)
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

      // Live keyless translation
      let translatedText = msg.text;
      try {
        const transUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(msg.text)}`;
        const transRes = await fetch(transUrl);
        const transJson = await transRes.json();
        translatedText = transJson[0][0][0];
        
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

  // 5. POST API: Send a new message (Auto-detects language)
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

// Embedded Static HTML (Fully customized, premium Sepia eye-care gradient UI)
const HTML_CONTENT = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BhashaSetu — Global Chat Room</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Google Fonts for elite typography -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <!-- FontAwesome for neat icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
        body {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
            /* Premium, eye-pleasing, warm sepia paper background gradient (No raw white, never dark) */
            background: linear-gradient(135deg, #fdfaf5 0%, #f6edd9 100%);
            color: #1a1a1a;
            -webkit-font-smoothing: antialiased;
            overflow: hidden;
        }
        /* Custom scrollbar for chat stream */
        .chat-scroll::-webkit-scrollbar {
            width: 4px;
        }
        .chat-scroll::-webkit-scrollbar-track {
            background: transparent;
        }
        .chat-scroll::-webkit-scrollbar-thumb {
            background: #d4cfc5;
            border-radius: 10px;
        }
        .chat-scroll::-webkit-scrollbar-thumb:hover {
            background: #b8b3aa;
        }
    </style>
</head>
<body class="h-screen flex flex-col">

    <!-- Super Thin & Minimal Top Navigation (0% Wasted Space) -->
    <header class="h-12 bg-[#faf6ee]/90 backdrop-blur-md border-b border-neutral-300/40 flex items-center justify-between px-4 shrink-0 z-40">
        <!-- Minimal Title -->
        <div class="flex items-center gap-1.5">
            <span class="font-extrabold text-xs tracking-tight bg-gradient-to-r from-neutral-900 to-neutral-600 bg-clip-text text-transparent">BhashaSetu 🌐</span>
        </div>

        <!-- Compact Actions -->
        <div class="flex items-center gap-2">
            <!-- Dynamic Sync indicator -->
            <span class="text-[9px] text-neutral-500 font-semibold font-mono hidden sm:inline" id="countdown-indicator">
                Syncing in <span id="seconds-left">5</span>s
            </span>
            <!-- Simple refresh -->
            <button id="manual-refresh-btn" class="text-neutral-400 hover:text-neutral-800 p-1.5 rounded transition-colors" title="Force Sync Feed">
                <i class="fa-solid fa-rotate-right text-[10px]"></i>
            </button>
            <!-- Minimal Language Button -->
            <button id="open-lang-modal-btn" class="bg-neutral-200/60 hover:bg-neutral-200 text-neutral-800 text-[10px] font-bold px-3 py-1 rounded-full transition-all flex items-center gap-1">
                <span id="current-lang-text">English (en)</span>
                <i class="fa-solid fa-chevron-down text-[7px] opacity-50"></i>
            </button>
        </div>
    </header>

    <!-- Main Chat Feed (Takes 100% Remaining Screen Space) -->
    <main class="flex-grow relative overflow-hidden flex justify-center w-full">
        
        <!-- Chat Thread (Single continuous column) -->
        <div id="messages-container" class="w-full max-w-2xl h-full overflow-y-auto chat-scroll px-4 pt-4 pb-28 space-y-4">
            <!-- Loaded bubbles inserted dynamically -->
            <div class="flex flex-col items-center justify-center h-full text-neutral-400 space-y-2">
                <i class="fa-solid fa-circle-notch animate-spin text-lg text-neutral-300"></i>
                <p class="text-[10px] font-medium tracking-wide">Syncing chat room...</p>
            </div>
        </div>

        <!-- Floating, Transparent, Glassmorphic Send Bar (Centered bottom dock) -->
        <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 w-[92%] sm:w-[75%] md:w-[55%] lg:w-[42%] max-w-md bg-[#faf6ee]/80 backdrop-blur-md border border-neutral-300/50 shadow-[0_8px_32px_rgba(139,124,103,0.12)] rounded-full px-2 py-1.5 flex items-center gap-2">
            
            <!-- Quick Identity Changer -->
            <button type="button" id="shuffle-identity-btn" class="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-200/50 hover:bg-neutral-200 border border-neutral-300/30 rounded-full transition-all shrink-0 shadow-xs" title="Tap to shuffle identity">
                <span id="avatar-preview" class="text-xs">🦁</span>
                <span id="sender-display" class="text-[10px] font-extrabold text-neutral-600 hidden sm:inline">Toofani Panda</span>
                <i class="fa-solid fa-dice text-[9px] text-neutral-400"></i>
            </button>
            
            <!-- Hidden inputs -->
            <input type="hidden" id="post-avatar" value="🦁">
            <input type="hidden" id="post-sender" value="🦁 Anonymous">

            <!-- Message Form Input -->
            <form id="message-form" class="flex-grow flex items-center gap-2">
                <input type="text" id="post-text" required autocomplete="off" 
                       class="w-full bg-transparent text-xs text-neutral-800 pl-1.5 pr-2 py-1.5 focus:outline-none placeholder:text-neutral-400 font-medium" 
                       placeholder="Type message in any language...">
                       
                <!-- Send circle button -->
                <button type="submit" id="submit-btn" 
                        class="w-8 h-8 rounded-full bg-gradient-to-tr from-[#0084ff] to-[#1877f2] hover:shadow-md hover:shadow-[#0084ff]/10 text-white flex items-center justify-center transition-all duration-150 active:scale-95 shrink-0 shadow-sm">
                    <i class="fa-solid fa-paper-plane text-[9px]"></i>
                </button>
            </form>
        </div>

    </main>

    <!-- Language Selector Popup Modal -->
    <div id="lang-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-xs hidden transition-all duration-200 opacity-0">
        <!-- Modal Card -->
        <div class="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[70vh] border border-neutral-200 transform scale-95 transition-transform duration-200">
            <!-- Header -->
            <div class="px-4 py-3 border-b border-neutral-100 flex items-center justify-between shrink-0">
                <div>
                    <h3 class="text-xs font-bold text-neutral-800">Select Chat Language</h3>
                </div>
                <button id="close-lang-modal-btn" class="text-[9px] text-neutral-500 hover:text-neutral-900 font-bold bg-neutral-100 hover:bg-neutral-200 px-2.5 py-1 rounded-full transition-all">
                    Dismiss
                </button>
            </div>

            <!-- Search Area with AI Suggestion -->
            <div class="p-3 border-b border-neutral-100 bg-[#f9fafb]">
                <div class="relative">
                    <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-[10px]"></i>
                    <input type="text" id="lang-search-input" class="w-full bg-white text-[11px] text-neutral-800 pl-8 pr-3 py-2 rounded-full border border-neutral-200 focus:border-neutral-300 focus:outline-none transition-all" placeholder="Search language or type greeting (e.g. 'Bonjour')...">
                </div>
                
                <!-- AI Smart suggestions box -->
                <div id="ai-suggestion-box" class="mt-2 hidden">
                    <div class="text-[8px] text-[#0084ff] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> AI Suggested:
                    </div>
                    <div id="ai-suggestion-list" class="flex flex-wrap gap-1">
                        <!-- Dynamic suggestions -->
                    </div>
                </div>
            </div>

            <!-- Languages List -->
            <div class="p-3 overflow-y-auto chat-scroll flex-grow space-y-3 bg-white">
                <!-- Popular -->
                <div>
                    <h4 class="text-[8px] text-neutral-400 uppercase tracking-wider font-bold mb-1.5">Popular</h4>
                    <div class="grid grid-cols-2 gap-1" id="popular-languages-grid">
                        <!-- Popular buttons inserted -->
                    </div>
                </div>

                <!-- All Languages -->
                <div>
                    <h4 class="text-[8px] text-neutral-400 uppercase tracking-wider font-bold mb-1.5" id="all-langs-header">All Languages</h4>
                    <div class="grid grid-cols-2 gap-1" id="all-languages-grid">
                        <!-- All languages buttons inserted -->
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- JavaScript Logic -->
    <script>
        // State
        let selectedLanguage = localStorage.getItem("selectedLanguageCode") || "en";
        let selectedLanguageName = localStorage.getItem("selectedLanguageName") || "English";
        let languages = [];
        let messagesData = [];
        let refreshTimer = null;
        let timeLeft = 5;

        // Custom Unique Chat User Identity lists
        const avatars = ["🦁", "🐯", "🐼", "🦊", "🐸", "🐨", "🐵", "🦄", "🐙", "🦕", "🦥", "🦉", "🦚", "🐬"];
        const adjectives = ["Toofani", "Desi", "Bindass", "Jugaadi", "Sanskari", "Mast", "Dhakad", "Chalaak", "Shanti", "Gabru", "Naughty", "Shana", "Smart", "Cool"];
        const animals = ["Lion", "Panda", "Fox", "Frog", "Koala", "Monkey", "Unicorn", "Octopus", "Dinosaur", "Sloth", "Owl", "Peacock", "Dolphin"];
        const popularCodes = ["hi", "es", "en", "fr", "ar", "de", "ru", "pt", "ja", "zh-CN"];

        // DOM elements
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

        // Set or load persistent user identity
        let currentSender = localStorage.getItem("chatSenderName");
        let currentAvatar = localStorage.getItem("chatSenderAvatar") || "🦁";

        function setIdentity(avatar, name) {
            currentAvatar = avatar;
            currentSender = name;
            localStorage.setItem("chatSenderAvatar", avatar);
            localStorage.setItem("chatSenderName", name);
            
            postAvatar.value = avatar;
            postSender.value = \`\${avatar} \${name}\`;
            avatarPreview.textContent = avatar;
            senderDisplay.textContent = name;
        }

        function shuffleIdentity() {
            const avatar = avatars[Math.floor(Math.random() * avatars.length)];
            const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
            const animal = animals[Math.floor(Math.random() * animals.length)];
            const name = \`\${adj} \${animal}\`;
            setIdentity(avatar, name);
        }

        if (!currentSender) {
            shuffleIdentity();
        } else {
            setIdentity(currentAvatar, currentSender);
        }

        shuffleIdentityBtn.addEventListener("click", () => {
            shuffleIdentity();
            shuffleIdentityBtn.classList.add("scale-95");
            setTimeout(() => shuffleIdentityBtn.classList.remove("scale-95"), 100);
        });

        // Fetch languages list
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

        function selectLanguage(code, name) {
            selectedLanguage = code;
            selectedLanguageName = name;
            localStorage.setItem("selectedLanguageCode", code);
            localStorage.setItem("selectedLanguageName", name);
            
            currentLangText.textContent = name;
            fetchMessages(true);
            closeLanguageModal();
        }

        // Render lists inside modal
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
                
                const btnStyle = isSelected
                    ? "bg-neutral-900 text-white font-bold text-left text-[10px] px-3 py-1.5 rounded-full border border-neutral-900 flex justify-between"
                    : "bg-[#f3f4f6] hover:bg-neutral-200/80 text-neutral-700 font-semibold text-left text-[10px] px-3 py-1.5 rounded-full border border-transparent transition-all flex justify-between";

                if (popularCodes.includes(code) && !cleanFilter) {
                    const btn = document.createElement("button");
                    btn.type = "button";
                    btn.className = btnStyle;
                    btn.innerHTML = \`<span>\${name}</span><span class="opacity-50 font-mono text-[8px]">\${code}</span>\`;
                    btn.onclick = () => selectLanguage(code, name);
                    popularLangsGrid.appendChild(btn);
                }

                if (matches) {
                    matchCount++;
                    const btn = document.createElement("button");
                    btn.type = "button";
                    btn.className = btnStyle;
                    btn.innerHTML = \`<span>\${name}</span><span class="opacity-50 font-mono text-[8px]">\${code}</span>\`;
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

        // AI language suggestions query
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
                        chip.className = "bg-[#0084ff]/10 hover:bg-[#0084ff] text-[#0084ff] hover:text-white border border-[#0084ff]/20 text-[9px] px-2.5 py-0.5 rounded-full transition-all active:scale-95 font-semibold flex items-center gap-1";
                        chip.innerHTML = \`<span>\${s.name}</span> <span class="opacity-60 text-[7px] uppercase">\${s.code}</span>\`;
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

        function openLanguageModal() {
            langModal.classList.remove("hidden");
            setTimeout(() => {
                langModal.classList.remove("opacity-0");
                langModal.classList.add("opacity-100");
                langModal.querySelector(".transform").classList.remove("scale-95");
                langModal.querySelector(".transform").classList.add("scale-100");
            }, 10);
            langSearchInput.value = "";
            renderLanguages("");
            aiSuggestionBox.classList.add("hidden");
            langSearchInput.focus();
        }

        function closeLanguageModal() {
            langModal.classList.add("opacity-0");
            langModal.classList.remove("opacity-100");
            langModal.querySelector(".transform").classList.remove("scale-100");
            langModal.querySelector(".transform").classList.add("scale-95");
            setTimeout(() => langModal.classList.add("hidden"), 200);
        }

        openModalBtn.addEventListener("click", openLanguageModal);
        closeModalBtn.addEventListener("click", closeLanguageModal);
        
        window.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && !langModal.classList.contains("hidden")) closeLanguageModal();
        });
        langModal.addEventListener("click", (e) => {
            if (e.target === langModal) closeLanguageModal();
        });

        // Load messages
        async function fetchMessages(forceScroll = false) {
            try {
                const res = await fetch(\`/api/messages?lang=\${selectedLanguage}\`);
                const data = await res.json();
                
                const isNewMessageAdded = data.messages.length !== messagesData.length;
                messagesData = data.messages;
                
                document.getElementById("open-lang-modal-btn").querySelector("span").textContent = data.current_language;
                renderMessages();
                
                if (isNewMessageAdded || forceScroll) {
                    scrollToBottom();
                }
            } catch (err) {
                console.error("Failed to load feed:", err);
                messagesContainer.innerHTML = \`
                    <div class="h-full flex items-center justify-center text-xs text-red-500">
                        Error syncing feed. Check backend server.
                    </div>
                \`;
            }
        }

        function scrollToBottom() {
            setTimeout(() => {
                messagesContainer.scrollTo({
                    top: messagesContainer.scrollHeight,
                    behavior: 'smooth'
                });
            }, 100);
        }

        // Render clean premium chat bubbles with enlarged text (WhatsApp / Instagram Direct Messages style)
        function renderMessages() {
            if (messagesData.length === 0) {
                messagesContainer.innerHTML = \`
                    <div class="h-full flex flex-col items-center justify-center text-center text-xs text-neutral-400 p-6">
                        <i class="fa-regular fa-comment-dots text-3xl text-neutral-200 mb-2"></i>
                        <h4 class="font-bold text-neutral-500 text-xs">No Messages yet</h4>
                        <p class="max-w-xs mt-1">Be the first to join the chat and write a message in any language!</p>
                    </div>
                \`;
                return;
            }

            messagesContainer.innerHTML = "";
            
            messagesData.forEach(msg => {
                const isMe = msg.sender.includes(currentSender);
                const isOriginal = msg.original_lang === selectedLanguage;
                
                const bubbleRow = document.createElement("div");
                bubbleRow.className = \`flex flex-col w-full \${isMe ? 'items-end' : 'items-start'} space-y-1\`;

                // CRITICAL FIXES (Enlarged Sender size, crisp borders, eye-pleasing white bubble colors)
                // Left Bubble: White, Crisp outline border border-neutral-300, shadow
                // Right Bubble: Blue gradient, Crisp outline border border-blue-600/30
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
                    ? \`<button onclick="toggleOriginal('\${msg.id}')" id="btn-orig-\${msg.id}" class="text-[9px] text-[#0084ff] hover:underline font-bold transition-all">Show Original</button>\`
                    : '';

                bubbleRow.innerHTML = \`
                    <!-- Sender Name (ENLARGED to text-xs, Font-ExtraBold, and highly defined) -->
                    \${!isMe ? \`<span class="text-xs font-extrabold text-neutral-600 ml-1 flex items-center gap-1">\${msg.sender}</span>\` : ''}
                    
                    <!-- Message Bubble Body -->
                    <div class="max-w-[80%] md:max-w-[70%] flex flex-col \${isMe ? 'items-end' : 'items-start'}">
                        <div class="\${bubbleStyle} break-words w-full">
                            \${msg.translated_text}
                        </div>
                        
                        <!-- Mini Bubble Footer -->
                        <div class="flex items-center gap-1.5 mt-1 px-1 text-[9px] text-neutral-500 font-medium">
                            <span>\s\${msg.timestamp.split(" ")[1].substring(0, 5)}</span>
                            <span>•</span>
                            <span>\${metaString}</span>
                            \${toggleBtnHtml ? \`<span>•</span> \${toggleBtnHtml}\` : ''}
                        </div>

                        <!-- Expandable Original box -->
                        \${!isOriginal ? \`
                            <div id="box-orig-\${msg.id}" class="hidden mt-1.5 border-l-2 border-neutral-300 pl-2.5 py-0.5 text-[10px] text-neutral-500 italic">
                                Original: "\${msg.original_text}"
                            </div>
                        \` : ''}
                    </div>
                \`;
                
                messagesContainer.appendChild(bubbleRow);
            });
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

        // Post trigger
        messageForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const sender = postSender.value;
            const avatar = postAvatar.value;
            const text = postText.value.trim();
            
            if (!text) return;
            
            const submitBtn = document.getElementById("submit-btn");
            submitBtn.disabled = true;
            submitBtn.innerHTML = \`<i class="fa-solid fa-spinner animate-spin text-[9px]"></i>\`;
            
            try {
                const response = await fetch("/api/messages", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sender, avatar, text })
                });
                
                if (response.ok) {
                    postText.value = "";
                    await fetchMessages(true);
                } else {
                    const err = await response.json();
                    alert("Delivery failed: " + (err.detail || "Server error"));
                }
            } catch (err) {
                console.error("Deliver error:", err);
                alert("Deliver error. Ensure connection.");
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = \`<i class="fa-solid fa-paper-plane text-[9px]"></i>\`;
            }
        });

        // Countdown timer clock
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
            fetchMessages();
            startAutoRefreshTimer();
            const icon = manualRefreshBtn.querySelector("i");
            icon.classList.add("fa-spin");
            setTimeout(() => icon.classList.remove("fa-spin"), 500);
        });

        // App Bootstrapping
        (async function init() {
            currentLangText.textContent = selectedLanguageName;
            
            await fetchLanguages();
            await fetchMessages(true); // Initial load scroll to bottom
            startAutoRefreshTimer();
        })();
    </script>
</body>
</html>
`;
