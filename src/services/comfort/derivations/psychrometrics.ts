import { psy_ta_rh } from "jsthermalcomfort/lib/esm/psychrometrics/psy_ta_rh.js";

export type PsychrometricDerivedState = {
  dewPoint: number;
  humidityRatio: number;
  wetBulb: number;
  vaporPressure: number;
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

/**
 * Calculates psychrometric values (dew point, vapor pressure, etc.) from dry bulb temperature and relative humidity.
 * @param dryBulbTemperature The air temperature in SI units.
 * @param relativeHumidity The relative humidity as a percentage (0-100).
 * @returns An object containing calculated dew point, humidity ratio, wet bulb, and vapor pressure.
 */
export function derivePsychrometricStateFromRelativeHumidity(
  dryBulbTemperature: number,
  relativeHumidity: number,
): PsychrometricDerivedState {
  const result = psy_ta_rh(dryBulbTemperature, relativeHumidity);

  return {
    dewPoint: result.t_dp,
    humidityRatio: result.hr,
    wetBulb: result.t_wb,
    vaporPressure: result.p_vap,
  };
}

/**
 * Iteratively solves for relative humidity given a target value and a selection helper.
 * @param dryBulbTemperature Air temperature.
 * @param targetValue The target value to solve for (e.g., dew point, humidity ratio).
 * @param selector A function that extracts the comparison value from psychrometric results.
 * @returns The solved relative humidity (0-100).
 */
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

/**
 * Derives the active Relative Humidity given the Dry Bulb Temperature and a target Dew Point temperature.
 * Uses a robust numerical iterator since an analytical reverse projection isn't cleanly linear out-of-the-box in `jsthermalcomfort`.
 *
 * @param dryBulbTemperature Active dry bulb.
 * @param dewPoint Target Dew Point to resolve against.
 * @returns The solved Relative Humidity.
 */
export function deriveRelativeHumidityFromDewPoint(dryBulbTemperature: number, dewPoint: number): number {
  if (dewPoint >= dryBulbTemperature) {
    return 100;
  }

  return solveRelativeHumidity(dryBulbTemperature, dewPoint, (result) => result.t_dp);
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
