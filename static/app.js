/**
 * ========================================================
 * BhashaSetu Premium Messenger Core Application Logic
 * Production-ready Vanilla JS ES6 matching strict guidelines
 * ========================================================
 */

// Application State
let selectedLanguage = localStorage.getItem("selectedLanguageCode") || "en";
let selectedLanguageName = localStorage.getItem("selectedLanguageName") || "English";
let activeChatId = "global-lobby"; // "global-lobby", "announcements", "ai-assistant"
let languages = [];
let messagesData = [];
let refreshTimer = null;
let timeLeft = 5;

// Client-Side Translation Cache for SWR (Stale-While-Revalidate) 0ms Transitions
const clientTranslationCache = {};

// Custom unique anonymous chat identity generator lists
const avatars = ["🦁", "🐯", "🐼", "🦊", "🐸", "🐨", "🐵", "🦄", "🐙", "🦕", "🦥", "🦉", "🦚", "🐬"];
const adjectives = ["Toofani", "Desi", "Bindass", "Jugaadi", "Sanskari", "Mast", "Dhakad", "Chalaak", "Shanti", "Gabru", "Naughty", "Shana", "Smart", "Cool"];
const animals = ["Lion", "Panda", "Fox", "Frog", "Koala", "Monkey", "Unicorn", "Octopus", "Dinosaur", "Sloth", "Owl", "Peacock", "Dolphin"];
const popularCodes = ["hi", "es", "en", "fr", "ar", "de", "ru", "pt", "ja", "zh-CN"];

// Mock Static Data for Announcements Room
const announcementMessages = [
    {
        id: "ann_1",
        sender: "System Administrator 📢",
        avatar: "⚙️",
        translated_text: "Welcome to BhashaSetu! This is the Announcements room. Here you will find helpful tips about using our real-time multi-lingual message board.",
        timestamp: "10:00 AM",
        original_lang_name: "English",
        original_lang: "en"
    },
    {
        id: "ann_2",
        sender: "System Administrator 📢",
        avatar: "⚙️",
        translated_text: "Tip 💡: Click the Language button on the top right. Type any sentence like 'Bonjour' or 'Namaste' in the search bar. Our AI will automatically detect the language and suggest it instantly!",
        timestamp: "10:05 AM",
        original_lang_name: "English",
        original_lang: "en"
    },
    {
        id: "ann_3",
        sender: "System Administrator 📢",
        avatar: "⚙️",
        translated_text: "Tip 🚀: Click on 'Show Original' link below any translated message to compare translations and inspect the original phrasing in real-time!",
        timestamp: "10:10 AM",
        original_lang_name: "English",
        original_lang: "en"
    }
];

// Mock State for AI Assistant Private Chat Room
const aiAssistantMessages = [
    {
        id: "ai_1",
        sender: "AI Assistant Bot 🤖",
        avatar: "🤖",
        translated_text: "Hello! I am your personal multi-lingual AI Assistant. You can message me in any language, and I will converse with you fluently. Try texting me!",
        timestamp: "12:00 PM",
        original_lang_name: "English",
        original_lang: "en"
    }
];

// DOM Elements
const appContainer = document.getElementById("app-container");
const sidebar = document.getElementById("sidebar");
const chatWindow = document.getElementById("chat-window");

// Header elements
const backButton = document.getElementById("back-button");
const headerAvatar = document.getElementById("header-avatar");
const headerTitle = document.getElementById("header-title");
const headerSubtitle = document.getElementById("header-subtitle");
const openLangModalBtn = document.getElementById("open-lang-modal-btn");
const currentLangText = document.getElementById("current-lang-text");
const manualRefreshBtn = document.getElementById("manual-refresh-btn");

// Chat stream & message input
const messagesContainer = document.getElementById("messages-container");
const messageForm = document.getElementById("message-form");
const postText = document.getElementById("post-text");
const submitBtn = document.getElementById("submit-btn");
const postAvatar = document.getElementById("post-avatar");
const postSender = document.getElementById("post-sender");
const avatarPreview = document.getElementById("avatar-preview");
const senderDisplay = document.getElementById("sender-display");
const shuffleIdentityBtn = document.getElementById("shuffle-identity-btn");
const countdownIndicator = document.getElementById("countdown-indicator");
const secondsLeftSpan = document.getElementById("seconds-left");

// Language modal elements
const langModal = document.getElementById("lang-modal");
const closeLangModalBtn = document.getElementById("close-lang-modal-btn");
const langSearchInput = document.getElementById("lang-search-input");
const aiSuggestionBox = document.getElementById("ai-suggestion-box");
const aiSuggestionList = document.getElementById("ai-suggestion-list");
const popularLangsGrid = document.getElementById("popular-languages-grid");
const allLangsGrid = document.getElementById("all-languages-grid");

// Sidebar chat list items
const chatItems = document.querySelectorAll(".chat-item");

// ========================================================
// INITIALIZATION & USER CREDENTIALS
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
// RESPONSIVE VIEW TOGGLING (MOBILE & DESKTOP)
// ========================================================
// On Mobile: Click chat item -> Hide sidebar, Show Chat Window
// Click Back button -> Show sidebar, Hide Chat Window
function initResponsive() {
    // Set default mobile view class on initial load
    if (window.innerWidth <= 767) {
        appContainer.classList.add("sidebar-active");
    }
}

backButton.addEventListener("click", () => {
    appContainer.classList.add("sidebar-active");
});

// Handle resize events to prevent stuck states
window.addEventListener("resize", () => {
    if (window.innerWidth >= 768) {
        appContainer.classList.remove("sidebar-active");
    } else {
        if (!appContainer.classList.contains("sidebar-active") && activeChatId === "") {
            appContainer.classList.add("sidebar-active");
        }
    }
});

// ========================================================
// SIDEBAR ROOM SWITCHING
// ========================================================
chatItems.forEach(item => {
    item.addEventListener("click", () => {
        // Toggle active styling
        chatItems.forEach(c => c.classList.remove("active"));
        item.classList.add("active");
        
        // Clear unread badge on click
        const badge = item.querySelector(".unread-badge");
        if (badge) badge.classList.add("hidden");
        
        const roomId = item.dataset.id;
        switchRoom(roomId);
    });
});

function switchRoom(roomId) {
    activeChatId = roomId;
    
    // Smooth responsive toggle for mobile
    if (window.innerWidth <= 767) {
        appContainer.classList.remove("sidebar-active");
    }
    
    // Update Header
    if (roomId === "global-lobby") {
        headerAvatar.textContent = "🌐";
        headerTitle.textContent = "Global Chat Area";
        headerSubtitle.textContent = "Auto translating DM Room";
        messageForm.parentElement.classList.remove("hidden"); // Show input
        countdownIndicator.classList.remove("hidden");
        fetchMessages(true);
    } else if (roomId === "announcements") {
        headerAvatar.textContent = "📢";
        headerTitle.textContent = "System Announcements";
        headerSubtitle.textContent = "Read-only channel • Tips & updates";
        messageForm.parentElement.classList.add("hidden"); // Read-only
        countdownIndicator.classList.add("hidden");
        renderAnnouncements();
    } else if (roomId === "ai-assistant") {
        headerAvatar.textContent = "🤖";
        headerTitle.textContent = "AI Translating Assistant";
        headerSubtitle.textContent = "Fluent in 130+ languages • Chat privately";
        messageForm.parentElement.classList.remove("hidden"); // Show input
        countdownIndicator.classList.add("hidden");
        renderAIAssistant();
    }
}

// ========================================================
// MESSAGE STREAM RENDER LOGIC
// ========================================================

// Smooth scroll chat down
function scrollToBottom() {
    setTimeout(() => {
        messagesContainer.scrollTo({
            top: messagesContainer.scrollHeight,
            behavior: 'smooth'
        });
    }, 50);
}

// Render Global Lobby messages
function renderMessages() {
    if (activeChatId !== "global-lobby") return;
    
    if (messagesData.length === 0) {
        messagesContainer.innerHTML = `
            <div class="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-400">
                <i class="fa-regular fa-comment-dots text-4xl text-neutral-600 mb-2"></i>
                <h4 class="font-bold text-sm text-neutral-300">No Messages yet</h4>
                <p class="text-xs max-w-xs mt-1">Be the first to join the chat and write a message in any language!</p>
            </div>
        `;
        return;
    }

    messagesContainer.innerHTML = "";
    
    const wrapper = document.createElement("div");
    wrapper.className = "chat-messages-inner";

    messagesData.forEach(msg => {
        const isMe = msg.sender.includes(currentSender);
        const isOriginal = msg.original_lang === selectedLanguage;
        
        const row = document.createElement("div");
        row.className = `message-row ${isMe ? 'outgoing' : 'incoming'}`;

        let metaString = isOriginal ? `Original: ${msg.original_lang_name}` : `Translated from ${msg.original_lang_name}`;
        const toggleBtnHtml = !isOriginal
            ? `<button onclick="toggleOriginal('${msg.id}')" id="btn-orig-${msg.id}" class="original-text-link">Show Original</button>`
            : '';

        const statusHtml = msg.isPending 
            ? `<span class="animate-pulse"><i class="fa-regular fa-clock"></i> sending...</span>`
            : `<span>${msg.timestamp.split(" ")[1] ? msg.timestamp.split(" ")[1].substring(0, 5) : msg.timestamp}</span>`;

        row.innerHTML = `
            ${!isMe ? `<span class="message-sender">${msg.sender}</span>` : ''}
            <div class="message-bubble">
                <div>${msg.translated_text}</div>
                
                <div class="message-meta-info">
                    ${statusHtml}
                    <span>•</span>
                    <span>${metaString}</span>
                    ${toggleBtnHtml ? `<span>•</span> ${toggleBtnHtml}` : ''}
                </div>
                
                ${!isOriginal ? `
                    <div id="box-orig-${msg.id}" class="original-collapsible-box hidden">
                        Original: "${msg.original_text}"
                    </div>
                ` : ''}
            </div>
        `;
        wrapper.appendChild(row);
    });

    messagesContainer.appendChild(wrapper);
}

// Render Announcements
function renderAnnouncements() {
    messagesContainer.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "chat-messages-inner";

    announcementMessages.forEach(msg => {
        const row = document.createElement("div");
        row.className = "message-row incoming";
        row.innerHTML = `
            <span class="message-sender">${msg.sender}</span>
            <div class="message-bubble">
                <div>${msg.translated_text}</div>
                <div class="message-meta-info">
                    <span>${msg.timestamp}</span>
                </div>
            </div>
        `;
        wrapper.appendChild(row);
    });

    messagesContainer.appendChild(wrapper);
    scrollToBottom();
}

// Render Private AI Assistant
function renderAIAssistant() {
    messagesContainer.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "chat-messages-inner";

    aiAssistantMessages.forEach(msg => {
        const isMe = msg.isMe;
        const row = document.createElement("div");
        row.className = `message-row ${isMe ? 'outgoing' : 'incoming'}`;
        
        row.innerHTML = `
            ${!isMe ? `<span class="message-sender">${msg.sender}</span>` : ''}
            <div class="message-bubble">
                <div>${msg.translated_text}</div>
                <div class="message-meta-info">
                    <span>${msg.timestamp}</span>
                </div>
            </div>
        `;
        wrapper.appendChild(row);
    });

    messagesContainer.appendChild(wrapper);
    scrollToBottom();
}

// Global toggle raw message helper
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
// SYNC FEED LOGIC WITH STALE-WHILE-REVALIDATE CACHING
// ========================================================
async function fetchMessages(forceScroll = false) {
    if (activeChatId !== "global-lobby") return;

    // SWR Cache optimization: Render immediately if cached
    if (clientTranslationCache[selectedLanguage]) {
        messagesData = clientTranslationCache[selectedLanguage];
        renderMessages();
        if (forceScroll) scrollToBottom();
    }

    // Refresh in background
    try {
        openLangModalBtn.classList.add("animate-pulse");

        const res = await fetch(`/api/messages?lang=${selectedLanguage}`);
        const data = await res.json();
        
        openLangModalBtn.classList.remove("animate-pulse");

        const isNewMessageAdded = data.messages.length !== messagesData.length;
        messagesData = data.messages;
        
        // Write into cache
        clientTranslationCache[selectedLanguage] = messagesData;
        
        renderMessages();
        
        if (isNewMessageAdded || forceScroll) {
            scrollToBottom();
        }
    } catch (err) {
        console.error("Failed to load feed:", err);
        openLangModalBtn.classList.remove("animate-pulse");
    }
}

// Countdown timer loop
function startAutoRefreshTimer() {
    if (refreshTimer) clearInterval(refreshTimer);
    timeLeft = 5;
    secondsLeftSpan.textContent = timeLeft;
    
    refreshTimer = setInterval(() => {
        if (activeChatId !== "global-lobby") return;
        
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
// SEND MESSAGE & AI CHAT SIMULATOR
// ========================================================
messageForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = postText.value.trim();
    if (!text) return;
    
    if (activeChatId === "global-lobby") {
        // Optimistic UI update (0ms immediate response)
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
        
        messagesData.push(optimisticMsg);
        renderMessages();
        scrollToBottom();
        
        postText.value = ""; // Clear box instantly
        
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
                alert("Delivery failed");
            }
        } catch (err) {
            console.error(err);
            messagesData = messagesData.filter(m => m.id !== tempMsgId);
            renderMessages();
        }
    } 
    else if (activeChatId === "ai-assistant") {
        // Send message to AI Assistant
        const userMsg = {
            id: `usr_${Date.now()}`,
            sender: `${currentAvatar} ${currentSender}`,
            isMe: true,
            translated_text: text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        aiAssistantMessages.push(userMsg);
        renderAIAssistant();
        postText.value = "";
        
        // Show Typing indicator!
        showAITypingIndicator();
        
        // Trigger private AI assistant response (simulated translated chat)
        setTimeout(async () => {
            removeAITypingIndicator();
            
            // Translate the reply based on the active language
            let aiReplyText = "I have translated your message. You are speaking wonderfully!";
            try {
                const transUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${selectedLanguage}&dt=t&q=${encodeURIComponent("Hello! I received your message: '" + text + "'. I can talk to you in any language. Your translation system is 100% active and running on Cloudflare Edge!")}`;
                const res = await fetch(transUrl);
                const json = await res.json();
                aiReplyText = json[0].map(s => s && s[0] ? s[0] : "").join("");
            } catch (err) {}

            const aiMsg = {
                id: `ai_${Date.now()}`,
                sender: "AI Assistant Bot 🤖",
                isMe: false,
                translated_text: aiReplyText,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            aiAssistantMessages.push(aiMsg);
            renderAIAssistant();
        }, 1500);
    }
});

// Typing Indicator helpers
function showAITypingIndicator() {
    const indicator = document.createElement("div");
    indicator.className = "message-row incoming";
    indicator.id = "ai-typing-row";
    indicator.innerHTML = `
        <span class="message-sender">AI Assistant Bot 🤖</span>
        <div class="typing-bubble">
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
        </div>
    `;
    messagesContainer.querySelector(".chat-messages-inner").appendChild(indicator);
    scrollToBottom();
}

function removeAITypingIndicator() {
    const indicator = document.getElementById("ai-typing-row");
    if (indicator) indicator.remove();
}

// ========================================================
// LANGUAGE SELECTION MODAL LOGIC
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

        // Popular
        if (popularCodes.includes(code) && !cleanFilter) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = btnClass;
            btn.innerHTML = `<span>${name}</span><span class="lang-code">${code}</span>`;
            btn.onclick = () => selectLanguage(code, name);
            popularLangsGrid.appendChild(btn);
        }

        // All
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

openLangModalBtn.addEventListener("click", openLanguageModal);
closeLangModalBtn.addEventListener("click", closeLanguageModal);

window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && langModal.classList.contains("active")) closeLanguageModal();
});
langModal.addEventListener("click", (e) => {
    if (e.target === langModal) closeLanguageModal();
});

// ========================================================
// INITIAL BOOTSTRAP
// ========================================================
(async function init() {
    currentLangText.textContent = selectedLanguageName;
    
    initResponsive();
    await fetchLanguages();
    switchRoom("global-lobby");
    startAutoRefreshTimer();
})();
