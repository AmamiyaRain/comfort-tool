import { inputOrder, type InputId as InputIdType } from "../../models/inputSlots";
import { DerivedFieldKey, FieldKey } from "../../models/fieldKeys";
import {
  deriveDewPointFromRelativeHumidity,
  deriveHumidityRatioFromRelativeHumidity,
  deriveMeasuredAirSpeedFromRelative,
  deriveVaporPressureFromRelativeHumidity,
  deriveWetBulbFromRelativeHumidity,
} from "../../services/comfort";
import type { DerivedByInputState, ComfortToolStateSlice } from "./types";

export function createEmptyDerivedByInput(): DerivedByInputState {
  return inputOrder.reduce((accumulator, inputId) => {
    accumulator[inputId] = {};
    return accumulator;
  }, {} as DerivedByInputState);
}

export function refreshDerivedStateForInput(state: ComfortToolStateSlice, inputId: InputIdType) {
  const inputs = state.inputsByInput[inputId];
  state.derivedByInput[inputId][DerivedFieldKey.MeasuredAirSpeed] = deriveMeasuredAirSpeedFromRelative(
    inputs[FieldKey.RelativeAirSpeed],
    inputs[FieldKey.MetabolicRate],
  );
  state.derivedByInput[inputId][DerivedFieldKey.DewPoint] = deriveDewPointFromRelativeHumidity(
    inputs[FieldKey.DryBulbTemperature],
    inputs[FieldKey.RelativeHumidity],
  );
  state.derivedByInput[inputId][DerivedFieldKey.HumidityRatio] = deriveHumidityRatioFromRelativeHumidity(
    inputs[FieldKey.DryBulbTemperature],
    inputs[FieldKey.RelativeHumidity],
  );
  state.derivedByInput[inputId][DerivedFieldKey.WetBulb] = deriveWetBulbFromRelativeHumidity(
    inputs[FieldKey.DryBulbTemperature],
    inputs[FieldKey.RelativeHumidity],
  );
  state.derivedByInput[inputId][DerivedFieldKey.VaporPressure] = deriveVaporPressureFromRelativeHumidity(
    inputs[FieldKey.DryBulbTemperature],
    inputs[FieldKey.RelativeHumidity],
  );
}

export function refreshAllDerivedState(state: ComfortToolStateSlice) {
  inputOrder.forEach((inputId) => {
    refreshDerivedStateForInput(state, inputId);
  });
}
