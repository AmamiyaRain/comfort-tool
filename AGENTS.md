# Repository Guidelines

## Active Scope

This repository is maintained as a frontend-first project.

- Active product code lives in `frontend/`.
- `backend/` is legacy reference code and is not the source of truth for current architecture decisions.
- New work should not depend on the backend unless a task explicitly says to revive it.

## Frontend Structure

Primary source tree:

```text
frontend/src/
  components/
    chart/                 chart rendering and export UI
    input-panel/           input-panel subcomponents
  models/                  controlled domain constants and metadata
  services/
    comfort/               all thermal-comfort calculations and chart builders
  state/
    comfortTool/           controller, selectors, request builders, mutations
  views/                   page composition only
```

Key entrypoints:

```text
frontend/src/App.svelte
frontend/src/views/ComfortDashboard.svelte
frontend/src/state/comfortTool.svelte.ts
```

Generated or local-only directories:

```text
frontend/node_modules/
frontend/dist/
backend/.venv/
__pycache__/
```

Never commit generated artifacts.

## Architecture Rules

### Calculation Ownership

Thermal-comfort calculations currently run in the frontend.

- Allowed calculation location: `frontend/src/services/comfort/**`
- Allowed lightweight frontend logic outside that directory:
  - SI/IP conversion
  - formatting
  - state orchestration
  - chart rendering
  - share-link serialization
- Not allowed outside `services/comfort/**`:
  - PMV / PPD computation
  - UTCI computation
  - comfort-zone solving
  - psychrometric chart series generation
  - UTCI stress band logic

Only `frontend/src/services/comfort/**` may import `jsthermalcomfort`.

### Dependency Direction

Keep imports moving in one direction:

- `views` -> `components`, `state`
- `components` -> `state`, `models`, lightweight `services`
- `state` -> `models`, `services`
- `services` -> `models`

Avoid reverse dependencies.

### State Rules

- Canonical domain state stays in SI units.
- UI components must not keep competing copies of shared state.
- The comfort tool controller is the single shared state entrypoint.
- Controller responsibilities:
  - state storage
  - UI mode transitions
  - derived display-state synchronization
  - calculation scheduling
  - share snapshot import/export
- Controller must not absorb raw formula implementations.

### Component Rules

- Prefer Flowbite Svelte components before custom UI.
- Use Tailwind utilities before handwritten CSS.
- Components should be presentational or interaction-focused.
- If a component starts combining layout, domain branching, modal state, and data shaping, split it.
- New shared components should usually have at least two real call sites. Otherwise keep them feature-local first.

### File Size Rules

Soft limits for source files:

- Aim for under 250 lines for components, controller modules, and services.
- Over 400 lines requires an explicit reason in the PR or a follow-up split.
- Large constant tables and fixture-like metadata are exempt.

## Domain Modeling

Do not introduce raw domain strings for:

- model identifiers
- field identifiers
- chart identifiers
- compare-case identifiers

Use centralized constants and typed metadata from `frontend/src/models/`.

## Coding Style

### Svelte / TypeScript

- Svelte 5 conventions for new code
- 2-space indentation
- `camelCase` for variables and functions
- `PascalCase` for component filenames
- Prefer TypeScript for new logic-bearing modules

### Scientific and UI Boundaries

- Keep formulas out of components.
- Keep formatting and interaction logic out of `services/comfort/**` where possible.
- Keep DTO/request construction in the controller layer, not inside components.

## Testing And Done Criteria

Frontend validation commands:

```bash
cd frontend && npm test
cd frontend && npm run build
```

A frontend change is done when:

- tests pass
- production build passes
- no new raw domain strings were introduced
- `jsthermalcomfort` imports remain isolated to `services/comfort/**`
- the change preserves SI as canonical state
- the diff keeps module boundaries clear

## Documentation Expectations

When architecture changes:

- update `README.md` if setup or project positioning changed
- update `frontend/FRONTEND_ARCHITECTURE.md` if module boundaries or state flow changed
- keep this `AGENTS.md` focused on execution rules, not historical explanations
