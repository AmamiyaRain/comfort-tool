import { ComfortModel } from "../../models/comfortModels";
import type { CompareCaseId as CompareCaseIdType } from "../../models/compareCases";
import type {
  PlotlyChartResponseDto,
  PmvResponseDto,
  UtciResponseDto,
} from "../../models/dto";
import {
  buildComparePsychrometricChart,
  buildRelativeHumidityChart,
  buildUtciStressChart,
  buildUtciTemperatureChart,
  calculateComfortZone,
  calculatePmv,
  calculateUtci,
  type ComfortZonesByCase,
  type UtciChartResultsByCase,
} from "../../services/comfortService";
import { mapCaseResponses, createEmptyPmvResults, createEmptyUtciResults } from "./stateFactories";
import {
  toComfortZoneRequest,
  toPmvCompareChartRequest,
  toPmvRequest,
  toUtciRequest,
  toUtciStressChartRequest,
} from "./requestBuilders";
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

    state.ui.isLoading = true;
    state.ui.errorMessage = "";
    state.ui.calculationCount += 1;

    await yieldToNextFrame();

    if (calculationToken !== latestCalculationToken) {
      return;
    }

    try {
      const visibleCaseIds = options.getVisibleCaseIds();

      if (state.ui.selectedModel === ComfortModel.Pmv) {
        const compareChartRequest = toPmvCompareChartRequest(state, visibleCaseIds);
        const pmvResponses = visibleCaseIds.map((caseId) => calculatePmv(toPmvRequest(state, caseId)));
        const comfortZonesByCase = visibleCaseIds.reduce((accumulator, caseId) => {
          accumulator[caseId] = calculateComfortZone(toComfortZoneRequest(state, caseId));
          return accumulator;
        }, {} as ComfortZonesByCase);

        state.ui.pmvResults = mapCaseResponses<PmvResponseDto>(visibleCaseIds, pmvResponses);
        state.ui.utciResults = createEmptyUtciResults();
        state.ui.psychrometricChart = buildComparePsychrometricChart(
          compareChartRequest,
          comfortZonesByCase,
        ) as PlotlyChartResponseDto;
        state.ui.relativeHumidityChart = buildRelativeHumidityChart(
          compareChartRequest,
          comfortZonesByCase,
        ) as PlotlyChartResponseDto;
        state.ui.utciStressChart = null;
        state.ui.utciTemperatureChart = null;
      } else {
        const utciResponses = visibleCaseIds.map((caseId) => calculateUtci(toUtciRequest(state, caseId)));
        const utciResultsByCase = visibleCaseIds.reduce((accumulator, caseId) => {
          accumulator[caseId] = utciResponses[visibleCaseIds.indexOf(caseId)] ?? null;
          return accumulator;
        }, {} as UtciChartResultsByCase);

        state.ui.utciResults = mapCaseResponses<UtciResponseDto>(visibleCaseIds, utciResponses);
        state.ui.pmvResults = createEmptyPmvResults();
        state.ui.psychrometricChart = null;
        state.ui.relativeHumidityChart = null;
        state.ui.utciStressChart = buildUtciStressChart(
          toUtciStressChartRequest(state, visibleCaseIds),
          utciResultsByCase,
        ) as PlotlyChartResponseDto;
        state.ui.utciTemperatureChart = buildUtciTemperatureChart(
          toUtciStressChartRequest(state, visibleCaseIds),
          utciResultsByCase,
        ) as PlotlyChartResponseDto;
      }

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
