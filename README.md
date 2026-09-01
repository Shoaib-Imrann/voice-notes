An AI-powered voice notes platform that transcribes audio recordings into text and generates structured summaries using Gnani Speech-to-Text and Google Gemini AI.

---

## Features

- **Silence-Aware Audio Chunking**: Segments long audio files at natural speech pauses (8s-12s window) to ensure optimal transcription accuracy and stay within API payload limits.
- **Speech Transcription**: Integrates with Gnani Prisma ASR with 16kHz mono normalization, sub-chunk fallback recovery, and rate-limit backoff handling.
- **Adaptive AI Summarization**: Uses Google Gemini to generate structured output:
  - Executive Summary: Clear overview of the audio content.
  - Key Takeaways: Main points and concepts.
  - Topic Tags: Categorical subject pills.
- **Crash Recovery & Retries**: Automatically identifies and recovers interrupted tasks upon server restart with a 1-click retry mechanism.


---

## Local Setup

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
| `GEMINI_API_KEY` | Yes | Google Gemini API Key |
| `BACKEND_CORS_ORIGINS`| No | Allowed origins (comma-separated) |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
| :--- | :---: | :--- |
| `NEXT_PUBLIC_API_URL` | Yes | Backend API Base URL (e.g. `http://localhost:8000/api/v1`) |


