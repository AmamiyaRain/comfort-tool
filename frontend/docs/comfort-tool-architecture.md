# Comfort Tool Frontend Architecture

## Summary

- `src/state/comfortTool/**` owns UI orchestration, compare-input flow, share snapshot application, and scheduling.
- `src/services/comfort/**` owns comfort calculations, psychrometrics, derived-input adapters, and chart building.
- `src/services/units/**` owns display/SI conversion rules.
- Canonical shared state remains SI in `inputsByInput`.
- Compare inputs are identified by stable `InputId` values: `input1`, `input2`, and `input3`.
- Model-specific behavior is registered through `src/state/comfortTool/modelConfigs/**`.
- Share URL snapshot serialization and parsing live in `src/state/comfortTool/shareState.ts`.

## State Shape

- `inputsByInput`
  - Canonical SI inputs for all compare inputs.
- `derivedByInput`
  - Derived PMV-facing values such as measured air speed, dew point, humidity ratio, wet-bulb temperature, and vapor pressure.
- `ui.selectedModel`
- `ui.selectedChartByModel`
- `ui.modelOptionsByModel`
- `ui.resultsByModel`
- `ui.chartResultsByModel`
- Shared UI flags
  - `compareEnabled`
  - `compareInputIds`
  - `activeInputId`
  - `unitSystem`
  - `isLoading`
  - `errorMessage`
  - `resultRevision`

## Model Registry

Each model config defines:

- `chartIds`
- `defaultChartId`
- `defaultOptions`
- `normalizeOptions`
- `getChartOptions`
- `fieldOrder`
- `syncDerivedState`
- `setOption`
- `updateInput`
- `calculate`
- `getFieldPresentation`
- `getDisplayValue`
- `getAdvancedOptionMenu`
- `getResultSections`

Adding a new model should be a config and service task, not a controller-shape expansion task.

## Ownership Rules

- Keep all direct `jsthermalcomfort` imports inside `src/services/comfort/**`.
- Keep all unit conversions inside `src/services/units/**`.
- Components should consume selector/view-model output and avoid raw domain branching.
- Share snapshots serialize stable user state in `version: 5` format:
  - selected model
  - model state by registered model:
    - selected chart
    - normalized options
  - compare settings
  - unit system
  - canonical SI inputs
- Older snapshot versions are rejected rather than normalized.
- Derived values are always recomputed after snapshot load.
- `chartMetaById` only owns stable chart metadata; chart membership by model comes from the model config registry.
- PMV field behavior for operative temperature, measured air speed, and alternate humidity inputs is descriptor-driven inside the PMV model config, not component helpers.

## Future Model Workflow

1. Add stable IDs and metadata in `src/models/**`.
2. Add calculation/chart adapters in `src/services/comfort/**`.
3. Register a new config in `src/state/comfortTool/modelConfigs/**`.
4. Ensure selectors/components work through config-driven presentation, not new hardcoded branches.
5. Add service and state tests before exposing the model in the UI.
