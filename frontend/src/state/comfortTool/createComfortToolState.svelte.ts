/**
 * Main comfort-tool controller.
 * Canonical user inputs are stored in SI under `inputsByInput`; derived SI values and serializable UI state are
 * coordinated here, while model-specific behavior comes from the registered model configs.
 */
import {
  InputId,
  inputDefaultsById,
  inputOrder,
  type InputId as InputIdType,
} from "../../models/inputSlots";
import {
  chartMetaById,
  type ChartId as ChartIdType,
} from "../../models/chartOptions";
import {
  ComfortModel,
  comfortModelOrder,
  type ComfortModel as ComfortModelType,
} from "../../models/comfortModels";
import { allFieldOrder, fieldMetaByKey } from "../../models/fieldMeta";
import type { FieldKey as FieldKeyType } from "../../models/fieldKeys";
import type { ModelOptionId as ModelOptionIdType } from "../../models/inputModes";
import { UnitSystem } from "../../models/units";
import { comfortModelConfigs, getComfortModelConfig } from "./modelConfigs";
import { createEmptyDerivedByInput } from "./derivedState";
import type { ShareStateSnapshot } from "./shareState";
import type {
  InputState,
  ChartResultsByModelState,
  ComfortToolController,
  ModelOptionsByModelState,
  ResultsByModelState,
  SelectedChartByModelState,
  ComfortToolStateSlice,
} from "./types";

function createInputState(inputId: InputIdType): InputState {
  return allFieldOrder.reduce((accumulator, fieldKey) => {
    accumulator[fieldKey] = inputDefaultsById[inputId][fieldKey] ?? fieldMetaByKey[fieldKey].defaultValue;
    return accumulator;
  }, {} as InputState);
}

function createInputsByInput() {
  return inputOrder.reduce((accumulator, inputId) => {
    accumulator[inputId] = createInputState(inputId);
    return accumulator;
  }, {} as ComfortToolStateSlice["inputsByInput"]);
}

function createDefaultCompareInputIds(): InputIdType[] {
  return [InputId.Input1, InputId.Input2];
}

function normalizeCompareInputIds(inputIds: InputIdType[]): InputIdType[] {
  return inputOrder.filter((inputId) => inputId === InputId.Input1 || inputIds.includes(inputId));
}

function createSelectedChartByModel(): SelectedChartByModelState {
  return comfortModelOrder.reduce((accumulator, modelId) => {
    accumulator[modelId] = comfortModelConfigs[modelId].defaultChartId;
    return accumulator;
  }, {} as SelectedChartByModelState);
}

function createModelOptionsByModel(): ModelOptionsByModelState {
  return comfortModelOrder.reduce((accumulator, modelId) => {
    accumulator[modelId] = { ...comfortModelConfigs[modelId].defaultOptions };
    return accumulator;
  }, {} as ModelOptionsByModelState);
}

function createEmptyInputResultRecord<T>(): Record<InputIdType, T | null> {
  return inputOrder.reduce((accumulator, inputId) => {
    accumulator[inputId] = null;
    return accumulator;
  }, {} as Record<InputIdType, T | null>);
}

function createResultsByModel(): ResultsByModelState {
  return comfortModelOrder.reduce((accumulator, modelId) => {
    accumulator[modelId] = createEmptyInputResultRecord() as ResultsByModelState[typeof modelId];
    return accumulator;
  }, {} as ResultsByModelState);
}

function createChartResultsByModel(): ChartResultsByModelState {
  return comfortModelOrder.reduce((accumulator, modelId) => {
    accumulator[modelId] = comfortModelConfigs[modelId].chartIds.reduce((chartAccumulator, chartId) => {
      chartAccumulator[chartId] = null;
      return chartAccumulator;
    }, {} as ChartResultsByModelState[ComfortModelType]);
    return accumulator;
  }, {} as ChartResultsByModelState);
}

function exportShareSnapshot(state: ComfortToolStateSlice): ShareStateSnapshot {
  return {
    version: 5,
    selectedModel: state.ui.selectedModel,
    models: comfortModelOrder.reduce((accumulator, modelId) => {
      accumulator[modelId] = {
        selectedChart: state.ui.selectedChartByModel[modelId],
        options: { ...state.ui.modelOptionsByModel[modelId] },
      };
      return accumulator;
    }, {} as ShareStateSnapshot["models"]),
    compareEnabled: state.ui.compareEnabled,
    compareInputIds: [...state.ui.compareInputIds],
    activeInputId: state.ui.activeInputId,
    unitSystem: state.ui.unitSystem,
    inputsByInput: inputOrder.reduce((accumulator, inputId) => {
      accumulator[inputId] = allFieldOrder.reduce((inputAccumulator, fieldKey) => {
        inputAccumulator[fieldKey] = state.inputsByInput[inputId][fieldKey];
        return inputAccumulator;
      }, {} as ShareStateSnapshot["inputsByInput"][typeof inputId]);
      return accumulator;
    }, {} as ShareStateSnapshot["inputsByInput"]),
  };
}

type ApplyShareSnapshotCallbacks = {
  clearResults: (options?: { keepErrorMessage?: boolean }) => void;
  scheduleCalculation: (options?: { immediate?: boolean }) => void;
};

function applyShareSnapshot(
  state: ComfortToolStateSlice,
  snapshot: ShareStateSnapshot,
  callbacks: ApplyShareSnapshotCallbacks,
) {
  state.ui.selectedModel = snapshot.selectedModel;
  comfortModelOrder.forEach((modelId) => {
    state.ui.selectedChartByModel[modelId] = snapshot.models[modelId].selectedChart;
    state.ui.modelOptionsByModel[modelId] = { ...snapshot.models[modelId].options };
  });
  state.ui.compareEnabled = snapshot.compareEnabled;
  state.ui.compareInputIds = normalizeCompareInputIds(snapshot.compareInputIds);
  state.ui.activeInputId = snapshot.compareEnabled && state.ui.compareInputIds.includes(snapshot.activeInputId)
    ? snapshot.activeInputId
    : InputId.Input1;
  state.ui.unitSystem = snapshot.unitSystem;

  inputOrder.forEach((inputId) => {
    allFieldOrder.forEach((fieldKey) => {
      state.inputsByInput[inputId][fieldKey] = snapshot.inputsByInput[inputId][fieldKey];
    });
  });

  comfortModelOrder.forEach((modelId) => {
    comfortModelConfigs[modelId].syncDerivedState(state);
  });

  callbacks.clearResults();
  callbacks.scheduleCalculation({ immediate: true });
}

async function yieldToNextFrame() {
  if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
    await Promise.resolve();
    return;
  }

  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

export function createComfortToolState(): ComfortToolController {
  const initialInputsByInput = createInputsByInput();
  const inputsByInput = $state(initialInputsByInput);
  const derivedByInput = $state(createEmptyDerivedByInput());
  const ui = $state({
    selectedModel: ComfortModel.Pmv,
    selectedChartByModel: createSelectedChartByModel(),
    modelOptionsByModel: createModelOptionsByModel(),
    compareEnabled: false,
    compareInputIds: createDefaultCompareInputIds(),
    activeInputId: InputId.Input1,
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
    inputsByInput,
    derivedByInput,
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

  function getVisibleInputIds(): InputIdType[] {
    if (!state.ui.compareEnabled) {
      return [InputId.Input1];
    }

    return normalizeCompareInputIds(state.ui.compareInputIds);
  }

  function getActiveModelConfig() {
    return getComfortModelConfig(state.ui.selectedModel);
  }

  function getCurrentSelectedChartId() {
    return state.ui.selectedChartByModel[state.ui.selectedModel];
  }

  const selectors = {
    getVisibleInputIds,
    getFieldOrder: () => getActiveModelConfig().fieldOrder,
    getFieldPresentation: (fieldKey: FieldKeyType) => getActiveModelConfig().getFieldPresentation(state, fieldKey),
    getFieldDisplayValue: (inputId: InputIdType, fieldKey: FieldKeyType) => (
      getActiveModelConfig().getDisplayValue(state, inputId, fieldKey)
    ),
    getAdvancedOptionMenu: (fieldKey: FieldKeyType) => getActiveModelConfig().getAdvancedOptionMenu(state, fieldKey),
    getResultSections: () => getActiveModelConfig().getResultSections(state, getVisibleInputIds()),
    getCurrentChartResult: () => state.ui.chartResultsByModel[state.ui.selectedModel][getCurrentSelectedChartId()] ?? null,
    getCurrentChartEmptyMessage: () => chartMetaById[getCurrentSelectedChartId()].emptyMessage,
    getCurrentChartOptions: () => getActiveModelConfig().getChartOptions(),
    getCurrentSelectedChart: () => getCurrentSelectedChartId(),
    getCurrentChartHeightClass: () => chartMetaById[getCurrentSelectedChartId()].heightClass,
  };

  let calculationTimerId: number | null = null;
  let latestCalculationToken = 0;

  function clearScheduledCalculation() {
    if (calculationTimerId !== null && typeof window !== "undefined") {
      window.clearTimeout(calculationTimerId);
      calculationTimerId = null;
    }
  }

  async function calculate(calculationToken: number) {
    const selectedModel = state.ui.selectedModel;

    state.ui.isLoading = true;
    state.ui.errorMessage = "";
    state.ui.calculationCount += 1;

    await yieldToNextFrame();

    if (calculationToken !== latestCalculationToken) {
      return;
    }

    try {
      const modelConfig = getComfortModelConfig(selectedModel);
      const calculationOutputs = modelConfig.calculate(state, getVisibleInputIds());

      state.ui.resultsByModel[selectedModel] = calculationOutputs.resultsByInput as typeof state.ui.resultsByModel[typeof selectedModel];
      state.ui.chartResultsByModel[selectedModel] = {
        ...state.ui.chartResultsByModel[selectedModel],
        ...calculationOutputs.chartResults,
      };

      if (calculationToken !== latestCalculationToken) {
        return;
      }

      state.ui.lastCompletedAt = Date.now();
      state.ui.resultRevision += 1;
    } catch (error) {
      if (calculationToken !== latestCalculationToken) {
        return;
      }

      clearResults({ keepErrorMessage: true });
      state.ui.errorMessage = error instanceof Error ? error.message : "Calculation failed.";
    } finally {
      if (calculationToken === latestCalculationToken) {
        state.ui.isLoading = false;
      }
    }
  }

  function scheduleCalculation(options?: { immediate?: boolean }) {
    if (typeof window === "undefined") {
      return;
    }

    const runCalculation = () => {
      calculationTimerId = null;
      latestCalculationToken += 1;
      void calculate(latestCalculationToken);
    };

    clearScheduledCalculation();

    if (options?.immediate) {
      runCalculation();
      return;
    }

    calculationTimerId = window.setTimeout(runCalculation, 180);
  }

  function setSelectedModel(nextModel: ComfortModelType) {
    state.ui.selectedModel = nextModel;
    clearResults();
    scheduleCalculation({ immediate: true });
  }

  function setSelectedChart(nextChart: ChartIdType) {
    if (!getActiveModelConfig().chartIds.includes(nextChart)) {
      return;
    }

    state.ui.selectedChartByModel[state.ui.selectedModel] = nextChart;
  }

  function setModelOption(optionKey: ModelOptionIdType, nextValue: string) {
    const modelConfig = getComfortModelConfig(state.ui.selectedModel);
    if (!modelConfig.setOption(state, optionKey, nextValue)) {
      return;
    }

    scheduleCalculation({ immediate: true });
  }

  function setCompareEnabled(enabled: boolean) {
    state.ui.compareEnabled = enabled;
    if (enabled) {
      state.ui.compareInputIds = normalizeCompareInputIds(state.ui.compareInputIds);
      if (state.ui.compareInputIds.length < 2) {
        state.ui.compareInputIds = createDefaultCompareInputIds();
      }
      if (!state.ui.compareInputIds.includes(state.ui.activeInputId)) {
        state.ui.activeInputId = state.ui.compareInputIds[0] ?? InputId.Input1;
      }
    } else {
      state.ui.activeInputId = InputId.Input1;
    }
    clearResults();
    scheduleCalculation({ immediate: true });
  }

  function setActiveInputId(nextInputId: InputIdType) {
    state.ui.activeInputId = nextInputId;
  }

  function toggleCompareInputVisibility(inputId: InputIdType) {
    if (!state.ui.compareEnabled || inputId === InputId.Input1) {
      return;
    }

    if (state.ui.compareInputIds.includes(inputId)) {
      state.ui.compareInputIds = state.ui.compareInputIds.filter((visibleInputId) => visibleInputId !== inputId);
      if (state.ui.activeInputId === inputId) {
        state.ui.activeInputId = state.ui.compareInputIds[0] ?? InputId.Input1;
      }
    } else {
      state.ui.compareInputIds = normalizeCompareInputIds([...state.ui.compareInputIds, inputId]);
    }

    clearResults();
    scheduleCalculation({ immediate: true });
  }

  function setUnitSystem(nextUnitSystem) {
    state.ui.unitSystem = nextUnitSystem;
  }

  function toggleUnitSystem() {
    state.ui.unitSystem = state.ui.unitSystem === UnitSystem.SI ? UnitSystem.IP : UnitSystem.SI;
  }

  function updateInput(inputId: InputIdType, fieldKey: FieldKeyType, rawValue: string) {
    const modelConfig = getComfortModelConfig(state.ui.selectedModel);
    modelConfig.updateInput(state, inputId, fieldKey, rawValue);
    scheduleCalculation();
  }

  const actions = {
    setSelectedModel,
    setSelectedChart,
    setModelOption,
    setCompareEnabled,
    setActiveInputId,
    toggleCompareInputVisibility,
    setUnitSystem,
    toggleUnitSystem,
    exportShareSnapshot: () => exportShareSnapshot(state),
    applyShareSnapshot: (snapshot: ShareStateSnapshot) => applyShareSnapshot(state, snapshot, {
      clearResults,
      scheduleCalculation,
    }),
    updateInput,
    scheduleCalculation,
  };

  return {
    state,
    actions,
    selectors,
  };
}
