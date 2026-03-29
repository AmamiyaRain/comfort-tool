import { cooling_effect } from "jsthermalcomfort/lib/esm/models/cooling_effect.js";
import { pmv_calculation, pmv_ppd } from "jsthermalcomfort/lib/esm/models/pmv_ppd.js";

import { CalculationSource, ComfortStandard } from "../../models/calculationMetadata";
import type { PmvRequestDto, PmvResponseDto } from "../../models/dto";
import { ensureFiniteValue, PMV_COMFORT_LIMIT } from "./helpers";

function calculatePmvValues(payload: PmvRequestDto): { pmv: number; ppd: number } {
  const result = pmv_ppd(
    payload.tdb,
    payload.tr,
    payload.vr,
    payload.rh,
    payload.met,
    payload.clo,
    payload.wme,
    "ASHRAE",
    {
      units: payload.units,
      limit_inputs: false,
      airspeed_control: true,
    },
  );

  return {
    pmv: ensureFiniteValue("PMV", result.pmv),
    ppd: ensureFiniteValue("PPD", result.ppd),
  };
}

function calculateRawPmvValue(payload: PmvRequestDto): number {
  const coolingEffect = payload.vr > 0.1
    ? cooling_effect(
        payload.tdb,
        payload.tr,
        payload.vr,
        payload.rh,
        payload.met,
        payload.clo,
        payload.wme,
        payload.units,
      )
    : 0;

  const adjustedDryBulbTemperature = payload.tdb - coolingEffect;
  const adjustedMeanRadiantTemperature = payload.tr - coolingEffect;
  const adjustedRelativeAirSpeed = coolingEffect > 0 ? 0.1 : payload.vr;

  return ensureFiniteValue(
    "PMV",
    pmv_calculation(
      adjustedDryBulbTemperature,
      adjustedMeanRadiantTemperature,
      adjustedRelativeAirSpeed,
      payload.rh,
      payload.met,
      payload.clo,
      payload.wme,
    ),
  );
}

export function clonePmvPayload(
  payload: PmvRequestDto,
  overrides: Partial<PmvRequestDto>,
): PmvRequestDto {
  return {
    ...payload,
    ...overrides,
  };
}

export function solveDryBulbForTargetPmv(
  targetPmv: number,
  rh: number,
  payload: PmvRequestDto,
): number | null {
  let low = 10;
  let high = 40;

  const lowPmv = calculateRawPmvValue(clonePmvPayload(payload, { tdb: low, rh }));
  const highPmv = calculateRawPmvValue(clonePmvPayload(payload, { tdb: high, rh }));

  let lowDelta = lowPmv - targetPmv;
  const highDelta = highPmv - targetPmv;
  if (lowDelta * highDelta > 0) {
    return null;
  }

  for (let index = 0; index < 45; index += 1) {
    const middle = (low + high) / 2;
    const middlePmv = calculateRawPmvValue(clonePmvPayload(payload, { tdb: middle, rh }));
    const middleDelta = middlePmv - targetPmv;

    if (Math.abs(middleDelta) < 5e-4) {
      return middle;
    }

    if (lowDelta * middleDelta <= 0) {
      high = middle;
    } else {
      low = middle;
      lowDelta = middleDelta;
    }
  }

  return (low + high) / 2;
}

export function calculatePmv(payload: PmvRequestDto): PmvResponseDto {
  const result = calculatePmvValues(payload);
  return {
    pmv: result.pmv,
    ppd: result.ppd,
    acceptable80: Math.abs(result.pmv) <= PMV_COMFORT_LIMIT,
    standard: ComfortStandard.Ashrae55PmvPpd,
    source: CalculationSource.JsThermalComfort,
  };
}
