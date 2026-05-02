/**
 * Helper functions for input ordering, dtos, and Thermal Indices constants.
 */

import {
  inputOrder,
  type InputId as InputIdType,
} from "../../models/inputSlots";
import { FieldKey } from "../../models/fieldKeys";
import { fieldMetaByKey } from "../../models/inputFieldsMeta";
import type {
  CompareInputMap,
  ComfortZoneResponseDto,
  UtciResponseDto,
} from "../../models/comfortDtos";
import { UnitSystem, type UnitSystem as UnitSystemType } from "../../models/units";
import { convertFieldValueFromSi } from "../units";

// Heat Index thresholds in Celsius
export const HI_CAUTION = 27;
export const HI_EXTREME_CAUTION = 32;
export const HI_DANGER = 39;
export const HI_EXTREME_DANGER = 51;

// Humidex discomfort thresholds in Celsius
export const HUMIDEX_NOTICEABLE = 30;
export const HUMIDEX_EVIDENT = 35;
export const HUMIDEX_INTENSE = 40;
export const HUMIDEX_DANGEROUS = 45;
export const HUMIDEX_STROKE_PROBABLE = 54;

// Wind Chill frostbite thresholds in SI units (W/m2)
export const WCI_FROSTBITE_30 = 1400;
export const WCI_FROSTBITE_10 = 1600;
export const WCI_FROSTBITE_2 = 2300;

/**
 * Determines the Heat Index risk category based on Celsius value.
 */
export function getHeatIndexCategory(hiSi: number): string {
  if (hiSi >= HI_EXTREME_DANGER) return "Extreme Danger";
  if (hiSi >= HI_DANGER) return "Danger";
  if (hiSi >= HI_EXTREME_CAUTION) return "Extreme Caution";
  if (hiSi >= HI_CAUTION) return "Caution";
  return "Safe";
}

/**
 * Determines the Humidex discomfort level.
 */
export function getHumidexDiscomfort(h: number): string {
  if (h >= HUMIDEX_STROKE_PROBABLE) return "Stroke Probable";
  if (h >= HUMIDEX_DANGEROUS) return "Dangerous";
  if (h >= HUMIDEX_INTENSE) return "Intense";
  if (h >= HUMIDEX_EVIDENT) return "Evident";
  if (h >= HUMIDEX_NOTICEABLE) return "Noticeable";
  return "Little/None";
}

/**
 * Determines the Wind Chill frostbite risk zone.
 */
export function getWindChillZone(wci: number): string {
  if (wci >= WCI_FROSTBITE_2) return "2 min frostbite";
  if (wci >= WCI_FROSTBITE_10) return "10 min frostbite";
  if (wci >= WCI_FROSTBITE_30) return "30 min frostbite";
  return "Safe";
}

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
 * Asserts that a value is finite, throwing an error for non-finite values such as NaN and Infinity.
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
export function formatSignedTemperature(value: number, unitSystem: UnitSystemType = UnitSystem.SI): string {
  // Convert the temperature to the target unit system
  const convertedValue = convertFieldValueFromSi(FieldKey.DryBulbTemperature, value, unitSystem);
  // Round the temperature to one decimal place
  const rounded = roundValue(convertedValue, 1);
  // Return the temperature with a sign prefix and unit
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
  // Return the fallback range if no values are provided
  if (values.length === 0) {
    return fallback;
  }

  // Find the minimum and maximum values in the array
  const rawMin = values.reduce((min, current) => Math.min(min, current));
  const rawMax = values.reduce((max, current) => Math.max(max, current));

  // Round down/up to nearest 5 after applying padding
  const roundedMin = Math.floor((rawMin - padding) / 5) * 5;
  const roundedMax = Math.ceil((rawMax + padding) / 5) * 5;

  // Clamp the results within the fallback boundaries
  const paddedMinimum = Math.max(fallback[0], roundedMin);
  const paddedMaximum = Math.min(fallback[1], roundedMax);

  if (paddedMinimum === paddedMaximum) {
    return [
      Math.max(fallback[0], paddedMinimum - 5),
      Math.min(fallback[1], paddedMaximum + 5),
    ];
  }

  return [paddedMinimum, paddedMaximum];
}

/**
 * Helper function to get ordered inputs from a map of inputs.
 * @param inputsByInput The map of inputs keyed by InputIdType.
 * @returns An array of inputs in the correct order.
 */
export function getCompareInputs<T>(inputsByInput: CompareInputMap<T>): Array<{ inputId: InputIdType; payload: T }> {
  return inputOrder
    // Filter out inputs that don't exist in the map
    .filter((inputId) => !!inputsByInput[inputId])
    // Get inputs in order
    .map((inputId) => ({
      inputId,
      payload: inputsByInput[inputId] as T,
    }));
}

