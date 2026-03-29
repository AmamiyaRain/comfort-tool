import { utci } from "jsthermalcomfort/lib/esm/models/utci.js";

import { CalculationSource } from "../../models/calculationMetadata";
import {
  utciStressCategoryOrder,
  type UtciStressCategory as UtciStressCategoryType,
} from "../../models/utciStress";
import type { UtciRequestDto, UtciResponseDto } from "../../models/dto";
import { ensureFiniteValue } from "./helpers";

function normalizeUtciStressCategory(value: string): UtciStressCategoryType {
  const matchedCategory = utciStressCategoryOrder.find((category) => category === value);
  if (!matchedCategory) {
    throw new Error(`Unexpected UTCI stress category: ${value}`);
  }

  return matchedCategory;
}

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
