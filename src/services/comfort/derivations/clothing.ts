import { clo_tout } from "jsthermalcomfort/lib/esm/models/clo_tout.js";
import type { UnitSystem as UnitSystemType } from "../../../models/units";

type CloToutResult =
  | number
  | {
      clo?: number;
      clo_tout?: number;
    };

/**
 * Dynamically maps flexible dictionary payloads into a guaranteed single numerical scalar. 
 * Different JS targets export slightly different payload structures (number vs object containing clo).
 * @param result The unstructured output emitted by the jsthermalcomfort clothing function.
 */
function normalizePredictedClothingValue(result: CloToutResult): number {
  if (typeof result === "number") {
    return result;
  }

  if (typeof result.clo === "number") {
    return result.clo;
  }

  if (typeof result.clo_tout === "number") {
    return result.clo_tout;
  }

  throw new Error("Clothing prediction did not return a numeric clo value.");
}

/**
 * Predicts the required clothing insulation (clo) from the mean outdoor temperature.
 * Uses the dynamic predicted clothing model from jsthermalcomfort.
 * @param outdoorTemperature The average outdoor temperature.
 * @param unitSystem Current unit system (SI/IP).
 * @returns The predicted clothing insulation level.
 */
export function predictClothingInsulationFromOutdoorTemperature(
  outdoorTemperature: number,
  unitSystem: UnitSystemType,
): number {
  return normalizePredictedClothingValue(clo_tout(outdoorTemperature, unitSystem));
}
