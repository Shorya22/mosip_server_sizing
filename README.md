# MOSIP Resource Calculator

A professional, production-grade server sizing calculator for MOSIP (Modular Open Source Identity Platform) deployments. This application calculates the required server resources (vCPU, RAM, and Pods) for MOSIP Registration and ID Authentication modules.

## Overview

This calculator is based on the official **MOSIP Resource Calculator Excel (Platform Release 1.3.0)** and implements the same formulas and service configurations used in production deployments.

### Features

- **Registration Module Calculator**: Calculate resources for packet upload and sync operations
- **ID Authentication Module Calculator**: Calculate resources for authentication services
- **Combined Calculator**: Get a comprehensive summary of both modules
- **Detailed Service Breakdown**: View resource requirements per service
- **Buffer Calculations**: Includes overhead for monitoring, K8s infrastructure, and system buffers
- **Export Results**: Download calculation results as JSON

## Tech Stack

### Backend
- **Python 3.10+**
- **FastAPI** - Modern, high-performance web framework
- **Pydantic** - Data validation using Python type annotations
- **Uvicorn** - Lightning-fast ASGI server

### Frontend
- **React 18** with TypeScript
- **Vite** - Next-generation frontend tooling
- **Axios** - Promise-based HTTP client
- **Lucide React** - Beautiful icons

## Project Structure

```
Mosip_Resource_Calculator/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes.py          # API endpoints
│   │   ├── core/
│   │   │   ├── config.py          # Application configuration
│   │   │   └── constants.py       # Service definitions & constants
│   │   ├── models/
│   │   │   └── schemas.py         # Pydantic models
│   │   ├── services/
│   │   │   └── calculator.py      # Calculation engine
│   │   └── main.py                # FastAPI application
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── calculator.ts      # API client
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── InputForm.tsx
│   │   │   ├── ModuleDetails.tsx
│   │   │   ├── ResultsPanel.tsx
│   │   │   ├── SummaryCard.tsx
│   │   │   └── TabNavigation.tsx
│   │   ├── types/
│   │   │   └── index.ts           # TypeScript types
│   │   ├── App.tsx
│   │   └── App.css
│   ├── package.json
│   └── .env
└── README.md
```

## Getting Started

### Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run the server:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

   The API will be available at `http://localhost:8000`
   - API Documentation: `http://localhost:8000/docs`
   - ReDoc: `http://localhost:8000/redoc`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5173`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/health` | Health check |
| GET | `/api/v1/config` | Get calculator configuration |
| POST | `/api/v1/calculate/registration` | Calculate Registration resources |
| POST | `/api/v1/calculate/authentication` | Calculate Authentication resources |
| POST | `/api/v1/calculate/combined` | Calculate both modules |
| GET | `/api/v1/services/registration` | Get Registration services list |
| GET | `/api/v1/services/authentication` | Get Authentication services list |

## Calculation Methodology

### Registration Module

```
Daily Registrations = Devices × Registrations per device per day
Peak Daily Upload = Daily Registrations × Peak day multiplier
Peak TPS = Peak Daily Upload / (Upload window hours × 3600)
Scale Factor = Peak TPS / Baseline TPS (22.5)
```

### ID Authentication Module

```
Daily Authentications = Population × Auth percentage per day
Peak Hour Authentications = Daily Authentications × Peak hour percentage
Peak TPS = Peak Hour Authentications / 3600
Scale Factor = Peak TPS / Baseline TPS (50)
```

### Buffer Allocations

- **Monitoring & Logging**: 20% of base resources
- **Kubernetes Infrastructure**: 30% of (base + monitoring)
- **System Buffer**: 30% of K8s infrastructure

## Input Parameters

### Registration Module

| Parameter | Description | Default |
|-----------|-------------|---------|
| total_population | Total population to be registered | Required |
| num_registration_devices | Number of registration kiosks | Required |
| registrations_per_device_per_day | Daily registrations per device | Required |
| upload_window_hours | Hours for packet upload | 1 |
| peak_day_multiplier | Peak day load multiplier | 1.2 |

### ID Authentication Module

| Parameter | Description | Default |
|-----------|-------------|---------|
| total_population | Population with National ID | Required |
| avg_auth_percentage | Daily auth as % of population | Required |
| peak_hour_percentage | Peak hour as % of daily | 0.08 (8%) |

## Output

The calculator provides:

- **Total vCPU** required
- **Total RAM (GB)** required
- **Total Pods** required
- **Peak TPS** calculation
- **Duration** to complete registrations (days)
- **Per-service breakdown** with scaling details
- **Buffer allocation breakdown**

## Important Notes

1. **Storage NOT included**: Disk/storage requirements are not calculated
2. **Excludes**: Pre-Registration, KYC with OTP, post-upload packet processing
3. **Assumptions**: External systems (ABIS) have max 300ms response time
4. **Based on**: MOSIP internal performance testing results

## License

This project is part of the MOSIP ecosystem.

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.
