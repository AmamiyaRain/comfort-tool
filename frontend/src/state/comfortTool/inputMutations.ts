import { compareCaseOrder, type CompareCaseId as CompareCaseIdType } from "../../models/compareCases";
import { ComfortModel } from "../../models/comfortModels";
import { FieldKey, type FieldKey as FieldKeyType } from "../../models/fieldKeys";
import {
  PmvAirSpeedInputMode,
  PmvHumidityInputMode,
  PmvTemperatureInputMode,
  type PmvAirSpeedControlMode as PmvAirSpeedControlModeType,
  type PmvAirSpeedInputMode as PmvAirSpeedInputModeType,
  type PmvHumidityInputMode as PmvHumidityInputModeType,
  type PmvTemperatureInputMode as PmvTemperatureInputModeType,
} from "../../models/inputModes";
import { convertDisplayToSi } from "../../services/unitConversion";
import {
  convertHumidityRatioDisplayToSi,
  convertVaporPressureDisplayToSi,
  deriveDewPointFromRelativeHumidity,
  deriveHumidityRatioFromRelativeHumidity,
  deriveMeasuredAirSpeedFromRelative,
  deriveOperativeTemperature,
  deriveRelativeAirSpeedFromMeasured,
  deriveRelativeHumidityFromDewPoint,
  deriveRelativeHumidityFromHumidityRatio,
  deriveRelativeHumidityFromVaporPressure,
  deriveRelativeHumidityFromWetBulb,
  deriveVaporPressureFromRelativeHumidity,
  deriveWetBulbFromRelativeHumidity,
} from "../../services/advancedPmvInputs";
import type { ComfortToolStateSlice } from "./types";

function refreshHumidityDerivedValues(state: ComfortToolStateSlice, caseId: CompareCaseIdType) {
  state.dewPointByCase[caseId] = deriveDewPointFromRelativeHumidity(
    state.inputsByCase[caseId][FieldKey.DryBulbTemperature],
    state.inputsByCase[caseId][FieldKey.RelativeHumidity],
  );
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
}

function syncDerivedPmvInputs(state: ComfortToolStateSlice, caseId: CompareCaseIdType) {
  if (state.ui.pmvAirSpeedInputMode === PmvAirSpeedInputMode.Measured) {
    state.inputsByCase[caseId][FieldKey.RelativeAirSpeed] = deriveRelativeAirSpeedFromMeasured(
      state.measuredAirSpeedByCase[caseId],
      state.inputsByCase[caseId][FieldKey.MetabolicRate],
    );
  }

  if (state.ui.pmvHumidityInputMode === PmvHumidityInputMode.DewPoint) {
    state.inputsByCase[caseId][FieldKey.RelativeHumidity] = deriveRelativeHumidityFromDewPoint(
      state.inputsByCase[caseId][FieldKey.DryBulbTemperature],
      state.dewPointByCase[caseId],
    );
  } else if (state.ui.pmvHumidityInputMode === PmvHumidityInputMode.HumidityRatio) {
    state.inputsByCase[caseId][FieldKey.RelativeHumidity] = deriveRelativeHumidityFromHumidityRatio(
      state.inputsByCase[caseId][FieldKey.DryBulbTemperature],
      state.humidityRatioByCase[caseId],
    );
  } else if (state.ui.pmvHumidityInputMode === PmvHumidityInputMode.WetBulb) {
    state.inputsByCase[caseId][FieldKey.RelativeHumidity] = deriveRelativeHumidityFromWetBulb(
      state.inputsByCase[caseId][FieldKey.DryBulbTemperature],
      state.wetBulbByCase[caseId],
    );
  } else if (state.ui.pmvHumidityInputMode === PmvHumidityInputMode.VaporPressure) {
    state.inputsByCase[caseId][FieldKey.RelativeHumidity] = deriveRelativeHumidityFromVaporPressure(
      state.inputsByCase[caseId][FieldKey.DryBulbTemperature],
      state.vaporPressureByCase[caseId],
    );
  }

  refreshHumidityDerivedValues(state, caseId);
}

export function recalculateDerivedDisplayState(state: ComfortToolStateSlice) {
  compareCaseOrder.forEach((caseId) => {
    refreshHumidityDerivedValues(state, caseId);
    if (state.ui.pmvAirSpeedInputMode === PmvAirSpeedInputMode.Measured) {
      state.inputsByCase[caseId][FieldKey.RelativeAirSpeed] = deriveRelativeAirSpeedFromMeasured(
        state.measuredAirSpeedByCase[caseId],
        state.inputsByCase[caseId][FieldKey.MetabolicRate],
      );
    }
  });
}

type ScheduleCalculation = (options?: { immediate?: boolean }) => void;

export function createComfortToolInputActions(
  state: ComfortToolStateSlice,
  scheduleCalculation: ScheduleCalculation,
) {
  function setPmvTemperatureInputMode(nextMode: PmvTemperatureInputModeType) {
    if (state.ui.pmvTemperatureInputMode === nextMode) {
      return;
    }

    state.ui.pmvTemperatureInputMode = nextMode;

    if (nextMode === PmvTemperatureInputMode.Operative) {
      compareCaseOrder.forEach((caseId) => {
        const operativeTemperature = deriveOperativeTemperature(
          state.inputsByCase[caseId][FieldKey.DryBulbTemperature],
          state.inputsByCase[caseId][FieldKey.MeanRadiantTemperature],
          state.ui.pmvAirSpeedInputMode === PmvAirSpeedInputMode.Measured
            ? state.measuredAirSpeedByCase[caseId]
            : state.inputsByCase[caseId][FieldKey.RelativeAirSpeed],
        );
        state.inputsByCase[caseId][FieldKey.DryBulbTemperature] = operativeTemperature;
        state.inputsByCase[caseId][FieldKey.MeanRadiantTemperature] = operativeTemperature;
        syncDerivedPmvInputs(state, caseId);
      });
    }

    scheduleCalculation({ immediate: true });
  }

  function setPmvAirSpeedInputMode(nextMode: PmvAirSpeedInputModeType) {
    if (state.ui.pmvAirSpeedInputMode === nextMode) {
      return;
    }

    state.ui.pmvAirSpeedInputMode = nextMode;

    if (nextMode === PmvAirSpeedInputMode.Measured) {
      compareCaseOrder.forEach((caseId) => {
        state.measuredAirSpeedByCase[caseId] = deriveMeasuredAirSpeedFromRelative(
          state.inputsByCase[caseId][FieldKey.RelativeAirSpeed],
          state.inputsByCase[caseId][FieldKey.MetabolicRate],
        );
      });
    }

    scheduleCalculation({ immediate: true });
  }

  function setPmvAirSpeedControlMode(nextMode: PmvAirSpeedControlModeType) {
    if (state.ui.pmvAirSpeedControlMode === nextMode) {
      return;
    }

    state.ui.pmvAirSpeedControlMode = nextMode;
    scheduleCalculation({ immediate: true });
  }

  function setPmvHumidityInputMode(nextMode: PmvHumidityInputModeType) {
    if (state.ui.pmvHumidityInputMode === nextMode) {
      return;
    }

    state.ui.pmvHumidityInputMode = nextMode;

    if (nextMode === PmvHumidityInputMode.DewPoint) {
      compareCaseOrder.forEach((caseId) => {
        state.dewPointByCase[caseId] = deriveDewPointFromRelativeHumidity(
          state.inputsByCase[caseId][FieldKey.DryBulbTemperature],
          state.inputsByCase[caseId][FieldKey.RelativeHumidity],
        );
      });
    } else if (nextMode === PmvHumidityInputMode.HumidityRatio) {
      compareCaseOrder.forEach((caseId) => {
        state.humidityRatioByCase[caseId] = deriveHumidityRatioFromRelativeHumidity(
          state.inputsByCase[caseId][FieldKey.DryBulbTemperature],
          state.inputsByCase[caseId][FieldKey.RelativeHumidity],
        );
      });
    } else if (nextMode === PmvHumidityInputMode.WetBulb) {
      compareCaseOrder.forEach((caseId) => {
        state.wetBulbByCase[caseId] = deriveWetBulbFromRelativeHumidity(
          state.inputsByCase[caseId][FieldKey.DryBulbTemperature],
          state.inputsByCase[caseId][FieldKey.RelativeHumidity],
        );
      });
    } else if (nextMode === PmvHumidityInputMode.VaporPressure) {
      compareCaseOrder.forEach((caseId) => {
        state.vaporPressureByCase[caseId] = deriveVaporPressureFromRelativeHumidity(
          state.inputsByCase[caseId][FieldKey.DryBulbTemperature],
          state.inputsByCase[caseId][FieldKey.RelativeHumidity],
        );
      });
    }

    scheduleCalculation({ immediate: true });
  }

  function updateInput(caseId: CompareCaseIdType, fieldKey: FieldKeyType, rawValue: string) {
    const nextValue = Number(rawValue);
    if (Number.isNaN(nextValue)) {
      return;
    }

    if (
      state.ui.selectedModel === ComfortModel.Pmv &&
      fieldKey === FieldKey.DryBulbTemperature &&
      state.ui.pmvTemperatureInputMode === PmvTemperatureInputMode.Operative
    ) {
      const operativeTemperature = convertDisplayToSi(FieldKey.DryBulbTemperature, nextValue, state.ui.unitSystem);
      state.inputsByCase[caseId][FieldKey.DryBulbTemperature] = operativeTemperature;
      state.inputsByCase[caseId][FieldKey.MeanRadiantTemperature] = operativeTemperature;
      syncDerivedPmvInputs(state, caseId);
      scheduleCalculation();
      return;
    }

    if (
      state.ui.selectedModel === ComfortModel.Pmv &&
      fieldKey === FieldKey.RelativeAirSpeed &&
      state.ui.pmvAirSpeedInputMode === PmvAirSpeedInputMode.Measured
    ) {
      state.measuredAirSpeedByCase[caseId] = convertDisplayToSi(FieldKey.RelativeAirSpeed, nextValue, state.ui.unitSystem);
      state.inputsByCase[caseId][FieldKey.RelativeAirSpeed] = deriveRelativeAirSpeedFromMeasured(
        state.measuredAirSpeedByCase[caseId],
        state.inputsByCase[caseId][FieldKey.MetabolicRate],
      );
      scheduleCalculation();
      return;
    }

    if (
      state.ui.selectedModel === ComfortModel.Pmv &&
      fieldKey === FieldKey.RelativeHumidity &&
      state.ui.pmvHumidityInputMode === PmvHumidityInputMode.DewPoint
    ) {
      state.dewPointByCase[caseId] = convertDisplayToSi(FieldKey.DryBulbTemperature, nextValue, state.ui.unitSystem);
      state.inputsByCase[caseId][FieldKey.RelativeHumidity] = deriveRelativeHumidityFromDewPoint(
        state.inputsByCase[caseId][FieldKey.DryBulbTemperature],
        state.dewPointByCase[caseId],
      );
      refreshHumidityDerivedValues(state, caseId);
      scheduleCalculation();
      return;
    }

    if (
      state.ui.selectedModel === ComfortModel.Pmv &&
      fieldKey === FieldKey.RelativeHumidity &&
      state.ui.pmvHumidityInputMode === PmvHumidityInputMode.HumidityRatio
    ) {
      state.humidityRatioByCase[caseId] = convertHumidityRatioDisplayToSi(nextValue, state.ui.unitSystem);
      state.inputsByCase[caseId][FieldKey.RelativeHumidity] = deriveRelativeHumidityFromHumidityRatio(
        state.inputsByCase[caseId][FieldKey.DryBulbTemperature],
        state.humidityRatioByCase[caseId],
      );
      refreshHumidityDerivedValues(state, caseId);
      scheduleCalculation();
      return;
    }

    if (
      state.ui.selectedModel === ComfortModel.Pmv &&
      fieldKey === FieldKey.RelativeHumidity &&
      state.ui.pmvHumidityInputMode === PmvHumidityInputMode.WetBulb
    ) {
      state.wetBulbByCase[caseId] = convertDisplayToSi(FieldKey.DryBulbTemperature, nextValue, state.ui.unitSystem);
      state.inputsByCase[caseId][FieldKey.RelativeHumidity] = deriveRelativeHumidityFromWetBulb(
        state.inputsByCase[caseId][FieldKey.DryBulbTemperature],
        state.wetBulbByCase[caseId],
      );
      refreshHumidityDerivedValues(state, caseId);
      scheduleCalculation();
      return;
    }

    if (
      state.ui.selectedModel === ComfortModel.Pmv &&
      fieldKey === FieldKey.RelativeHumidity &&
      state.ui.pmvHumidityInputMode === PmvHumidityInputMode.VaporPressure
    ) {
      state.vaporPressureByCase[caseId] = convertVaporPressureDisplayToSi(nextValue, state.ui.unitSystem);
      state.inputsByCase[caseId][FieldKey.RelativeHumidity] = deriveRelativeHumidityFromVaporPressure(
        state.inputsByCase[caseId][FieldKey.DryBulbTemperature],
        state.vaporPressureByCase[caseId],
      );
      refreshHumidityDerivedValues(state, caseId);
      scheduleCalculation();
      return;
    }

    state.inputsByCase[caseId][fieldKey] = convertDisplayToSi(fieldKey, nextValue, state.ui.unitSystem);

    if (state.ui.selectedModel === ComfortModel.Pmv) {
      if (fieldKey === FieldKey.DryBulbTemperature || fieldKey === FieldKey.RelativeHumidity) {
        refreshHumidityDerivedValues(state, caseId);
      }

      if (fieldKey === FieldKey.MetabolicRate && state.ui.pmvAirSpeedInputMode === PmvAirSpeedInputMode.Measured) {
        state.inputsByCase[caseId][FieldKey.RelativeAirSpeed] = deriveRelativeAirSpeedFromMeasured(
          state.measuredAirSpeedByCase[caseId],
          state.inputsByCase[caseId][FieldKey.MetabolicRate],
        );
      }

      if (
        fieldKey === FieldKey.DryBulbTemperature &&
        state.ui.pmvHumidityInputMode !== PmvHumidityInputMode.RelativeHumidity
      ) {
        syncDerivedPmvInputs(state, caseId);
      }
    }

    scheduleCalculation();
  }

  return {
    setPmvTemperatureInputMode,
    setPmvAirSpeedControlMode,
    setPmvAirSpeedInputMode,
    setPmvHumidityInputMode,
    updateInput,
  };
}
