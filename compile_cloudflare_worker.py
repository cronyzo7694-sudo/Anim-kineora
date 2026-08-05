import os

def escape_content(text):
    # Escape backslashes, backticks, and interpolation signs for JavaScript template literals
    return text.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")

# 1. Read static assets
with open("static/index.html", "r", encoding="utf-8") as f:
    html_text = f.read()

with open("static/style.css", "r", encoding="utf-8") as f:
    css_text = f.read()

with open("static/app.js", "r", encoding="utf-8") as f:
    js_text = f.read()

with open("static/chat-pattern.svg", "r", encoding="utf-8") as f:
    svg_text = f.read()

# 2. Escape assets
escaped_html = escape_content(html_text)
escaped_css = escape_content(css_text)
escaped_js = escape_content(js_text)
escaped_svg = escape_content(svg_text)

# 3. Create the template code (without f-string to avoid curly brace conflicts!)
worker_template = """// Cloudflare Worker for BhashaSetu — 100% Serverless Universal DM Room
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
const HTML_CONTENT = `__HTML_CONTENT__`;
const STYLE_CONTENT = `__STYLE_CONTENT__`;
const JS_CONTENT = `__JS_CONTENT__`;
const SVG_CONTENT = `__SVG_CONTENT__`;
"""

# 4. Inject escaped variables
assembled_worker = worker_template.replace("__HTML_CONTENT__", escaped_html)\
                                   .replace("__STYLE_CONTENT__", escaped_css)\
                                   .replace("__JS_CONTENT__", escaped_js)\
                                   .replace("__SVG_CONTENT__", escaped_svg)

# 5. Write out
with open("worker.js", "w", encoding="utf-8") as f:
    f.write(assembled_worker)

print("SUCCESS: Cloudflare Worker compiled and packed into worker.js without curly-brace conflicts!")
