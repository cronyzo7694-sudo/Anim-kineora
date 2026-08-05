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

// Client-Side Cache for 0ms transitions (SWR Pattern)
const clientTranslationCache = {};

// Custom unique anonymous chat identity generator lists
const avatars = ["🦁", "🐯", "🐼", "🦊", "🐸", "🐨", "🐵", "🦄", "🐙", "🦕", "🦥", "🦉", "🦚", "🐬"];
const adjectives = ["Toofani", "Desi", "Bindass", "Jugaadi", "Sanskari", "Mast", "Dhakad", "Chalaak", "Shanti", "Gabru", "Naughty", "Shana", "Smart", "Cool"];
const animals = ["Lion", "Panda", "Fox", "Frog", "Koala", "Monkey", "Unicorn", "Octopus", "Dinosaur", "Sloth", "Owl", "Peacock", "Dolphin"];
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
// 👤 INITIALIZE USER CREDENTIALS & IDENTITY
// ========================================================
let currentSender = localStorage.getItem("chatSenderName");
let currentAvatar = localStorage.getItem("chatSenderAvatar") || "🦁";

function setIdentity(avatar, name) {
    currentAvatar = avatar;
    currentSender = name;
    localStorage.setItem("chatSenderAvatar", avatar);
    localStorage.setItem("chatSenderName", name);
    
    postAvatar.value = avatar;
    postSender.value = `${avatar} ${name}`;
    avatarPreview.textContent = avatar;
    senderDisplay.textContent = name;
}

function shuffleIdentity() {
    const avatar = avatars[Math.floor(Math.random() * avatars.length)];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const animal = animals[Math.floor(Math.random() * animals.length)];
    const name = `${adj} ${animal}`;
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
        
        // Settings based on speed
        const duration = isHighSpeed ? 0.35 : 0.65;
        const startFreq = isHighSpeed ? 140 : 80;
        const endFreq = isHighSpeed ? 1600 : 900;
        const volume = isHighSpeed ? 0.45 : 0.25;
        
        // Lowpass filter for deep motor thrust
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
        // Hot flame colors: orange, red, yellow
        const colors = [
            "rgba(255, 69, 0, 0.7)",  // Red-orange
            "rgba(255, 140, 0, 0.6)", // Dark Orange
            "rgba(255, 215, 0, 0.8)",   // Gold/Yellow
            "rgba(255, 0, 0, 0.4)"     // Soft red
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
    
    // Spawn 15 particles per frame for intense volume
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
    
    // Synthesize deep rumble fire roar sound
    playFireRoarSound();
    
    // Exactly 300ms (0.3s) later, stop everything cleanly
    setTimeout(() => {
        fireOverlay.classList.remove("active");
        cancelAnimationFrame(flameAnimationId);
        canvasCtx.clearRect(0, 0, flamesCanvas.width, flamesCanvas.height);
    }, 300);
}

function playFireRoarSound() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const bufferSize = ctx.sampleRate * 0.3; // 0.3s duration buffer
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        // Generate brown noise / rumble
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = data[i];
            data[i] *= 4.5; // Amplify rumble
        }
        
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 180; // deep bass rumble
        
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
// 🚀 SWIPE-TO-SEND DRAGGABLE ROCKET LOGIC
// ========================================================
let isDragging = false;
let startX = 0;
let dragOffset = 0;
let swipeStartTime = 0;
const maxOffset = 88; // Slide limit inside channel

// Show/Hide Bouncing Guide Arrow (Tutorial helper)
function checkSwipeGuide() {
    const hasSwiped = localStorage.getItem("hasSwipedBefore") === "true";
    if (!hasSwiped && postText.value.trim().length > 0) {
        swipeGuide.classList.add("visible");
    } else {
        swipeGuide.classList.remove("visible");
    }
}

postText.addEventListener("input", checkSwipeGuide);

// Drag Handler (Supports Mouse & Touch simultaneously)
function startDrag(e) {
    isDragging = true;
    startX = e.clientX || (e.touches && e.touches[0].clientX);
    swipeStartTime = Date.now();
    fireTrail.classList.add("active");
    swipeRocket.style.transition = "none"; // Stop snapping transitions
    swipeGuide.classList.remove("visible");
}

function handleDrag(e) {
    if (!isDragging) return;
    const currentX = e.clientX || (e.touches && e.touches[0].clientX);
    dragOffset = currentX - startX;
    
    // Lock drag between 0px and maxOffset (right limit)
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
    
    // Check if dragged past threshold to trigger send
    if (dragOffset >= 80) {
        const text = postText.value.trim();
        if (text) {
            // Speed calculation
            const isHighSpeed = swipeDuration < 160; // Swiped very quickly!
            
            // Play launching sound & Fire effects!
            playRocketLaunchSound(isHighSpeed);
            if (isHighSpeed) {
                triggerFireScreenOverlay();
            }
            
            // Mark tutorial done
            localStorage.setItem("hasSwipedBefore", "true");
            
            // Deliver Message
            await sendChatMessage(text);
        } else {
            // Snap back if input empty
            snapRocketBack();
        }
    } else {
        // Snap back if threshold not met
        snapRocketBack();
    }
}

function snapRocketBack() {
    swipeRocket.style.transition = "transform 250ms cubic-bezier(0.175, 0.885, 0.32, 1.25)";
    swipeRocket.style.transform = "translateX(0px)";
    dragOffset = 0;
    checkSwipeGuide();
}

// Bind Touch/Mouse Event Listeners
swipeRocket.addEventListener("mousedown", startDrag);
window.addEventListener("mousemove", handleDrag);
window.addEventListener("mouseup", endDrag);

swipeRocket.addEventListener("touchstart", startDrag, { passive: true });
window.addEventListener("touchmove", handleDrag, { passive: false });
window.addEventListener("touchend", endDrag);

// ========================================================
// 📩 CHAT MESSAGES DISPATCH (OPTIMISTIC UI UPDATE)
// ========================================================
async function sendChatMessage(text) {
    // Clear input box immediately (0ms response time!)
    postText.value = "";
    snapRocketBack();
    
    const tempMsgId = `temp_${Date.now()}`;
    const optimisticMsg = {
        id: tempMsgId,
        sender: `${currentAvatar} ${currentSender}`,
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
            body: JSON.stringify({ sender: `${currentAvatar} ${currentSender}`, avatar: currentAvatar, text })
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
// 🚀 BOOTSTRAP LOGIC
// ========================================================
(async function init() {
    currentLangText.textContent = selectedLanguageName;
    
    await fetchLanguages();
    await fetchMessages(true); // Initial load scroll to bottom
    startAutoRefreshTimer();
})();
