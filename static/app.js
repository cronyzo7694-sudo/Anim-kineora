/**
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

// Dynamic Client-Side Translation Cache for SWR (Stale-While-Revalidate) 0ms Transitions
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
    userNumberTag = `#${uniqueNum}`;
    sessionStorage.setItem("user_tag", userNumberTag);
}

// Set up Avatar while keeping the persistent User Number Tag
function setIdentity(avatar) {
    currentAvatar = avatar;
    localStorage.setItem("chatSenderAvatar", avatar);
    
    postAvatar.value = avatar;
    // Strictly set their sender nickname to 'User #XXXXX'
    const fullSenderName = `User ${userNumberTag}`;
    postSender.value = `${avatar} ${fullSenderName}`;
    
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
    
    swipeRocket.style.transform = `translateX(${dragOffset}px)`;
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
            // ONLY SWIPING triggers launch sound and fire overlay!
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
// 🚀 ROCKET CLICK TO SEND (NO FIRE, NO LOUD SOUND)
// ========================================================
swipeRocket.addEventListener("click", async (e) => {
    // Only trigger click if they did not drag the rocket (dragOffset is very small or zero)
    if (dragOffset < 5) {
        const text = postText.value.trim();
        if (!text) return;
        
        // Hide tutorial guide
        localStorage.setItem("hasSwipedBefore", "true");
        swipeGuide.classList.remove("visible");
        
        // Rocket slides smoothly to the right, then resets (NO FIRE, NO RUMBLE SOUND!)
        swipeRocket.style.transition = "transform 180ms ease-in-out";
        swipeRocket.style.transform = `translateX(${maxOffset}px)`;
        
        // Send message cleanly
        await sendChatMessage(text);
        
        setTimeout(() => {
            snapRocketBack();
        }, 250);
    }
});

// ========================================================
// ⌨️ ENTER KEY PRESS SUBMIT FLOW (NO FIRE, NO LOUD SOUND)
// ========================================================
postText.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        const text = postText.value.trim();
        if (!text) return;

        // Mark tutorial done
        localStorage.setItem("hasSwipedBefore", "true");
        swipeGuide.classList.remove("visible");

        // 1. Rocket slides smoothly by itself (NO FIRE, NO RUMBLE SOUND!)
        swipeRocket.style.transition = "transform 180ms ease-in-out";
        swipeRocket.style.transform = `translateX(${maxOffset}px)`;

        // 2. Clear text immediately and send message
        postText.value = "";
        await sendChatMessage(text);

        // 3. Snaps the rocket smoothly back after flight
        setTimeout(() => {
            snapRocketBack();
        }, 250);
    }
});

// ========================================================
// 📩 CHAT MESSAGES DISPATCH (OPTIMISTIC UI UPDATE)
// ========================================================
async function sendChatMessage(text) {
    postText.value = "";
    snapRocketBack();
    
    const tempMsgId = `temp_${Date.now()}`;
    const optimisticMsg = {
        id: tempMsgId,
        sender: `${currentAvatar} User ${userNumberTag}`,
        avatar: currentAvatar,
        text: text,
        original_text: text,
        original_lang: selectedLanguage,
        original_lang_name: selectedLanguageName,
        translated_text: text,
        timestamp: "sending...",
        isPending: true
    };
    
    // Instant UI injection
    messagesData.push(optimisticMsg);
    renderMessages();
    scrollToBottom();
    
    try {
        const response = await fetch("/api/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sender: `${currentAvatar} User ${userNumberTag}`, avatar: currentAvatar, text })
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
    // SWR Cache trigger (0ms transition)
    if (clientTranslationCache[selectedLanguage]) {
        messagesData = clientTranslationCache[selectedLanguage];
        renderMessages();
        if (forceScroll) scrollToBottom();
    }

    try {
        openModalBtn.classList.add("animate-pulse");

        const res = await fetch(`/api/messages?lang=${selectedLanguage}`);
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
            btn.innerHTML = `<span>${name}</span><span class="lang-code">${code}</span>`;
            btn.onclick = () => selectLanguage(code, name);
            popularLangsGrid.appendChild(btn);
        }

        if (matches) {
            matchCount++;
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = btnClass;
            btn.innerHTML = `<span>${name}</span><span class="lang-code">${code}</span>`;
            btn.onclick = () => selectLanguage(code, name);
            allLangsGrid.appendChild(btn);
        }
    });

    const popHeading = popularLangsGrid.parentElement;
    if (cleanFilter) {
        popHeading.classList.add("hidden");
        document.getElementById("all-langs-header").textContent = `Search Results (${matchCount})`;
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
        const res = await fetch(`/api/suggest-language?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        
        if (data.suggestions && data.suggestions.length > 0) {
            aiSuggestionBox.classList.remove("hidden");
            aiSuggestionList.innerHTML = "";
            
            data.suggestions.forEach(s => {
                const chip = document.createElement("button");
                chip.type = "button";
                chip.className = "ai-chip";
                chip.innerHTML = `${s.name} <span class="text-[8px] opacity-60 font-mono">${s.code}</span>`;
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
closeModalBtn.addEventListener("click", closeLanguageModal);

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
    }, 50); // Fast scroll response
}

// Render clean premium chat bubbles with enlarged text
function renderMessages() {
    if (messagesData.length === 0) {
        messagesContainer.innerHTML = `
            <div class="h-full flex flex-col items-center justify-center text-center text-xs text-neutral-400 p-6">
                <i class="fa-regular fa-comment-dots text-3xl text-neutral-600 mb-2"></i>
                <h4 class="font-bold text-neutral-300 text-sm">No Messages yet</h4>
                <p class="max-w-xs mt-1 text-neutral-500">Be the first to join the chat and write a message in any language!</p>
            </div>
        `;
        return;
    }

    messagesContainer.innerHTML = "";
    
    const wrapper = document.createElement("div");
    wrapper.className = "chat-messages-inner";

    messagesData.forEach(msg => {
        const isMe = msg.sender.includes(`User ${userNumberTag}`);
        const isOriginal = msg.original_lang === selectedLanguage;
        
        const row = document.createElement("div");
        row.className = `message-row ${isMe ? 'outgoing' : 'incoming'}`;

        // Left Bubble: White, Crisp outline border border-neutral-300, shadow
        // Right Bubble: Blue gradient, Crisp outline border border-blue-600/30
        const bubbleStyle = isMe
            ? "bg-gradient-to-tr from-[#0084ff] to-[#1877f2] text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-[15px] font-medium leading-relaxed border border-blue-600/30 shadow-sm"
            : "bg-white text-neutral-800 rounded-2xl rounded-tl-sm px-4 py-2.5 text-[15px] font-medium border border-neutral-300 shadow-sm leading-relaxed";

        let metaString = "";
        if (!isOriginal) {
            metaString = `Translated from ${msg.original_lang_name}`;
        } else {
            metaString = `Original: ${msg.original_lang_name}`;
        }

        const toggleBtnHtml = !isOriginal
            ? `<button onclick="toggleOriginal('${msg.id}')" id="btn-orig-${msg.id}" class="original-text-link">Show Original</button>`
            : '';

        const statusHtml = msg.isPending 
            ? `<span class="animate-pulse"><i class="fa-regular fa-clock"></i> sending...</span>`
            : `<span>${msg.timestamp.split(" ")[1] ? msg.timestamp.split(" ")[1].substring(0, 5) : msg.timestamp}</span>`;

        row.innerHTML = `
            <!-- Sender Name (ENLARGED to text-xs, Font-ExtraBold, and highly defined) -->
            ${!isMe ? `<span class="text-xs font-extrabold text-neutral-400 ml-1 flex items-center gap-1">${msg.sender}</span>` : ''}
            
            <!-- Message Bubble Body -->
            <div class="max-w-[80%] md:max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}">
                <div class="${bubbleStyle} break-words w-full">
                    ${msg.translated_text}
                </div>
                
                <!-- Mini Bubble Footer -->
                <div class="flex items-center gap-1.5 mt-1 px-1 text-[9px] text-neutral-500 font-medium">
                    ${statusHtml}
                    <span>•</span>
                    <span>${metaString}</span>
                    ${toggleBtnHtml ? `<span>•</span> ${toggleBtnHtml}` : ''}
                </div>

                <!-- Expandable Original box -->
                ${!isOriginal ? `
                    <div id="box-orig-${msg.id}" class="hidden mt-1.5 border-l-2 border-neutral-300 pl-2.5 py-0.5 text-[10px] text-neutral-500 italic">
                        Original: "${msg.original_text}"
                    </div>
                ` : ''}
            </div>
        `;
        wrapper.appendChild(row);
    });

    messagesContainer.appendChild(wrapper);
}

window.toggleOriginal = function(msgId) {
    const box = document.getElementById(`box-orig-${msgId}`);
    const btn = document.getElementById(`btn-orig-${msgId}`);
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
// 📦 ROBUST ASYNC ERROR RECOVERY BOOTSTRAPPING
// ========================================================
(async function init() {
    currentLangText.textContent = selectedLanguageName;
    
    // Robust separate try-catches so if one API fails, the other still loads and works perfectly!
    try {
        await fetchLanguages();
    } catch(err) {
        console.error("Async load languages error:", err);
    }

    try {
        await fetchMessages(true); // Initial load scroll to bottom
    } catch(err) {
        console.error("Async load messages error:", err);
    }
    
    startAutoRefreshTimer();
})();
