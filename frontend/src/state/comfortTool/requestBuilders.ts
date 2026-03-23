import { CompareCaseId, type CompareCaseId as CompareCaseIdType } from "../../models/compareCases";
import { FieldKey } from "../../models/fieldKeys";
import type {
  ComfortZoneRequestDto,
  PmvCompareChartRequestDto,
  PmvRequestDto,
  UtciRequestDto,
  UtciStressChartRequestDto,
} from "../../models/dto";
import { UnitSystem } from "../../models/units";
import type { ComfortToolStateSlice } from "./types";

export function toPmvRequest(state: ComfortToolStateSlice, caseId: CompareCaseIdType): PmvRequestDto {
  const inputs = state.inputsByCase[caseId];
  return {
    tdb: Number(inputs[FieldKey.DryBulbTemperature]),
    tr: Number(inputs[FieldKey.MeanRadiantTemperature]),
    vr: Number(inputs[FieldKey.RelativeAirSpeed]),
    rh: Number(inputs[FieldKey.RelativeHumidity]),
    met: Number(inputs[FieldKey.MetabolicRate]),
    clo: Number(inputs[FieldKey.ClothingInsulation]),
    wme: Number(inputs[FieldKey.ExternalWork]),
    units: UnitSystem.SI,
  };
}

export function toComfortZoneRequest(
  state: ComfortToolStateSlice,
  caseId: CompareCaseIdType,
): ComfortZoneRequestDto {
  return {
    ...toPmvRequest(state, caseId),
    rh_min: 0,
    rh_max: 100,
    rh_points: 31,
  };
}

export function toPmvCompareChartRequest(
  state: ComfortToolStateSlice,
  visibleCaseIds: CompareCaseIdType[],
): PmvCompareChartRequestDto {
  return {
    case_a: toComfortZoneRequest(state, CompareCaseId.A),
    case_b: visibleCaseIds.includes(CompareCaseId.B) ? toComfortZoneRequest(state, CompareCaseId.B) : null,
    case_c: visibleCaseIds.includes(CompareCaseId.C) ? toComfortZoneRequest(state, CompareCaseId.C) : null,
    chart_range: {
      tdb_min: 10,
      tdb_max: 40,
      tdb_points: 121,
      humidity_ratio_min: 0,
      humidity_ratio_max: 30,
    },
    rh_curves: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
  };
}

export function toUtciRequest(state: ComfortToolStateSlice, caseId: CompareCaseIdType): UtciRequestDto {
  const inputs = state.inputsByCase[caseId];
  return {
    tdb: Number(inputs[FieldKey.DryBulbTemperature]),
    tr: Number(inputs[FieldKey.MeanRadiantTemperature]),
    v: Number(inputs[FieldKey.WindSpeed]),
    rh: Number(inputs[FieldKey.RelativeHumidity]),
    units: UnitSystem.SI,
  };
}

export function toUtciStressChartRequest(
  state: ComfortToolStateSlice,
  visibleCaseIds: CompareCaseIdType[],
): UtciStressChartRequestDto {
  return {
    case_a: toUtciRequest(state, CompareCaseId.A),
    case_b: visibleCaseIds.includes(CompareCaseId.B) ? toUtciRequest(state, CompareCaseId.B) : null,
    case_c: visibleCaseIds.includes(CompareCaseId.C) ? toUtciRequest(state, CompareCaseId.C) : null,
  };
}
