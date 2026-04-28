import {
  inputOrder,
  type InputId as InputIdType,
} from "../../models/inputSlots";
import { FieldKey } from "../../models/fieldKeys";
import { fieldMetaByKey } from "../../models/inputFieldsMeta";
import type {
  CompareInputMap,
  ComfortZoneRequestDto,
  ComfortZoneResponseDto,
  UtciRequestDto,
  UtciResponseDto,
} from "../../models/comfortDtos";
import { UnitSystem, type UnitSystem as UnitSystemType } from "../../models/units";
import { convertFieldValueFromSi } from "../units";

export type ComfortZonesByInput = Partial<Record<InputIdType, ComfortZoneResponseDto>>;
export type UtciChartResultsByInput = Partial<Record<InputIdType, UtciResponseDto>>;

/**
 * Rounds a number to a specific number of decimal places.
 * @param value The number to round.
 * @param decimals The number of decimal places (default is 3).
 * @returns The rounded number.
 */
export function roundValue(value: number, decimals = 3): number {
  return Number(value.toFixed(decimals));
}

/**
 * Asserts that a value is finite, throwing an error otherwise.
 * @param label The label for the value (used in error messages).
 * @param value The number to check.
 * @returns The value if finite.
 */
export function ensureFiniteValue(label: string, value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} calculation returned an invalid value.`);
  }

  return value;
}

/**
 * Formats a temperature value for display, including a sign prefix and unit.
 * @param value The temperature in SI.
 * @param unitSystem The active unit system.
 * @returns A formatted string (e.g., "+25.0 °C").
 */
export function formatSignedTemperature(value: number, unitSystem: unitSystemType = UnitSystem.SI): string {
  const convertedValue = convertFieldValueFromSi(FieldKey.DryBulbTemperature, value, unitSystem);
  const rounded = roundValue(convertedValue, 1);
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)} ${fieldMetaByKey[FieldKey.DryBulbTemperature].displayUnits[unitSystem]}`;
}

/**
 * Calculates a padded axis range for charts based on a set of values.
 * @param values The data points to cover.
 * @param fallback The default range if no values are provided.
 * @param padding The amount of padding to add to the edges.
 * @returns Buffer-padded [min, max] range.
 */
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
