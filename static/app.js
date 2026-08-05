/**
 * ========================================================
 * BhashaSetu — Baap-Level Enterprise-Grade Chat Client
 * Production-ready Vanilla JS ES6 with SWR & Sequence Recovery
 * Conforms to elite distributed architectural guidelines
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
            const white = Math.random() * WhiteNoiseMultiplier();
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
function WhiteNoiseMultiplier() { return 2 - 1; }

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
        // Check if inside E2B container proxy url
        if (host.includes("e2b.app")) {
            return `${protocol}//8000-${host.split("-")[1]}/ws`;
        }
        return `${protocol}//${host}/ws`;
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
            
            // 1. Send Handshake CONNECT package with sequence number!
            this.socket.send(JSON.stringify({
                type: "CONNECT",
                lastSequence: STATE.lastSequence
            }));
            
            // 2. Start heartbeats
            this.startHeartbeat();
            
            // 3. Retry sending any offline queued messages automatically!
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
        
        // Exponential backoff reconnect
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
            
            // Update sequence tracker safely
            if (msg.sequenceNumber > STATE.lastSequence) {
                STATE.lastSequence = msg.sequenceNumber;
                DurableStore.setLastSequence(msg.sequenceNumber);
            }

            // Verify if message already in our feed (idempotency check)
            const exists = STATE.messagesData.some(m => m.id === msg.id || (m.clientMessageId && m.clientMessageId === msg.clientMessageId));
            if (!exists) {
                STATE.messagesData.push(msg);
                renderSingleMessageBubble(msg, true);
                
                // If user is scrolled up, count unread messages
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

            // Resolve optimistic pending bubble to Sent!
            const idx = STATE.messagesData.findIndex(m => m.clientMessageId === clientMsgId || m.id === clientMsgId);
            if (idx !== -1) {
                STATE.messagesData[idx].id = realId;
                STATE.messagesData[idx].sequenceNumber = seqNum;
                STATE.messagesData[idx].timestamp = time;
                STATE.messagesData[idx].isPending = false;
                STATE.messagesData[idx].isFailed = false;

                // Re-render specifically this single bubble
                const tempBubbleRow = document.getElementById(`msg-row-${clientMsgId}`);
                if (tempBubbleRow) tempBubbleRow.remove();
                STATE.renderedMessageIds.delete(clientMsgId);

                renderSingleMessageBubble(STATE.messagesData[idx], false);
                
                if (seqNum > STATE.lastSequence) {
                    STATE.lastSequence = seqNum;
                    DurableStore.setLastSequence(seqNum);
                }
            }
            
            // Remove from durable offline queue
            let queue = DurableStore.getPendingQueue();
            queue = queue.filter(item => item.clientMessageId !== clientMsgId);
            DurableStore.savePendingQueue(queue);
        }
        else if (type === "TRANSLATION_UPDATED") {
            // Real-time asynchronous translation patch update!
            const msgId = packet.id;
            const targetLang = packet.targetLang;
            const translatedText = packet.translatedText;

            // Update in our cache/memory directly
            const idx = STATE.messagesData.findIndex(m => m.id === msgId);
            if (idx !== -1) {
                if (targetLang === STATE.selectedLanguage) {
                    STATE.messagesData[idx].translated_text = translatedText;
                    
                    // Update text inside DOM instantly without redrawing the rest of the feed!
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
                // REST Fallback if WS went down during drain
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
    
    // Load from local SWR language cache first (0ms instantaneous transition!)
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
        
        const freshMessages = data.messages;
        
        // Incremental insertion of newly received messages only
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
    const clientMsgId = `cli_${Date.now()}`;
    DOM.postText.value = "";
    autoResizeInput();
    snapRocketBack();
    
    // 1. Construct Optimistic Bubble object
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
    
    // Append locally instantly (0ms)
    STATE.messagesData.push(optimisticMsg);
    renderSingleMessageBubble(optimisticMsg, true);
    
    if (STATE.isUserAtBottom) {
        scrollToBottom();
    }

    // 2. Save inside persistent offline queue (Survives tab close/crashes!)
    const queue = DurableStore.getPendingQueue();
    queue.push({
        clientMessageId: clientMsgId,
        sender: `${STATE.currentAvatar} User ${STATE.userNumberTag}`,
        avatar: STATE.currentAvatar,
        text: text
    });
    DurableStore.savePendingQueue(queue);

    // 3. Try delivering via high-performance WebSocket gateway
    const sent = RealtimeGateway.send({
        type: "SEND_MESSAGE",
        clientMessageId: clientMsgId,
        sender: `${STATE.currentAvatar} User ${STATE.userNumberTag}`,
        avatar: STATE.currentAvatar,
        text: text
    });

    if (!sent) {
        // Fallback: If WebSocket is closed/blocked, use HTTP POST endpoint
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
                
                // Update local memory and GUI
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
                
                // Clear from offline queue
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
// 🔌 HEARTBEATS AND CONNECTION HUD GRAPHICS
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
        const bubble = document.getElementById(`msg-bubble-${msg.id}`);
        if (bubble) updateMessageBubbleStatus(bubble, msg);
        return;
    }

    const isMe = msg.sender.includes(`User ${STATE.userNumberTag}`);
    const row = document.createElement("div");
    row.className = `message-row ${isMe ? 'outgoing' : 'incoming'}`;
    row.id = `msg-row-${msg.id}`;
    
    if (animate) {
        row.classList.add("animate-in");
    }

    const formattedText = formatMessageText(msg.translated_text || msg.original_text || msg.text);
    const isOriginal = msg.original_lang === STATE.selectedLanguage;
    
    const bubbleStyle = isMe
        ? "bg-gradient-to-tr from-[#0084ff] to-[#1877f2] text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-[15px] font-medium leading-relaxed border border-blue-600/30 shadow-sm"
        : "bg-white text-neutral-800 rounded-2xl rounded-tl-sm px-4 py-2.5 text-[15px] font-medium border border-neutral-300 shadow-sm leading-relaxed";

    let metaString = isOriginal ? `Original: ${msg.original_lang_name}` : `Translated from ${msg.original_lang_name}`;
    const toggleBtnHtml = !isOriginal
        ? `<button onclick="toggleSingleBubbleTranslation('${msg.id}')" id="btn-trans-toggle-${msg.id}" class="translation-toggle-link">Show Original</button>`
        : '';

    const statusHtml = msg.isPending 
        ? `<span class="animate-pulse"><i class="fa-regular fa-clock"></i> sending...</span>`
        : `<span>${msg.timestamp.includes(" ") ? msg.timestamp.split(" ")[1].substring(0, 5) : msg.timestamp}</span>`;

    row.innerHTML = `
        ${!isMe ? `
            <div class="message-header-row">
                <span class="message-sender-avatar">${msg.avatar || "🦁"}</span>
                <span class="message-sender-name">${msg.sender}</span>
            </div>
        ` : ''}
        <div class="message-bubble-wrapper max-w-[80%] md:max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}" id="msg-bubble-${msg.id}">
            <div class="${bubbleStyle} break-words w-full message-text-content">
                <span id="text-body-${msg.id}">${formattedText}</span>
                ${!isOriginal ? `
                    <div id="box-translation-${msg.id}" class="translation-box hidden">
                        Original: "${escapeHTML(msg.original_text || msg.text)}"
                    </div>
                ` : ''}
            </div>
            <div class="message-meta-row">
                <span id="status-time-${msg.id}">${statusHtml}</span>
                <span>•</span>
                <span id="status-lang-${msg.id}">${metaString}</span>
                ${toggleBtnHtml ? `<span>•</span> ${toggleBtnHtml}` : ''}
                <span id="status-tick-${msg.id}" class="message-status-icon ml-1"></span>
            </div>
        </div>
    `;

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
            const name = LANG_CODE_TO_NAME[code];
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
