/**
 * Main comfort-tool controller.
 * Canonical user inputs are stored in SI under `inputsByInput`; reusable control behaviors produce UI-ready view
 * models and plain patches, while model definitions own calculations and chart assembly.
 */
import {
  InputId,
  inputDefaultsById,
  inputOrder,
  type InputId as InputIdType,
} from "../../models/inputSlots";
import { chartMetaById, type ChartId as ChartIdType } from "../../models/chartOptions";
import { ComfortModel, comfortModelOrder, type ComfortModel as ComfortModelType } from "../../models/comfortModels";
import { allFieldOrder, fieldMetaByKey } from "../../models/fieldMeta";
import type { InputControlId as InputControlIdType } from "../../models/inputControls";
import type { OptionKey as OptionKeyType } from "../../models/inputModes";
import { UnitSystem } from "../../models/units";
import type { BehaviorPatch, ControlBehaviorContext } from "../../services/comfort/controls/types";
import { deriveInputsDerivedState } from "../../services/comfort/inputDerivations";
import { comfortModelConfigs, getComfortModelConfig } from "./modelConfigs";
import {
  applyShareSnapshotToState,
  createShareStateSnapshot,
  type ShareStateSnapshot,
} from "./shareState";
import type {
  CalculationCacheStatus,
  ComfortToolController,
  InputState,
  ModelCalculationCacheByModelState,
  ModelOptionsByModelState,
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

function createEmptyCalculationCache<ResultType>(): {
  status: CalculationCacheStatus;
  lastVisibleInputIds: InputIdType[];
  resultsByInput: Record<InputIdType, ResultType | null>;
  chartSource: null;
} {
  return {
    status: "empty",
    lastVisibleInputIds: [InputId.Input1],
    resultsByInput: createEmptyInputResultRecord(),
    chartSource: null,
  };
}

function createCalculationCacheByModel(): ModelCalculationCacheByModelState {
  return {
    [ComfortModel.Pmv]: createEmptyCalculationCache(),
    [ComfortModel.Utci]: createEmptyCalculationCache(),
  } as ModelCalculationCacheByModelState;
}

function getTimerApi() {
  return typeof window !== "undefined" ? window : globalThis;
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
  const inputsByInput = $state(createInputsByInput());
  const derivedByInput = $derived.by(() => deriveInputsDerivedState(inputsByInput));
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
    calculationCacheByModel: createCalculationCacheByModel(),
  });

  const state: ComfortToolStateSlice = {
    inputsByInput,
    ui,
  };

  function invalidateModel(modelId: ComfortModelType, options?: { keepErrorMessage?: boolean }) {
    if (!options?.keepErrorMessage) {
      state.ui.errorMessage = "";
    }

    const nextStatus = state.ui.calculationCacheByModel[modelId].chartSource ? "stale" : "empty";
    state.ui.calculationCacheByModel[modelId] = {
      ...state.ui.calculationCacheByModel[modelId],
      status: nextStatus,
    };
  }

  function invalidateAllModels(options?: { keepErrorMessage?: boolean }) {
    comfortModelOrder.forEach((modelId, index) => {
      invalidateModel(modelId, {
        keepErrorMessage: options?.keepErrorMessage || index !== 0,
      });
    });
  }

  function getVisibleInputIds(): InputIdType[] {
    if (!state.ui.compareEnabled) {
      return [InputId.Input1];
    }

    return normalizeCompareInputIds(state.ui.compareInputIds);
  }

  function getModelContext(modelId: ComfortModelType): ControlBehaviorContext {
    return {
      inputsByInput: state.inputsByInput,
      derivedByInput,
      options: state.ui.modelOptionsByModel[modelId],
      unitSystem: state.ui.unitSystem,
      visibleInputIds: getVisibleInputIds(),
      selectedChartId: state.ui.selectedChartByModel[modelId],
    };
  }

  function getActiveModelConfig() {
    return getComfortModelConfig(state.ui.selectedModel);
  }

  function getCurrentSelectedChartId() {
    return state.ui.selectedChartByModel[state.ui.selectedModel];
  }

  function getCurrentModelCache() {
    return state.ui.calculationCacheByModel[state.ui.selectedModel];
  }

  function applyBehaviorPatch(modelId: ComfortModelType, patch: BehaviorPatch) {
    if (patch.optionsPatch) {
      state.ui.modelOptionsByModel[modelId] = {
        ...state.ui.modelOptionsByModel[modelId],
        ...patch.optionsPatch,
      };
    }

    if (patch.inputsPatch) {
      Object.entries(patch.inputsPatch).forEach(([inputId, inputPatch]) => {
        if (!inputPatch) {
          return;
        }

        Object.entries(inputPatch).forEach(([fieldKey, value]) => {
          state.inputsByInput[inputId as InputIdType][fieldKey] = value;
        });
      });
    }
  }

  const selectors = {
    getVisibleInputIds,
    getInputControls: () => {
      const context = getModelContext(state.ui.selectedModel);
      return getActiveModelConfig().controls
        .map((control) => control.behavior.buildViewModel(context))
        .filter((control) => !control.hidden);
    },
    getResultSections: () => {
      const cache = getCurrentModelCache();
      if (cache.status === "empty") {
        return [];
      }

      return getActiveModelConfig().buildResultSections(
        cache.resultsByInput,
        getVisibleInputIds(),
        state.ui.unitSystem,
      );
    },
    getCurrentChartResult: () => getActiveModelConfig().buildChartResult(
      getCurrentSelectedChartId(),
      getCurrentModelCache().chartSource,
      getCurrentModelCache().resultsByInput,
      state.ui.unitSystem,
    ),
    getCurrentChartEmptyMessage: () => chartMetaById[getCurrentSelectedChartId()].emptyMessage,
    getCurrentChartOptions: () => getActiveModelConfig().chartIds.map((chartId) => ({
      name: chartMetaById[chartId].name,
      value: chartId,
    })),
    getCurrentSelectedChart: () => getCurrentSelectedChartId(),
    getCurrentChartHeightClass: () => chartMetaById[getCurrentSelectedChartId()].heightClass,
    getCurrentCacheStatus: () => getCurrentModelCache().status,
  };

  let calculationTimerId: ReturnType<typeof setTimeout> | null = null;
  let latestCalculationToken = 0;

  function clearScheduledCalculation() {
    if (calculationTimerId !== null) {
      getTimerApi().clearTimeout(calculationTimerId as never);
      calculationTimerId = null;
    }
  }

  async function calculate(calculationToken: number) {
    const selectedModel = state.ui.selectedModel;
    const visibleInputIds = getVisibleInputIds();

    state.ui.isLoading = true;
    state.ui.errorMessage = "";

    await yieldToNextFrame();

    if (calculationToken !== latestCalculationToken) {
      return;
    }

    try {
      const modelConfig = getComfortModelConfig(selectedModel);
      const calculationOutputs = modelConfig.calculate(state, visibleInputIds);

      state.ui.calculationCacheByModel[selectedModel] = {
        ...state.ui.calculationCacheByModel[selectedModel],
        status: "ready",
        lastVisibleInputIds: [...visibleInputIds],
        resultsByInput: calculationOutputs.resultsByInput,
        chartSource: calculationOutputs.chartSource,
      };

      if (calculationToken !== latestCalculationToken) {
        return;
      }
    } catch (error) {
      if (calculationToken !== latestCalculationToken) {
        return;
      }

      state.ui.calculationCacheByModel[selectedModel] = {
        ...state.ui.calculationCacheByModel[selectedModel],
        status: state.ui.calculationCacheByModel[selectedModel].chartSource ? "stale" : "empty",
      };
      state.ui.errorMessage = error instanceof Error ? error.message : "Calculation failed.";
    } finally {
      if (calculationToken === latestCalculationToken) {
        state.ui.isLoading = false;
      }
    }
  }

  function scheduleCalculationInternal(options?: { immediate?: boolean; force?: boolean }) {
    if (!options?.force && getCurrentModelCache().status === "ready") {
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

    calculationTimerId = getTimerApi().setTimeout(runCalculation, 180);
  }

  function setSelectedModel(nextModel: ComfortModelType) {
    state.ui.selectedModel = nextModel;
    state.ui.errorMessage = "";
    scheduleCalculationInternal({ immediate: true });
  }

  function setSelectedChart(nextChart: ChartIdType) {
    if (!getActiveModelConfig().chartIds.includes(nextChart)) {
      return;
    }

    state.ui.selectedChartByModel[state.ui.selectedModel] = nextChart;
  }

  function setModelOption(optionKey: OptionKeyType, nextValue: string) {
    const modelConfig = getActiveModelConfig();
    const context = getModelContext(state.ui.selectedModel);
    const patch = modelConfig.optionHandlersByKey[optionKey]?.(context, nextValue) ?? null;

    if (!patch) {
      return;
    }

    applyBehaviorPatch(state.ui.selectedModel, patch);
    invalidateModel(state.ui.selectedModel);
    scheduleCalculationInternal({ immediate: true });
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
    invalidateAllModels();
    scheduleCalculationInternal({ immediate: true });
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

    invalidateAllModels();
    scheduleCalculationInternal({ immediate: true });
  }

  function toggleUnitSystem() {
    state.ui.unitSystem = state.ui.unitSystem === UnitSystem.SI ? UnitSystem.IP : UnitSystem.SI;
  }

  function updateInput(inputId: InputIdType, controlId: InputControlIdType, rawValue: string) {
    const control = getActiveModelConfig().controls.find((item) => item.id === controlId);
    if (!control?.behavior.applyInput) {
      return;
    }

    const patch = control.behavior.applyInput(getModelContext(state.ui.selectedModel), inputId, rawValue);
    if (!patch) {
      return;
    }

    applyBehaviorPatch(state.ui.selectedModel, patch);
    invalidateAllModels();
    scheduleCalculationInternal();
  }

  const actions = {
    setSelectedModel,
    setSelectedChart,
    setModelOption,
    setCompareEnabled,
    setActiveInputId,
    toggleCompareInputVisibility,
    toggleUnitSystem,
    exportShareSnapshot: () => createShareStateSnapshot(state),
    applyShareSnapshot: (snapshot: ShareStateSnapshot) => {
      applyShareSnapshotToState(state, snapshot);
      invalidateAllModels();
      scheduleCalculationInternal({ immediate: true, force: true });
    },
    updateInput,
    scheduleCalculation: (scheduleOptions) => scheduleCalculationInternal(scheduleOptions),
  };

  return {
    state,
    actions,
    selectors,
  };
}
