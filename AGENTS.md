# Repository Guidelines

## Project Structure & Module Organization

This repository contains two applications:

### Frontend
`frontend/` — Svelte 5 + Vite UI

Main source directory:

```text
frontend/src/
```

Important files:

```text
frontend/src/App.svelte
frontend/src/main.js
frontend/src/app.css
```

Recommended structure as the project grows:

```text
frontend/src/
  components/       reusable UI components
  models/           domain models and field definitions
  services/         API clients
  state/            global application state
  views/            page-level components
```

### Backend
`backend/` — FastAPI service

Main file:

```text
backend/main.py
```

Recommended future structure:

```text
backend/
  api/
  models/
  services/
  schemas/
  tests/
```

### Ignored Directories

The following directories are local or generated artifacts:

```text
frontend/node_modules/
frontend/dist/
backend/.venv/
__pycache__/
```

Never commit these directories.

---

## Architecture Principles

### Backend-Driven Calculations

All thermal comfort calculations must run in the backend.

The frontend must not perform domain calculations.

Allowed frontend computation:
- unit conversion (SI ↔ IP)
- UI formatting
- chart rendering
- lightweight display helpers

Not allowed in frontend:
- PMV
- PPD
- UTCI
- SET
- adaptive comfort
- heat stress classification
- psychrometric calculations

All scientific computation must be performed through the backend API.

### Backend Technology

Backend stack:
- FastAPI
- Pydantic models
- NumPy for vectorization
- pythermalcomfort

All domain logic belongs in backend services.

The backend acts as the single source of truth for thermal comfort calculations.

---

## UI Framework Rules

### Flowbite First

The UI must use Flowbite Svelte components whenever possible.

Avoid writing custom CSS unless absolutely necessary.

Preferred stack:

```text
Svelte 5
Flowbite Svelte
Tailwind CSS
```

Allowed uses:
- Navbar
- Sidebar
- Tabs
- Dropdown
- Input
- Select
- Modal
- Card
- Table
- form layout components

Avoid:
- custom layout CSS
- custom button styling
- manual spacing rules
- bespoke component styling when Flowbite already provides an equivalent

Use Flowbite components and Tailwind utility classes first.  
Handwritten CSS should only be used when there is no reasonable Flowbite/Tailwind solution.

### Svelte 5 Requirement

All new frontend code must follow Svelte 5 conventions.

Prefer the current Svelte 5 rune-based approach for new stateful logic.

Do not introduce outdated patterns into new code when a Svelte 5-native approach is cleaner.

---

## Coding Style & Naming Conventions

### Python

- 4-space indentation
- type hints required
- `snake_case` for functions and variables
- `PascalCase` for Pydantic models

Example:

```python
class PmvRequest(BaseModel):
    tdb: float
    tr: float
    vr: float
```

### Svelte / JavaScript / TypeScript

- 2-space indentation
- `camelCase` for variables and functions
- `PascalCase` for component files
- prefer TypeScript for new domain or API-facing code

Example:

```text
ModelSelector.svelte
RelativeHumidityChart.svelte
comfortApi.ts
```

Keep units in SI internally.  
UI-only conversion logic belongs in the frontend.  
All scientific calculations belong in the backend.

---

## Domain Modeling (No Raw Strings)

Hardcoded strings are not allowed for domain values, model identifiers, field identifiers, labels, or categories.

Bad example:

```ts
if (model === "PMV") { ... }
form["rh"] = value
if (field === "tdb") { ... }
```

Correct approach: define controlled value sets and typed structures in a shared domain layer, then import and reuse them everywhere.

### Controlled Value Sets

```ts
export const ComfortModel = {
  Pmv: 'PMV',
  Adaptive: 'ADAPTIVE',
  Set: 'SET',
  Utci: 'UTCI'
} as const;

export type ComfortModel = (typeof ComfortModel)[keyof typeof ComfortModel];
```

### Field Keys

```ts
export const FieldKey = {
  DryBulbTemperature: 'tdb',
  MeanRadiantTemperature: 'tr',
  RelativeHumidity: 'rh',
  RelativeAirSpeed: 'vr',
  MetabolicRate: 'met',
  ClothingInsulation: 'clo'
} as const;

export type FieldKey = (typeof FieldKey)[keyof typeof FieldKey];
```

### Field Metadata

```ts
export interface FieldMeta {
  key: FieldKey;
  labelKey: string;
  unitKey: string;
  assetName?: string;
}
```

### Example Usage

```ts
if (field === FieldKey.DryBulbTemperature) {
  // ...
}
```

This pattern prevents:
- duplicated string literals
- fragile refactors
- UI logic coupled to raw API field names
- inconsistent naming across modules

---

## API Contracts

All API boundaries must use explicit DTOs.

Frontend services must send structured payloads matching backend schemas exactly.

### Frontend DTO Example

```ts
export interface PmvRequestDto {
  tdb: number;
  tr: number;
  vr: number;
  rh: number;
  met: number;
  clo: number;
}
```

### Backend DTO Example

```python
class PmvRequestDto(BaseModel):
    tdb: float
    tr: float
    vr: float
    rh: float
    met: float
    clo: float
```

Do not use ad hoc payloads or UI-specific field names in API requests.

Bad example:

```json
{
  "leftPanelTemperature": 25
}
```

Good example:

```json
{
  "tdb": 25
}
```

---

## Frontend State Rules

### Single Source of Truth

Frontend state must be centralized and predictable.

The UI must not maintain conflicting duplicate state across:
- model selector
- input forms
- unit toggle
- results panel
- compare mode
- chart controls

### Canonical Unit Rule

Frontend canonical state must remain in SI units.

Use derived display logic for:
- IP display
- formatted labels
- slider text
- chart annotations

Do not store converted IP values as canonical domain state.

### No Scientific Business Logic in Components

Svelte components must not implement thermal comfort formulas or classifications.

Components may:
- collect user input
- call API services
- render results
- manage UI state
- perform display-only conversion

Components must not:
- compute PMV/PPD/UTCI/SET
- classify stress categories from raw formulas
- reproduce backend scientific logic in parallel

---

## Charting Rules

### Recommended Library

Preferred frontend charting library: **Plotly.js**

Reason:
- well-suited for scientific and engineering plots
- fast to integrate with backend-generated datasets
- interactive out of the box
- good fit for compare views, heatmaps, and annotated results

Charts should be rendered inside Flowbite layout components such as Card, Tabs, and responsive containers.

### Chart Responsibilities

Frontend charts should only:
- render backend results
- manage interaction state
- handle hover/zoom/export if needed

Chart data preparation should remain lightweight on the frontend.

Any heavy computation required to generate chart series, grids, or classifications must happen in the backend.

---

## Build, Test, and Development Commands

### Frontend

Install dependencies:

```bash
cd frontend && npm install
```

Start dev server:

```bash
cd frontend && npm run dev
```

Create production build:

```bash
cd frontend && npm run build
```

Preview build:

```bash
cd frontend && npm run preview
```

### Backend

Create virtual environment:

```bash
cd backend && python -m venv .venv && source .venv/bin/activate
```

Install dependencies:

```bash
cd backend && pip install -r requirements.txt
```

Run API:

```bash
cd backend && uvicorn main:app --reload --port 8000
```

Health check:

```bash
curl http://localhost:8000/api/health
```

---

## Testing Guidelines

Automated tests are not fully configured yet.

Until test infrastructure is added, validate changes with:

### Frontend validation

```bash
cd frontend && npm run build
```

### Backend validation

```bash
cd backend && uvicorn main:app --reload --port 8000
```

### Manual API check

```bash
curl http://localhost:8000/api/health
```

When adding tests:
- frontend tests go under `frontend/src/` or `frontend/tests/`
- backend tests go under `backend/tests/`

### Testing Expectations for New Code

Any new domain helper, DTO mapper, API client helper, or backend calculation wrapper should include automated tests when test infrastructure is available.

Prefer:
- frontend unit tests for state helpers and API utilities
- backend unit tests for calculation services and schema validation
- integration tests for endpoint contracts

---

## Commit & Pull Request Guidelines

Use short, imperative commit messages.

Examples:

```text
Add UTCI endpoint
Implement model selector
Add relative humidity chart
Refine compare mode request flow
```

Keep commits focused.

Pull requests should include:
- summary of changes
- screenshots for UI updates
- API contract notes if endpoints changed
- manual verification steps
- any known limitations

---

## AI Code Generation Rules

Any AI-generated code must follow these constraints:

1. Follow Svelte 5 conventions for new code.
2. Avoid hardcoded domain strings.
3. Use centralized domain constants, DTOs, and field metadata.
4. Prefer Flowbite Svelte components over handwritten CSS.
5. Do not implement thermal comfort calculations in the frontend.
6. Route all scientific calculations through backend APIs.
7. Keep changes small, local, and reviewable.
8. Do not duplicate backend domain logic in frontend utilities.
9. Prefer typed structures over loose objects.

### AI Output Expectations

When AI generates implementation, it should provide:
- the files to create or edit
- the code
- any required DTO/constants additions
- any backend/frontend contract updates
- tests when applicable

Do not provide explanation-only output when implementation is requested.

---

## Definition of Done

A change is considered complete when all of the following are true:

- frontend builds successfully
- backend starts successfully
- API contract remains consistent
- no raw domain strings were introduced
- Flowbite components were used where appropriate
- no unnecessary handwritten CSS was added
- all scientific calculations run through backend APIs
- SI remains the canonical internal unit
- manual verification steps were completed

---

## If Unsure

When in doubt, prefer:
- explicit DTOs
- centralized field definitions
- backend-owned scientific logic
- Flowbite components
- smaller diffs
- typed domain structures
- predictable state flow

Do not invent undocumented formulas, thresholds, or category labels in the frontend.