import { utci } from "jsthermalcomfort/lib/esm/models/utci.js";

import { CalculationSource } from "../../models/calculationMetadata";
import {
  utciStressCategoryOrder,
  type UtciStressCategory as UtciStressCategoryType,
} from "../../models/utciStress";
import type { UtciRequestDto, UtciResponseDto } from "../../models/comfortDtos";
import { ensureFiniteValue } from "./helpers";

/**
 * Strictly resolves loosely-typed third-party dynamic string outputs (e.g. from computational engines) 
 * against our canonical union types, forcibly crashing the pipeline if an unregistered thermal category is returned.
 * @param value The raw string evaluated by JSThermalComfort
 */
function normalizeUtciStressCategory(value: string): UtciStressCategoryType {
  const matchedCategory = utciStressCategoryOrder.find((category) => category === value);
  if (!matchedCategory) {
    throw new Error(`Unexpected UTCI stress category: ${value}`);
  }

  return matchedCategory;
}

/**
 * Main entry point for UTCI (Universal Thermal Climate Index) calculations.
 * Returns the UTCI value and its associated stress category.
 * Note: UTCI is evaluated directly and does not require local minimum/maximum temperature search brackets 
 * for solving comfort zones, unlike PMV. Its visualization bounds are defined independently.
 * This function acts as the integration gateway used by the UTCI model config state layers to drive chart updates and dashboard displays.
 * @param payload The UTCI request parameters.
 * @returns An object containing the UTCI temperature and stress category.
 */
export function calculateUtci(payload: UtciRequestDto): UtciResponseDto {
  const result = utci(payload.tdb, payload.tr, payload.v, payload.rh, payload.units, true, false);

  if (typeof result === "number") {
    throw new Error("UTCI calculation did not return a stress category.");
  }

  return {
    utci: ensureFiniteValue("UTCI", result.utci),
    stressCategory: normalizeUtciStressCategory(String(result.stress_category)),
    source: CalculationSource.JsThermalComfort,
  };
}
