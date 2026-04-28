# Frontend Structure Summary

## Overall Purpose

This project is a Svelte 5 frontend for exploring thermal comfort calculations. The application lets users enter environmental and personal parameters, run comfort calculations, and view both numeric results and charts.

The current active application is the repository root version.

## Main Runtime Flow

`src/App.svelte`
- Application entry point.
- Creates the main comfort-tool state controller.
- Loads shared state from the URL when present.
- Triggers the initial calculation when the page opens.

`src/views/ComfortDashboard.svelte`
- Main page composition.
- Connects the input panel, results panel, and chart panel.
- Keeps layout separate from domain logic.

## Directory Summary

`src/components/`
- Reusable UI components.
- Contains layout components, results display, search/select inputs, and clothing tools.

`src/components/chart/`
- Chart-specific UI.
- Handles chart display, export, and Plotly rendering.

`src/components/input-panel/`
- Input workflow UI.
- Handles model selection, compare mode, unit switching, and input editing.

`src/models/`
- Domain constants and metadata.
- Defines model IDs, chart IDs, field keys, field metadata, DTOs, units, and preset options.

`src/services/comfort/`
- Thermal-comfort calculation layer.
- Contains PMV, UTCI, comfort-zone, input-derivation, and chart-building logic.

`src/services/comfort/charts/`
- Builds Plotly-ready chart data for PMV and UTCI views.

`src/services/comfort/controls/`
- Encapsulates advanced PMV input behavior and reusable numeric control behavior.

`src/services/units/`
- Centralized SI to display-unit conversion helpers.
- Keeps canonical shared state in SI units.

`src/state/comfortTool/`
- Main shared controller for the application.
- Owns UI state, canonical input state, model configuration, and share-state logic.

`src/views/`
- Page-level composition only.

`public/brand-media/`
- Static media assets used by the UI.

## Key Files And Their Roles

`src/state/comfortTool/createComfortToolState.svelte.ts`
- Main controller for the tool.
- Creates canonical input state and UI state.
- Recomputes derived input view data from canonical inputs via Svelte `$derived.by()`.
- Exposes actions and selectors used by the interface.
- Tracks per-model calculation caches with explicit `empty` / `stale` / `ready` status.
- Invalidates model caches without wiping raw results and rebuilds presentation from selectors.

`src/state/comfortTool/types.ts`
- Central type definitions for controller state, model cache state, actions, selectors, and presentation view models.

`src/state/comfortTool/modelConfigs/index.ts`
- Registry of supported comfort models.
- Connects model IDs to their model-specific definitions.

`src/state/comfortTool/modelConfigs/pmv.ts`
- PMV model definition.
- Declares PMV controls, typed PMV calculations, SI chart-source generation, and PMV presentation builders.

`src/state/comfortTool/modelConfigs/utci.ts`
- UTCI model definition.
- Declares UTCI controls, typed UTCI calculations, SI chart-source generation, and UTCI presentation builders.

`src/state/comfortTool/shareState.ts`
- Owns share snapshot typing, version dispatch, serialization, deserialization, and state-apply helpers.

`src/services/comfort/pmv.ts`
- Wrapper around PMV-related thermal comfort calculations.

`src/services/comfort/utci.ts`
- Wrapper around UTCI calculations.

`src/services/comfort/referenceValues.ts`
- Adapts library-backed `met` and `clo` reference datasets into UI-ready option metadata.

`src/services/comfort/comfortZone.ts`
- Computes comfort-zone boundaries used in chart visualizations.

`src/services/comfort/inputDerivations.ts`
- Handles derived values such as dew point, humidity ratio, wet-bulb temperature, vapor pressure, operative temperature, relative air speed transformations, and derived-by-input aggregation.

`src/services/comfort/charts/pmvCharts.ts`
- Builds PMV chart presentation from canonical SI chart source and the active display unit system.

`src/services/comfort/charts/sharedCharts.ts`
- Holds shared chart presentation builders that convert SI source data into display-unit payloads.

`src/services/comfort/charts/utciCharts.ts`
- Builds UTCI chart presentation from cached SI source data and cached raw UTCI results.

`src/services/units/index.ts`
- Centralized unit conversion helpers.
- Converts between canonical SI values and display units used by the UI.

`src/components/input-panel/InputPanel.svelte`
- Container for the input section.
- Combines controls, compare toggles, and input rows.

`src/components/input-panel/InputFieldRow.svelte`
- Renders one logical input row across one or more visible input sets.
- Handles numeric entry, presets, and advanced option menus.
- Canonical state is updated on committed number-field changes instead of every keystroke.

`src/components/input-panel/ToolControls.svelte`
- Handles model selection, compare mode, and unit-system switching.

`src/components/ResultsPanel.svelte`
- Displays calculated result sections for the currently active model.

`src/components/chart/ChartPanel.svelte`
- Displays the currently selected chart and chart selector UI.

`src/components/chart/PlotlyCanvas.svelte`
- Hosts the Plotly chart rendering surface.

`src/components/chart/ChartExportMenu.svelte`
- Provides chart export actions.

`src/components/ClothingEnsembleBuilder.svelte`
- Helps users estimate clothing insulation from clothing ensembles.

## Current Design Principles

- Canonical shared state is stored in SI units.
- Derived input display values are recomputed from canonical inputs instead of being stored as mutable controller state.
- Raw calculation caches are stored in SI and kept separate from result/chart presentation.
- Result sections, chart payloads, units, and tone styling are derived in selectors or presentation builders, not stored in canonical state.
- Calculation formulas stay in `src/services/comfort/`, not in UI components.
- Library reference datasets such as metabolic tasks and clothing presets are adapted in `src/services/comfort/`.
- Views handle composition.
- Components handle rendering and interaction.
- State coordinates inputs, selections, cache invalidation, scheduling, and share-state application.
- Metadata in `src/models/` provides stable identifiers and configuration.
- Input identifiers/defaults are separated from input display/theme metadata.
- Share URLs remain versioned and must evolve through explicit snapshot parsing and migration entrypoints.

## What Was Improved Recently

- Per-model caches now preserve typed raw results instead of storing `unknown` buckets and preformatted UI payloads.
- Unit switching now rebuilds result and chart presentation consistently from SI source data.
- Share-state ownership is centralized in one module with explicit version dispatch.
- Numeric input fields now commit on change/blur so blank values are not committed as `0`.
- `met` and `clo` option values now come from `jsthermalcomfort` through a comfort-service adapter instead of duplicated model data.
- Shared calculation flow remains validated through automated tests and a successful production build.
