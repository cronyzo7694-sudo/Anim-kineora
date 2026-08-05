# BhashaSetu — Universal Multi-lingual DM Room 🌐

BhashaSetu is a high-performance, real-time multi-lingual direct messaging group chat application. Users can write in any language in the world, and every other participant reads the messages translated into their preferred language in real-time, preserving the original intent.

Built with a minimalist, ultra-professional UI reminiscent of **Apple** products and **Instagram/WhatsApp** direct messaging screens, BhashaSetu requires no signup, login, or database installation.

---

## ✨ Features

- **No Database & No Login**: Users join instantly with zero friction. Messages are stored in a fast local file system cache.
- **WhatsApp & Instagram Bubble Layout**: High-fidelity sent (right-side blue gradient) and received (left-side light gray) message bubbles.
- **World Language Library**: Supports translation into **133+ languages** in real-time.
- **AI Language Suggestion & Detection**: 
  - Real-time language searching.
  - Custom AI-powered detection. Type phrases like *"Bonjour"* or *"Namaste"* in the search bar, and our AI instantly recommends the target language!
- **High-Speed Parallel Translation**: Uses multi-threaded parallel processing (`ThreadPoolExecutor`) in Python to hit translation APIs simultaneously, avoiding serialization bottlenecks.
- **Smart Translation Caching**: Translations are cached in-memory and on disk to deliver immediate (**0ms**) delivery on subsequent message reads.
- **Full Focus Mode (Hide Header 👁️)**: Smoothly collapses the title, headers, and metadata to turn the interface into a full-screen, dedicated chat workspace.
- **Persistent Local Identity**: Random, friendly animal nicknames (e.g. *Toofani Panda 🐼*, *Jugaadi Dinosaur 🦕*) with an instant identity-shuffler dice button.

---

## 🛠️ Technology Stack

- **Backend**: Python 3, FastAPI (Uvicorn)
- **Frontend**: HTML5, Tailwind CSS (CDN), FontAwesome Icons, Vanilla JS ES6
- **AI / Translation Core**: `deep-translator` (Google Translate Engine wrapper), `langdetect` (Language Detection library)

---

## 🚀 How to Run Locally

### 1. Clone the repository
```bash
git clone https://github.com/cronyzo7694-sudo/Anim-kineora.git
cd Anim-kineora
```

### 2. Set up a virtual environment (optional but recommended)
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows, use `.venv\Scripts\activate`
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Start the server
```bash
python server.py
```

The server will start running on **`http://localhost:8000`**. Open this address in your web browser and experience global barrier-free communication!

---

## 💻 Architecture Behind the Translation Speed

1. **The Multithreading Pipeline**: When a client requests the feed in target language $L$, the server inspects the entire message log. Any message that has not yet been translated into $L$ is submitted to a python `ThreadPoolExecutor` of workers. The translations occur in parallel instead of one after another.
2. **Translation Verification**: The server filters out raw Google-Translate rate-limiting error pages or block errors, falling back gracefully to the original text without throwing a `500 Server Error`.
3. **Dual-Tier Cache**: Successfully computed translations are stored in-memory (fast reads) and serialized into `data/translations.json` (persistence), meaning translation latency occurs exactly once.

---

## 🎨 Minimalist Apple-Inspired Design Philosophy

- **Background**: Soft radial neutral gradient (`#f5f7fa` to `#e8ecf2`) to prevent visual strain.
- **Typography**: Clean, responsive layout utilizing `Plus Jakarta Sans` weights.
- **Metallic Accents**: Muted headers using rich background text clipping.
- **Shadows**: Softest, diffuse light shadows representing modern organic elements.

---

Made with ❤️ for barrier-free global communication. Feel free to fork and open PRs!
