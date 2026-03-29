import { clo_tout } from "jsthermalcomfort/lib/esm/models/clo_tout.js";
import { psy_ta_rh } from "jsthermalcomfort/lib/esm/psychrometrics/psy_ta_rh.js";
import { t_dp } from "jsthermalcomfort/lib/esm/psychrometrics/t_dp.js";
import { t_o } from "jsthermalcomfort/lib/esm/psychrometrics/t_o.js";
import { v_relative } from "jsthermalcomfort/lib/esm/utilities/utilities.js";

import type { UnitSystem as UnitSystemType } from "../../models/units";

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function deriveMeasuredAirSpeedFromRelative(relativeAirSpeed: number, metabolicRate: number): number {
  if (metabolicRate <= 1) {
    return relativeAirSpeed;
  }

  return Math.max(0, relativeAirSpeed - 0.3 * (metabolicRate - 1));
}

export function deriveRelativeAirSpeedFromMeasured(measuredAirSpeed: number, metabolicRate: number): number {
  return v_relative(measuredAirSpeed, metabolicRate);
}

export function deriveDewPointFromRelativeHumidity(dryBulbTemperature: number, relativeHumidity: number): number {
  return t_dp(dryBulbTemperature, relativeHumidity);
}

export function deriveHumidityRatioFromRelativeHumidity(dryBulbTemperature: number, relativeHumidity: number): number {
  return psy_ta_rh(dryBulbTemperature, relativeHumidity).hr;
}

export function deriveWetBulbFromRelativeHumidity(dryBulbTemperature: number, relativeHumidity: number): number {
  return psy_ta_rh(dryBulbTemperature, relativeHumidity).t_wb;
}

export function deriveVaporPressureFromRelativeHumidity(dryBulbTemperature: number, relativeHumidity: number): number {
  return psy_ta_rh(dryBulbTemperature, relativeHumidity).p_vap;
}

function solveRelativeHumidity(
  dryBulbTemperature: number,
  targetValue: number,
  selector: (result: ReturnType<typeof psy_ta_rh>) => number,
): number {
  let low = 0.01;
  let high = 100;

  for (let index = 0; index < 40; index += 1) {
    const middle = (low + high) / 2;
    const middleValue = selector(psy_ta_rh(dryBulbTemperature, middle));

    if (Math.abs(middleValue - targetValue) < 1e-4) {
      return clamp(middle, 0, 100);
    }

    if (middleValue < targetValue) {
      low = middle;
    } else {
      high = middle;
    }
  }

  return clamp((low + high) / 2, 0, 100);
}

export function deriveRelativeHumidityFromDewPoint(dryBulbTemperature: number, dewPoint: number): number {
  if (dewPoint >= dryBulbTemperature) {
    return 100;
  }

  let low = 0.01;
  let high = 100;

  for (let index = 0; index < 35; index += 1) {
    const middle = (low + high) / 2;
    const middleDewPoint = t_dp(dryBulbTemperature, middle);

    if (Math.abs(middleDewPoint - dewPoint) < 0.01) {
      return clamp(middle, 0, 100);
    }

    if (middleDewPoint < dewPoint) {
      low = middle;
    } else {
      high = middle;
    }
  }

  return clamp((low + high) / 2, 0, 100);
}

export function deriveRelativeHumidityFromHumidityRatio(dryBulbTemperature: number, humidityRatio: number): number {
  return solveRelativeHumidity(dryBulbTemperature, humidityRatio, (result) => result.hr);
}

export function deriveRelativeHumidityFromWetBulb(dryBulbTemperature: number, wetBulbTemperature: number): number {
  return solveRelativeHumidity(dryBulbTemperature, wetBulbTemperature, (result) => result.t_wb);
}

export function deriveRelativeHumidityFromVaporPressure(dryBulbTemperature: number, vaporPressure: number): number {
  return solveRelativeHumidity(dryBulbTemperature, vaporPressure, (result) => result.p_vap);
}

export function deriveOperativeTemperature(
  dryBulbTemperature: number,
  meanRadiantTemperature: number,
  airSpeed: number,
): number {
  return t_o(dryBulbTemperature, meanRadiantTemperature, airSpeed, "ASHRAE");
}

export function predictClothingInsulationFromOutdoorTemperature(
  outdoorTemperature: number,
  unitSystem: UnitSystemType,
): number {
  return clo_tout(outdoorTemperature, unitSystem);
}
