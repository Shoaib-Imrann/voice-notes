A showcase demo of an AI voice notes platform that transcribes audio recordings into text and generates structured summaries using Gnani Speech-to-Text and Google Gemini AI.

---

## Features

- **Silence-Aware Audio Chunking**: Segments long audio files at natural speech pauses (8s-12s window) to ensure optimal transcription accuracy and stay within API payload limits.
- **Speech Transcription**: Integrates with Gnani Prisma ASR with 16kHz mono normalization, sub-chunk fallback recovery, and rate-limit backoff handling.
- **Adaptive AI Summarization**: Uses Google Gemini to generate structured output:
  - Executive Summary: Clear overview of the audio content.
  - Key Takeaways: Main points and concepts.
  - Action Items: Actionable follow-ups mentioned in the audio.
  - Topic Tags: Categorical subject pills.
- **Dual Storage Support**:
  - Production: Stores audio binaries in Supabase Cloud Storage.
  - Development: Falls back to local disk storage (`/uploads`).
- **Crash Recovery & Retries**: Automatically identifies and recovers interrupted tasks upon server restart with a 1-click retry mechanism.
- **IP Rate Limiting & Protection**: Built-in sliding window rate limiter protects API quotas against spam.
- **Telegram Alerts**: Instant notifications for audio uploads, processing completions, errors, and server restarts.
- **Modern Web Interface**: Next.js 14 frontend with live service connection indicators, waveform audio player, and searchable note history.

---

## Repository Structure

```text
Ai-audio-notes/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/    # REST endpoints (notes, health)
│   │   ├── core/                # App configuration, settings & rate limiter
│   │   ├── db/                  # SQLAlchemy session & base models
│   │   ├── models/              # AudioNote schema & models
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   └── services/            # Gnani ASR, Gemini LLM, Notifier, Background tasks
│   ├── alembic/                 # Database migrations
│   ├── requirements.txt         # Python dependencies
│   └── .env.example             # Backend environment template
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js 14 App Router pages
│   │   ├── components/          # React components (AudioPlayer, NewNoteHero, etc.)
│   │   ├── lib/                 # Axios client, React Query providers
│   │   └── types/               # TypeScript interfaces
│   ├── package.json             # Node dependencies
│   └── .env.example             # Frontend environment template
└── README.md
```

---

## Local Setup

### Prerequisites
- Python 3.10+
- Node.js 18+ & pnpm (or npm)
- ffmpeg installed on system (required for audio processing)
  - macOS: `brew install ffmpeg`
  - Ubuntu/Debian: `sudo apt-get install ffmpeg`

---

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your credentials

# Start backend server
uvicorn app.main:app --reload --port 8000
```

The backend server runs at `http://localhost:8000`.  
Swagger API Docs: `http://localhost:8000/docs`

---

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The frontend app runs at `http://localhost:3000`.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
| :--- | :---: | :--- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `GNANI_API_KEY` | Yes | Gnani Prisma STT API Key |
| `GNANI_STT_URL` | No | Gnani ASR endpoint (default: `https://api.vachana.ai/stt/v3`) |
| `GEMINI_API_KEY` | Yes | Google Gemini API Key |
| `GEMINI_MODEL` | No | Gemini model name (default: `gemini-3.6-flash`) |
| `SUPABASE_URL` | Optional | Supabase project URL (for cloud audio storage) |
| `SUPABASE_KEY` | Optional | Supabase service key |
| `TELEGRAM_BOT_TOKEN` | Optional | Telegram Bot token for alerts |
| `TELEGRAM_CHAT_ID` | Optional | Telegram chat ID for alerts |
| `BACKEND_CORS_ORIGINS`| No | Allowed origins (comma-separated) |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
| :--- | :---: | :--- |
| `NEXT_PUBLIC_API_URL` | Yes | Backend API Base URL (e.g. `http://localhost:8000/api/v1`) |

---

## Production Deployment

### Backend (Render)
1. Create a **Web Service** on Render pointing to your repository.
2. Set Root Directory: `backend`
3. Set Build Command: `pip install -r requirements.txt`
4. Set Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add the environment variables from the table above in Render Environment Settings.

### Frontend (Vercel)
1. Import the repository on Vercel.
2. Set Root Directory: `frontend`
3. Configure `NEXT_PUBLIC_API_URL` pointing to your deployed backend URL.
4. Deploy.
