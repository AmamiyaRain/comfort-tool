import {
  CompareCaseId,
  compareCaseOrder,
} from "../../models/compareCases";
import { allFieldOrder } from "../../models/fieldMeta";
import { FieldKey } from "../../models/fieldKeys";
import { PmvAirSpeedControlMode, PmvAirSpeedInputMode } from "../../models/inputModes";
import type { FieldKey as FieldKeyType } from "../../models/fieldKeys";
import type { ShareStateSnapshot } from "../../services/shareState";
import {
  deriveHumidityRatioFromRelativeHumidity,
  deriveRelativeAirSpeedFromMeasured,
  deriveVaporPressureFromRelativeHumidity,
  deriveWetBulbFromRelativeHumidity,
} from "../../services/advancedPmvInputs";
import { normalizeCompareCaseIds } from "./stateFactories";
import type { ComfortToolStateSlice, NumericByCaseState } from "./types";

export function exportShareSnapshot(state: ComfortToolStateSlice): ShareStateSnapshot {
  return {
    version: 1,
    selectedModel: state.ui.selectedModel,
    selectedPmvChart: state.ui.selectedPmvChart,
    selectedUtciChart: state.ui.selectedUtciChart,
    pmvTemperatureInputMode: state.ui.pmvTemperatureInputMode,
    pmvAirSpeedControlMode: state.ui.pmvAirSpeedControlMode,
    pmvAirSpeedInputMode: state.ui.pmvAirSpeedInputMode,
    pmvHumidityInputMode: state.ui.pmvHumidityInputMode,
    compareEnabled: state.ui.compareEnabled,
    compareCaseIds: [...state.ui.compareCaseIds],
    activeCaseId: state.ui.activeCaseId,
    unitSystem: state.ui.unitSystem,
    inputsByCase: compareCaseOrder.reduce((accumulator, caseId) => {
      accumulator[caseId] = allFieldOrder.reduce((caseAccumulator, fieldKey) => {
        caseAccumulator[fieldKey] = state.inputsByCase[caseId][fieldKey];
        return caseAccumulator;
      }, {} as Record<FieldKeyType, number>);
      return accumulator;
    }, {} as ShareStateSnapshot["inputsByCase"]),
    measuredAirSpeedByCase: compareCaseOrder.reduce((accumulator, caseId) => {
      accumulator[caseId] = state.measuredAirSpeedByCase[caseId];
      return accumulator;
    }, {} as NumericByCaseState),
    dewPointByCase: compareCaseOrder.reduce((accumulator, caseId) => {
      accumulator[caseId] = state.dewPointByCase[caseId];
      return accumulator;
    }, {} as NumericByCaseState),
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
  state.ui.selectedPmvChart = snapshot.selectedPmvChart;
  state.ui.selectedUtciChart = snapshot.selectedUtciChart;
  state.ui.pmvTemperatureInputMode = snapshot.pmvTemperatureInputMode;
  state.ui.pmvAirSpeedControlMode = snapshot.pmvAirSpeedControlMode ?? PmvAirSpeedControlMode.WithLocalControl;
  state.ui.pmvAirSpeedInputMode = snapshot.pmvAirSpeedInputMode;
  state.ui.pmvHumidityInputMode = snapshot.pmvHumidityInputMode;
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
    state.measuredAirSpeedByCase[caseId] = snapshot.measuredAirSpeedByCase[caseId];
    state.dewPointByCase[caseId] = snapshot.dewPointByCase[caseId];
    state.humidityRatioByCase[caseId] = deriveHumidityRatioFromRelativeHumidity(
      state.inputsByCase[caseId][FieldKey.DryBulbTemperature],
      state.inputsByCase[caseId][FieldKey.RelativeHumidity],
    );
    state.wetBulbByCase[caseId] = deriveWetBulbFromRelativeHumidity(
      state.inputsByCase[caseId][FieldKey.DryBulbTemperature],
      state.inputsByCase[caseId][FieldKey.RelativeHumidity],
    );
    state.vaporPressureByCase[caseId] = deriveVaporPressureFromRelativeHumidity(
      state.inputsByCase[caseId][FieldKey.DryBulbTemperature],
      state.inputsByCase[caseId][FieldKey.RelativeHumidity],
    );

    if (state.ui.pmvAirSpeedInputMode === PmvAirSpeedInputMode.Measured) {
      state.inputsByCase[caseId][FieldKey.RelativeAirSpeed] = deriveRelativeAirSpeedFromMeasured(
        state.measuredAirSpeedByCase[caseId],
        state.inputsByCase[caseId][FieldKey.MetabolicRate],
      );
    }
  });

  callbacks.clearResults();
  callbacks.scheduleCalculation({ immediate: true });
}
