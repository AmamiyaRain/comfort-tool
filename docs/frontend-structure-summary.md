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
- Owns UI state, input state, derived state, model configuration, and share-state logic.

`src/views/`
- Page-level composition only.

`public/brand-media/`
- Static media assets used by the UI.

## Key Files And Their Roles

`src/state/comfortTool/createComfortToolState.svelte.ts`
- Main controller for the tool.
- Creates canonical input state and UI state.
- Exposes actions and selectors used by the interface.
- Schedules calculations and stores results.

`src/state/comfortTool/types.ts`
- Central type definitions for controller state, actions, selectors, and result structures.

`src/state/comfortTool/derivedState.ts`
- Maintains derived values for each input set.
- Refreshes psychrometric and related calculated input values.

`src/state/comfortTool/modelConfigs/index.ts`
- Registry of supported comfort models.
- Connects model IDs to their model-specific definitions.

`src/state/comfortTool/modelConfigs/pmv.ts`
- PMV model definition.
- Declares PMV controls, PMV calculations, chart generation, and result formatting.

`src/state/comfortTool/modelConfigs/utci.ts`
- UTCI model definition.
- Declares UTCI controls, UTCI calculations, chart generation, and result formatting.

`src/state/comfortTool/shareState.ts`
- Serializes and restores shareable application state through the URL.

`src/services/comfort/pmv.ts`
- Wrapper around PMV-related thermal comfort calculations.

`src/services/comfort/utci.ts`
- Wrapper around UTCI calculations.

`src/services/comfort/comfortZone.ts`
- Computes comfort-zone boundaries used in chart visualizations.

`src/services/comfort/inputDerivations.ts`
- Handles derived values such as dew point, humidity ratio, wet-bulb temperature, vapor pressure, operative temperature, and relative air speed transformations.

`src/services/comfort/charts/pmvCharts.ts`
- Builds PMV chart data such as psychrometric visualizations.

`src/services/comfort/charts/sharedCharts.ts`
- Holds chart helpers shared across related chart views.

`src/services/comfort/charts/utciCharts.ts`
- Builds UTCI chart data.

`src/services/units/index.ts`
- Centralized unit conversion helpers.
- Converts between canonical SI values and display units used by the UI.

`src/components/input-panel/InputPanel.svelte`
- Container for the input section.
- Combines controls, compare toggles, and input rows.

`src/components/input-panel/InputFieldRow.svelte`
- Renders one logical input row across one or more visible input sets.
- Handles numeric entry, presets, and advanced option menus.

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
- Calculation formulas stay in `src/services/comfort/`, not in UI components.
- Views handle composition.
- Components handle rendering and interaction.
- State coordinates inputs, selections, scheduling, and results.
- Metadata in `src/models/` provides stable identifiers and configuration.

## What Was Improved Recently

- The state structure was made more generic so it is easier to extend without adding more hardcoded model-specific fields.
- More chart and derivation logic was kept in service and model-configuration layers instead of UI components.
- Shared calculation flow remains validated through automated tests and a successful production build.
