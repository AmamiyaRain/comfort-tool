import {
  PmvChartId,
  pmvChartOptions,
  UtciChartId,
  utciChartOptions,
} from "../../models/chartOptions";
import { CompareCaseId } from "../../models/compareCases";
import { ComfortModel } from "../../models/comfortModels";
import { fieldOrderByModel } from "../../models/fieldMeta";
import type { ComfortToolSelectors, ComfortToolStateSlice } from "./types";
import { normalizeCompareCaseIds } from "./stateFactories";

export function createComfortToolSelectors(state: ComfortToolStateSlice): ComfortToolSelectors {
  function getVisibleCaseIds() {
    if (!state.ui.compareEnabled) {
      return [CompareCaseId.A];
    }

    return normalizeCompareCaseIds(state.ui.compareCaseIds);
  }

  function getFieldOrder() {
    return fieldOrderByModel[state.ui.selectedModel];
  }

  function getCurrentChartResult() {
    if (state.ui.selectedModel === ComfortModel.Pmv) {
      return state.ui.selectedPmvChart === PmvChartId.Psychrometric
        ? state.ui.psychrometricChart
        : state.ui.relativeHumidityChart;
    }

    return state.ui.selectedUtciChart === UtciChartId.Stress
      ? state.ui.utciStressChart
      : state.ui.utciTemperatureChart;
  }

  function getCurrentChartEmptyMessage() {
    if (state.ui.selectedModel === ComfortModel.Pmv) {
      return state.ui.selectedPmvChart === PmvChartId.Psychrometric
        ? "No psychrometric chart yet."
        : "No relative humidity chart yet.";
    }

    return state.ui.selectedUtciChart === UtciChartId.Stress
      ? "No UTCI stress visualization yet."
      : "No UTCI temperature comparison yet.";
  }

  function getCurrentChartOptions() {
    return state.ui.selectedModel === ComfortModel.Pmv ? pmvChartOptions : utciChartOptions;
  }

  function getCurrentSelectedChart() {
    return state.ui.selectedModel === ComfortModel.Pmv ? state.ui.selectedPmvChart : state.ui.selectedUtciChart;
  }

  function getCurrentChartHeightClass() {
    if (state.ui.selectedModel === ComfortModel.Pmv) {
      return "h-[420px] xl:h-[420px]";
    }

    return state.ui.selectedUtciChart === UtciChartId.Stress
      ? "h-[360px] xl:h-[360px]"
      : "h-[380px] xl:h-[380px]";
  }

  return {
    getVisibleCaseIds,
    getFieldOrder,
    getCurrentChartResult,
    getCurrentChartEmptyMessage,
    getCurrentChartOptions,
    getCurrentSelectedChart,
    getCurrentChartHeightClass,
  };
}
