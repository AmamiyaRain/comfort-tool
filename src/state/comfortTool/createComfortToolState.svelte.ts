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
import { mergeBehaviorPatches } from "../../services/comfort/controls/types";
import { refreshAllDerivedState, createEmptyDerivedByInput } from "./derivedState";
import { comfortModelConfigs, getComfortModelConfig } from "./modelConfigs";
import type { ShareStateSnapshot } from "./shareState";
import type {
  ChartResultsByModelState,
  ComfortToolController,
  InputState,
  ModelOptionsByModelState,
  ResultSectionsByModelState,
  ResultsByModelState,
  SelectedChartByModelState,
  ComfortToolStateSlice,
} from "./types";

/**
 * Creates an initial input state for a specific input slot.
 * @param inputId The input slot ID to initialize.
 * @returns A record of field keys to their default numeric values.
 */
function createInputState(inputId: InputIdType): InputState {
  return allFieldOrder.reduce((accumulator, fieldKey) => {
    accumulator[fieldKey] = inputDefaultsById[inputId][fieldKey] ?? fieldMetaByKey[fieldKey].defaultValue;
    return accumulator;
  }, {} as InputState);
}

/**
 * Creates the initial multi-input state record.
 * @returns A record of all input slots initialized with their default states.
 */
function createInputsByInput() {
  return inputOrder.reduce((accumulator, inputId) => {
    accumulator[inputId] = createInputState(inputId);
    return accumulator;
  }, {} as ComfortToolStateSlice["inputsByInput"]);
}

/**
 * Returns a default set of input IDs to be visible when comparison mode is first enabled.
 * @returns An array containing the IDs for Input 1 and Input 2.
 */
function createDefaultCompareInputIds(): InputIdType[] {
  return [InputId.Input1, InputId.Input2];
}

/**
 * Normalizes an array of input IDs ensuring Input 1 is always present and in order.
 * @param inputIds The unsorted or incomplete list of input IDs.
 * @returns A sanitized and ordered array of input IDs.
 */
function normalizeCompareInputIds(inputIds: InputIdType[]): InputIdType[] {
  return inputOrder.filter((inputId) => inputId === InputId.Input1 || inputIds.includes(inputId));
}

/**
 * Creates the initial record of selected charts for each comfort model.
 * @returns A record mapping models to their default chart IDs.
 */
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
    accumulator[modelId] = createEmptyInputResultRecord();
    return accumulator;
  }, {} as ResultsByModelState);
}

function createResultSectionsByModel(): ResultSectionsByModelState {
  return comfortModelOrder.reduce((accumulator, modelId) => {
    accumulator[modelId] = [];
    return accumulator;
  }, {} as ResultSectionsByModelState);
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
    version: 6,
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

  refreshAllDerivedState(state);
  callbacks.clearResults();
  callbacks.scheduleCalculation({ immediate: true });
}

/**
 * Yields execution to the next animation frame if in a browser environment.
 * Useful for ensuring the UI remains responsive during heavy calculations.
 */
async function yieldToNextFrame() {
  if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
    await Promise.resolve();
    return;
  }

  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

/**
 * Factory function that creates the stateful comfort tool controller.
 * Manages calculations, UI state, and user actions using Svelte's runes.
 * @returns A controller object containing state, actions, and selectors.
 */
export function createComfortToolState(): ComfortToolController {
  const inputsByInput = $state(createInputsByInput());
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
    resultsByModel: createResultsByModel(),
    resultSectionsByModel: createResultSectionsByModel(),
    chartResultsByModel: createChartResultsByModel(),
  });

  const state: ComfortToolStateSlice = {
    inputsByInput,
    derivedByInput,
    ui,
  };

  refreshAllDerivedState(state);

  /**
   * Clears current calculation results and chart data.
   * @param options Configuration for reset behavior.
   */
  function clearResults(options?: { keepErrorMessage?: boolean }) {
    if (!options?.keepErrorMessage) {
      state.ui.errorMessage = "";
    }
    state.ui.resultsByModel = createResultsByModel();
    state.ui.resultSectionsByModel = createResultSectionsByModel();
    state.ui.chartResultsByModel = createChartResultsByModel();
  }

  /**
   * Returns IDs of all currently visible input slots.
   */
  function getVisibleInputIds(): InputIdType[] {
    if (!state.ui.compareEnabled) {
      return [InputId.Input1];
    }

    return normalizeCompareInputIds(state.ui.compareInputIds);
  }

  function getModelContext(modelId: ComfortModelType): ControlBehaviorContext {
    return {
      inputsByInput: state.inputsByInput,
      derivedByInput: state.derivedByInput,
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

  function applyBehaviorPatch(patch: BehaviorPatch) {
    if (patch.optionsPatch) {
      state.ui.modelOptionsByModel[state.ui.selectedModel] = {
        ...state.ui.modelOptionsByModel[state.ui.selectedModel],
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

    if (patch.derivedPatch) {
      Object.entries(patch.derivedPatch).forEach(([inputId, derivedPatch]) => {
        if (!derivedPatch) {
          return;
        }

        state.derivedByInput[inputId as InputIdType] = {
          ...state.derivedByInput[inputId as InputIdType],
          ...derivedPatch,
        };
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
    getResultSections: () => state.ui.resultSectionsByModel[state.ui.selectedModel],
    getCurrentChartResult: () => state.ui.chartResultsByModel[state.ui.selectedModel][getCurrentSelectedChartId()] ?? null,
    getCurrentChartEmptyMessage: () => chartMetaById[getCurrentSelectedChartId()].emptyMessage,
    getCurrentChartOptions: () => getActiveModelConfig().chartIds.map((chartId) => ({
      name: chartMetaById[chartId].name,
      value: chartId,
    })),
    getCurrentSelectedChart: () => getCurrentSelectedChartId(),
    getCurrentChartHeightClass: () => chartMetaById[getCurrentSelectedChartId()].heightClass,
  };

  let calculationTimerId: number | null = null;
  let latestCalculationToken = 0;

  /**
   * Cancels any currently pending calculation.
   */
  function clearScheduledCalculation() {
    if (calculationTimerId !== null && typeof window !== "undefined") {
      window.clearTimeout(calculationTimerId);
      calculationTimerId = null;
    }
  }

  /**
   * Performs the actual comfort calculation via the active model configuration.
   * @param calculationToken A token used to identify and cancel stale calculations.
   */
  async function calculate(calculationToken: number) {
    const selectedModel = state.ui.selectedModel;

    state.ui.isLoading = true;
    state.ui.errorMessage = "";

    await yieldToNextFrame();

    if (calculationToken !== latestCalculationToken) {
      return;
    }

    try {
      const modelConfig = getComfortModelConfig(selectedModel);
      const calculationOutputs = modelConfig.calculate(state, getVisibleInputIds());

      state.ui.resultsByModel[selectedModel] = calculationOutputs.resultsByInput;
      state.ui.resultSectionsByModel[selectedModel] = calculationOutputs.resultSections;
      state.ui.chartResultsByModel[selectedModel] = {
        ...state.ui.chartResultsByModel[selectedModel],
        ...calculationOutputs.chartResults,
      };

      if (calculationToken !== latestCalculationToken) {
        return;
      }
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

  /**
   * Schedules a calculation to run after a short debounce period.
   * @param options Configuration for the scheduled task.
   */
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

  /**
   * Updates the active comfort model.
   * @param nextModel The ID of the model to select.
   */
  function setSelectedModel(nextModel: ComfortModelType) {
    state.ui.selectedModel = nextModel;
    clearResults();
    scheduleCalculation({ immediate: true });
  }

  /**
   * Updates the active chart for the current model.
   * @param nextChart The ID of the chart to select.
   */
  function setSelectedChart(nextChart: ChartIdType) {
    if (!getActiveModelConfig().chartIds.includes(nextChart)) {
      return;
    }

    state.ui.selectedChartByModel[state.ui.selectedModel] = nextChart;
  }

  /**
   * Updates a model-specific configuration option.
   * @param optionKey The option key to change.
   * @param nextValue The new value for the option.
   */
  function setModelOption(optionKey: OptionKeyType, nextValue: string) {
    const modelConfig = getActiveModelConfig();
    const context = getModelContext(state.ui.selectedModel);
    const patch = modelConfig.controls.reduce<BehaviorPatch | null>((accumulator, control) => {
      const nextPatch = control.behavior.applyOptionChange?.(context, optionKey, nextValue);
      if (!nextPatch) {
        return accumulator;
      }

      return accumulator ? mergeBehaviorPatches(accumulator, nextPatch) : nextPatch;
    }, null);

    if (!patch) {
      return;
    }

    applyBehaviorPatch(patch);
    scheduleCalculation({ immediate: true });
  }

  /**
   * Enables or disables input comparison mode.
   * @param enabled Whether comparison mode should be active.
   */
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

  /**
   * Updates the currently active input slot for editing.
   * @param nextInputId The ID of the input slot to activate.
   */
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

  /**
   * Toggles the UI unit system between SI and IP.
   */
  function toggleUnitSystem() {
    state.ui.unitSystem = state.ui.unitSystem === UnitSystem.SI ? UnitSystem.IP : UnitSystem.SI;
  }

  /**
   * Updates a specific environmental or personal input value.
   * @param inputId The ID of the input slot being updated.
   * @param controlId The ID of the control behavior managing the field.
   * @param rawValue The new string value from the UI.
   */
  function updateInput(inputId: InputIdType, controlId: InputControlIdType, rawValue: string) {
    const control = getActiveModelConfig().controls.find((item) => item.id === controlId);
    if (!control?.behavior.applyInput) {
      return;
    }

    const patch = control.behavior.applyInput(getModelContext(state.ui.selectedModel), inputId, rawValue);
    if (!patch) {
      return;
    }

    applyBehaviorPatch(patch);
    scheduleCalculation();
  }

  const actions = {
    setSelectedModel,
    setSelectedChart,
    setModelOption,
    setCompareEnabled,
    setActiveInputId,
    toggleCompareInputVisibility,
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
