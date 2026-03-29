import {
  inputOrder,
  type InputId as InputIdType,
} from "../../models/inputSlots";
import type {
  CompareInputMap,
  ComfortZoneRequestDto,
  ComfortZoneResponseDto,
  UtciRequestDto,
  UtciResponseDto,
} from "../../models/dto";

export const PMV_COMFORT_LIMIT = 0.5;
export const ATM_PRESSURE_PA = 101325;

export type ComfortZonesByInput = Partial<Record<InputIdType, ComfortZoneResponseDto>>;
export type UtciChartResultsByInput = Partial<Record<InputIdType, UtciResponseDto>>;

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

export function getCompareInputs<T>(inputsByInput: CompareInputMap<T>): Array<{ inputId: InputIdType; payload: T }> {
  return inputOrder.flatMap((inputId) => {
    const payload = inputsByInput[inputId];
    return payload ? [{ inputId, payload }] : [];
  });
}
