import { chartMetaById, chartOptionsByModel } from "../../models/chartOptions";
import { CompareCaseId } from "../../models/compareCases";
import { getComfortModelConfig } from "./modelConfigs";
import { normalizeCompareCaseIds } from "./stateFactories";
import type { ComfortToolSelectors, ComfortToolStateSlice } from "./types";

export function createComfortToolSelectors(state: ComfortToolStateSlice): ComfortToolSelectors {
  function getVisibleCaseIds() {
    if (!state.ui.compareEnabled) {
      return [CompareCaseId.A];
    }

    return normalizeCompareCaseIds(state.ui.compareCaseIds);
  }

  function getActiveModelConfig() {
    return getComfortModelConfig(state.ui.selectedModel);
  }

  function getCurrentSelectedChartId() {
    return state.ui.selectedChartByModel[state.ui.selectedModel];
  }

  function getFieldOrder() {
    return getActiveModelConfig().fieldOrder;
  }

  function getFieldPresentation(fieldKey) {
    return getActiveModelConfig().getFieldPresentation(state, fieldKey);
  }

  function getFieldDisplayValue(caseId, fieldKey) {
    return getActiveModelConfig().getDisplayValue(state, caseId, fieldKey);
  }

  function getAdvancedOptionMenu(fieldKey) {
    return getActiveModelConfig().getAdvancedOptionMenu(state, fieldKey);
  }

  function getResultSections() {
    return getActiveModelConfig().getResultSections(state, getVisibleCaseIds());
  }

  function getCurrentChartResult() {
    return state.ui.chartResultsByModel[state.ui.selectedModel][getCurrentSelectedChartId()] ?? null;
  }

  function getCurrentChartEmptyMessage() {
    return chartMetaById[getCurrentSelectedChartId()].emptyMessage;
  }

  function getCurrentChartOptions() {
    return chartOptionsByModel[state.ui.selectedModel];
  }

  function getCurrentSelectedChart() {
    return getCurrentSelectedChartId();
  }

  function getCurrentChartHeightClass() {
    return chartMetaById[getCurrentSelectedChartId()].heightClass;
  }

  return {
    getVisibleCaseIds,
    getFieldOrder,
    getFieldPresentation,
    getFieldDisplayValue,
    getAdvancedOptionMenu,
    getResultSections,
    getCurrentChartResult,
    getCurrentChartEmptyMessage,
    getCurrentChartOptions,
    getCurrentSelectedChart,
    getCurrentChartHeightClass,
  };
}
