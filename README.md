# CBE Thermal Comfort Tool

This repository is maintained as a frontend-first Svelte 5 application for thermal-comfort exploration.

## Current Status

- Active app: `frontend/`
- No active backend runtime in this repository
- Current calculation engine: frontend-local `jsthermalcomfort` wrappers in `frontend/src/services/comfort/`
- Shared controller: `frontend/src/state/comfortTool/`

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



## Architecture Summary

The frontend is organized around a single comfort-tool controller:

- `frontend/src/models/`: domain constants, field metadata, DTOs
- `frontend/src/models/inputSlots.ts`: stable `Input 1/2/3` identifiers, defaults, and UI/chart styling
- `frontend/src/services/comfort/`: PMV, UTCI, comfort-zone, psychrometric, and chart builders
- `frontend/src/services/units/`: canonical SI <-> active unit-system conversion helpers
- `frontend/src/state/comfortTool/`: controller composition, model config registry, derived state, and share snapshot logic
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
- Frontend architecture: `frontend/docs/comfort-tool-architecture.md`
