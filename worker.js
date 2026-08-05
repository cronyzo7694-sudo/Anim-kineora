/**
 * Batiyan Cloudflare Worker v3.5
 * Fixes broken live core: working languages API, working POST messages,
 * real WebSocket `/ws`, ACK flow, Durable Object room storage and translation fallback.
 */

const LANGUAGES = [{"code": "af", "name": "Afrikaans"}, {"code": "sq", "name": "Albanian"}, {"code": "am", "name": "Amharic"}, {"code": "ar", "name": "Arabic"}, {"code": "hy", "name": "Armenian"}, {"code": "as", "name": "Assamese"}, {"code": "az", "name": "Azerbaijani"}, {"code": "eu", "name": "Basque"}, {"code": "be", "name": "Belarusian"}, {"code": "bn", "name": "Bengali"}, {"code": "bs", "name": "Bosnian"}, {"code": "bg", "name": "Bulgarian"}, {"code": "ca", "name": "Catalan"}, {"code": "ceb", "name": "Cebuano"}, {"code": "zh-CN", "name": "Chinese (simplified)"}, {"code": "zh-TW", "name": "Chinese (traditional)"}, {"code": "hr", "name": "Croatian"}, {"code": "cs", "name": "Czech"}, {"code": "da", "name": "Danish"}, {"code": "nl", "name": "Dutch"}, {"code": "en", "name": "English"}, {"code": "eo", "name": "Esperanto"}, {"code": "et", "name": "Estonian"}, {"code": "fi", "name": "Finnish"}, {"code": "fr", "name": "French"}, {"code": "gl", "name": "Galician"}, {"code": "ka", "name": "Georgian"}, {"code": "de", "name": "German"}, {"code": "el", "name": "Greek"}, {"code": "gu", "name": "Gujarati"}, {"code": "ht", "name": "Haitian creole"}, {"code": "ha", "name": "Hausa"}, {"code": "haw", "name": "Hawaiian"}, {"code": "he", "name": "Hebrew"}, {"code": "hi", "name": "Hindi"}, {"code": "hmn", "name": "Hmong"}, {"code": "hu", "name": "Hungarian"}, {"code": "is", "name": "Icelandic"}, {"code": "ig", "name": "Igbo"}, {"code": "id", "name": "Indonesian"}, {"code": "ga", "name": "Irish"}, {"code": "it", "name": "Italian"}, {"code": "ja", "name": "Japanese"}, {"code": "jw", "name": "Javanese"}, {"code": "kn", "name": "Kannada"}, {"code": "kk", "name": "Kazakh"}, {"code": "km", "name": "Khmer"}, {"code": "ko", "name": "Korean"}, {"code": "ku", "name": "Kurdish"}, {"code": "ky", "name": "Kyrgyz"}, {"code": "lo", "name": "Lao"}, {"code": "la", "name": "Latin"}, {"code": "lv", "name": "Latvian"}, {"code": "lt", "name": "Lithuanian"}, {"code": "lb", "name": "Luxembourgish"}, {"code": "mk", "name": "Macedonian"}, {"code": "mg", "name": "Malagasy"}, {"code": "ms", "name": "Malay"}, {"code": "ml", "name": "Malayalam"}, {"code": "mt", "name": "Maltese"}, {"code": "mi", "name": "Maori"}, {"code": "mr", "name": "Marathi"}, {"code": "mn", "name": "Mongolian"}, {"code": "my", "name": "Myanmar (burmese)"}, {"code": "ne", "name": "Nepali"}, {"code": "no", "name": "Norwegian"}, {"code": "ny", "name": "Nyanja (chichewa)"}, {"code": "or", "name": "Oriya"}, {"code": "ps", "name": "Pashto"}, {"code": "fa", "name": "Persian"}, {"code": "pl", "name": "Polish"}, {"code": "pt", "name": "Portuguese"}, {"code": "pa", "name": "Punjabi"}, {"code": "ro", "name": "Romanian"}, {"code": "ru", "name": "Russian"}, {"code": "sm", "name": "Samoan"}, {"code": "gd", "name": "Scots gaelic"}, {"code": "sr", "name": "Serbian"}, {"code": "st", "name": "Sesotho"}, {"code": "sn", "name": "Shona"}, {"code": "sd", "name": "Sindhi"}, {"code": "si", "name": "Sinhala (sinhalese)"}, {"code": "sk", "name": "Slovak"}, {"code": "sl", "name": "Slovenian"}, {"code": "so", "name": "Somali"}, {"code": "es", "name": "Spanish"}, {"code": "su", "name": "Sundanese"}, {"code": "sw", "name": "Swahili"}, {"code": "sv", "name": "Swedish"}, {"code": "tl", "name": "Tagalog (filipino)"}, {"code": "tg", "name": "Tajik"}, {"code": "ta", "name": "Tamil"}, {"code": "te", "name": "Telugu"}, {"code": "th", "name": "Thai"}, {"code": "tr", "name": "Turkish"}, {"code": "uk", "name": "Ukrainian"}, {"code": "ur", "name": "Urdu"}, {"code": "uz", "name": "Uzbek"}, {"code": "vi", "name": "Vietnamese"}, {"code": "cy", "name": "Welsh"}, {"code": "xh", "name": "Xhosa"}, {"code": "yi", "name": "Yiddish"}, {"code": "yo", "name": "Yoruba"}, {"code": "zu", "name": "Zulu"}];
const SEED_MESSAGES = [{"id": "msg_1", "clientMessageId": "msg_1", "sequenceNumber": 1, "sender": "Toofani Panda", "avatar": "🐼", "text": "नमस्ते दोस्तो! इस मंच पर आपका स्वागत है। आप यहाँ बिना किसी अकाउंट के अपनी भाषा में लिख सकते हैं और यह सबके लिए तुरंत अनुवादित हो जाएगा।", "original_text": "नमस्ते दोस्तो! इस मंच पर आपका स्वागत है। आप यहाँ बिना किसी अकाउंट के अपनी भाषा में लिख सकते हैं और यह सबके लिए तुरंत अनुवादित हो जाएगा।", "original_lang": "hi", "original_lang_name": "Hindi", "translated_text": "नमस्ते दोस्तो! इस मंच पर आपका स्वागत है। आप यहाँ बिना किसी अकाउंट के अपनी भाषा में लिख सकते हैं और यह सबके लिए तुरंत अनुवादित हो जाएगा।", "timestamp": "2026-08-05 15:35:10", "translations": {"hi": "नमस्ते दोस्तो! इस मंच पर आपका स्वागत है। आप यहाँ बिना किसी अकाउंट के अपनी भाषा में लिख सकते हैं और यह सबके लिए तुरंत अनुवादित हो जाएगा।"}}, {"id": "msg_2", "clientMessageId": "msg_2", "sequenceNumber": 2, "sender": "Shanti Fox", "avatar": "🦊", "text": "¡Hola a todos! Esta es una aplicación increíble. ¡La traducción en tiempo real es extremadamente rápida y no cambia el significado original!", "original_text": "¡Hola a todos! Esta es una aplicación increíble. ¡La traducción en tiempo real es extremadamente rápida y no cambia el significado original!", "original_lang": "es", "original_lang_name": "Spanish", "translated_text": "¡Hola a todos! Esta es una aplicación increíble. ¡La traducción en tiempo real es extremadamente rápida y no cambia el significado original!", "timestamp": "2026-08-05 15:36:20", "translations": {"es": "¡Hola a todos! Esta es una aplicación increíble. ¡La traducción en tiempo real es extremadamente rápida y no cambia el significado original!"}}, {"id": "msg_3", "clientMessageId": "msg_3", "sequenceNumber": 3, "sender": "Smart Dolphin", "avatar": "🐬", "text": "Bonjour du monde entier ! C'est magique de pouvoir communiquer sans aucune barrière linguistique. Essayez de choisir votre langue en haut !", "original_text": "Bonjour du monde entier ! C'est magique de pouvoir communiquer sans aucune barrière linguistique. Essayez de choisir votre langue en haut !", "original_lang": "fr", "original_lang_name": "French", "translated_text": "Bonjour du monde entier ! C'est magique de pouvoir communiquer sans aucune barrière linguistique. Essayez de choisir votre langue en haut !", "timestamp": "2026-08-05 15:37:45", "translations": {"fr": "Bonjour du monde entier ! C'est magique de pouvoir communiquer sans aucune barrière linguistique. Essayez de choisir votre langue en haut !"}}, {"id": "msg_4", "clientMessageId": "msg_4", "sequenceNumber": 4, "sender": "Jugaadi Dinosaur", "avatar": "🦕", "text": "こんにちは！世界中の人々とお互いの母国語でリアルタイムに話せるなんて、本当に素晴らしい技術ですね！", "original_text": "こんにちは！世界中の人々とお互いの母国語でリアルタイムに話せるなんて、本当に素晴らしい技術ですね！", "original_lang": "ja", "original_lang_name": "Japanese", "translated_text": "こんにちは！世界中の人々とお互いの母国語でリアルタイムに話せるなんて、本当に素晴らしい技術ですね！", "timestamp": "2026-08-05 15:39:00", "translations": {"ja": "こんにちは！世界中の人々とお互いの母国語でリアルタイムに話せるなんて、本当に素晴らしい技術ですね！"}}, {"id": "msg_1785944657818", "clientMessageId": "msg_1785944657818", "sequenceNumber": 5, "sender": "🦉 Dhakad Unicorn", "avatar": "🦉", "text": "hii", "original_text": "hii", "original_lang": "en", "original_lang_name": "English", "translated_text": "hii", "timestamp": "2026-08-05 15:44:17", "translations": {"en": "hii"}}, {"id": "msg_1785945707337", "clientMessageId": "msg_1785945707337", "sequenceNumber": 6, "sender": "🦉 Dhakad Unicorn", "avatar": "🦉", "text": "hii", "original_text": "hii", "original_lang": "en", "original_lang_name": "English", "translated_text": "hii", "timestamp": "2026-08-05 16:01:47", "translations": {"en": "hii"}}, {"id": "msg_1785945719553", "clientMessageId": "msg_1785945719553", "sequenceNumber": 7, "sender": "🦉 Dhakad Unicorn", "avatar": "🦉", "text": "kya bat he bhai", "original_text": "kya bat he bhai", "original_lang": "id", "original_lang_name": "Indonesian", "translated_text": "kya bat he bhai", "timestamp": "2026-08-05 16:01:59", "translations": {"id": "kya bat he bhai"}}];
const LANG_NAME = Object.fromEntries(LANGUAGES.map(l => [l.code, l.name]));
const ROOM_DEFAULT = "global";
const MAX_MESSAGES = 500;
const MAX_TEXT_LENGTH = 1200;
const RATE_LIMIT_COUNT = 10;
const RATE_LIMIT_WINDOW_MS = 10_000;

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type"
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { headers: JSON_HEADERS });

    if (url.pathname === "/health") {
      return Response.json({ ok: true, app: "Batiyan", version: "3.5", now: new Date().toISOString() }, { headers: JSON_HEADERS });
    }

    if (url.pathname === "/api/languages") {
      return Response.json({ languages: LANGUAGES }, { headers: JSON_HEADERS });
    }

    if (url.pathname === "/api/suggest-language") {
      const q = (url.searchParams.get("q") || "").trim().toLowerCase();
      return Response.json({ suggestions: suggestLanguages(q) }, { headers: JSON_HEADERS });
    }

    if (url.pathname === "/ws" || url.pathname === "/api/messages" || url.pathname === "/api/stats" || url.pathname === "/api/report") {
      const room = safeRoom(url.searchParams.get("room") || ROOM_DEFAULT);
      const id = env.CHAT_ROOM.idFromName(room);
      return env.CHAT_ROOM.get(id).fetch(request);
    }

    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response("BhashaSetu assets binding missing", { status: 500 });
  }
};

export class ChatRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Set();
    this.rateBuckets = new Map();
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/ws") return this.handleWebSocket(request, url);
    if (url.pathname === "/api/messages" && request.method === "GET") return this.getMessagesApi(url);
    if (url.pathname === "/api/messages" && request.method === "POST") return this.postMessageApi(request, url);
    if (url.pathname === "/api/stats" && request.method === "GET") return this.getStatsApi();
    if (url.pathname === "/api/stats" && request.method === "POST") return this.registerStatsVisit(request);
    if (url.pathname === "/api/report" && request.method === "POST") return this.reportMessageApi(request);
    return new Response("Not Found", { status: 404 });
  }

  async bootstrap() {
    if (await this.state.storage.get("bootstrapped")) return;
    const seeded = SEED_MESSAGES.map((m, i) => ({ ...m, sequenceNumber: m.sequenceNumber || i + 1 }));
    await this.state.storage.put("messages", seeded);
    await this.state.storage.put("sequence", seeded.length);
    for (const msg of seeded) await this.state.storage.put(`client:${msg.clientMessageId || msg.id}`, msg);
    await this.state.storage.put("bootstrapped", true);
  }

  async readMessages() {
    await this.bootstrap();
    return (await this.state.storage.get("messages")) || [];
  }

  async saveMessages(messages) {
    const clipped = messages.length > MAX_MESSAGES ? messages.slice(-MAX_MESSAGES) : messages;
    await this.state.storage.put("messages", clipped);
  }

  getPeriodKeys(date = new Date()) {
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(date.getUTCDate()).padStart(2, "0");
    return {
      day: `${yyyy}-${mm}-${dd}`,
      month: `${yyyy}-${mm}`,
      year: `${yyyy}`
    };
  }

  async getStatsObject() {
    const keys = this.getPeriodKeys();
    const [totalUsers, totalVisits, todayUsers, monthUsers, yearUsers] = await Promise.all([
      this.state.storage.get("stats:totalUsers"),
      this.state.storage.get("stats:totalVisits"),
      this.state.storage.get(`stats:day:${keys.day}`),
      this.state.storage.get(`stats:month:${keys.month}`),
      this.state.storage.get(`stats:year:${keys.year}`)
    ]);
    return {
      currentOnline: this.sessions.size,
      todayUsers: todayUsers || 0,
      monthUsers: monthUsers || 0,
      yearUsers: yearUsers || 0,
      totalUsers: totalUsers || 0,
      totalVisits: totalVisits || 0,
      dayKey: keys.day,
      monthKey: keys.month,
      yearKey: keys.year,
      updatedAt: new Date().toISOString()
    };
  }

  async getStatsApi() {
    return Response.json(await this.getStatsObject(), { headers: JSON_HEADERS });
  }

  async registerStatsVisit(request) {
    let body = {};
    try { body = await request.json(); } catch (_) {}
    const rawVisitor = clean(body.visitorId || request.headers.get("CF-Connecting-IP") || crypto.randomUUID());
    const visitorId = rawVisitor.slice(0, 120) || crypto.randomUUID();
    const keys = this.getPeriodKeys();

    await this.incrementCounter("stats:totalVisits", 1);

    const allKey = `stats:seen:all:${visitorId}`;
    const dayKey = `stats:seen:day:${keys.day}:${visitorId}`;
    const monthKey = `stats:seen:month:${keys.month}:${visitorId}`;
    const yearKey = `stats:seen:year:${keys.year}:${visitorId}`;

    if (!(await this.state.storage.get(allKey))) {
      await this.state.storage.put(allKey, true);
      await this.incrementCounter("stats:totalUsers", 1);
    }
    if (!(await this.state.storage.get(dayKey))) {
      await this.state.storage.put(dayKey, true);
      await this.incrementCounter(`stats:day:${keys.day}`, 1);
    }
    if (!(await this.state.storage.get(monthKey))) {
      await this.state.storage.put(monthKey, true);
      await this.incrementCounter(`stats:month:${keys.month}`, 1);
    }
    if (!(await this.state.storage.get(yearKey))) {
      await this.state.storage.put(yearKey, true);
      await this.incrementCounter(`stats:year:${keys.year}`, 1);
    }

    return Response.json(await this.getStatsObject(), { headers: JSON_HEADERS });
  }

  async incrementCounter(key, by = 1) {
    const current = (await this.state.storage.get(key)) || 0;
    const next = current + by;
    await this.state.storage.put(key, next);
    return next;
  }

  async reportMessageApi(request) {
    let body = {};
    try { body = await request.json(); } catch (_) {}
    const report = {
      id: crypto.randomUUID(),
      messageId: clean(body.messageId || "").slice(0, 140),
      sender: clean(body.sender || "").slice(0, 120),
      text: clean(body.text || "").slice(0, 1200),
      reporterId: clean(body.reporterId || "anonymous").slice(0, 140),
      reason: clean(body.reason || "user_report").slice(0, 80),
      createdAt: new Date().toISOString()
    };
    const reports = (await this.state.storage.get("reports")) || [];
    reports.push(report);
    await this.state.storage.put("reports", reports.slice(-500));
    await this.incrementCounter("stats:reports", 1);
    return Response.json({ ok: true, reportId: report.id }, { headers: JSON_HEADERS });
  }

  async getMessagesApi(url) {
    const lang = safeLang(url.searchParams.get("lang") || "en");
    const after = Number(url.searchParams.get("after") || 0) || 0;
    const limit = Math.min(Number(url.searchParams.get("limit") || 150) || 150, 300);
    const messages = await this.readMessages();
    const selected = messages.filter(m => (m.sequenceNumber || 0) > after).slice(-limit);

    // IMPORTANT: language switch must actually return translated text, not only warm cache later.
    // Translate missing selected messages now, with a hard timeout so UI never hangs forever.
    await withTimeout(
      this.ensureTranslationsForMessages(selected.map(m => m.id), lang),
      6500
    );

    const fresh = await this.readMessages();
    const freshById = new Map(fresh.map(m => [m.id, m]));
    const out = selected.map(m => this.present(freshById.get(m.id) || m, lang));

    return Response.json({ messages: out, current_language: LANG_NAME[lang] || "English", room: ROOM_DEFAULT }, { headers: JSON_HEADERS });
  }

  async postMessageApi(request, url) {
    let body;
    try { body = await request.json(); } catch {
      return Response.json({ detail: "Invalid JSON" }, { status: 400, headers: JSON_HEADERS });
    }
    const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("x-forwarded-for") || "http";
    const result = await this.createMessage(body, null, ip, safeLang(url.searchParams.get("lang") || body.lang || "en"));
    return Response.json(result.body, { status: result.status, headers: JSON_HEADERS });
  }

  handleWebSocket(request, url) {
    if (request.headers.get("Upgrade") !== "websocket") return new Response("Expected WebSocket", { status: 426 });
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.accept();
    server.lang = safeLang(url.searchParams.get("lang") || "en");
    server.room = safeRoom(url.searchParams.get("room") || ROOM_DEFAULT);
    server.sessionId = crypto.randomUUID();
    this.sessions.add(server);

    server.addEventListener("message", event => this.onSocketMessage(server, event).catch(err => {
      safeSend(server, { type: "ERROR", detail: "WebSocket packet failed" });
      console.error(err);
    }));
    server.addEventListener("close", () => this.sessions.delete(server));
    server.addEventListener("error", () => this.sessions.delete(server));

    safeSend(server, { type: "CONNECTED", room: server.room, lang: server.lang, now: new Date().toISOString() });
    return new Response(null, { status: 101, webSocket: client });
  }

  async onSocketMessage(ws, event) {
    let packet;
    try { packet = JSON.parse(event.data); } catch { return safeSend(ws, { type: "ERROR", detail: "Bad JSON" }); }
    if (packet.type === "PING") return safeSend(ws, { type: "PONG", now: Date.now() });

    if (packet.type === "CONNECT") {
      ws.lang = safeLang(packet.lang || ws.lang || "en");
      ws.sessionId = clean(packet.sessionId || ws.sessionId).slice(0, 100);
      const lastSequence = Number(packet.lastSequence || 0) || 0;
      const messages = await this.readMessages();
      const missed = messages.filter(m => (m.sequenceNumber || 0) > lastSequence).slice(-250);
      for (const msg of missed) safeSend(ws, { type: "NEW_MESSAGE", message: this.present(msg, ws.lang) });
      this.runLater(Promise.all(missed.slice(-40).map(m => this.ensureTranslation(m.id, ws.lang))));
      return safeSend(ws, { type: "CONNECTED", sequenceNumber: await this.state.storage.get("sequence") || 0 });
    }

    if (packet.type === "CHANGE_LANGUAGE") {
      ws.lang = safeLang(packet.lang || "en");
      const messages = await this.readMessages();
      this.runLater(Promise.all(messages.slice(-80).map(m => this.ensureTranslation(m.id, ws.lang))));
      return safeSend(ws, { type: "LANGUAGE_CHANGED", lang: ws.lang });
    }

    if (packet.type === "SEND_MESSAGE") {
      const ip = ws.sessionId || "ws";
      const result = await this.createMessage(packet, ws, ip, ws.lang || "en");
      if (result.status >= 400) safeSend(ws, { type: "ERROR", clientMessageId: packet.clientMessageId, detail: result.body.detail });
    }
  }

  async createMessage(body, ws, rateKey, preferredLang) {
    const clientMessageId = clean(body.clientMessageId || crypto.randomUUID()).slice(0, 120);
    const old = await this.state.storage.get(`client:${clientMessageId}`);
    if (old) {
      if (ws) safeSend(ws, { type: "ACK", clientMessageId, id: old.id, sequenceNumber: old.sequenceNumber, timestamp: old.timestamp });
      return { status: 200, body: this.present(old, preferredLang) };
    }

    if (!this.allowRate(rateKey || "anon")) return { status: 429, body: { detail: "Spam protection active. Please slow down." } };

    const text = clean(body.text || body.original_text || "").slice(0, MAX_TEXT_LENGTH);
    if (!text) return { status: 400, body: { detail: "Message cannot be empty" } };

    const sender = clean(body.sender || "Anonymous User").slice(0, 80) || "Anonymous User";
    const avatar = clean(body.avatar || "🦁").slice(0, 16) || "🦁";
    const detected = detectLanguage(text);
    const sequence = ((await this.state.storage.get("sequence")) || 0) + 1;
    const timestamp = formatTimestamp(new Date());
    const msg = {
      id: `msg_${crypto.randomUUID()}`,
      clientMessageId,
      sequenceNumber: sequence,
      sender,
      avatar,
      text,
      original_text: text,
      original_lang: detected.code,
      original_lang_name: detected.name,
      translated_text: text,
      timestamp,
      createdAt: new Date().toISOString(),
      translations: { [detected.code]: text }
    };

    const messages = await this.readMessages();
    messages.push(msg);
    await this.saveMessages(messages);
    await this.state.storage.put("sequence", sequence);
    await this.state.storage.put(`client:${clientMessageId}`, msg);

    if (ws) safeSend(ws, { type: "ACK", clientMessageId, id: msg.id, sequenceNumber: msg.sequenceNumber, timestamp: msg.timestamp });
    this.broadcast({ type: "NEW_MESSAGE", message: this.present(msg, preferredLang) });

    const targets = this.activeLanguages(preferredLang);
    this.runLater(Promise.all(targets.map(lang => this.ensureTranslation(msg.id, lang))));
    return { status: 200, body: this.present(msg, preferredLang) };
  }

  present(msg, lang) {
    const target = safeLang(lang || "en");
    const translated = (msg.translations && msg.translations[target]) || (target === msg.original_lang ? msg.original_text : msg.translated_text) || msg.original_text || msg.text;
    return {
      id: msg.id,
      clientMessageId: msg.clientMessageId,
      sequenceNumber: msg.sequenceNumber || 0,
      sender: msg.sender,
      avatar: msg.avatar,
      text: msg.text || msg.original_text,
      original_text: msg.original_text || msg.text,
      original_lang: msg.original_lang || "en",
      original_lang_name: msg.original_lang_name || "English",
      translated_text: translated,
      timestamp: msg.timestamp
    };
  }

  async ensureTranslationsForMessages(messageIds, targetLang) {
    targetLang = safeLang(targetLang || "en");
    const idSet = new Set(messageIds || []);
    const messages = await this.readMessages();
    const jobs = [];

    for (const msg of messages) {
      if (!idSet.has(msg.id)) continue;
      msg.translations = msg.translations || {};
      if (msg.translations[targetLang]) continue;

      const source = msg.original_lang || "auto";
      const original = msg.original_text || msg.text || "";
      if (!original) continue;

      if (source === targetLang) {
        jobs.push({ msg, promise: Promise.resolve(original) });
      } else {
        jobs.push({ msg, promise: translateText(original, source, targetLang) });
      }
    }

    if (!jobs.length) return;

    const results = await Promise.allSettled(jobs.map(j => j.promise));
    let changed = false;

    results.forEach((result, index) => {
      const job = jobs[index];
      const original = job.msg.original_text || job.msg.text || "";
      const translated = result.status === "fulfilled" && result.value ? result.value : original;
      job.msg.translations = job.msg.translations || {};
      job.msg.translations[targetLang] = translated;
      changed = true;
    });

    if (changed) {
      await this.saveMessages(messages);
      for (const job of jobs) {
        const translated = job.msg.translations && job.msg.translations[targetLang];
        if (translated) this.broadcastTranslation(job.msg.id, targetLang, translated);
      }
    }
  }

  async ensureTranslation(messageId, targetLang) {
    targetLang = safeLang(targetLang || "en");
    const messages = await this.readMessages();
    const index = messages.findIndex(m => m.id === messageId);
    if (index < 0) return;
    const msg = messages[index];
    msg.translations = msg.translations || {};
    if (msg.translations[targetLang]) return;
    const source = msg.original_lang || "auto";
    if (source === targetLang) msg.translations[targetLang] = msg.original_text || msg.text;
    else msg.translations[targetLang] = await translateText(msg.original_text || msg.text, source, targetLang);
    messages[index] = msg;
    await this.saveMessages(messages);
    this.broadcastTranslation(msg.id, targetLang, msg.translations[targetLang]);
  }

  activeLanguages(priority) {
    const set = new Set([safeLang(priority || "en")]);
    for (const ws of this.sessions) set.add(safeLang(ws.lang || "en"));
    return [...set].slice(0, 16);
  }

  broadcast(packet) { for (const ws of [...this.sessions]) safeSend(ws, packet); }
  broadcastTranslation(id, targetLang, translatedText) {
    for (const ws of [...this.sessions]) {
      if ((ws.lang || "en") === targetLang) safeSend(ws, { type: "TRANSLATION_UPDATED", id, targetLang, translatedText });
    }
  }

  allowRate(key) {
    const now = Date.now();
    const arr = (this.rateBuckets.get(key) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    if (arr.length >= RATE_LIMIT_COUNT) { this.rateBuckets.set(key, arr); return false; }
    arr.push(now);
    this.rateBuckets.set(key, arr);
    return true;
  }

  runLater(promise) {
    try {
      if (typeof this.state.waitUntil === "function") this.state.waitUntil(promise);
      else promise.catch(() => {});
    } catch { promise.catch(() => {}); }
  }
}

function safeSend(ws, packet) { try { ws.send(JSON.stringify(packet)); return true; } catch { return false; } }
function safeRoom(v) { return String(v || ROOM_DEFAULT).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 50) || ROOM_DEFAULT; }
function safeLang(v) { return String(v || "en").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 16) || "en"; }
function clean(v) { return String(v || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim(); }
function formatTimestamp(d) { const p=n=>String(n).padStart(2,"0"); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; }

function suggestLanguages(q) {
  if (!q) return [{ code: "en", name: "English", reason: "Default" }, { code: "hi", name: "Hindi", reason: "Popular" }];
  const detected = detectLanguage(q);
  const matches = LANGUAGES.filter(l => l.name.toLowerCase().includes(q) || l.code.toLowerCase().includes(q)).slice(0, 6).map(l => ({...l, reason: "Matching language"}));
  const out = [{ code: detected.code, name: detected.name, reason: "AI Detected from text" }, ...matches];
  return [...new Map(out.map(x => [x.code, x])).values()].slice(0, 6);
}

function detectLanguage(text) {
  const t = String(text || "").toLowerCase();
  if (/[\u0900-\u097F]/.test(text) || /\b(namaste|namaskar|kaise|kya|hai|bhai)\b/.test(t)) return { code: "hi", name: "Hindi" };
  if (/[\u0600-\u06FF]/.test(text)) return { code: "ar", name: "Arabic" };
  if (/[\u3040-\u30ff]/.test(text)) return { code: "ja", name: "Japanese" };
  if (/[\u4E00-\u9FFF]/.test(text)) return { code: "zh-CN", name: "Chinese (simplified)" };
  if (/[\u0400-\u04FF]/.test(text)) return { code: "ru", name: "Russian" };
  if (/\b(hola|gracias|amigo)\b/.test(t)) return { code: "es", name: "Spanish" };
  if (/\b(bonjour|merci)\b/.test(t)) return { code: "fr", name: "French" };
  return { code: "en", name: "English" };
}

async function translateText(text, sourceLang, targetLang) {
  if (!text || sourceLang === targetLang) return text;

  // Provider 1: Google public endpoint. Use sl=auto because lightweight local detection
  // can mis-detect Hinglish/Roman Hindi and then Google may refuse bad source codes.
  try {
    const translated = await googleTranslate(text, "auto", targetLang, 3200);
    if (isGoodTranslation(translated, text)) return translated;
  } catch (_) {}

  // Provider 2: Retry with detected source language for scripts where auto struggles.
  try {
    const translated = await googleTranslate(text, sourceLang || "auto", targetLang, 3200);
    if (isGoodTranslation(translated, text)) return translated;
  } catch (_) {}

  // Provider 3: MyMemory fallback. Not perfect, but better than silently failing.
  try {
    const translated = await myMemoryTranslate(text, sourceLang || "auto", targetLang, 3200);
    if (isGoodTranslation(translated, text)) return translated;
  } catch (_) {}

  // Graceful degradation: never break chat if translator providers fail.
  return text;
}

async function googleTranslate(text, sourceLang, targetLang, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sourceLang || "auto")}&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, { signal: controller.signal, headers: { "user-agent": "Mozilla/5.0 Batiyan/3.5" } });
    if (!res.ok) return "";
    const data = await res.json();
    return Array.isArray(data?.[0]) ? data[0].map(x => x?.[0] || "").join("") : "";
  } finally {
    clearTimeout(timer);
  }
}

async function myMemoryTranslate(text, sourceLang, targetLang, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const src = sourceLang && sourceLang !== "auto" ? sourceLang : "auto";
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(src + "|" + targetLang)}`;
    const res = await fetch(url, { signal: controller.signal, headers: { "user-agent": "Batiyan/3.5" } });
    if (!res.ok) return "";
    const data = await res.json();
    return data?.responseData?.translatedText || "";
  } finally {
    clearTimeout(timer);
  }
}

function isGoodTranslation(translated, original) {
  if (!translated) return false;
  const low = translated.toLowerCase();
  if (low.includes("<html") || low.includes("error 500") || low.includes("that's an error") || low.includes("too many requests")) return false;
  return true;
}

async function withTimeout(promise, timeoutMs) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise(resolve => { timer = setTimeout(() => resolve("timeout"), timeoutMs); })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
