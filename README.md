# MOSIP Server Sizing Calculator

Calculate server resources (vCPU, RAM, Pods) needed for MOSIP Registration and ID Authentication deployments.

## Prerequisites

- **Python 3.10+** — [Download](https://www.python.org/downloads/)
- **Node.js 18+** — [Download](https://nodejs.org/)

## Quick Start (Windows)

Double-click `run-app.bat` — it installs everything and starts both servers automatically.

## Manual Setup

### 1. Backend

```bash
cd backend
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend runs at **http://localhost:8000** (API docs at `/docs`)

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:5173**

### 3. Environment Variables (optional)

Frontend `.env` file (already configured for local dev):

```
VITE_API_URL=http://localhost:8000/api/v1
```

## Usage

1. Open **http://localhost:5173** in your browser
2. Select a MOSIP platform version
3. Enter population and device parameters
4. View calculated resource requirements (vCPU, RAM, Pods)
5. Export results as PDF or Excel

## Tech Stack

| Layer    | Technology                  |
|----------|-----------------------------|
| Frontend | React 19 + TypeScript, Vite |
| Backend  | Python, FastAPI, Pydantic   |
| Charts   | Recharts                    |
| Export   | jsPDF, xlsx                 |
