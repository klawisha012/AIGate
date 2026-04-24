# PrivacyGate AI

Secure Gateway Desktop Application with PII Detection and Masking.

## Features

- **Real-time PII Detection**: Automatically detects and masks personally identifiable information
- **Backend-powered PII Masking**: Uses Microsoft Presidio for accurate detection
- **Real AI Responses**: Integrates with OpenRouter for real LLM responses
- **Telegram-style Blur**: Masked PII entities are blurred and can be revealed on click
- **React + Electron Desktop App**: Cross-platform desktop application
- **FastAPI Backend**: High-performance Python backend

## Prerequisites

- Node.js (v18+)
- Python (v3.9+)
- pip
- OpenRouter API key (get it at https://openrouter.ai/keys)

## Installation

### Frontend

```bash
npm install
```

### Backend

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment (recommended):
```bash
python -m venv venv
.\venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Configure OpenRouter API key:
```bash
# Copy the example env file
copy .env.example .env  # Windows
cp .env.example .env      # Linux/Mac

# Edit .env and add your OpenRouter API key
# Get your key at https://openrouter.ai/keys
```

5. Download spaCy language models (required for Presidio):
```bash
# English (required)
python -m spacy download en_core_web_lg

# For other languages (optional):
python -m spacy download de_core_news_lg  # German
python -m spacy download es_core_news_lg  # Spanish
python -m spacy download fr_core_news_lg  # French
python -m spacy download ru_core_news_lg  # Russian (experimental)
```

Note: Presidio requires spaCy models for entity recognition. The more accurate the model (lg > md > sm), the better the detection.

## Running the Application

### Start Backend (Terminal 1):
```bash
npm run backend:dev
```

Or manually:
```bash
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Start Frontend (Terminal 2):
```bash
npm run electron:dev
```

Or for web-only:
```bash
npm run dev
```

### Start Both (requires concurrently):
```bash
npm run dev:full
```

## Backend API Endpoints

- `GET /health` - Health check
- `POST /analyze` - Analyze text for PII entities
- `POST /sanitize` - Sanitize text by replacing PII with masks
- `POST /sanitize-payload` - Sanitize entire JSON payload
- `POST /chat` - Send message to AI (includes PII detection + OpenRouter)

## Features Detail

### Telegram-style Blur Effect
Masked PII entities (like `[MASKED_EMAIL]`, `[MASKED_PHONE]`) are displayed with a blur effect similar to Telegram's spoiler feature:
- Blurred by default
- Click to reveal/hide
- Animated shimmer effect
- Cannot be selected (user-select: none)

### Real AI Integration
Messages are processed by:
1. Detecting and masking PII (using Presidio)
2. Sending sanitized text to OpenRouter (supporting multiple LLM models)
3. Returning the AI response with any masked entities also blurred in the output

## Technologies

- **Frontend**: React, TypeScript, Vite, TailwindCSS, Electron
- **Backend**: FastAPI, Presidio Analyzer, Presidio Anonymizer
- **PII Detection**: Microsoft Presidio

## Notes

- Backend must be running on http://localhost:8000 for PII detection to work
- If backend is not available, Inspection Panel will show connection error
- Presidio requires spaCy language models for text analysis
