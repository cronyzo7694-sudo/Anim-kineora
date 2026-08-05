/**
 * ========================================================
 * BhashaSetu — Immersive Gamified Chat Application
 * Production-ready Vanilla JS ES6 with SWR & Sequence Recovery
 * Arch-Certified Quality conforming to strict guidelines
 * ========================================================
 */

// Core App Configuration
const CONFIG = {
    syncInterval: 2500,     // 2.5s background poll fallback when WebSocket is unavailable
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
    sessionStorage.setItem("user_tag", `#${uniqueNum}`);
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
function getLangName(code, fallback = "") {
    const found = STATE.languages.find(l => l.code === code);
    return found ? found.name : (fallback || code || "Language");
}

function normalizeSelectedLanguage() {
    if (!STATE.selectedLanguage || STATE.selectedLanguage === "auto") {
        STATE.selectedLanguage = "en";
        STATE.selectedLanguageName = "English";
        localStorage.setItem("selectedLanguageCode", "en");
        localStorage.setItem("selectedLanguageName", "English");
    }
}

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
    openStatsModalBtn: document.getElementById("open-stats-modal-btn"),
    closeStatsModalBtn: document.getElementById("close-stats-modal-btn"),
    statsModal: document.getElementById("stats-modal"),
    statsOnlinePill: document.getElementById("stats-online-pill"),
    installAppBtn: document.getElementById("install-app-btn"),
    statsCurrent: document.getElementById("stats-current"),
    statsToday: document.getElementById("stats-today"),
    statsMonth: document.getElementById("stats-month"),
    statsYear: document.getElementById("stats-year"),
    statsTotal: document.getElementById("stats-total"),
    statsVisits: document.getElementById("stats-visits"),
    statsUpdatedText: document.getElementById("stats-updated-text"),
    
    messageForm: document.getElementById("message-form"),
    postAvatar: document.getElementById("post-avatar"),
    postSender: document.getElementById("post-sender"),
    avatarPreview: document.getElementById("avatar-preview"),
    senderDisplay: document.getElementById("sender-display"),
    postText: document.getElementById("post-text"),
    shuffleIdentityBtn: document.getElementById("shuffle-identity-btn"),
    identityToggleBtn: document.getElementById("identity-toggle-btn"),
    
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
    const fullSenderName = `User ${STATE.userNumberTag}`;
    DOM.postSender.value = `${avatar} ${fullSenderName}`;
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

function setIdentityExpanded(expanded) {
    document.body.classList.toggle("identity-expanded", expanded);
    if (DOM.identityToggleBtn) {
        DOM.identityToggleBtn.textContent = expanded ? "Hide" : "Show";
        DOM.identityToggleBtn.setAttribute("aria-label", expanded ? "Hide nickname" : "Show nickname");
    }
}

if (DOM.identityToggleBtn) {
    DOM.identityToggleBtn.addEventListener("click", () => {
        setIdentityExpanded(!document.body.classList.contains("identity-expanded"));
    });
}

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
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="message-code-block">$1</code>');
    const urlPattern = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
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
    
    DOM.swipeRocket.style.transform = `translateX(${dragOffset}px)`;
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
        DOM.swipeRocket.style.transform = `translateX(${maxOffset}px)`;
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
        DOM.swipeRocket.style.transform = `translateX(${maxOffset}px)`;
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
        const room = encodeURIComponent("global");
        const lang = encodeURIComponent(STATE.selectedLanguage || "en");
        return `${protocol}//${host}/ws?room=${room}&lang=${lang}`;
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
                lang: STATE.selectedLanguage,
                roomId: "global",
                sessionId: STATE.userNumberTag
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

                // If the message arrived before translation patch, silently refresh once.
                // This avoids manual reload if a TRANSLATION_UPDATED event is missed.
                if (msg.original_lang !== STATE.selectedLanguage && (msg.translated_text === msg.original_text || msg.translated_text === msg.text)) {
                    setTimeout(() => {
                        const current = STATE.messagesData.find(m => m.id === msg.id);
                        if (current && current.original_lang !== STATE.selectedLanguage && (current.translated_text === current.original_text || current.translated_text === current.text)) {
                            fetchMessages(false);
                        }
                    }, 1100);
                }
                
                if (!STATE.isUserAtBottom) {
                    STATE.unreadCount++;
                    DOM.newMessagesDock.querySelector("span").textContent = `${STATE.unreadCount} New Messages`;
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

                const tempBubbleRow = document.getElementById(`msg-row-${clientMsgId}`);
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

            const idx = STATE.messagesData.findIndex(m => m.id === msgId || m.clientMessageId === msgId);
            if (idx !== -1) {
                if (targetLang === STATE.selectedLanguage) {
                    STATE.messagesData[idx].translated_text = translatedText;
                    
                    const textSpan = document.getElementById(`text-body-${msgId}`);
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
        const res = await fetch(`/api/messages?lang=${STATE.selectedLanguage}`);
        const data = await res.json();
        setConnectionStatus("connected");
        
        const freshMessages = Array.isArray(data.messages) ? data.messages : [];
        
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
            } else {
                const idx = STATE.messagesData.findIndex(m => m.id === newMsg.id || (m.clientMessageId && m.clientMessageId === newMsg.clientMessageId));
                if (idx !== -1) {
                    const oldText = STATE.messagesData[idx].translated_text;
                    STATE.messagesData[idx] = { ...STATE.messagesData[idx], ...newMsg };
                    if (newMsg.translated_text && newMsg.translated_text !== oldText) {
                        const textSpan = document.getElementById(`text-body-${newMsg.id}`);
                        if (textSpan) textSpan.innerHTML = formatMessageText(newMsg.translated_text);
                    }
                }
            }
        });

        STATE.messagesData = freshMessages;
        STATE.clientTranslationCache[STATE.selectedLanguage] = STATE.messagesData;
        
        if (STATE.unreadCount > 0 && !STATE.isUserAtBottom) {
            DOM.newMessagesDock.querySelector("span").textContent = `${STATE.unreadCount} New Messages`;
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
    const clientMsgId = (window.crypto && crypto.randomUUID) ? `cli_${crypto.randomUUID()}` : `cli_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    DOM.postText.value = "";
    autoResizeInput();
    snapRocketBack();
    
    const optimisticMsg = {
        id: clientMsgId,
        clientMessageId: clientMsgId,
        sender: `${STATE.currentAvatar} User ${STATE.userNumberTag}`,
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
        sender: `${STATE.currentAvatar} User ${STATE.userNumberTag}`,
        avatar: STATE.currentAvatar,
        text: text
    });
    DurableStore.savePendingQueue(queue);

    const sent = RealtimeGateway.send({
        type: "SEND_MESSAGE",
        clientMessageId: clientMsgId,
        sender: `${STATE.currentAvatar} User ${STATE.userNumberTag}`,
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
                    sender: `${STATE.currentAvatar} User ${STATE.userNumberTag}`,
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

                    const tempBubbleRow = document.getElementById(`msg-row-${clientMsgId}`);
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
        
        const wrapper = document.getElementById(`msg-bubble-${clientMsgId}`);
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
        const wrapper = document.getElementById(`msg-bubble-${clientMsgId}`);
        if (wrapper) {
            updateMessageBubbleStatus(wrapper, STATE.messagesData[idx]);
        }
    }
    
    const sent = RealtimeGateway.send({
        type: "SEND_MESSAGE",
        clientMessageId: clientMsgId,
        sender: `${STATE.currentAvatar} User ${STATE.userNumberTag}`,
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
                    sender: `${STATE.currentAvatar} User ${STATE.userNumberTag}`,
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
                    
                    const tempRow = document.getElementById(`msg-row-${clientMsgId}`);
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

// Render individual message card incrementally (YouTube-comment style for maximum readability)
function renderSingleMessageBubble(msg, animate = false) {
    if (STATE.renderedMessageIds.has(msg.id)) {
        const bubble = document.getElementById(`msg-bubble-${msg.id}`);
        if (bubble) updateMessageBubbleStatus(bubble, msg);
        return;
    }

    const isMe = msg.sender.includes(`User ${STATE.userNumberTag}`);
    const row = document.createElement("article");
    row.className = `message-row comment-message-row ${isMe ? 'outgoing mine' : 'incoming'}`;
    row.id = `msg-row-${msg.id}`;
    
    if (animate) row.classList.add("animate-in");

    const formattedText = formatMessageText(msg.translated_text || msg.original_text || msg.text || "");
    const isOriginal = msg.original_lang === STATE.selectedLanguage;
    const timeText = msg.isPending
        ? `<span class="comment-pending"><i class="fa-regular fa-clock"></i> sending...</span>`
        : `<span>${msg.timestamp && msg.timestamp.split(" ")[1] ? msg.timestamp.split(" ")[1].substring(0, 5) : (msg.timestamp || "now")}</span>`;

    const langBadgeText = !isOriginal
        ? `Translated from ${escapeHTML(msg.original_lang_name || msg.original_lang || "Unknown")}`
        : `Original: ${escapeHTML(msg.original_lang_name || msg.original_lang || "Unknown")}`;

    const toggleBtnHtml = !isOriginal
        ? `<button type="button" onclick="toggleSingleBubbleTranslation('${msg.id}')" id="btn-trans-toggle-${msg.id}" class="translation-toggle-link comment-action-pill"><i class="fa-solid fa-language"></i> Show Original</button>`
        : '';

    const likeState = getMessageReactionState(msg.id);
    const likeActive = likeState === "like" ? "active" : "";
    const dislikeActive = likeState === "dislike" ? "active" : "";

    row.innerHTML = `
        <div class="comment-avatar-wrap" aria-hidden="true">
            <div class="comment-avatar">${escapeHTML(msg.avatar || "🦁")}</div>
        </div>

        <div class="comment-card ${isMe ? 'comment-card-mine' : ''}" id="msg-bubble-${msg.id}">
            <header class="comment-card-header">
                <div class="comment-author-line">
                    <span class="comment-author-name">${escapeHTML(msg.sender || "Anonymous")}</span>
                    ${isMe ? `<span class="comment-you-badge">You</span>` : ''}
                    <span class="comment-dot">•</span>
                    <time class="comment-time" id="status-time-${msg.id}">${timeText}</time>
                    <span id="status-tick-${msg.id}" class="message-status-icon comment-status-icon"></span>
                </div>
                <span class="comment-language-badge" id="status-lang-${msg.id}">${langBadgeText}</span>
            </header>

            <div class="comment-text message-text-content" id="text-body-${msg.id}">${formattedText}</div>

            ${!isOriginal ? `
                <div id="box-translation-${msg.id}" class="translation-box comment-original-box hidden">
                    <span class="comment-original-label">Original message:</span>
                    <span class="comment-original-text">${escapeHTML(msg.original_text || msg.text || "")}</span>
                </div>
            ` : ''}

            <footer class="comment-actions" aria-label="Message actions">
                <button type="button" class="comment-action-btn ${likeActive}" onclick="reactToMessage('${msg.id}', 'like')" title="Like">
                    <i class="fa-regular fa-thumbs-up"></i><span>Like</span>
                </button>
                <button type="button" class="comment-action-btn ${dislikeActive}" onclick="reactToMessage('${msg.id}', 'dislike')" title="Dislike">
                    <i class="fa-regular fa-thumbs-down"></i><span>Dislike</span>
                </button>
                <button type="button" class="comment-action-btn" onclick="replyToMessage('${msg.id}')" title="Reply">
                    <i class="fa-regular fa-comment-dots"></i><span>Reply</span>
                </button>
                <button type="button" class="comment-action-btn report-action-btn" onclick="reportMessage('${msg.id}')" title="Report abuse">
                    <i class="fa-regular fa-flag"></i><span>Report</span>
                </button>
                ${toggleBtnHtml}
            </footer>
        </div>
    `;

    let innerContainer = DOM.messagesContainer.querySelector(".chat-messages-inner");
    if (!innerContainer) {
        DOM.messagesContainer.innerHTML = '<div class="chat-messages-inner"></div>';
        innerContainer = DOM.messagesContainer.querySelector(".chat-messages-inner");
    }
    
    innerContainer.appendChild(row);
    STATE.renderedMessageIds.add(msg.id);
    
    const wrapper = row.querySelector(".comment-card");
    updateMessageBubbleStatus(wrapper, msg);
}

function getMessageReactionState(msgId) {
    try {
        const map = JSON.parse(localStorage.getItem("message_reactions") || "{}");
        return map[msgId] || "";
    } catch (_) {
        return "";
    }
}

window.reactToMessage = function(msgId, reaction) {
    const map = JSON.parse(localStorage.getItem("message_reactions") || "{}");
    map[msgId] = map[msgId] === reaction ? "" : reaction;
    if (!map[msgId]) delete map[msgId];
    localStorage.setItem("message_reactions", JSON.stringify(map));

    const row = document.getElementById(`msg-row-${msgId}`);
    if (!row) return;
    row.querySelectorAll(".comment-action-btn").forEach(btn => btn.classList.remove("active"));
    const btns = row.querySelectorAll(".comment-action-btn");
    if (map[msgId] === "like" && btns[0]) btns[0].classList.add("active");
    if (map[msgId] === "dislike" && btns[1]) btns[1].classList.add("active");
};

window.replyToMessage = function(msgId) {
    const msg = STATE.messagesData.find(m => m.id === msgId || m.clientMessageId === msgId);
    if (!msg) return;
    const name = (msg.sender || "User").replace(/^\S+\s*/, "").trim() || "User";
    DOM.postText.value = `@${name} `;
    DOM.postText.focus();
    autoResizeInput();
    checkSwipeGuide();
};

window.reportMessage = async function(msgId) {
    const msg = STATE.messagesData.find(m => m.id === msgId || m.clientMessageId === msgId);
    if (!msg) return;
    const ok = confirm("Report this message for review?");
    if (!ok) return;
    try {
        await fetch("/api/report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                messageId: msg.id,
                sender: msg.sender,
                text: msg.original_text || msg.text || "",
                reporterId: getVisitorId(),
                reason: "user_report"
            })
        });
        alert("Thanks. This message has been reported for review.");
    } catch (err) {
        alert("Report could not be sent right now. Please try again later.");
    }
};

function updateMessageBubbleStatus(wrapper, msg) {
    const tickSpan = wrapper.querySelector('[id^="status-tick-"]');
    if (!tickSpan) return;

    if (msg.isPending) {
        tickSpan.innerHTML = '<i class="fa-regular fa-clock text-[#A5A5A5] animate-pulse" title="Sending..."></i>';
    } else if (msg.isFailed) {
        tickSpan.innerHTML = `<span onclick="retryMessageDelivery('${msg.clientMessageId || msg.id}', '${escapeHTML(msg.original_text || msg.text)}')" class="status-failed-indicator" title="Failed. Click to retry!"><i class="fa-solid fa-circle-exclamation"></i> Retry</span>`;
    } else {
        tickSpan.innerHTML = '<i class="fa-solid fa-check text-emerald-500" title="Sent ✓"></i>';
    }
}

window.toggleSingleBubbleTranslation = function(msgId) {
    const box = document.getElementById(`box-translation-${msgId}`);
    const btn = document.getElementById(`btn-trans-toggle-${msgId}`);
    if (!box || !btn) return;

    if (box.classList.contains("hidden")) {
        box.classList.remove("hidden");
        btn.innerHTML = `<i class="fa-solid fa-language"></i> Hide Original`;
    } else {
        box.classList.add("hidden");
        btn.innerHTML = `<i class="fa-solid fa-language"></i> Show Original`;
    }
    if (STATE.isUserAtBottom) scrollToBottom();
};

function renderAllMessagesFeed(forceScroll = false) {
    DOM.messagesContainer.innerHTML = '<div class="chat-messages-inner"></div>';
    STATE.renderedMessageIds.clear();
    
    if (STATE.messagesData.length === 0) {
        DOM.messagesContainer.innerHTML = `
            <div class="h-full flex flex-col items-center justify-center text-center text-xs text-neutral-400 p-6">
                <i class="fa-regular fa-comment-dots text-3xl text-neutral-600 mb-2"></i>
                <h4 class="font-bold text-neutral-300 text-sm">No Messages yet</h4>
                <p class="max-w-xs mt-1 text-neutral-500">Be the first to join the chat and write a message in any language!</p>
            </div>
        `;
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
        STATE.languages = Array.isArray(data.languages) ? data.languages : [];
        normalizeSelectedLanguage();
        DOM.currentLangText.textContent = STATE.selectedLanguageName || getLangName(STATE.selectedLanguage, "English");
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
    const deviceLangName = getLangName(deviceLangCode, "Device Language");
    
    // Auto Detect
    const autoBtn = document.createElement("button");
    autoBtn.type = "button";
    autoBtn.className = STATE.selectedLanguage === "auto" ? "lang-btn active" : "lang-btn";
    autoBtn.innerHTML = `<span>Auto Detect</span><span class="lang-code">auto</span>`;
    autoBtn.onclick = () => selectLanguage("auto", "Auto Detect");
    DOM.systemLangsGrid.appendChild(autoBtn);

    // Device Language
    const deviceBtn = document.createElement("button");
    deviceBtn.type = "button";
    deviceBtn.className = STATE.selectedLanguage === deviceLangCode ? "lang-btn active" : "lang-btn";
    deviceBtn.innerHTML = `<span>System (${deviceLangName})</span><span class="lang-code">${deviceLangCode}</span>`;
    deviceBtn.onclick = () => selectLanguage(deviceLangCode, deviceLangName);
    DOM.systemLangsGrid.appendChild(deviceBtn);

    // Recent Languages
    if (STATE.recentLanguages.length > 0 && !cleanFilter) {
        DOM.recentLangsSection.classList.remove("hidden");
        STATE.recentLanguages.forEach(code => {
            const name = getLangName(code, "");
            if (name) {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = STATE.selectedLanguage === code ? "lang-btn active" : "lang-btn";
                btn.innerHTML = `<span>${name}</span><span class="lang-code">${code}</span>`;
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
            btn.innerHTML = `<span>${name}</span><span class="lang-code">${code}</span>`;
            btn.onclick = () => selectLanguage(code, name);
            DOM.popularLangsGrid.appendChild(btn);
        }

        if (matches) {
            matchCount++;
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = btnClass;
            btn.innerHTML = `<span>${name}</span><span class="lang-code">${code}</span>`;
            btn.onclick = () => selectLanguage(code, name);
            DOM.allLangsGrid.appendChild(btn);
        }
    });

    if (cleanFilter) {
        document.getElementById("all-langs-header").textContent = `Search Results (${matchCount})`;
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
        const res = await fetch(`/api/suggest-language?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        
        if (data.suggestions && data.suggestions.length > 0) {
            DOM.aiSuggestionBox.classList.remove("hidden");
            DOM.aiSuggestionList.innerHTML = "";
            
            data.suggestions.forEach(s => {
                const chip = document.createElement("button");
                chip.type = "button";
                chip.className = "ai-chip";
                chip.innerHTML = `${s.name} <span class="text-[8px] opacity-60 font-mono">${s.code}</span>`;
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

async function openLanguageModal() {
    DOM.langModal.classList.add("active");
    DOM.langSearchInput.value = "";
    if (!STATE.languages || STATE.languages.length === 0) {
        await fetchLanguages();
    } else {
        renderLanguages("");
    }
    DOM.aiSuggestionBox.classList.add("hidden");
    setTimeout(() => DOM.langSearchInput.focus(), 40);
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
    if (e.key === "Escape" && DOM.statsModal && DOM.statsModal.classList.contains("active")) {
        closeStatsModal();
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


// ========================================================
// 📲 PWA INSTALL SUPPORT
// ========================================================
let deferredInstallPrompt = null;

function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/service-worker.js").catch(err => {
            console.warn("Service worker registration failed:", err);
        });
    });
}

window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    if (DOM.installAppBtn) DOM.installAppBtn.classList.remove("hidden");
});

window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    if (DOM.installAppBtn) DOM.installAppBtn.classList.add("hidden");
});

async function installBatiyanApp() {
    if (!deferredInstallPrompt) {
        alert("Install option is available from your browser menu if this device supports PWA installation.");
        return;
    }
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice.catch(() => null);
    deferredInstallPrompt = null;
    if (DOM.installAppBtn) DOM.installAppBtn.classList.add("hidden");
}

if (DOM.installAppBtn) DOM.installAppBtn.addEventListener("click", installBatiyanApp);
registerServiceWorker();

// ========================================================
// 📊 USAGE STATS MODAL + VISITOR COUNTER
// ========================================================
function getVisitorId() {
    let id = localStorage.getItem("bhashasetu_visitor_id");
    if (!id) {
        id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `vis_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        localStorage.setItem("bhashasetu_visitor_id", id);
    }
    return id;
}

function formatCompactNumber(num) {
    const n = Number(num || 0);
    if (n >= 10000000) return `${(n / 10000000).toFixed(1)}Cr`;
    if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
}

async function registerVisitAndLoadStats() {
    try {
        const visitorId = getVisitorId();
        const res = await fetch("/api/stats", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ visitorId })
        });
        if (res.ok) {
            const stats = await res.json();
            renderStats(stats);
        }
    } catch (err) {
        console.warn("Stats register failed:", err);
    }
}

async function fetchStats() {
    try {
        const res = await fetch("/api/stats");
        if (!res.ok) throw new Error("Stats API failed");
        const stats = await res.json();
        renderStats(stats);
    } catch (err) {
        console.warn("Stats load failed:", err);
        if (DOM.statsUpdatedText) DOM.statsUpdatedText.textContent = "Stats temporarily unavailable";
    }
}

function renderStats(stats) {
    if (!stats) return;
    const current = stats.currentOnline || 0;
    if (DOM.statsOnlinePill) DOM.statsOnlinePill.textContent = `${formatCompactNumber(current)} online`;
    if (DOM.statsCurrent) DOM.statsCurrent.textContent = formatCompactNumber(current);
    if (DOM.statsToday) DOM.statsToday.textContent = formatCompactNumber(stats.todayUsers);
    if (DOM.statsMonth) DOM.statsMonth.textContent = formatCompactNumber(stats.monthUsers);
    if (DOM.statsYear) DOM.statsYear.textContent = formatCompactNumber(stats.yearUsers);
    if (DOM.statsTotal) DOM.statsTotal.textContent = formatCompactNumber(stats.totalUsers);
    if (DOM.statsVisits) DOM.statsVisits.textContent = formatCompactNumber(stats.totalVisits);
    if (DOM.statsUpdatedText) {
        const updated = stats.updatedAt ? new Date(stats.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "now";
        DOM.statsUpdatedText.textContent = `Updated ${updated} • Unique browser-based counts`;
    }
}

function openStatsModal() {
    if (!DOM.statsModal) return;
    DOM.statsModal.classList.add("active");
    fetchStats();
}

function closeStatsModal() {
    if (!DOM.statsModal) return;
    DOM.statsModal.classList.remove("active");
    DOM.postText.focus();
}

if (DOM.openStatsModalBtn) DOM.openStatsModalBtn.addEventListener("click", openStatsModal);
if (DOM.closeStatsModalBtn) DOM.closeStatsModalBtn.addEventListener("click", closeStatsModal);

// 📦 BOOTSTRAP INITIALIZATION
// ========================================================
(async function init() {
    DOM.currentLangText.textContent = STATE.selectedLanguageName;
    registerVisitAndLoadStats();
    setInterval(fetchStats, 30000);
    
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
