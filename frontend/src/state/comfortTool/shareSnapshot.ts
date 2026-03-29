import { compareCaseOrder, CompareCaseId } from "../../models/compareCases";
import { comfortModelOrder } from "../../models/comfortModels";
import { allFieldOrder } from "../../models/fieldMeta";
import { normalizeCompareCaseIds } from "./stateFactories";
import { comfortModelConfigs } from "./modelConfigs";
import type { ComfortToolStateSlice } from "./types";
import type { ShareStateSnapshot } from "../../services/shareState";

export function exportShareSnapshot(state: ComfortToolStateSlice): ShareStateSnapshot {
  return {
    version: 2,
    selectedModel: state.ui.selectedModel,
    selectedChartByModel: comfortModelOrder.reduce((accumulator, modelId) => {
      accumulator[modelId] = state.ui.selectedChartByModel[modelId];
      return accumulator;
    }, {} as ShareStateSnapshot["selectedChartByModel"]),
    modelOptionsByModel: comfortModelOrder.reduce((accumulator, modelId) => {
      accumulator[modelId] = { ...state.ui.modelOptionsByModel[modelId] };
      return accumulator;
    }, {} as ShareStateSnapshot["modelOptionsByModel"]),
    compareEnabled: state.ui.compareEnabled,
    compareCaseIds: [...state.ui.compareCaseIds],
    activeCaseId: state.ui.activeCaseId,
    unitSystem: state.ui.unitSystem,
    inputsByCase: compareCaseOrder.reduce((accumulator, caseId) => {
      accumulator[caseId] = allFieldOrder.reduce((caseAccumulator, fieldKey) => {
        caseAccumulator[fieldKey] = state.inputsByCase[caseId][fieldKey];
        return caseAccumulator;
      }, {} as ShareStateSnapshot["inputsByCase"][typeof caseId]);
      return accumulator;
    }, {} as ShareStateSnapshot["inputsByCase"]),
  };
}

type ApplyShareSnapshotCallbacks = {
  clearResults: (options?: { keepErrorMessage?: boolean }) => void;
  scheduleCalculation: (options?: { immediate?: boolean }) => void;
};

export function applyShareSnapshot(
  state: ComfortToolStateSlice,
  snapshot: ShareStateSnapshot,
  callbacks: ApplyShareSnapshotCallbacks,
) {
  state.ui.selectedModel = snapshot.selectedModel;
  comfortModelOrder.forEach((modelId) => {
    state.ui.selectedChartByModel[modelId] = snapshot.selectedChartByModel[modelId];
    state.ui.modelOptionsByModel[modelId] = { ...snapshot.modelOptionsByModel[modelId] };
  });
  state.ui.compareEnabled = snapshot.compareEnabled;
  state.ui.compareCaseIds = normalizeCompareCaseIds(snapshot.compareCaseIds);
  state.ui.activeCaseId = snapshot.compareEnabled && state.ui.compareCaseIds.includes(snapshot.activeCaseId)
    ? snapshot.activeCaseId
    : CompareCaseId.A;
  state.ui.unitSystem = snapshot.unitSystem;

  compareCaseOrder.forEach((caseId) => {
    allFieldOrder.forEach((fieldKey) => {
      state.inputsByCase[caseId][fieldKey] = snapshot.inputsByCase[caseId][fieldKey];
    });
  });

  comfortModelOrder.forEach((modelId) => {
    comfortModelConfigs[modelId].syncDerivedState(state);
  });

  callbacks.clearResults();
  callbacks.scheduleCalculation({ immediate: true });
}
