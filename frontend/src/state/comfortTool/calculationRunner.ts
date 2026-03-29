import type { CompareCaseId as CompareCaseIdType } from "../../models/compareCases";
import { getComfortModelConfig } from "./modelConfigs";
import type { ComfortToolStateSlice } from "./types";

type CreateCalculationRunnerOptions = {
  state: ComfortToolStateSlice;
  getVisibleCaseIds: () => CompareCaseIdType[];
  clearResults: (options?: { keepErrorMessage?: boolean }) => void;
};

async function yieldToNextFrame() {
  if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
    await Promise.resolve();
    return;
  }

  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

export function createCalculationRunner(options: CreateCalculationRunnerOptions) {
  let calculationTimerId: number | null = null;
  let latestCalculationToken = 0;

  function clearScheduledCalculation() {
    if (calculationTimerId !== null && typeof window !== "undefined") {
      window.clearTimeout(calculationTimerId);
      calculationTimerId = null;
    }
  }

  async function calculate(calculationToken: number) {
    const { state } = options;
    const selectedModel = state.ui.selectedModel;

    state.ui.isLoading = true;
    state.ui.errorMessage = "";
    state.ui.calculationCount += 1;

    await yieldToNextFrame();

    if (calculationToken !== latestCalculationToken) {
      return;
    }

    try {
      const visibleCaseIds = options.getVisibleCaseIds();
      const modelConfig = getComfortModelConfig(selectedModel);
      const calculationOutputs = modelConfig.calculate(state, visibleCaseIds);

      state.ui.resultsByModel[selectedModel] = calculationOutputs.resultsByCase as typeof state.ui.resultsByModel[typeof selectedModel];
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

      options.clearResults({ keepErrorMessage: true });
      state.ui.errorMessage = error instanceof Error ? error.message : "Calculation failed.";
    } finally {
      if (calculationToken === latestCalculationToken) {
        state.ui.isLoading = false;
      }
    }
  }

  function scheduleCalculation(optionsArg?: { immediate?: boolean }) {
    if (typeof window === "undefined") {
      return;
    }

    const runCalculation = () => {
      calculationTimerId = null;
      latestCalculationToken += 1;
      void calculate(latestCalculationToken);
    };

    clearScheduledCalculation();

    if (optionsArg?.immediate) {
      runCalculation();
      return;
    }

    calculationTimerId = window.setTimeout(runCalculation, 180);
  }

  return {
    scheduleCalculation,
    clearScheduledCalculation,
  };
}
