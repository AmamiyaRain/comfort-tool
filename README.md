# CBE Thermal Comfort Tool

This repository is currently maintained as a Svelte 5 frontend application for thermal-comfort exploration.

## Current Status

- Active app: `frontend/`
- Current calculation engine: frontend-local `jsthermalcomfort` wrappers in `frontend/src/services/comfort/`
- Shared controller: `frontend/src/state/comfortTool/`
- Legacy reference only: `backend/`

The backend remains in the repo as deprecated reference code and is not required for normal frontend development.

## Frontend Commands

Install dependencies:

```bash
cd frontend
npm install
```

Start the dev server:

```bash
cd frontend
npm run dev
```

Run tests:

```bash
cd frontend
npm test
```

Create a production build:

```bash
cd frontend
npm run build
```

## Architecture Summary

The frontend is organized around a single comfort-tool controller:

- `frontend/src/models/`: domain constants, field metadata, DTOs
- `frontend/src/services/comfort/`: PMV, UTCI, comfort-zone, psychrometric, and chart builders
- `frontend/src/state/comfortTool/`: controller composition, selectors, request builders, input mutations
- `frontend/src/components/input-panel/`: input workflow UI
- `frontend/src/components/chart/`: chart rendering and export UI
- `frontend/src/views/ComfortDashboard.svelte`: page composition only

Important runtime rules:

- canonical state is SI
- calculations live in `services/comfort/`
- components should not implement formulas
- Flowbite + Tailwind are preferred for UI composition

## Documentation

- Collaboration rules: `AGENTS.md`
- Frontend architecture notes: `frontend/FRONTEND_ARCHITECTURE.md`
