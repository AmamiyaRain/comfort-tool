import {
  CompareCaseId,
  type CompareCaseId as CompareCaseIdType,
} from "../../models/compareCases";
import type {
  ComfortZoneRequestDto,
  ComfortZoneResponseDto,
  PmvCompareChartRequestDto,
  RelativeHumidityChartRequestDto,
  UtciRequestDto,
  UtciResponseDto,
  UtciStressChartRequestDto,
} from "../../models/dto";

export const PMV_COMFORT_LIMIT = 0.5;
export const ATM_PRESSURE_PA = 101325;

export type ComfortZonesByCase = Partial<Record<CompareCaseIdType, ComfortZoneResponseDto>>;
export type UtciChartResultsByCase = Partial<Record<CompareCaseIdType, UtciResponseDto>>;

export function roundValue(value: number, decimals = 3): number {
  return Number(value.toFixed(decimals));
}

export function ensureFiniteValue(label: string, value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} calculation returned an invalid value.`);
  }

  return value;
}

export function formatSignedTemperature(value: number): string {
  const rounded = roundValue(value, 1);
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)} C`;
}

export function getPaddedAxisRange(
  values: number[],
  fallback: [number, number],
  padding = 4,
): [number, number] {
  if (values.length === 0) {
    return fallback;
  }

  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const paddedMinimum = Math.max(fallback[0], Math.floor((minimum - padding) / 5) * 5);
  const paddedMaximum = Math.min(fallback[1], Math.ceil((maximum + padding) / 5) * 5);

  if (paddedMinimum === paddedMaximum) {
    return [
      Math.max(fallback[0], paddedMinimum - 5),
      Math.min(fallback[1], paddedMaximum + 5),
    ];
  }

  return [paddedMinimum, paddedMaximum];
}

export function getPmvCompareCases(
  payload: PmvCompareChartRequestDto | RelativeHumidityChartRequestDto,
): Array<{ caseId: CompareCaseIdType; payload: ComfortZoneRequestDto }> {
  const cases: Array<{ caseId: CompareCaseIdType; payload: ComfortZoneRequestDto }> = [
    { caseId: CompareCaseId.A, payload: payload.case_a },
  ];

  if (payload.case_b) {
    cases.push({ caseId: CompareCaseId.B, payload: payload.case_b });
  }

  if (payload.case_c) {
    cases.push({ caseId: CompareCaseId.C, payload: payload.case_c });
  }

  return cases;
}

export function getUtciCases(
  payload: UtciStressChartRequestDto,
): Array<{ caseId: CompareCaseIdType; payload: UtciRequestDto }> {
  const cases: Array<{ caseId: CompareCaseIdType; payload: UtciRequestDto }> = [
    { caseId: CompareCaseId.A, payload: payload.case_a },
  ];

  if (payload.case_b) {
    cases.push({ caseId: CompareCaseId.B, payload: payload.case_b });
  }

  if (payload.case_c) {
    cases.push({ caseId: CompareCaseId.C, payload: payload.case_c });
  }

  return cases;
}
