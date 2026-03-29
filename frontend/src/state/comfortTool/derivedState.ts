import { compareCaseOrder, type CompareCaseId as CompareCaseIdType } from "../../models/compareCases";
import { DerivedFieldKey } from "../../models/derivedFieldKeys";
import { FieldKey } from "../../models/fieldKeys";
import {
  deriveDewPointFromRelativeHumidity,
  deriveHumidityRatioFromRelativeHumidity,
  deriveMeasuredAirSpeedFromRelative,
  deriveVaporPressureFromRelativeHumidity,
  deriveWetBulbFromRelativeHumidity,
} from "../../services/comfort";
import type { DerivedByCaseState, ComfortToolStateSlice } from "./types";

export function createEmptyDerivedByCase(): DerivedByCaseState {
  return compareCaseOrder.reduce((accumulator, caseId) => {
    accumulator[caseId] = {};
    return accumulator;
  }, {} as DerivedByCaseState);
}

export function refreshDerivedStateForCase(state: ComfortToolStateSlice, caseId: CompareCaseIdType) {
  const inputs = state.inputsByCase[caseId];
  state.derivedByCase[caseId][DerivedFieldKey.MeasuredAirSpeed] = deriveMeasuredAirSpeedFromRelative(
    inputs[FieldKey.RelativeAirSpeed],
    inputs[FieldKey.MetabolicRate],
  );
  state.derivedByCase[caseId][DerivedFieldKey.DewPoint] = deriveDewPointFromRelativeHumidity(
    inputs[FieldKey.DryBulbTemperature],
    inputs[FieldKey.RelativeHumidity],
  );
  state.derivedByCase[caseId][DerivedFieldKey.HumidityRatio] = deriveHumidityRatioFromRelativeHumidity(
    inputs[FieldKey.DryBulbTemperature],
    inputs[FieldKey.RelativeHumidity],
  );
  state.derivedByCase[caseId][DerivedFieldKey.WetBulb] = deriveWetBulbFromRelativeHumidity(
    inputs[FieldKey.DryBulbTemperature],
    inputs[FieldKey.RelativeHumidity],
  );
  state.derivedByCase[caseId][DerivedFieldKey.VaporPressure] = deriveVaporPressureFromRelativeHumidity(
    inputs[FieldKey.DryBulbTemperature],
    inputs[FieldKey.RelativeHumidity],
  );
}

export function refreshAllDerivedState(state: ComfortToolStateSlice) {
  compareCaseOrder.forEach((caseId) => {
    refreshDerivedStateForCase(state, caseId);
  });
}
