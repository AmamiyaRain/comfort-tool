import { CompareCaseId } from "../../models/compareCases";
import { chartMetaById } from "../../models/chartOptions";
import { ComfortModel } from "../../models/comfortModels";
import { UnitSystem } from "../../models/units";
import { createCalculationRunner } from "./calculationRunner";
import { createComfortToolInputActions } from "./inputMutations";
import { comfortModelConfigs } from "./modelConfigs";
import { createComfortToolSelectors } from "./selectors";
import {
  createChartResultsByModel,
  createDefaultCompareCaseIds,
  createDerivedByCase,
  createInputsByCase,
  createModelOptionsByModel,
  createResultsByModel,
  createSelectedChartByModel,
  normalizeCompareCaseIds,
} from "./stateFactories";
import { applyShareSnapshot, exportShareSnapshot } from "./shareSnapshot";
import type { ComfortToolController, ComfortToolStateSlice } from "./types";

export function createComfortToolState(): ComfortToolController {
  const initialInputsByCase = createInputsByCase();
  const inputsByCase = $state(initialInputsByCase);
  const derivedByCase = $state(createDerivedByCase());
  const ui = $state({
    selectedModel: ComfortModel.Pmv,
    selectedChartByModel: createSelectedChartByModel(),
    modelOptionsByModel: createModelOptionsByModel(),
    compareEnabled: false,
    compareCaseIds: createDefaultCompareCaseIds(),
    activeCaseId: CompareCaseId.A,
    unitSystem: UnitSystem.SI,
    isLoading: false,
    errorMessage: "",
    calculationCount: 0,
    lastCompletedAt: 0,
    resultRevision: 0,
    resultsByModel: createResultsByModel(),
    chartResultsByModel: createChartResultsByModel(),
  });

  const state: ComfortToolStateSlice = {
    inputsByCase,
    derivedByCase,
    ui,
  };

  Object.values(comfortModelConfigs).forEach((config) => {
    config.syncDerivedState(state);
  });

  function clearResults(options?: { keepErrorMessage?: boolean }) {
    if (!options?.keepErrorMessage) {
      state.ui.errorMessage = "";
    }
    state.ui.lastCompletedAt = 0;
    state.ui.resultsByModel = createResultsByModel();
    state.ui.chartResultsByModel = createChartResultsByModel();
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
    clearResults();
    calculationRunner.scheduleCalculation({ immediate: true });
  }

  function setSelectedChart(nextChart) {
    if (chartMetaById[nextChart]?.model !== state.ui.selectedModel) {
      return;
    }

    state.ui.selectedChartByModel[state.ui.selectedModel] = nextChart;
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
    setSelectedChart,
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
