# Comfort Tool Frontend Architecture

## Summary

- `src/state/comfortTool/**` owns UI orchestration, compare-case flow, share snapshot application, and scheduling.
- `src/services/comfort/**` owns comfort calculations, psychrometrics, derived-input adapters, and chart building.
- `src/services/units/**` owns display/SI conversion rules.
- Canonical shared state remains SI in `inputsByCase`.
- Model-specific behavior is registered through `src/state/comfortTool/modelConfigs/**`.

## State Shape

- `inputsByCase`
  - Canonical SI inputs for all compare cases.
- `derivedByCase`
  - Derived PMV-facing values such as measured air speed, dew point, humidity ratio, wet-bulb temperature, and vapor pressure.
- `ui.selectedModel`
- `ui.selectedChartByModel`
- `ui.modelOptionsByModel`
- `ui.resultsByModel`
- `ui.chartResultsByModel`
- Shared UI flags
  - `compareEnabled`
  - `compareCaseIds`
  - `activeCaseId`
  - `unitSystem`
  - `isLoading`
  - `errorMessage`
  - `resultRevision`

## Model Registry

Each model config defines:

- `fieldOrder`
- `defaultChartId`
- `defaultOptions`
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
- Share snapshots only serialize stable user state:
  - selected model
  - selected charts by model
  - model options by model
  - compare settings
  - unit system
  - canonical SI inputs
- Derived values are always recomputed after snapshot load.

## Future Model Workflow

1. Add stable IDs and metadata in `src/models/**`.
2. Add calculation/chart adapters in `src/services/comfort/**`.
3. Register a new config in `src/state/comfortTool/modelConfigs/**`.
4. Ensure selectors/components work through config-driven presentation, not new hardcoded branches.
5. Add service and state tests before exposing the model in the UI.
