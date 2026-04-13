import { pmv_ppd_ashrae } from "jsthermalcomfort/lib/esm/models/pmv_ppd_ashrae.js";
import { check_standard_compliance_array, units_converter } from "jsthermalcomfort/lib/esm/utilities/utilities.js";

import { CalculationSource, ComfortStandard } from "../../models/calculationMetadata";
import type { PmvRequestDto, PmvResponseDto } from "../../models/comfortDtos";
import { UnitSystem } from "../../models/units";
import { ensureFiniteValue } from "./helpers";

export const PMV_COMFORT_LIMIT = 0.5;

// The exact bounds are used primarily as a search bracket for finding PMV roots (comfort zone boundaries).
// They represent the limits of the comfort zone solver, not the actual mathematical limits of the PMV model.
const COMFORT_ZONE_MIN_DRY_BULB = 10;
const COMFORT_ZONE_MAX_DRY_BULB = 40;
const ROOT_SCAN_POINTS = 81;
const ROOT_REFINE_POINTS = 7;
const ROOT_MAX_REFINEMENTS = 9;
const ROOT_TOLERANCE = 5e-4;

type TemperatureBracket =
  | { exactTemperature: number } // Found a specific dry bulb temperature that meets the target PMV within expected tolerance.
  | { low: number; high: number }; // Found a temperature range bracket where the target PMV root exists.

function normalizePmvPayloadToSi(payload: PmvRequestDto): PmvRequestDto {
  if (payload.units === UnitSystem.SI) {
    return payload;
  }

  const { tdb, tr, vr } = units_converter(
    {
      tdb: payload.tdb,
      tr: payload.tr,
      vr: payload.vr,
    },
    payload.units,
  );

  return {
    ...payload,
    tdb,
    tr,
    vr,
    units: UnitSystem.SI,
  };
}

function hasInvalidComplianceValues(values: number[]): boolean {
  return values.some((value) => Number.isNaN(value));
}

function isNormalizedPmvInputWithinAshraeLimits(payload: PmvRequestDto): boolean {
  const compliance = check_standard_compliance_array("ASHRAE", {
    tdb: [payload.tdb],
    tr: [payload.tr],
    v: [payload.vr],
    met: [payload.met],
    clo: [payload.clo],
    airspeed_control: payload.occupantHasAirSpeedControl,
  });

  return !hasInvalidComplianceValues(compliance.tdb)
    && !hasInvalidComplianceValues(compliance.tr)
    && !hasInvalidComplianceValues(compliance.v)
    && !hasInvalidComplianceValues(compliance.met ?? [])
    && !hasInvalidComplianceValues(compliance.clo ?? []);
}

function isPmvInputWithinAshraeLimits(payload: PmvRequestDto): boolean {
  return isNormalizedPmvInputWithinAshraeLimits(normalizePmvPayloadToSi(payload));
}

function calculatePmvValues(payload: PmvRequestDto): { pmv: number; ppd: number } {
  const result = pmv_ppd_ashrae(
    payload.tdb,
    payload.tr,
    payload.vr,
    payload.rh,
    payload.met,
    payload.clo,
    payload.wme,
    {
      units: payload.units,
      limit_inputs: false,
      airspeed_control: payload.occupantHasAirSpeedControl,
    },
  );

  return {
    pmv: ensureFiniteValue("PMV", result.pmv),
    ppd: ensureFiniteValue("PPD", result.ppd),
  };
}

function calculateRawPmvValue(payload: PmvRequestDto): number {
  const normalizedPayload = normalizePmvPayloadToSi(payload);

  if (!isNormalizedPmvInputWithinAshraeLimits(normalizedPayload)) {
    return NaN;
  }

  return calculatePmvValues(normalizedPayload).pmv;
}

function clonePmvPayload(
  payload: PmvRequestDto,
  overrides: Partial<PmvRequestDto>,
): PmvRequestDto {
  return {
    ...payload,
    ...overrides,
  };
}

function getPmvDeltaAtTemperature(
  targetPmv: number,
  rh: number,
  payload: PmvRequestDto,
  dryBulbTemperature: number,
): number | null {
  const pmv = calculateRawPmvValue(clonePmvPayload(payload, { tdb: dryBulbTemperature, rh }));
  return Number.isFinite(pmv) ? pmv - targetPmv : null;
}

/**
 * Scans a range of temperatures sequentially to locate a bracket where the target PMV root crosses zero.
 * Note: A simple bisection search cannot be used from the very beginning because the ASHRAE definition
 * bounds cause the PMV function to frequently return NaN at edge temperatures. The sequential scan
 * ensures we can safely walk over these "holes" (invalid compliance zones) in the domain.
 */
function findTemperatureBracket(
  targetPmv: number,
  rh: number,
  payload: PmvRequestDto,
  minimum: number,
  maximum: number,
  pointCount: number,
): TemperatureBracket | null {
  let previousTemperature: number | null = null;
  let previousDelta: number | null = null;

  for (let index = 0; index < pointCount; index += 1) {
    const temperature = minimum + ((maximum - minimum) * index) / (pointCount - 1);
    const delta = getPmvDeltaAtTemperature(targetPmv, rh, payload, temperature);

    if (delta === null) {
      previousTemperature = null;
      previousDelta = null;
      continue;
    }

    if (Math.abs(delta) < ROOT_TOLERANCE) {
      return { exactTemperature: temperature };
    }

    if (previousTemperature !== null && previousDelta !== null && previousDelta * delta <= 0) {
      return {
        low: previousTemperature,
        high: temperature,
      };
    }

    previousTemperature = temperature;
    previousDelta = delta;
  }

  return null;
}

/**
 * Solves for the dry bulb temperature that results in a target PMV value at a given RH.
 * Uses a recursive refinement strategy (bisection-like) for root finding.
 * @param targetPmv The target PMV value to solve for (e.g., -0.5, +0.5).
 * @param rh The relative humidity (0-100).
 * @param payload The base comfort request parameters.
 * @returns The solved dry bulb temperature, or null if no solution is found within range.
 */
export function solveDryBulbForTargetPmv(
  targetPmv: number,
  rh: number,
  payload: PmvRequestDto,
): number | null {
  const initialBracket = findTemperatureBracket(
    targetPmv,
    rh,
    payload,
    COMFORT_ZONE_MIN_DRY_BULB,
    COMFORT_ZONE_MAX_DRY_BULB,
    ROOT_SCAN_POINTS,
  );

  if (!initialBracket) {
    return null;
  }

  if ("exactTemperature" in initialBracket) {
    return initialBracket.exactTemperature;
  }

  let currentBracket = initialBracket;

  for (let index = 0; index < ROOT_MAX_REFINEMENTS; index += 1) {
    const refinedBracket = findTemperatureBracket(
      targetPmv,
      rh,
      payload,
      currentBracket.low,
      currentBracket.high,
      ROOT_REFINE_POINTS,
    );

    if (!refinedBracket) {
      break;
    }

    if ("exactTemperature" in refinedBracket) {
      return refinedBracket.exactTemperature;
    }

    currentBracket = refinedBracket;
  }

  return (currentBracket.low + currentBracket.high) / 2;
}

/**
 * Main entry point for PMV/PPD calculations.
 * Returns the PMV, PPD, and ASHRAE standard compliance status.
 * This is primarily used by the model definitions in the Reactivity state (e.g. `pmvModelConfig`) to bridge purely mathematical functions into user-accessible UI variables.
 * @param payload The thermal comfort request payload.
 * @returns An object containing PMV results and metadata.
 */
export function calculatePmv(payload: PmvRequestDto): PmvResponseDto {
  const result = calculatePmvValues(payload);
  const isWithinAshraeLimits = isPmvInputWithinAshraeLimits(payload);
  return {
    pmv: result.pmv,
    ppd: result.ppd,
    acceptable80: isWithinAshraeLimits && Math.abs(result.pmv) <= PMV_COMFORT_LIMIT,
    standard: ComfortStandard.Ashrae55PmvPpd,
    source: CalculationSource.JsThermalComfort,
  };
}
