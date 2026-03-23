import { CompareCaseId } from "../../models/compareCases";
import { PmvChartId, UtciChartId } from "../../models/chartOptions";
import { ComfortModel } from "../../models/comfortModels";
import {
  PmvAirSpeedControlMode,
  PmvAirSpeedInputMode,
  PmvHumidityInputMode,
  PmvTemperatureInputMode,
} from "../../models/inputModes";
import { UnitSystem } from "../../models/units";
import { createCalculationRunner } from "./calculationRunner";
import { createComfortToolInputActions } from "./inputMutations";
import { createComfortToolSelectors } from "./selectors";
import {
  createDefaultCompareCaseIds,
  createDewPointByCase,
  createEmptyPmvResults,
  createEmptyUtciResults,
  createHumidityRatioByCase,
  createInputsByCase,
  createMeasuredAirSpeedByCase,
  createVaporPressureByCase,
  createWetBulbByCase,
  normalizeCompareCaseIds,
} from "./stateFactories";
import { applyShareSnapshot, exportShareSnapshot } from "./shareSnapshot";
import type { ComfortToolController, ComfortToolStateSlice } from "./types";

export function createComfortToolState(): ComfortToolController {
  const initialInputsByCase = createInputsByCase();
  const inputsByCase = $state(initialInputsByCase);
  const measuredAirSpeedByCase = $state(createMeasuredAirSpeedByCase(initialInputsByCase));
  const dewPointByCase = $state(createDewPointByCase(initialInputsByCase));
  const humidityRatioByCase = $state(createHumidityRatioByCase(initialInputsByCase));
  const wetBulbByCase = $state(createWetBulbByCase(initialInputsByCase));
  const vaporPressureByCase = $state(createVaporPressureByCase(initialInputsByCase));
  const ui = $state({
    selectedModel: ComfortModel.Pmv,
    selectedPmvChart: PmvChartId.Psychrometric,
    selectedUtciChart: UtciChartId.Stress,
    pmvTemperatureInputMode: PmvTemperatureInputMode.Air,
    pmvAirSpeedControlMode: PmvAirSpeedControlMode.WithLocalControl,
    pmvAirSpeedInputMode: PmvAirSpeedInputMode.Relative,
    pmvHumidityInputMode: PmvHumidityInputMode.RelativeHumidity,
    compareEnabled: false,
    compareCaseIds: createDefaultCompareCaseIds(),
    activeCaseId: CompareCaseId.A,
    unitSystem: UnitSystem.SI,
    isLoading: false,
    errorMessage: "",
    calculationCount: 0,
    lastCompletedAt: 0,
    resultRevision: 0,
    pmvResults: createEmptyPmvResults(),
    utciResults: createEmptyUtciResults(),
    psychrometricChart: null,
    relativeHumidityChart: null,
    utciStressChart: null,
    utciTemperatureChart: null,
  });
  const state: ComfortToolStateSlice = {
    inputsByCase,
    measuredAirSpeedByCase,
    dewPointByCase,
    humidityRatioByCase,
    wetBulbByCase,
    vaporPressureByCase,
    ui,
  };

  function clearResults(options?: { keepErrorMessage?: boolean }) {
    if (!options?.keepErrorMessage) {
      state.ui.errorMessage = "";
    }
    state.ui.lastCompletedAt = 0;
    state.ui.pmvResults = createEmptyPmvResults();
    state.ui.utciResults = createEmptyUtciResults();
    state.ui.psychrometricChart = null;
    state.ui.relativeHumidityChart = null;
    state.ui.utciStressChart = null;
    state.ui.utciTemperatureChart = null;
    state.ui.resultRevision += 1;
  }

  const selectors = createComfortToolSelectors(state);
  const calculationRunner = createCalculationRunner({
    state,
    getVisibleCaseIds: selectors.getVisibleCaseIds,
    clearResults,
  });
  const inputActions = createComfortToolInputActions(state, calculationRunner.scheduleCalculation);

  function setSelectedModel(nextModel) {
    state.ui.selectedModel = nextModel;
    if (nextModel === ComfortModel.Pmv) {
      state.ui.selectedPmvChart = PmvChartId.Psychrometric;
    } else {
      state.ui.selectedUtciChart = UtciChartId.Stress;
    }
    clearResults();
    calculationRunner.scheduleCalculation({ immediate: true });
  }

  function setCompareEnabled(enabled: boolean) {
    state.ui.compareEnabled = enabled;
    if (enabled) {
      state.ui.compareCaseIds = normalizeCompareCaseIds(state.ui.compareCaseIds);
      if (state.ui.compareCaseIds.length < 2) {
        state.ui.compareCaseIds = createDefaultCompareCaseIds();
      }
      if (!state.ui.compareCaseIds.includes(state.ui.activeCaseId)) {
        state.ui.activeCaseId = state.ui.compareCaseIds[0] ?? CompareCaseId.A;
      }
    } else {
      state.ui.activeCaseId = CompareCaseId.A;
    }
    clearResults();
    calculationRunner.scheduleCalculation({ immediate: true });
  }

  function setSelectedPmvChart(nextChart) {
    state.ui.selectedPmvChart = nextChart;
  }

  function setSelectedUtciChart(nextChart) {
    state.ui.selectedUtciChart = nextChart;
  }

  function setActiveCaseId(nextCaseId) {
    state.ui.activeCaseId = nextCaseId;
  }

  function toggleCompareCaseVisibility(caseId) {
    if (!state.ui.compareEnabled || caseId === CompareCaseId.A) {
      return;
    }

    if (state.ui.compareCaseIds.includes(caseId)) {
      state.ui.compareCaseIds = state.ui.compareCaseIds.filter((visibleCaseId) => visibleCaseId !== caseId);
      if (state.ui.activeCaseId === caseId) {
        state.ui.activeCaseId = state.ui.compareCaseIds[0] ?? CompareCaseId.A;
      }
    } else {
      state.ui.compareCaseIds = normalizeCompareCaseIds([
        ...state.ui.compareCaseIds,
        caseId,
      ]);
    }

    clearResults();
    calculationRunner.scheduleCalculation({ immediate: true });
  }

  function setUnitSystem(nextUnitSystem) {
    state.ui.unitSystem = nextUnitSystem;
  }

  function toggleUnitSystem() {
    state.ui.unitSystem = state.ui.unitSystem === UnitSystem.SI ? UnitSystem.IP : UnitSystem.SI;
  }

  const actions = {
    setSelectedModel,
    setSelectedPmvChart,
    setSelectedUtciChart,
    ...inputActions,
    setCompareEnabled,
    setActiveCaseId,
    toggleCompareCaseVisibility,
    setUnitSystem,
    toggleUnitSystem,
    exportShareSnapshot: () => exportShareSnapshot(state),
    applyShareSnapshot: (snapshot) => applyShareSnapshot(state, snapshot, {
      clearResults,
      scheduleCalculation: calculationRunner.scheduleCalculation,
    }),
    updateInput: inputActions.updateInput,
    scheduleCalculation: calculationRunner.scheduleCalculation,
  };

  return {
    state,
    actions,
    selectors,
  };
}
