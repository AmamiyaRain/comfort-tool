# CBE Thermal Comfort Tool Prototype

This repository now contains a minimal prototype for the next iteration architecture:

- `frontend/`: Svelte 5 (Runes) demo UI.
- `backend/`: FastAPI service with a minimal ASHRAE 55 PMV/PPD endpoint.

## What is implemented

- UI layout: inputs on the left, results on the right.
- Centralized frontend state in SI units.
- SI/IP display toggle (conversion only at UI layer).
- Update-on-commit behavior (input change/keyup enter), backend-driven results.
- Realtime psychrometric (air temperature) chart.
- Tailwind + Flowbite Svelte base setup.
- FastAPI + Pydantic request/response models.
- `POST /api/ashrae55/pmv` endpoint.
- `POST /api/ashrae55/pmv-series` endpoint.
- `POST /api/ashrae55/comfort-zone` endpoint.
- PMV/PPD source:
  - Uses `pythermalcomfort` only.

## Run backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Health check:

```bash
curl http://localhost:8000/api/health
```

## Run frontend

```bash
cd frontend
npm install
npm run dev
```

Default API base URL is `http://localhost:8000`.
You can override it with:

```bash
VITE_API_BASE_URL=http://localhost:8000 npm run dev
```

## Minimal API contract

`POST /api/ashrae55/pmv`

Request body:

```json
{
  "tdb": 25.0,
  "tr": 25.0,
  "vr": 0.1,
  "rh": 50.0,
  "met": 1.2,
  "clo": 0.5,
  "wme": 0.0,
  "units": "SI"
}
```

Response body:

```json
{
  "pmv": 0.08,
  "ppd": 5.2,
  "acceptable_80": true,
  "standard": "ASHRAE 55 (PMV/PPD)",
  "source": "pythermalcomfort"
}
```

`POST /api/ashrae55/pmv-series`

Request body:

```json
{
  "tdb": 25.0,
  "tr": 25.0,
  "vr": 0.1,
  "rh": 50.0,
  "met": 1.2,
  "clo": 0.5,
  "wme": 0.0,
  "units": "SI",
  "tdb_min": 20.0,
  "tdb_max": 30.0,
  "points": 25
}
```

`POST /api/ashrae55/comfort-zone`

Request body:

```json
{
  "tdb": 25.0,
  "tr": 25.0,
  "vr": 0.1,
  "rh": 50.0,
  "met": 1.2,
  "clo": 0.5,
  "wme": 0.0,
  "units": "SI",
  "rh_min": 20.0,
  "rh_max": 80.0,
  "rh_points": 13
}
```
