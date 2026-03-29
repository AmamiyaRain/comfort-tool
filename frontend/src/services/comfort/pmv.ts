import { cooling_effect } from "jsthermalcomfort/lib/esm/models/cooling_effect.js";
import { pmv_ppd_ashrae } from "jsthermalcomfort/lib/esm/models/pmv_ppd_ashrae.js";
import { pmv_calculation } from "jsthermalcomfort/lib/esm/models/pmv_ppd.js";
import { check_standard_compliance_array, units_converter } from "jsthermalcomfort/lib/esm/utilities/utilities.js";

import { CalculationSource, ComfortStandard } from "../../models/calculationMetadata";
import type { PmvRequestDto, PmvResponseDto } from "../../models/dto";
import { UnitSystem } from "../../models/units";
import { ensureFiniteValue, PMV_COMFORT_LIMIT } from "./helpers";

const COMFORT_ZONE_MIN_DRY_BULB = 10;
const COMFORT_ZONE_MAX_DRY_BULB = 40;
const ROOT_SCAN_POINTS = 81;
const ROOT_REFINE_POINTS = 7;
const ROOT_MAX_REFINEMENTS = 9;
const ROOT_TOLERANCE = 5e-4;

type TemperatureBracket =
  | { exactTemperature: number }
  | { low: number; high: number };

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

  const coolingEffect = normalizedPayload.vr > 0.1
    ? cooling_effect(
        normalizedPayload.tdb,
        normalizedPayload.tr,
        normalizedPayload.vr,
        normalizedPayload.rh,
        normalizedPayload.met,
        normalizedPayload.clo,
        normalizedPayload.wme,
        normalizedPayload.units,
      ).ce
    : 0;

  const adjustedDryBulbTemperature = normalizedPayload.tdb - coolingEffect;
  const adjustedMeanRadiantTemperature = normalizedPayload.tr - coolingEffect;
  const adjustedRelativeAirSpeed = coolingEffect > 0 ? 0.1 : normalizedPayload.vr;

  return ensureFiniteValue(
    "PMV",
    pmv_calculation(
      adjustedDryBulbTemperature,
      adjustedMeanRadiantTemperature,
      adjustedRelativeAirSpeed,
      normalizedPayload.rh,
      normalizedPayload.met,
      normalizedPayload.clo,
      normalizedPayload.wme,
    ),
  );
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
